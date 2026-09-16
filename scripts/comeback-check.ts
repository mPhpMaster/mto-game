/**
 * يثبت أن «حماية الاستدعاء» و«النجدة» تعملان بشرطهما، وتزولان بزواله.
 *
 * الغاية من النظام أن تبقى أفضلية الساحة أفضليةً لا فوزاً محسوماً: من يسبق
 * بستّة وحوش كان يقتل كل وحشٍ جديد ساعةَ نزوله فلا يقوم المتأخّر أبداً.
 * ولذلك يقيس هذا الفحص الشرط والحدّ معاً: تُمنح عند الفارق، ولا تُمنح دونه،
 * ولا تدوم أكثر من دورٍ واحد، ولا تمنع إلا **القتل بضربة وحش**.
 *   npm run check:comeback
 */
import { CATALOG, def } from '../lib/game/cards';
import { applyGameAction, createGame, RULES } from '../lib/game/engine';
import type { GameScript } from '../lib/game/engine';
import type { GameState } from '../lib/game/types';

let failures = 0;
const ok = (name: string, detail: string) => console.log(`  ✓ ${name} — ${detail}`);
const bad = (name: string, detail: string) => {
  failures++;
  console.error(`  ✗ ${name} — ${detail}`);
};
const eq = (name: string, got: unknown, want: unknown, detail = '') =>
  got === want
    ? ok(name, detail || `${String(got)}`)
    : bad(name, `${detail ? detail + ' — ' : ''}توقّعت ${String(want)} فجاء ${String(got)}`);

function game(script: GameScript): GameState {
  return createGame({ seed: 4242, opponentIsAI: false, firstPlayer: 0, difficulty: 'hard', script });
}

const uidInHand = (s: GameState, defId: string) =>
  s.players[0].hand.find((c) => c.defId === defId)!.uid;
const play = (s: GameState, defId: string) =>
  applyGameAction(s, { type: 'PLAY', uid: uidInHand(s, defId) });

/** ساحةُ خصمٍ بعدد وحوشٍ مطلوب — من فصائل مختلفة كي لا يتكرّر تصميمٌ واحد */
const FOE_FIELD = [
  'mon_grass_ghabor_1',
  'mon_water_korali_1',
  'mon_dark_lailks_1',
  'mon_fire_volkani_1',
  'mon_electric_volti_1',
];
const NEW_MONSTER = 'mon_fire_lahibo_1'; // 🔥 نار · 3/5 · كلمته «هياج» فلا تتدخّل
/** ثانٍ من النار لاختبار «النجدة مرّةً واحدة» — فصيلةٌ أخرى لأن النسخ محدودة */
const SECOND_MONSTER = 'mon_fire_smoki_1';
/*
  التدفق كارتٌ ثالث لا أحد الاثنين: كل تصميم في السطح نسختان، وطلبُ النسخة
  الثالثة يرفضه الموزّع — وهو رفضٌ في محلّه، فالجرد لا يُخلق من العدم.
*/
const FLOW_CARD = 'mon_fire_jamra_1';
const board = (foeCount: number) =>
  game({
    flow: FLOW_CARD,
    fields: [[], FOE_FIELD.slice(0, foeCount)],
    hands: [[NEW_MONSTER, SECOND_MONSTER], []],
    energyCap: [9, 9],
  });

console.log('حماية الاستدعاء والنجدة:\n');

// ---------- بلا فارق: لا حماية ----------
{
  const s = play(board(1), NEW_MONSTER);
  const m = s.players[0].field[0];
  eq('فارق 1: بلا حماية', Boolean(m.protectedNew), false);
  eq('فارق 1: يبقى «جديد»', m.sick, true);
}

// ---------- فارق 2: حماية بلا نجدة ----------
{
  const s = play(board(RULES.PROTECT_DEFICIT), NEW_MONSTER);
  const m = s.players[0].field[0];
  eq(`فارق ${RULES.PROTECT_DEFICIT}: محميّ`, Boolean(m.protectedNew), true);
  eq(`فارق ${RULES.PROTECT_DEFICIT}: بلا نجدة`, m.sick, true, 'الحماية وحدها لا تُجهّزه للهجوم');
}

// ---------- الحماية تمنع القتل لا الضرر ----------
{
  const s = play(board(RULES.PROTECT_DEFICIT), NEW_MONSTER);
  const mine = s.players[0].field[0];
  // «غابور» بهجوم 5 ضدّ وحشٍ بصحة 5: يقتله لولا الحماية
  const struck = applyGameAction(applyGameAction(s, { type: 'END_TURN' }), {
    type: 'ATTACK',
    attackers: [s.players[1].field[0].uid],
    target: mine.uid,
  });
  const after = struck.players[0].field.find((x) => x.uid === mine.uid);
  eq('ضربةُ وحشٍ قاتلة: صمد', Boolean(after), true);
  eq('صمد على نقطة واحدة', after?.hp, 1, 'الحماية تمنع القتل لا الجرح');
}

// ---------- السحر يقتله رغم الحماية ----------
{
  const storm = CATALOG.find((c) => c.kind === 'spell' && c.spell === 'storm');
  if (!storm) {
    bad('السحر يخترق الحماية', 'لا سحر «عاصفة» في الكتالوج');
  } else {
    /*
      الوحش المُستدعى يصير هو التدفق، فيجب أن يشارك السحرَ عنصرَه أو رقمه
      وإلا لم يستطع الخصم لعبه أصلاً — و«حِمَمو» رقمه 4 كرقم «العاصفة»،
      فتُلعَب بالرقم وإن اختلف العنصر. (أوّل صياغةٍ للفحص تركت التدفق على
      «نار 2» فرُفضت العاصفة بـ`no_match`، ونجا المحميّ لأن شيئاً لم يقع.)
    */
    const SPELL_BAIT = 'mon_fire_volkani_1';
    let s = game({
      flow: FLOW_CARD,
      fields: [[], FOE_FIELD.slice(0, RULES.PROTECT_DEFICIT)],
      hands: [[SPELL_BAIT], [storm.id]],
      energyCap: [9, 9],
    });
    s = play(s, SPELL_BAIT);
    const mine = s.players[0].field[0];
    mine.hp = 2; // أقلّ من ضرر العاصفة
    eq('محميّ قبل السحر', Boolean(mine.protectedNew), true);
    s = applyGameAction(s, { type: 'END_TURN' });
    // الخصم يلعب العاصفة في دوره: الحماية ما زالت قائمة
    const foeUid = s.players[1].hand.find((c) => c.defId === storm.id)!.uid;
    const after = applyGameAction(s, { type: 'PLAY', uid: foeUid });
    eq('السحر يقتل المحميّ', after.players[0].field.length, 0, 'الحماية من ضربات الوحوش وحدها');
  }
}

// ---------- فارق 4: حماية ونجدة لوحشٍ واحد ----------
{
  let s = board(RULES.REINFORCE_DEFICIT);
  s = play(s, NEW_MONSTER);
  const first = s.players[0].field[0];
  eq(`فارق ${RULES.REINFORCE_DEFICIT}: محميّ`, Boolean(first.protectedNew), true);
  eq(`فارق ${RULES.REINFORCE_DEFICIT}: جاهزٌ فوراً`, first.sick, false);

  // الثاني في الدور نفسه: النجدة مرّةً واحدة
  s = play(s, SECOND_MONSTER);
  const second = s.players[0].field[1];
  eq('النجدة لوحشٍ واحد في الدور', second.sick, true);
  eq('والثاني محميّ أيضاً', Boolean(second.protectedNew), true, 'الحماية ليست مرّةً واحدة');
}

// ---------- الحماية تزول ببداية دورك ----------
{
  const s = play(board(RULES.PROTECT_DEFICIT), NEW_MONSTER);
  const uid = s.players[0].field[0].uid;
  const back = applyGameAction(applyGameAction(s, { type: 'END_TURN' }), { type: 'END_TURN' });
  const m = back.players[0].field.find((x) => x.uid === uid);
  eq('تزول ببداية دورك', Boolean(m?.protectedNew), false, 'غطّت دور الخصم ثم انقضت');
  eq('وصار جاهزاً للهجوم', m?.sick, false);
}

// ---------- الفارق يُقاس قبل نزوله ----------
{
  // خصمٌ بوحشين ولي وحشٌ واحد: الفارق 1 فلا حماية
  const s = play(
    game({
      flow: FLOW_CARD,
      fields: [[FOE_FIELD[1]], FOE_FIELD.slice(0, 2)],
      hands: [[NEW_MONSTER], []],
      energyCap: [9, 9],
    }),
    NEW_MONSTER
  );
  const fresh = s.players[0].field.find((m) => def(m.defId).id === NEW_MONSTER);
  eq('الفارق يُقاس على ما في الساحة قبله', Boolean(fresh?.protectedNew), false, 'فارق 1');
}

console.log(
  failures === 0
    ? '\n✓ الحماية والنجدة تُمنحان بشرطهما وتزولان بزواله.'
    : `\n✗ ${failures} فحصاً فشل.`
);
process.exit(failures > 0 ? 1 : 0);
