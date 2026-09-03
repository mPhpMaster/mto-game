-- مواجهة الوحوش — الحسابات والأصدقاء والرسائل والإحصاءات
--
-- يُطبَّق بـ`supabase db push` أو من محرّر SQL في اللوحة: مُشغّل auth.users
-- يحتاج صلاحية مرتفعة لا يملكها مفتاح REST.
--
-- مبدأ الأمان هنا: المفتاح العام مكشوف في المتصفّح، فلا شيء من هذه الجداول
-- يُقرأ بلا حساب، والعدّادات لا تُكتب إلا عبر دالة واحدة هويّتها auth.uid().

create extension if not exists "pgcrypto";

-- ═══════════════════════════════════════════════════════════════════
-- 0) إصلاح عطل قائم: عمود المستوى مفقود من جدول المباريات
--    app/api/matches/route.ts يُدرجه ويقرأه بينما 0001_init.sql لا ينشئه،
--    فكل حفظ نتيجة كان يفشل بـ500 على قاعدة نظيفة.
-- ═══════════════════════════════════════════════════════════════════
alter table public.matches
  add column if not exists difficulty text
    check (difficulty in ('easy', 'normal', 'hard'));
update public.matches set difficulty = 'easy' where difficulty is null;
alter table public.matches alter column difficulty set default 'easy';
alter table public.matches alter column difficulty set not null;

-- ═══════════════════════════════════════════════════════════════════
-- 1) صيغة المستوى
--    الانتقال من المستوى N إلى N+1 يكلّف 3N انتصاراً:
--    المستوى 2 عند 3، و3 عند 9، و5 عند 30، و10 عند 135.
-- ═══════════════════════════════════════════════════════════════════
-- `create or replace` لا يصلح هنا: عمود profiles.level مولَّد ويعتمد على هذه
-- الدالة، وPostgres يرفض استبدال دالة يعتمد عليها عمود مولَّد. الحارس يجعل
-- إعادة تشغيل الهجرة كلّها آمنة بدل أن تتعثّر عند هذا السطر.
do $$ begin
  if not exists (
    select 1 from pg_proc p
     where p.proname = 'level_from_wins'
       and p.pronamespace = 'public'::regnamespace
  ) then
    create function public.level_from_wins(p_wins integer)
    returns integer language sql immutable strict set search_path = '' as $fn$
      select greatest(1, floor((1 + sqrt(1 + (8.0 * greatest(p_wins, 0)) / 3.0)) / 2.0))::integer;
    $fn$;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════
-- 2) الملفات الشخصية
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  username       text        not null,
  display_name   text        not null,
  wins           integer     not null default 0 check (wins >= 0),
  losses         integer     not null default 0 check (losses >= 0),
  matches_played integer     not null default 0 check (matches_played >= 0),
  titan_summons  integer     not null default 0 check (titan_summons >= 0),
  traps_set      integer     not null default 0 check (traps_set >= 0),
  -- عمود مولَّد: المستوى دالة في الانتصارات، والانتصارات لا تُكتب إلا عبر
  -- record_match — فالانحراف مستحيل بنيوياً.
  -- تنبيه: تغيير level_from_wins لاحقاً لا يعيد بناء القيم المخزَّنة؛
  -- يلزم إسقاط العمود وإعادة إنشائه.
  level          integer     not null generated always as (public.level_from_wins(wins)) stored,
  created_at     timestamptz not null default now(),   -- تاريخ التسجيل
  last_seen_at   timestamptz not null default now(),
  constraint profiles_username_len check (char_length(username) between 3 and 20),
  constraint profiles_display_len  check (char_length(display_name) between 2 and 20)
);
create unique index if not exists profiles_username_key on public.profiles (lower(username));

-- الملف يُنشأ داخل معاملة إنشاء المستخدم نفسها، فتصادم الاسم يُرجع
-- مستخدم المصادقة أيضاً ولا يبقى صفّ يتيم.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_username text := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));
  v_display  text := trim(coalesce(new.raw_user_meta_data->>'display_name', ''));
begin
  if char_length(v_username) < 3 then
    raise exception 'username_invalid' using errcode = '22023';
  end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, v_username,
          case when char_length(v_display) >= 2 then left(v_display, 20) else v_username end);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════
-- 3) الصداقات — صفّ واحد بالاتجاه لا صفّان متقابلان
--    «معلّق» اتجاهيّ بطبعه، والفهرس الفريد على الزوج يجعل حالة
--    «طلب كلٌّ منهما الآخر» مستحيلة بنيوياً.
-- ═══════════════════════════════════════════════════════════════════
do $$ begin
  create type public.friend_status as enum ('pending', 'accepted', 'blocked');
exception when duplicate_object then null; end $$;

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       public.friend_status not null default 'pending',
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  user_lo uuid generated always as (least(requester_id, addressee_id))    stored,
  user_hi uuid generated always as (greatest(requester_id, addressee_id)) stored,
  constraint friendships_no_self check (requester_id <> addressee_id)
);
create unique index if not exists friendships_pair_key   on public.friendships (user_lo, user_hi);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);

-- ═══════════════════════════════════════════════════════════════════
-- 4) الرسائل المباشرة — 200 حرفاً كحدّ دردشة المباراة (CHAT_MAX_LEN)
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.direct_messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 200),
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  pair_lo uuid generated always as (least(sender_id, recipient_id))    stored,
  pair_hi uuid generated always as (greatest(sender_id, recipient_id)) stored,
  constraint dm_no_self check (sender_id <> recipient_id)
);
create index if not exists dm_pair_idx   on public.direct_messages (pair_lo, pair_hi, created_at desc);
create index if not exists dm_unread_idx on public.direct_messages (recipient_id) where read_at is null;

-- ═══════════════════════════════════════════════════════════════════
-- 5) دعوات اللعب — نقطة التقاء عابرة لرمز الغرفة، فالغرف بلا تخزين
--    بلا فهرس فريد: المضيف يرسل عدّة دعوات معلّقة لنفس الغرفة،
--    واحدة لكل صديق، وهذا ما يملأ مقاعد 1×1×1.
-- ═══════════════════════════════════════════════════════════════════
do $$ begin
  create type public.invite_status as enum ('pending', 'accepted', 'declined', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.game_invites (
  id           uuid not null primary key default gen_random_uuid(),
  from_user    uuid not null references public.profiles(id) on delete cascade,
  to_user      uuid not null references public.profiles(id) on delete cascade,
  -- أبجدية lib/multiplayer/code.ts — بلا I ولا O ولا 0 ولا 1
  room_code    text not null check (room_code ~ '^[A-HJ-NP-Z2-9]{5}$'),
  player_count smallint not null default 2  check (player_count in (2, 3)),
  turn_seconds smallint not null default 60 check (turn_seconds between 15 and 600),
  -- لنصّ الإشعار: «انضمّ — مقعد شاغر من 3»
  seats_taken  smallint not null default 1  check (seats_taken between 1 and 3),
  status       public.invite_status not null default 'pending',
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '3 minutes',
  constraint invite_no_self check (from_user <> to_user)
);
create index if not exists invites_to_idx   on public.game_invites (to_user, status, created_at desc);
create index if not exists invites_from_idx on public.game_invites (from_user, status);

-- ═══════════════════════════════════════════════════════════════════
-- 6) سجلّ المباريات — صفّ لكل مشارك، يجمعها match_id مشترك
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.match_records (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid     not null,
  user_id      uuid     not null references public.profiles(id) on delete cascade,
  mode         text     not null check (mode in ('ai', 'online')),
  seat         smallint not null check (seat between 0 and 2),
  player_count smallint not null default 2 check (player_count in (2, 3)),
  result       text     not null check (result in ('win', 'loss')),
  turns        integer  not null check (turns between 0 and 500),
  hp_left      integer  not null default 0 check (hp_left between 0 and 999),
  reason       text     check (char_length(reason) <= 60),
  difficulty   text     check (difficulty in ('easy', 'normal', 'hard')),
  room_code    text     check (room_code is null or room_code ~ '^[A-HJ-NP-Z2-9]{5}$'),
  seed         bigint   not null,
  opponents    text[]   not null default '{}',
  created_at   timestamptz not null default now()
);
create unique index if not exists match_records_once     on public.match_records (match_id, user_id);
create index if not exists match_records_user_idx on public.match_records (user_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════
-- 7) إحصاء الكروت والعناصر — عدّ تراكمي لا مسح تاريخي
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.profile_card_stats (
  user_id     uuid    not null references public.profiles(id) on delete cascade,
  card_def_id text    not null check (char_length(card_def_id) between 1 and 60),
  element     text    not null check (element in
                ('fire', 'water', 'grass', 'electric', 'psychic', 'dark', 'wild')),
  plays       integer not null default 0 check (plays >= 0),
  primary key (user_id, card_def_id)
);
create index if not exists card_stats_top_idx     on public.profile_card_stats (user_id, plays desc);
create index if not exists card_stats_element_idx on public.profile_card_stats (user_id, element);

-- ═══════════════════════════════════════════════════════════════════
-- 8) المسار الوحيد لكتابة النتيجة والإحصاءات
--
--    لماذا دالة لا رؤية ولا مُشغّل: الرؤية تجعل «أكثر الكروت» و«المستوى»
--    مسحاً تجميعياً في كل عرض، وأعداد الكروت ليست في match_records أصلاً؛
--    والمُشغّل يصلح لنسبة الفوز وحدها بينما حصيلة الكروت تصل في حمولة
--    أخرى، فيشطر عملية ذرّية إلى اثنتين.
--
--    الهوية من auth.uid() لا من معامل: المعامل قابل للتزوير.
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.record_match(
  p_match_id uuid, p_mode text, p_seat smallint, p_player_count smallint,
  p_result text, p_turns integer, p_hp_left integer, p_reason text,
  p_difficulty text, p_room_code text, p_seed bigint, p_opponents text[],
  p_cards jsonb,        -- {"mon_fire_lahibo_1": {"element":"fire","plays":2}, ...}
  p_titans integer, p_traps integer
) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := auth.uid();
  v_rows integer;
  v_row  public.profiles;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  insert into public.match_records (match_id, user_id, mode, seat, player_count, result,
                                    turns, hp_left, reason, difficulty, room_code, seed, opponents)
  values (p_match_id, v_uid, p_mode, p_seat, p_player_count, p_result,
          p_turns, p_hp_left, left(p_reason, 60), p_difficulty, p_room_code, p_seed,
          coalesce(p_opponents, '{}'))
  on conflict (match_id, user_id) do nothing;
  get diagnostics v_rows = row_count;

  -- تقرير مكرّر (إعادة إرسال) — لا تُحتسب مرّتين
  if v_rows = 0 then
    select * into v_row from public.profiles where id = v_uid;
    return v_row;
  end if;

  insert into public.profile_card_stats (user_id, card_def_id, element, plays)
  select v_uid, e.key, coalesce(e.value->>'element', 'wild'),
         least(greatest(coalesce((e.value->>'plays')::int, 0), 0), 60)
  from jsonb_each(coalesce(p_cards, '{}'::jsonb)) e
  where coalesce((e.value->>'plays')::int, 0) > 0
  on conflict (user_id, card_def_id)
  do update set plays = public.profile_card_stats.plays + excluded.plays;

  update public.profiles
     set wins           = wins   + (case when p_result = 'win'  then 1 else 0 end),
         losses         = losses + (case when p_result = 'loss' then 1 else 0 end),
         matches_played = matches_played + 1,
         titan_summons  = titan_summons + least(greatest(coalesce(p_titans, 0), 0), 3),
         traps_set      = traps_set     + least(greatest(coalesce(p_traps, 0), 0), 60),
         last_seen_at   = now()
   where id = v_uid
   returning * into v_row;

  return v_row;
end;
$$;

-- شبكة أمان: رؤية تكشف أي انحراف بين العدّادات والسجلّ، ودالة تُصلحه
create or replace view public.profile_stats_check with (security_invoker = on) as
  select user_id,
         count(*) filter (where result = 'win')  as wins,
         count(*) filter (where result = 'loss') as losses,
         count(*)                                as matches
  from public.match_records group by user_id;

create or replace function public.rebuild_profile_counters(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  update public.profiles p
     set wins = c.wins, losses = c.losses, matches_played = c.matches
    from public.profile_stats_check c
   where p.id = p_user and c.user_id = p_user;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 9) دوال القراءة
-- ═══════════════════════════════════════════════════════════════════

-- البحث بالاسم الكامل فقط: لا بادئة ولا سرد، فلا دليل مستخدمين يُحصد
create or replace function public.find_profile_by_username(p_username text)
returns table (id uuid, username text, display_name text, level integer)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name, p.level
  from public.profiles p
  where auth.uid() is not null
    and lower(p.username) = lower(trim(p_username))
    and p.id <> auth.uid()
  limit 1;
$$;

create or replace function public.top_cards(p_user uuid, p_limit integer default 5)
returns table (card_def_id text, element text, plays integer)
language sql stable security invoker set search_path = '' as $$
  select c.card_def_id, c.element, c.plays
  from public.profile_card_stats c
  where c.user_id = p_user
  order by c.plays desc, c.card_def_id
  limit least(greatest(p_limit, 1), 20);
$$;

create or replace function public.top_elements(p_user uuid)
returns table (element text, plays bigint)
language sql stable security invoker set search_path = '' as $$
  select c.element, sum(c.plays)::bigint
  from public.profile_card_stats c
  where c.user_id = p_user
  group by c.element
  order by 2 desc;
$$;

create or replace function public.mark_conversation_read(p_peer uuid)
returns integer language sql security invoker set search_path = '' as $$
  with upd as (
    update public.direct_messages
       set read_at = now()
     where recipient_id = auth.uid() and sender_id = p_peer and read_at is null
    returning 1)
  select count(*)::integer from upd;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 10) أمان الصفوف
-- ═══════════════════════════════════════════════════════════════════
alter table public.profiles           enable row level security;
alter table public.friendships        enable row level security;
alter table public.direct_messages    enable row level security;
alter table public.game_invites       enable row level security;
alter table public.match_records      enable row level security;
alter table public.profile_card_stats enable row level security;

-- المفتاح المجهول مكشوف في المتصفّح: لا شيء هنا يُقرأ بلا حساب.
-- (جدول matches القديم يبقى عاماً كما هو — سجلّ مجهول الهوية عن قصد.)
revoke all on public.profiles, public.friendships, public.direct_messages,
              public.game_invites, public.match_records, public.profile_card_stats
       from anon;

-- ── profiles ───────────────────────────────────────────────────────
-- سياسات profiles تشير إلى friendships، وسياسات friendships تشير إلى
-- auth.uid() فقط — فلا تكرار متبادل. لا تُضِف ضمّاً إلى profiles هناك.
drop policy if exists profiles_select_self    on public.profiles;
drop policy if exists profiles_select_related on public.profiles;
drop policy if exists profiles_update_self    on public.profiles;

create policy profiles_select_self on public.profiles for select to authenticated
  using (id = auth.uid());

create policy profiles_select_related on public.profiles for select to authenticated
  using (exists (
    select 1 from public.friendships f
     where f.status <> 'blocked'
       and f.user_lo = least(auth.uid(), public.profiles.id)
       and f.user_hi = greatest(auth.uid(), public.profiles.id)));

create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- السياسة وحدها تتيح `set wins = 9999`؛ صلاحية العمود هي المانع الفعلي.
revoke update on public.profiles from authenticated;
grant  update (display_name) on public.profiles to authenticated;
grant  select on public.profiles to authenticated;

-- ── friendships ────────────────────────────────────────────────────
drop policy if exists friendships_select_mine       on public.friendships;
drop policy if exists friendships_insert_mine       on public.friendships;
drop policy if exists friendships_update_addressee  on public.friendships;
drop policy if exists friendships_delete_mine       on public.friendships;

create policy friendships_select_mine on public.friendships for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));

create policy friendships_insert_mine on public.friendships for insert to authenticated
  with check (requester_id = auth.uid() and addressee_id <> auth.uid() and status = 'pending');

-- المُرسَل إليه وحده يقبل، ومرّة واحدة
create policy friendships_update_addressee on public.friendships for update to authenticated
  using      (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status in ('accepted', 'blocked'));

-- الرفض والحذف والإلغاء كلّها محو الصفّ — فلا حالة declined تُكنَس
create policy friendships_delete_mine on public.friendships for delete to authenticated
  using (auth.uid() in (requester_id, addressee_id));

revoke update on public.friendships from authenticated;
grant  update (status, responded_at) on public.friendships to authenticated;
grant  select, insert, delete on public.friendships to authenticated;

-- ── direct_messages ────────────────────────────────────────────────
drop policy if exists dm_select_mine      on public.direct_messages;
drop policy if exists dm_insert_to_friend on public.direct_messages;
drop policy if exists dm_update_read      on public.direct_messages;
drop policy if exists dm_delete_own       on public.direct_messages;

create policy dm_select_mine on public.direct_messages for select to authenticated
  using (auth.uid() in (sender_id, recipient_id));

create policy dm_insert_to_friend on public.direct_messages for insert to authenticated
  with check (
    sender_id = auth.uid() and recipient_id <> auth.uid()
    and exists (select 1 from public.friendships f
                 where f.status = 'accepted'
                   and f.user_lo = least(auth.uid(), recipient_id)
                   and f.user_hi = greatest(auth.uid(), recipient_id)));

create policy dm_update_read on public.direct_messages for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy dm_delete_own on public.direct_messages for delete to authenticated
  using (sender_id = auth.uid());

-- نصّ الرسالة المُرسَلة لا يُعاد كتابته — القراءة فقط
revoke update on public.direct_messages from authenticated;
grant  update (read_at) on public.direct_messages to authenticated;
grant  select, insert, delete on public.direct_messages to authenticated;

-- ── game_invites ───────────────────────────────────────────────────
drop policy if exists invites_select_mine      on public.game_invites;
drop policy if exists invites_insert_to_friend on public.game_invites;
drop policy if exists invites_update_party     on public.game_invites;
drop policy if exists invites_delete_party     on public.game_invites;

create policy invites_select_mine on public.game_invites for select to authenticated
  using (auth.uid() in (from_user, to_user));

create policy invites_insert_to_friend on public.game_invites for insert to authenticated
  with check (from_user = auth.uid() and to_user <> auth.uid()
    and exists (select 1 from public.friendships f
                 where f.status = 'accepted'
                   and f.user_lo = least(auth.uid(), to_user)
                   and f.user_hi = greatest(auth.uid(), to_user)));

create policy invites_update_party on public.game_invites for update to authenticated
  using (auth.uid() in (from_user, to_user)) with check (auth.uid() in (from_user, to_user));

create policy invites_delete_party on public.game_invites for delete to authenticated
  using (auth.uid() in (from_user, to_user));

revoke update on public.game_invites from authenticated;
grant  update (status) on public.game_invites to authenticated;
grant  select, insert, delete on public.game_invites to authenticated;

-- ── match_records / profile_card_stats — قراءة فقط للعميل ──────────
drop policy if exists match_records_select_own    on public.match_records;
drop policy if exists match_records_select_friend on public.match_records;
drop policy if exists card_stats_select_own       on public.profile_card_stats;
drop policy if exists card_stats_select_friend    on public.profile_card_stats;

create policy match_records_select_own on public.match_records for select to authenticated
  using (user_id = auth.uid());
create policy match_records_select_friend on public.match_records for select to authenticated
  using (exists (select 1 from public.friendships f
                  where f.status = 'accepted'
                    and f.user_lo = least(auth.uid(), user_id)
                    and f.user_hi = greatest(auth.uid(), user_id)));

create policy card_stats_select_own on public.profile_card_stats for select to authenticated
  using (user_id = auth.uid());
create policy card_stats_select_friend on public.profile_card_stats for select to authenticated
  using (exists (select 1 from public.friendships f
                  where f.status = 'accepted'
                    and f.user_lo = least(auth.uid(), user_id)
                    and f.user_hi = greatest(auth.uid(), user_id)));

-- المسار الوحيد للكتابة هو record_match
revoke insert, update, delete on public.match_records, public.profile_card_stats
       from authenticated, anon;
grant  select on public.match_records, public.profile_card_stats to authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 11) صلاحيات الدوال — المنع بعد المنح وإلا نادى المفتاح المجهول
-- ═══════════════════════════════════════════════════════════════════
grant execute on function
  public.find_profile_by_username(text),
  public.top_cards(uuid, integer),
  public.top_elements(uuid),
  public.mark_conversation_read(uuid),
  public.level_from_wins(integer),
  public.record_match(uuid, text, smallint, smallint, text, integer, integer, text,
                      text, text, bigint, text[], jsonb, integer, integer)
  to authenticated;

revoke execute on function public.rebuild_profile_counters(uuid)
  from public, anon, authenticated;

-- `handle_new_user` تُترك بصلاحيتها الافتراضية عن قصد: نوعها `trigger` فلا
-- تُنادى مباشرةً لا من SQL ولا من PostgREST، فالمنع لا يشتري شيئاً — بينما
-- سحبه من PUBLIC قد يمنع الدور الذي يُدرج في auth.users من إطلاق المُشغّل،
-- فيتعطّل إنشاء الحسابات كلّه.
revoke execute on function
  public.find_profile_by_username(text),
  public.top_cards(uuid, integer),
  public.top_elements(uuid),
  public.mark_conversation_read(uuid),
  public.record_match(uuid, text, smallint, smallint, text, integer, integer, text,
                      text, text, bigint, text[], jsonb, integer, integer)
  from anon;

-- ═══════════════════════════════════════════════════════════════════
-- 12) البثّ الحيّ — postgres_changes يحترم RLS للمستخدم المُصادَق
-- ═══════════════════════════════════════════════════════════════════
do $$ begin
  alter publication supabase_realtime add table public.friendships;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.direct_messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.game_invites;
exception when duplicate_object then null; end $$;
