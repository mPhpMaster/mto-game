'use client';

import { useCallback, useState } from 'react';
import LoadoutScreen from '@/components/game/LoadoutScreen';
import { applyGameAction, createGame } from '@/lib/game/engine';
import type { GameAction, GameState } from '@/lib/game/types';

/**
 * فرقة العرض. اختيرت لتغطّي أربعة طُرُز مختلفة بقدرات متباينة، وفيها
 * وحشا كهرباء كي يجد «نصل البرق» هدفاً صالحاً — وإلا بدا التجهيز معطّلاً
 * بلا سبب ظاهر للاعب.
 */
const SQUAD = [
  'mon_electric_volti_1', // كوبو — درع حراري
  'mon_electric_thandiro_1', // زحّاف — أثر سام
  'mon_grass_shawka_1', // فليكس — صاعقة خارقة
  'mon_water_tsuna_1', // ريشو — تفادٍ هوائي
];

export default function LoadoutDemo() {
  /*
   * الحالة تُنشأ مرّة واحدة داخل `useState`، لا في جسم المكوّن: `createGame`
   * يخلط السطح، فاستدعاؤه في كل عرض يعيد بناء المباراة تحت يد اللاعب.
   * والبذرة ثابتة كي تتطابق شجرة الخادم مع شجرة العميل عند الترطيب.
   */
  const [game, setGame] = useState<GameState>(() =>
    createGame({ seed: 20260909, firstPlayer: 0, script: { fields: [SQUAD, []] } })
  );

  const act = useCallback((action: GameAction) => {
    setGame((s) => applyGameAction(s, action));
  }, []);

  return <LoadoutScreen state={game} seat={0} onAction={act} />;
}
