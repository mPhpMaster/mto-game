-- مواجهة الوحوش — جداول المباريات
create extension if not exists "pgcrypto";

create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  seed          bigint      not null,
  turns         integer     not null check (turns >= 0),
  winner        text        not null check (winner in ('player', 'ai')),
  reason        text,
  player_hp     integer     not null default 0,
  opponent_hp   integer     not null default 0,
  player_name   text        not null default 'أنت',
  created_at    timestamptz not null default now()
);

create index if not exists matches_created_at_idx on public.matches (created_at desc);
create index if not exists matches_winner_idx     on public.matches (winner);

alter table public.matches enable row level security;

-- اللعبة مجهولة الهوية: يُسمح بالقراءة للجميع وبالإضافة فقط (لا تعديل ولا حذف)
drop policy if exists "matches_public_read"   on public.matches;
drop policy if exists "matches_public_insert" on public.matches;

create policy "matches_public_read"
  on public.matches for select
  to anon, authenticated
  using (true);

create policy "matches_public_insert"
  on public.matches for insert
  to anon, authenticated
  with check (turns between 0 and 500);

-- ملخّص السجل
create or replace view public.match_stats
with (security_invoker = on) as
select
  count(*)                                        as total,
  count(*) filter (where winner = 'player')       as player_wins,
  count(*) filter (where winner = 'ai')           as ai_wins,
  round(avg(turns)::numeric, 1)                   as avg_turns
from public.matches;
