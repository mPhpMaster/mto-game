/**
 * يثبت قاعدة التطوير: نسختان من الكارت نفسه على ساحتك تصيران وحشه المتطوّر.
 *
 * وأهمّ ما يحرسه هذا الفحص ليس القاعدة بل **الجرد**: الوحش المتطوّر يلبس
 * أرقام الطور الثاني وهو ما زال كارت الطور الأول. فلو خرج من الساحة بهوية
 * الطور الثاني — سقوطاً أو نفياً أو ارتداداً إلى اليد — دخل ديكَ صاحبه
 * كارتٌ لم يكن فيه قطّ، وانحرف تركيب الخمسين عند إعادة الخلط بلا أن يظهر
 * ذلك في أي عدّاد. ولذلك تُفحَص مخارج الساحة واحداً واحداً.
 *   npm run check:evolve
 */
import { CATALOG, def, evolutionOf } from '../lib/game/cards';
import { applyGameAction, canEvolve, createGame, evolvablePairs } from '../lib/game/engine';
import type { GameScript } from '../lib/game/engine';
import type { GameState, Seat } from '../lib/game/types';

let failures = 0;
const ok = (name: string, detail = '') => console.log(`  ✓ ${name}${detail ? ' — ' + detail : ''}`);
const bad = (name: string, detail: string) => {
  failures++;
  console.error(`  ✗ ${name} — ${detail}`);
};
const eq = (name: string, got: unknown, want: unknown, detail = '') =>
  got === want
    ? ok(name, detail || String(got))
    : bad(name, `${detail ? detail + ' — ' : ''}توقّعت ${String(want)} فجاء ${String(got)}`);

function game(script: GameScript): GameState {
  return createGame({ seed: 7171, opponentIsAI: false, firstPlayer: 0, difficulty: 'hard', script });
}

/** كل كروت اللاعب في كل مكان — لحساب الجرد وهويّات الكروت */
function inventory(s: GameState, side: Seat): string[] {
  const p = s.players[side];
  return [
    ...p.deck.map((c) => c.defId),
    ...p.discard.map((c) => c.defId),
    ...p.hand.map((c) => c.defId),
    ...p.traps.map((c) => c.defId),
    // الوحوش على الساحة تُحسب بهويّتها الحقيقية لا بما تلبسه
    ...p.field.map((m) => m.baseDefId ?? m.defId),
    ...s.flowPile.filter((c) => c.owner === side).map((c) => c.defId),
  ];
}

const PAIR = 'mon_fire_lahibo_1'; // نار · 3/5 · طوره الثاني «ضِرغام» 6/9
const OTHER = 'mon_fire_jamra_1';

console.log('التطوير:\n');

// ---------- الطور الثاني موجود لكل وحوش الطور الأول ----------
{
  const tier1 = CATALOG.filter((c) => c.kind === 'monster' && c.stage === 1);
  const missing = tier1.filter((c) => !evolutionOf(c.id));
  eq('لكل وحشٍ أساسيّ طورٌ ثانٍ', missing.length, 0, `${tier1.length} وحشاً أساسياً`);
  const tier2 = CATALOG.filter((c) => c.kind === 'monster' && c.stage === 2);
  const noChain = tier2.filter((c) => evolutionOf(c.id) !== null);
  eq('ولا يتطوّر المتطوّر', noChain.length, 0);
}

// ---------- نسختان من الكارت نفسه تتطوّران ----------
{
  const s0 = game({ fields: [[PAIR, PAIR], []], hands: [[], []], energyCap: [9, 9] });
  const pairs = evolvablePairs(s0, 0);
  eq('الزوج مُتاح', pairs.length, 1);
  const evo = evolutionOf(PAIR)!;

  const s = applyGameAction(s0, { type: 'EVOLVE', uids: pairs[0] });
  eq('صار وحشاً واحداً', s.players[0].field.length, 1);
  const m = s.players[0].field[0];
  eq('ولبس الطور الثاني', m.defId, evo.id);
  eq('بهجوم الطور الثاني', m.atk, evo.atk);
  eq('وصحّته كاملة', m.hp, evo.hp);
  eq('ويحفظ كارته الأصلي', m.baseDefId, PAIR);
  eq('ولا يهاجم في دور تطويره', m.exhausted, true);
}

// ---------- كارتان مختلفان لا يتطوّران ----------
{
  const s = game({ fields: [[PAIR, OTHER], []], hands: [[], []], energyCap: [9, 9] });
  eq('تصميمان مختلفان: لا زوج', evolvablePairs(s, 0).length, 0);
  const uids = s.players[0].field.map((m) => m.uid) as [string, string];
  const chk = canEvolve(s, 0, uids);
  eq('ويُرفض الطلب', chk.ok, false, chk.ok ? '' : chk.reason);
}

// ---------- الجرد لا يتغيّر بالتطوير ----------
{
  const s0 = game({ fields: [[PAIR, PAIR], []], hands: [[], []], energyCap: [9, 9] });
  const before = inventory(s0, 0).slice().sort();
  const s = applyGameAction(s0, { type: 'EVOLVE', uids: evolvablePairs(s0, 0)[0] });
  const after = inventory(s, 0).slice().sort();
  eq('الجرد نفسه قبل وبعد', JSON.stringify(after), JSON.stringify(before), `${before.length} كارتاً`);
  eq(
    'ونسخةٌ واحدة صارت مهملات',
    s.players[0].discard.filter((c) => c.defId === PAIR).length,
    s0.players[0].discard.filter((c) => c.defId === PAIR).length + 1
  );
}

// ---------- يسقط المتطوّر فيعود كارتَ الطور الأول ----------
{
  let s = game({ fields: [[PAIR, PAIR], []], hands: [[], []], energyCap: [9, 9] });
  s = applyGameAction(s, { type: 'EVOLVE', uids: evolvablePairs(s, 0)[0] });
  const evo = evolutionOf(PAIR)!;
  const m = s.players[0].field[0];
  const discardBefore = s.players[0].discard.length;

  // نُسقطه مباشرةً بضبط صحّته ثم ضربةٍ من الخصم
  m.hp = 1;
  s = applyGameAction(s, { type: 'END_TURN' });
  // الخصم بلا وحوش، فنضع له واحداً ونهاجم
  const s2 = applyGameAction(
    (() => {
      const g = JSON.parse(JSON.stringify(s)) as GameState;
      g.players[1].field.push({
        uid: 'striker',
        defId: OTHER,
        atk: def(OTHER).atk!,
        hp: def(OTHER).hp!,
        maxHp: def(OTHER).hp!,
        exhausted: false,
        sick: false,
      });
      return g;
    })(),
    { type: 'ATTACK', attackers: ['striker'], target: m.uid }
  );

  eq('سقط المتطوّر', s2.players[0].field.length, 0);
  const fell = s2.players[0].discard.slice(discardBefore);
  eq('وعاد كارتَ الطور الأول', fell.some((c) => c.defId === PAIR), true);
  eq(
    'ولم يدخل الديك كارتُ الطور الثاني',
    s2.players[0].discard.some((c) => c.defId === evo.id),
    false,
    'وإلا انحرف تركيب الديك عند إعادة الخلط'
  );
}

// ---------- لا تطوير في دور الخصم ----------
{
  let s = game({ fields: [[PAIR, PAIR], []], hands: [[], []], energyCap: [9, 9] });
  const pair = evolvablePairs(s, 0)[0];
  s = applyGameAction(s, { type: 'END_TURN' });
  const chk = canEvolve(s, 0, pair);
  eq('ليس في دورك: يُرفض', chk.ok, false, chk.ok ? '' : chk.reason);
}

console.log(
  failures === 0
    ? '\n✓ التطوير يعمل، والوحش المتطوّر يبقى كارتَه الأصلي حيث يُحسب الجرد.'
    : `\n✗ ${failures} فحصاً فشل.`
);
process.exit(failures > 0 ? 1 : 0);
