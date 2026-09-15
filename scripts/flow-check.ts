/**
 * يحرس قانون التدفق: الكارت يُلعب إذا طابق **العنصرَ أو الرقم**، والمطابقة
 * التامّة (الاثنان معاً) وسمٌ فقط بلا أثر.
 *
 * الأمثلة هي نفسها التي وُصف بها القانون: تدفّق 🔥5، ويدٌ فيها 🔥8 ✅ و💧5 ✅
 * و🌿3 ❌ و🔥5 ⭐ و🌑7 ❌. لو انكسر أيٌّ منها عادت «الأدوار الميتة» التي
 * وُضع القانون لتقليلها.
 *   npm run check:flow
 */
import { CATALOG } from '../lib/game/cards';
import { isPerfectMatch, matchesFlow } from '../lib/game/engine';
import type { CardDef, Element, GameState } from '../lib/game/types';

let failures = 0;
const expect = (label: string, got: boolean, want: boolean) => {
  if (got === want) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label} — المتوقَّع ${want} والناتج ${got}`);
  }
};

const monster = CATALOG.find((c) => c.kind === 'monster' && c.element !== 'wild');
if (!monster) throw new Error('لا وحش في الفهرس');
const card = (element: Element, number: number | null): CardDef => ({ ...monster, element, number });
const flow = { ...({} as GameState['flow']), element: 'fire', number: 5 } as GameState['flow'];

console.log('قانون التدفق — تدفّق 🔥 نار · 5:\n');
expect('🔥8 نفس العنصر ⇐ يُلعب', matchesFlow(card('fire', 8), flow), true);
expect('💧5 نفس الرقم ⇐ يُلعب', matchesFlow(card('water', 5), flow), true);
expect('🌿3 لا عنصر ولا رقم ⇐ لا يُلعب', matchesFlow(card('grass', 3), flow), false);
expect('🌑7 لا عنصر ولا رقم ⇐ لا يُلعب', matchesFlow(card('dark', 7), flow), false);
expect('🔥5 يُلعب', matchesFlow(card('fire', 5), flow), true);

console.log('\nالمطابقة التامّة (وسمٌ بلا مكافأة):\n');
expect('🔥5 مطابقة تامّة', isPerfectMatch(card('fire', 5), flow), true);
expect('🔥8 ليست تامّة', isPerfectMatch(card('fire', 8), flow), false);
expect('💧5 ليست تامّة', isPerfectMatch(card('water', 5), flow), false);
expect('كارتٌ بلا رقم لا يكون تامّاً', isPerfectMatch(card('fire', null), flow), false);
const wild = CATALOG.find((c) => c.element === 'wild');
if (wild) expect('البري يتخطّى المطابقة ولا يُعدّ تامّاً', isPerfectMatch({ ...wild, number: 5 }, flow), false);

console.log(failures === 0 ? '\n✓ القانون كما وُصف.' : `\n✗ ${failures} مخالفة للقانون.`);
process.exit(failures > 0 ? 1 : 0);
