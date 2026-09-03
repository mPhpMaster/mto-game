/**
 * يحرس جدول الطُّرُز: كل فصيلة لها شكل مكتوب، والتوزيع متوازن.
 *
 * لماذا يستحقّ فحصاً: `archetypeOf` تعيد `null` للفصيلة المجهولة بدل أن
 * ترمي — وهو الصواب في الواجهة، لكنه يعني أن فصيلة منسيّة تسقط بصمت إلى
 * شكل «فليكس» الافتراضي بدل أن تُكتشف. الفحص هو ما يجعل النسيان مستحيلاً.
 *   npm run check:archetype
 */
import { CATALOG } from '../lib/game/cards';
import { ARCHETYPES, ARCHETYPE_NAME, SPECIES_ARCHETYPE, archetypeOf } from '../lib/game/archetypes';
import type { Archetype } from '../lib/game/archetypes';
import type { PlayableElement } from '../lib/game/types';

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const bad = (m: string) => {
  failures++;
  console.error(`  ✗ ${m}`);
};

console.log('الطُّرُز:\n');

const monsters = CATALOG.filter((c) => c.kind === 'monster');
const species = [...new Set(monsters.map((c) => c.species!))];

// ---------- التغطية: لا فصيلة بلا شكل، ولا شكل بلا فصيلة ----------
{
  const missing = species.filter((s) => archetypeOf(s) === null);
  if (missing.length === 0) ok(`كل الفصائل (${species.length}) لها طراز مكتوب`);
  else bad(`فصائل بلا طراز فتسقط إلى الشكل الافتراضي: ${missing.join('، ')}`);

  const orphan = Object.keys(SPECIES_ARCHETYPE).filter((s) => !species.includes(s));
  if (orphan.length === 0) ok('لا مفتاح في الجدول بلا فصيلة تقابله في الكتالوج');
  else bad(`مفاتيح ميتة في الجدول: ${orphan.join('، ')}`);

  const unknown = Object.values(SPECIES_ARCHETYPE).filter((a) => !ARCHETYPES.includes(a));
  if (unknown.length === 0) ok('كل القيم من الطُّرُز الستّة المعروفة');
  else bad(`طُرُز مجهولة: ${[...new Set(unknown)].join('، ')}`);
}

// ---------- مرحلتا الفصيلة شكل واحد ----------
{
  const byId = new Map<string, Archetype | null>();
  for (const c of monsters) byId.set(c.id, archetypeOf(c.species));
  let split = 0;
  for (const s of species) {
    const shapes = new Set(monsters.filter((c) => c.species === s).map((c) => byId.get(c.id)));
    if (shapes.size !== 1) split++;
  }
  if (split === 0) ok('الأساسي وتطوّره يتشاركان الشكل — التطوّر مقروء بصرياً');
  else bad(`${split} فصيلة يختلف شكل مرحلتيها`);
}

// ---------- التوازن: 5 لكل طراز، و5 لكل عنصر ----------
{
  const perArch = new Map<Archetype, number>(ARCHETYPES.map((a) => [a, 0]));
  const perElement = new Map<PlayableElement, Set<Archetype>>();
  for (const s of species) {
    const a = archetypeOf(s)!;
    perArch.set(a, (perArch.get(a) ?? 0) + 1);
    const el = monsters.find((c) => c.species === s)!.element as PlayableElement;
    if (!perElement.has(el)) perElement.set(el, new Set());
    perElement.get(el)!.add(a);
  }

  const uneven = ARCHETYPES.filter((a) => perArch.get(a) !== 5);
  if (uneven.length === 0) ok('كل طراز يظهر في 5 فصائل بالضبط');
  else
    bad(
      `توزيع غير متوازن: ${uneven
        .map((a) => `${ARCHETYPE_NAME[a].ar}=${perArch.get(a)}`)
        .join('، ')}`
    );

  // خمسة أشكال مختلفة لخمس فصائل = لا عنصر يكرّر شكلاً
  const dup = [...perElement.entries()].filter(([, set]) => set.size !== 5);
  if (dup.length === 0) ok('كل عنصر يملك 5 أشكال مختلفة — لا تكرار داخل العنصر');
  else bad(`عناصر تكرّر شكلاً: ${dup.map(([el, set]) => `${el}=${set.size}`).join('، ')}`);

  // الطراز الغائب يجب أن يختلف بين العناصر، وإلا حُرم طراز من عنصرين
  const absent = [...perElement.entries()].map(
    ([el, set]) => [el, ARCHETYPES.find((a) => !set.has(a))!] as const
  );
  const absentSet = new Set(absent.map(([, a]) => a));
  if (absentSet.size === absent.length) {
    ok(`الطراز الغائب يختلف في كل عنصر (${absent.map(([el, a]) => `${el}:${a}`).join('، ')})`);
  } else {
    bad('طراز واحد غائب عن أكثر من عنصر — التوزيع يفقد اتّزانه');
  }
}

// ---------- الأسماء ----------
{
  const ar = ARCHETYPES.map((a) => ARCHETYPE_NAME[a].ar);
  const en = ARCHETYPES.map((a) => ARCHETYPE_NAME[a].en);
  if (new Set(ar).size === ar.length && new Set(en).size === en.length)
    ok('أسماء الطُّرُز الستّة فريدة في اللغتين');
  else bad('اسم طراز مكرّر');

  // اسم طراز يطابق اسم وحش يخلط المفهومين على اللاعب
  const monsterNames = new Set(monsters.flatMap((c) => [c.name.ar, c.name.en]));
  const clash = ARCHETYPES.filter(
    (a) => monsterNames.has(ARCHETYPE_NAME[a].ar) || monsterNames.has(ARCHETYPE_NAME[a].en)
  );
  if (clash.length === 0) ok('لا اسم طراز يصطدم باسم وحش');
  else bad(`أسماء طُرُز تصطدم بأسماء وحوش: ${clash.join('، ')}`);
}

console.log(
  failures === 0
    ? '\n✓ كل فصيلة لها شكل مكتوب، والتوزيع متوازن على العناصر والطُّرُز.'
    : `\n✗ ${failures} مشكلة في جدول الطُّرُز.`
);
process.exit(failures > 0 ? 1 : 0);
