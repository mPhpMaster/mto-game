/**
 * يثبت أن التجهيزات والطقس وقدرات الطُّرُز **تغيّر نتيجة القتال فعلاً**.
 *
 * لماذا يستحقّ فحصاً: هذه الطبقة تُعرض في شاشة التحضير قبل أن تُحلّ في
 * المحرّك، فبطلانُ أثرها لا يظهر في الواجهة إطلاقاً — الكرت يُنفق والطاقة
 * تنقص والأيقونة تظهر على الوحش، والضربة تقع كما لو لم يكن شيء. كل حالة
 * هنا تقيس رقماً قبل وبعد، فلا يمرّ أثرٌ صامت.
 *   npm run check:loadout
 */
import { applyGameAction, canActivateWeather, canEquip, createGame } from '../lib/game/engine';
import { GEAR, WEATHER } from '../lib/game/loadout';
import type { GearId, WeatherId } from '../lib/game/loadout';
import type { FieldMonster, GameState } from '../lib/game/types';

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const bad = (m: string) => {
  failures++;
  console.error(`  ✗ ${m}`);
};
const eq = (label: string, got: unknown, want: unknown) =>
  got === want ? ok(`${label} = ${String(got)}`) : bad(`${label}: توقّعت ${String(want)} فجاء ${String(got)}`);

/** مباراة مُعدّة: ساحتان ثابتتان، والبادئ اللاعب 0، وبلا قرعة */
function board(mine: string[], theirs: string[], seed = 7): GameState {
  return createGame({
    seed,
    firstPlayer: 0,
    script: { fields: [mine, theirs] },
  });
}

const mine = (s: GameState, i = 0) => s.players[0].field[i];
const theirs = (s: GameState, i = 0) => s.players[1].field[i];
const strike = (s: GameState, attacker: FieldMonster, target: FieldMonster | 'face') =>
  applyGameAction(s, {
    type: 'ATTACK',
    attackers: [attacker.uid],
    target: target === 'face' ? 'face' : target.uid,
  });

console.log('التجهيزات والطقس وقدرات الطُّرُز:\n');

// ---------- درع الصخر ----------
{
  // ناريكس آليّ (هجوم 4) ضدّ سموكي أفعى (صحة 3): يسقط بلا درع، ويصمد بدرع.
  const bare = board(['mon_fire_nariks_1'], ['mon_fire_smoki_1']);
  const after = strike(bare, mine(bare), theirs(bare));
  eq('بلا درع: الهدف سقط', after.players[1].field.length, 0);

  const armed = board(['mon_fire_nariks_1'], ['mon_fire_smoki_1']);
  theirs(armed).gear = ['rock_shield'];
  const armedAfter = strike(armed, mine(armed), theirs(armed));
  eq('بدرع الصخر: صحة الهدف الباقية', armedAfter.players[1].field[0]?.hp, 1);
}

// ---------- نصل البرق ----------
{
  const bare = board(['mon_electric_volti_1'], ['mon_fire_smoki_1']);
  const a = strike(bare, mine(bare), theirs(bare));
  eq('فولتي بلا نصل: صحة الهدف', a.players[1].field[0]?.hp, 1);

  const armed = board(['mon_electric_volti_1'], ['mon_fire_smoki_1']);
  mine(armed).gear = ['lightning_blade'];
  const b = strike(armed, mine(armed), theirs(armed));
  eq('بنصل البرق: الهدف سقط', b.players[1].field.length, 0);
  // النصل يخترق: الفائض 5−3=2 يصيب اللاعب مباشرةً
  eq('اختراق النصل: حياة الخصم', b.players[1].hp, b.players[1].maxHp - 2);
}

// ---------- عاصفة رعدية ----------
{
  const s = board(['mon_electric_volti_1'], ['mon_dark_voido_1']);
  s.weather = 'thunderstorm';
  const a = strike(s, mine(s), theirs(s));
  // هجوم 2 × 1.5 = 3 مجبوراً لأسفل
  eq('عاصفة رعدية: ضرر الكهرباء', 7 - (a.players[1].field[0]?.hp ?? 0), 3);

  const off = board(['mon_electric_volti_1'], ['mon_dark_voido_1']);
  const b = strike(off, mine(off), theirs(off));
  eq('بلا عاصفة: الضرر نفسه', 7 - (b.players[1].field[0]?.hp ?? 0), 2);
}

// ---------- أمطار حمضية ----------
{
  const s = board(['mon_dark_voido_1'], ['mon_water_korali_1']);
  s.weather = 'acid_rain';
  const hpBefore = [mine(s).hp, theirs(s).hp];
  // دور كامل: ينتهي دوري فيبدأ دوره، ثم ينتهي دوره فيبدأ دوري
  let after = applyGameAction(s, { type: 'END_TURN' });
  after = applyGameAction(after, { type: 'END_TURN' });
  // «فويدو» نواة فتمتصّ أوّل ضربة بيئية، فينقص مرّةً واحدة لا مرّتين
  eq('مطر حمضي: الآليّ فقد نقطتين', hpBefore[1] - after.players[1].field[0].hp, 2);
  eq('حلقة امتصاص أكلت أوّل قطرة', hpBefore[0] - after.players[0].field[0].hp, 1);
}

// ---------- ضباب كثيف ----------
{
  let miss = 0;
  const N = 300;
  for (let seed = 1; seed <= N; seed++) {
    const s = board(['mon_fire_nariks_1'], ['mon_dark_voido_1'], seed);
    s.weather = 'heavy_fog';
    const a = strike(s, mine(s), theirs(s));
    if (a.players[1].field[0].hp === 7) miss++;
  }
  const rate = miss / N;
  if (rate > 0.12 && rate < 0.3) ok(`ضباب كثيف: نسبة الإخفاق ${(rate * 100).toFixed(1)}% حول 20%`);
  else bad(`ضباب كثيف: نسبة الإخفاق ${(rate * 100).toFixed(1)}% بعيدة عن 20%`);
}

// ---------- تفادٍ هوائي ----------
{
  let dodged = 0;
  const N = 300;
  for (let seed = 1; seed <= N; seed++) {
    const s = board(['mon_fire_nariks_1'], ['mon_water_tsuna_1'], seed);
    const a = strike(s, mine(s), theirs(s));
    if (a.players[1].field[0]?.hp === 5) dodged++;
  }
  const rate = dodged / N;
  if (rate > 0.12 && rate < 0.3) ok(`تفادٍ هوائي: ${(rate * 100).toFixed(1)}% حول 20%`);
  else bad(`تفادٍ هوائي: ${(rate * 100).toFixed(1)}% بعيدة عن 20%`);
}

// ---------- درع حراري ----------
{
  // «كورالي» آليّ يردّ نقطةً إلى مهاجمه، و«فولكاني» نواة فلا قدرةَ هجومٍ تشوّش
  const s = board(['mon_fire_volkani_1'], ['mon_water_korali_1']);
  const a = strike(s, mine(s), theirs(s));
  eq('درع حراري: المهاجم فقد نقطة', 6 - a.players[0].field[0].hp, 1);
}

// ---------- أثر سام ----------
{
  // «غابور» آليّ حارس بصحة 7 — يصمد للجولتين فيُقاس عليه النهش
  const s = board(['mon_grass_fainks_1'], ['mon_grass_ghabor_1']);
  const hit = strike(s, mine(s), theirs(s));
  eq('أثر سام: سُمّ الهدف', hit.players[1].field[0]?.poison, 1);
  const hpAfterHit = hit.players[1].field[0].hp;
  const next = applyGameAction(hit, { type: 'END_TURN' });
  eq('السُم ينهش في دور صاحبه', hpAfterHit - next.players[1].field[0].hp, 1);

  // ومع المطر الحمضي يتضاعف: قطرة + سُمّ مضاعف = 3، ولا يردّها الدرع
  const rainy = board(['mon_grass_fainks_1'], ['mon_grass_ghabor_1']);
  rainy.weather = 'acid_rain';
  const bitten = strike(rainy, mine(rainy), theirs(rainy));
  const hp2 = bitten.players[1].field[0].hp;
  const ticked = applyGameAction(bitten, { type: 'END_TURN' });
  eq('سُم مضاعف + قطرة حمضية', hp2 - ticked.players[1].field[0].hp, 3);

  // والدرع لا يصدّ الحمض: لولا ذلك لصارت تجهيزةٌ واحدة مناعةً من الطقس
  const shielded = board([], ['mon_grass_ghabor_1']);
  shielded.weather = 'acid_rain';
  shielded.players[1].field[0].gear = ['rock_shield'];
  const hp3 = shielded.players[1].field[0].hp;
  const rained = applyGameAction(shielded, { type: 'END_TURN' });
  eq('درع الصخر لا يصدّ المطر الحمضي', hp3 - rained.players[1].field[0].hp, 1);
}

// ---------- عودة الطيف ----------
{
  const s = board(['mon_fire_nariks_1', 'mon_psychic_nirfa_1'], ['mon_fire_jamra_1']);
  const first = strike(s, mine(s), theirs(s));
  eq('عودة الطيف: بقي على الساحة', first.players[1].field.length, 1);
  eq('عاد بنقطة واحدة', first.players[1].field[0].hp, 1);
  const second = strike(first, mine(first, 1), theirs(first));
  eq('السقوط الثاني نهائي', second.players[1].field.length, 0);
}

// ---------- صاعقة خارقة ----------
{
  // «ليلكس» حارس (تخفيض 1) + درع الصخر (2) = 3. الوحش يتجاهل نصفها = 1.
  const plain = board(['mon_fire_volkani_1'], ['mon_dark_lailks_1']); // نواة تهاجم: بلا صاعقة
  theirs(plain).gear = ['rock_shield'];
  const a = strike(plain, mine(plain), theirs(plain));
  eq('بلا صاعقة: الضرر 5−3', 6 - a.players[1].field[0].hp, 2);

  const surge = board(['mon_psychic_nirfa_1'], ['mon_dark_lailks_1']); // وحش: صاعقة خارقة
  theirs(surge).gear = ['rock_shield'];
  const b = strike(surge, mine(surge), theirs(surge));
  eq('بصاعقة خارقة: الضرر 5−2', 6 - b.players[1].field[0].hp, 3);
}

// ---------- تميمة الشفاء ----------
{
  const s = board(['mon_dark_voido_1'], ['mon_fire_nariks_1']);
  mine(s).gear = ['healing_amulet'];
  mine(s).hp = 3;
  const after = applyGameAction(applyGameAction(s, { type: 'END_TURN' }), { type: 'END_TURN' });
  eq('تميمة الشفاء: +1 في بداية دورك', after.players[0].field[0].hp, 4);

  const full = board(['mon_dark_voido_1'], ['mon_fire_nariks_1']);
  mine(full).gear = ['healing_amulet'];
  const capped = applyGameAction(applyGameAction(full, { type: 'END_TURN' }), { type: 'END_TURN' });
  eq('لا تتجاوز التميمةُ السقفَ', capped.players[0].field[0].hp, 7);
}

// ---------- مسار الفعل: التركيب والتفعيل ----------
{
  const s = board(['mon_electric_volti_1', 'mon_fire_smoki_1'], []);
  const p = s.players[0];
  // طاقة الدور الأوّل اثنتان فقط، ونحن نختبر الرفض لا شحّ الطاقة
  p.energy = 20;
  const energy0 = p.energy;
  const stock0 = p.gearStock.lightning_blade;

  eq(
    'النصل يُرفض على غير الكهرباء',
    canEquip(s, 0, 'lightning_blade', mine(s, 1).uid).reason,
    'gear_wrong_element'
  );

  const equipped = applyGameAction(s, {
    type: 'EQUIP',
    gear: 'lightning_blade',
    targetUid: mine(s).uid,
  });
  eq('التركيب أنفق الطاقة', energy0 - equipped.players[0].energy, 3);
  eq('التركيب أنقص المخزون', stock0 - equipped.players[0].gearStock.lightning_blade, 1);
  eq('التجهيز صار على الوحش', equipped.players[0].field[0].gear?.[0], 'lightning_blade');
  eq(
    'لا يُركَّب مرّتين',
    canEquip(equipped, 0, 'lightning_blade', equipped.players[0].field[0].uid).reason,
    'gear_duplicate'
  );

  // نفاد المخزون يُرفض ولو كانت الطاقة وافرة
  const empty = board(['mon_electric_volti_1'], []);
  empty.players[0].gearStock.rock_shield = 0;
  empty.players[0].energy = 99;
  eq('نفاد المخزون يمنع', canEquip(empty, 0, 'rock_shield', mine(empty).uid).reason, 'out_of_stock');
}

{
  const s = board(['mon_dark_voido_1'], []);
  s.players[0].energy = 20;
  const energy0 = s.players[0].energy;
  const after = applyGameAction(s, { type: 'WEATHER', weather: 'heavy_fog' });
  eq('الطقس صار فعّالاً', after.weather, 'heavy_fog');
  eq('التفعيل أنفق الطاقة', energy0 - after.players[0].energy, 1);
  eq('لا يُفعَّل مرّتين', canActivateWeather(after, 0, 'heavy_fog').reason, 'weather_already');

  // واحد فقط يعمل: الجديد يزيح القديم
  const swapped = applyGameAction(after, { type: 'WEATHER', weather: 'thunderstorm' });
  eq('الطقس الجديد يزيح القديم', swapped.weather, 'thunderstorm');
}

// ---------- جوهرة السرعة ----------
{
  const s = board(['mon_dark_voido_1'], []);
  s.players[0].energy = 20;
  mine(s).sick = true;
  const after = applyGameAction(s, {
    type: 'EQUIP',
    gear: 'speed_jewel',
    targetUid: mine(s).uid,
  });
  eq('جوهرة السرعة ترفع حداثة الاستدعاء', after.players[0].field[0].sick, false);
}

// ---------- سلامة البيانات ----------
{
  const s = board([], []);
  const missingGear = GEAR.filter((g) => typeof s.players[0].gearStock[g.id] !== 'number');
  const missingWeather = WEATHER.filter(
    (w) => typeof s.players[0].weatherStock[w.id] !== 'number'
  );
  if (missingGear.length === 0 && missingWeather.length === 0)
    ok('كل لاعب يبدأ برصيدٍ لكل تجهيز وكل طقس');
  else
    bad(
      `رصيد ناقص: ${[...missingGear.map((g) => g.id), ...missingWeather.map((w) => w.id)].join('، ')}`
    );

  // الأثر يجب أن ينجو من الإرسال الشبكي، فالحالة تُنقل JSON
  const round = JSON.parse(JSON.stringify(s)) as GameState;
  const gearIds: GearId[] = GEAR.map((g) => g.id);
  const weatherIds: WeatherId[] = WEATHER.map((w) => w.id);
  const survives =
    gearIds.every((id) => round.players[0].gearStock[id] === s.players[0].gearStock[id]) &&
    weatherIds.every((id) => round.players[0].weatherStock[id] === s.players[0].weatherStock[id]) &&
    round.weather === s.weather;
  if (survives) ok('المخزون والطقس ينجوان من التحويل إلى JSON والعودة');
  else bad('المخزون أو الطقس يضيع في التحويل الشبكي');
}

console.log(
  failures === 0
    ? '\n✓ كل تجهيز وكل طقس وكل قدرة طراز يغيّر نتيجة القتال فعلاً.'
    : `\n✗ ${failures} أثر لا يقع كما هو موصوف.`
);
process.exit(failures > 0 ? 1 : 0);
