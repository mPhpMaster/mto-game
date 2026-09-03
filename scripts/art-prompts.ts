/**
 * يكتب `docs/art-prompts.md` — نصّ توليد لكل بطاقة وحش.
 *
 * النصوص **مُشتقّة لا مكتوبة**: الاسم من الكتالوج، والهيئة من جدول الطُّرُز،
 * واللون من لوحة العنصر، والوقفة من الخاصّية. فلو أُعيدت تسمية وحش أو غُيّر
 * طرازه، `npm run art:prompts` يعيد توليد الملف ولا ينحرف عن اللعبة.
 *   npm run art:prompts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG } from '../lib/game/cards';
import { ARCHETYPE_NAME, archetypeOf } from '../lib/game/archetypes';
import type { Archetype } from '../lib/game/archetypes';
import type { Ability, CardDef, PlayableElement } from '../lib/game/types';

/** هيئة الطراز — ملخّص السطر الأول من كل قسم في docs/archetypes.md */
const SHAPE: Record<Archetype, { body: string; stage2: string }> = {
  golem: {
    body:
      'a boxy armoured mechanical construct, polished metal plates with visible bolts and battle scratches, ' +
      'a single round glowing lens for a face, four short mechanical legs',
    stage2: 'heavier plating, a second ring of armour around the core, the lens burning wider and brighter',
  },
  serpent: {
    body:
      'a long sinuous serpent, semi-translucent skin over fine light-catching scales, coiled body raised off the ground, ' +
      'its tail tipped with a knot of raw elemental energy that scorches the floor beneath it',
    stage2: 'far longer, with a second row of luminous scales running the length of its spine',
  },
  orb: {
    body:
      'a floating crystalline core of pulsing plasma, ringed by two thin counter-rotating bands of energy, ' +
      'no limbs and no face, casting volumetric light on everything around it',
    stage2: 'a third rotating ring, and a slower deeper pulse at its centre',
  },
  beast: {
    body:
      'a compact four-legged beast with sharp pointed ears and a lithe athletic build, ' +
      'realistic fur catching the wind, keen predatory eyes locked forward',
    stage2: 'much larger and heavier, with horns or spines and a long thick mane at the neck',
  },
  avian: {
    body:
      'a sleek lightweight winged creature, wings built from layered high-detail feathers shot through with energy, ' +
      'wide focused eyes, gliding low with air displacing under it',
    stage2: 'a far broader wingspan and a long trailing tail that leaves a streak of light',
  },
  wraith: {
    body:
      'a bodiless wraith — a column of half-transparent mist rising off the ground, edges constantly dissolving and re-forming, ' +
      'no legs, a hollow faceless recess with two narrow glowing eyes, light passing straight through it and casting only a faint shadow',
    stage2: 'taller and denser, with threads of mist trailing down to the ground',
  },
};

/** اللون والجوّ لكل عنصر — الطراز واحد والعنصر هو ما يلوّنه */
const ELEMENT_LOOK: Record<PlayableElement, string> = {
  fire: 'molten orange and ember gold, heat shimmer in the air, drifting sparks, scorch marks underfoot',
  water: 'deep ocean blue and pale cyan, wet caustic reflections, drifting bubbles, a slick of water underfoot',
  grass: 'living green and moss gold, drifting pollen and leaf motes, small shoots pushing up underfoot',
  electric: 'electric yellow and white-hot arcs, crawling static, small forked bolts snapping off it',
  psychic: 'violet and orchid light, faint concentric rings in the air, weightless drifting dust',
  dark: 'cold slate grey and deep indigo, light drinking shadow, faint ash on the air',
};

/** الوقفة تُشتقّ من الخاصّية — فالرسم يقول ما يفعله الكارت */
const POSE: Record<Ability, string> = {
  none: 'standing squarely, watchful',
  guard: 'braced low in a defensive stance, absorbing an unseen blow',
  rush: 'caught mid-lunge, already committed to the charge',
  pierce: 'driving one sharpened limb forward like a spear',
  drain: 'siphoning tendrils of light out of the air toward itself',
  charge: 'still, gathering visible energy that has not been released yet',
  scout: 'head raised and alert, scanning something off-frame',
  venom: 'a toxic barb raised and dripping',
  link: 'tethered by a thin band of energy reaching off-frame',
};

const STYLE =
  'high-detail 3D game creature render, cinematic rim lighting, physically based materials, ' +
  'shallow depth of field over a dim ancient-ruins background, full body centred in frame, ' +
  'dark vignette at the edges, square 1:1, no text, no watermark, no card border, no UI';

const EL_AR: Record<PlayableElement, string> = {
  fire: 'نار',
  water: 'ماء',
  grass: 'عشب',
  electric: 'كهرباء',
  psychic: 'نفسي',
  dark: 'ظلام',
};

function promptFor(card: CardDef): string {
  const arch = archetypeOf(card.species)!;
  const shape = SHAPE[arch];
  const stage = card.stage === 2 ? `Evolved form: ${shape.stage2}.` : 'Young form: small and compact, knee-high.';
  return [
    `${shape.body}.`,
    stage,
    `Elemental colouring: ${ELEMENT_LOOK[card.element as PlayableElement]}.`,
    `Pose: ${POSE[card.ability ?? 'none']}.`,
    STYLE,
  ].join(' ');
}

const monsters = CATALOG.filter((c) => c.kind === 'monster' && c.stage)
  // نسختان لكل تصميم في السطح، والرسم للتصميم لا للنسخة
  .filter((c, i, all) => all.findIndex((o) => o.id === c.id) === i);

const byElement = new Map<string, CardDef[]>();
for (const c of monsters) {
  if (!byElement.has(c.element)) byElement.set(c.element, []);
  byElement.get(c.element)!.push(c);
}

const lines: string[] = [
  '# نصوص توليد رسوم الوحوش',
  '',
  '> **مُولَّد** بـ`npm run art:prompts` — لا يُحرَّر يدوياً. النصوص مشتقّة من',
  '> الكتالوج وجدول الطُّرُز ولوحة العناصر، فلا تنحرف عن اللعبة إن تغيّر اسم أو طراز.',
  '',
  `${monsters.length} تصميماً. لكل واحد اسم ملفّ ونصّ.`,
  '',
  '## كيف تُستعمل',
  '',
  '1. ولّد الصورة بأي مولّد صور (النصوص إنجليزية لأن المولّدات أدقّ بها).',
  '2. احفظها باسم الملفّ المذكور **حرفياً** في `public/art/monsters/`.',
  '3. `npm run art:scan` — ومن لا صورة له يبقى على SVG المولّد.',
  '',
  'مربّعة 1:1 لأن نافذة الرسم قد تُقصّ أفقياً أو عمودياً حسب المقاس؛ المربّع',
  'يحتمل القصّتين. والوحش في الوسط كاملاً بهامش، فالقصّ لا يقطع منه طرفاً.',
  '',
  '**اتّساق الخطّ الفنّي أهمّ من جمال الصورة الواحدة.** ثبّت مولّداً واحداً',
  'وإعداداً واحداً للستّين كلّها — ستّون صورة جميلة بأساليب مختلفة تبدو أسوأ من',
  'ستّين صورة متوسّطة بأسلوب واحد.',
  '',
];

for (const [el, cards] of byElement) {
  lines.push('---', '', `## ${EL_AR[el as PlayableElement]} — \`${el}\``, '');
  for (const c of cards) {
    const arch = archetypeOf(c.species)!;
    lines.push(
      `### ${c.name.ar} · ${c.name.en}`,
      '',
      `- **الملفّ:** \`${c.id}.webp\``,
      `- **الطراز:** ${ARCHETYPE_NAME[arch].ar} (${arch}) · **المرحلة:** ${c.stage}` +
        ` · **الخاصّية:** ${c.ability ?? 'none'} · ⚔${c.atk} ❤${c.hp}`,
      '',
      '```',
      promptFor(c),
      '```',
      ''
    );
  }
}

mkdirSync(join(process.cwd(), 'docs'), { recursive: true });
writeFileSync(join(process.cwd(), 'docs', 'art-prompts.md'), lines.join('\n'), 'utf8');
console.log(`✓ docs/art-prompts.md — ${monsters.length} نصّاً`);
