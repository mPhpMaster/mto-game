/**
 * يمسح `public/art/monsters/` ويكتب `lib/game/artManifest.ts`.
 *
 * الاسم يجب أن يطابق هوية بطاقة في الكتالوج، وإلا فالملفّ يُبلَّغ عنه ولا
 * يُدرَج: صورة باسم خاطئ تبقى غير مستعملة إلى الأبد بلا أي إشارة.
 *   npm run art:scan
 */
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CARD_BY_ID } from '../lib/game/cards';

const DIR = join(process.cwd(), 'public', 'art', 'monsters');
const OUT = join(process.cwd(), 'lib', 'game', 'artManifest.ts');
// الترتيب هو الأولوية: أوّل امتداد موجود يفوز
const EXT = ['.webp', '.png', '.jpg', '.jpeg'];

if (!existsSync(DIR)) {
  console.error(`✗ لا مجلّد ${DIR}`);
  process.exit(1);
}

const found = new Map<string, string>();
const stray: string[] = [];

for (const file of readdirSync(DIR).sort()) {
  const ext = EXT.find((e) => file.toLowerCase().endsWith(e));
  if (!ext) continue;
  const id = file.slice(0, -ext.length);
  if (!CARD_BY_ID[id]) {
    stray.push(file);
    continue;
  }
  const prev = found.get(id);
  if (prev) {
    // الأولوية للامتداد الأسبق في EXT
    const prevExt = EXT.find((e) => prev.toLowerCase().endsWith(e))!;
    if (EXT.indexOf(prevExt) <= EXT.indexOf(ext)) continue;
  }
  found.set(id, `/art/monsters/${file}`);
}

const rows = [...found.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, path]) => `  '${id}': '${path}',`)
  .join('\n');

writeFileSync(
  OUT,
  `/**
 * الرسوم المُصوَّرة الموجودة فعلاً — يُولَّد هذا الملف بـ\`npm run art:scan\`.
 *
 * لماذا بيان مُولَّد بدل الاعتماد على وجود الملفّ: العميل لا يستطيع أن يسأل
 * «هل الصورة موجودة؟» قبل الرسم، فبدون بيانٍ مسبق يُرسَم البديل ثم يُستبدل،
 * أو يظهر مربّع مكسور. البيان يُحسم عند البناء فلا يومض شيء.
 *
 * المفتاح هوية البطاقة (\`mon_<element>_<species>_<stage>\`) فلكل مرحلة رسمها.
 * والمسار من \`public/\`، فهو صالح كما هو في \`src\`.
 *
 * أضف ملفّاً إلى \`public/art/monsters/\` وشغّل \`npm run art:scan\` — لا سطر كود.
 */
export const CARD_ART: Record<string, string> = {
${rows || '  // مُولَّد — لا تحرّره يدوياً.'}
};

/** مسار الرسم المُصوَّر لهذه البطاقة، أو \`null\` فيُرسَم SVG المولّد. */
export function artPathOf(cardId: string): string | null {
  return CARD_ART[cardId] ?? null;
}
`,
  'utf8'
);

const monsters = Object.values(CARD_BY_ID).filter((c) => c.kind === 'monster');
console.log(`✓ ${found.size} رسماً مُصوَّراً من ${monsters.length} بطاقة وحش`);
if (stray.length) {
  console.log(`\n⚠ ${stray.length} ملفّاً باسم لا يطابق أي بطاقة، فلن يُستعمل:`);
  for (const f of stray) console.log(`    ${f}`);
  console.log('    الاسم يجب أن يكون هوية البطاقة، مثل mon_fire_lahibo_1.webp');
}
