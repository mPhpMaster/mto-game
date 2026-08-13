'use client';

import { useMemo, useState } from 'react';
import { CATALOG, ELEMENTS, ELEMENT_ICON, ELEMENT_NAME } from '@/lib/game/cards';
import type { CardDef, Element } from '@/lib/game/types';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import type { UIKey } from '@/lib/i18n/ui';
import CardDetail from './CardDetail';
import CardView, { ELEMENT_HEX } from './CardView';

const KINDS: { id: CardDef['kind'] | 'all'; label: UIKey }[] = [
  { id: 'all', label: 'filterAll' },
  { id: 'monster', label: 'filterMonsters' },
  { id: 'action', label: 'filterActions' },
  { id: 'trap', label: 'filterTraps' },
  { id: 'spell', label: 'filterSpells' },
  { id: 'fragment', label: 'filterFragments' },
];

export default function CardsExplorer() {
  const { t, L, locale } = useLocale();
  const [kind, setKind] = useState<CardDef['kind'] | 'all'>('all');
  const [element, setElement] = useState<Element | 'all'>('all');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<CardDef | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return CATALOG.filter(
      (c) =>
        (kind === 'all' || c.kind === kind) &&
        (element === 'all' || c.element === element) &&
        // البحث يشمل اللغتين حتى يجد اللاعب الكارت بأي اسم يعرفه
        (needle === '' ||
          c.name[locale].toLowerCase().includes(needle) ||
          c.text[locale].toLowerCase().includes(needle) ||
          c.name.ar.includes(needle) ||
          c.name.en.toLowerCase().includes(needle))
    );
  }, [kind, element, q, locale]);

  const copies = filtered.reduce((n, c) => n + c.copies, 0);

  return (
    <>
      <div className="panel mb-4 flex flex-wrap items-center gap-2 rounded-xl p-3 text-xs">
        {KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => setKind(k.id)}
            className={`rounded-lg px-3 py-1.5 font-bold transition ${
              kind === k.id ? 'bg-emerald-500 text-black' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {t(k.label)}
          </button>
        ))}

        <span className="mx-1 h-5 w-px bg-white/15" />

        <button
          onClick={() => setElement('all')}
          className={`rounded-lg px-3 py-1.5 font-bold transition ${
            element === 'all' ? 'bg-emerald-500 text-black' : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          {t('allElements')}
        </button>
        {[...ELEMENTS, 'wild' as const].map((el) => (
          <button
            key={el}
            onClick={() => setElement(el)}
            className="rounded-lg px-3 py-1.5 font-bold transition hover:scale-105"
            style={{
              background: element === el ? ELEMENT_HEX[el] : `${ELEMENT_HEX[el]}22`,
              color: element === el ? '#000' : ELEMENT_HEX[el],
              border: `1px solid ${ELEMENT_HEX[el]}66`,
            }}
          >
            {ELEMENT_ICON[el]} {L(ELEMENT_NAME[el])}
          </button>
        ))}

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="ms-auto w-48 rounded-lg bg-black/40 px-3 py-1.5 outline-none ring-1 ring-white/15 focus:ring-emerald-400"
        />
      </div>

      <p className="mb-3 text-xs opacity-60">
        {t('designsCount', { designs: filtered.length, copies })}
      </p>

      <div className="flex flex-wrap gap-3">
        {filtered.map((c) => (
          <div key={c.id} className="relative">
            <CardView card={c} onClick={() => setDetail(c)} onLongPress={() => setDetail(c)} />
            <span className="absolute -top-1 -start-1 rounded-full bg-black/80 px-1.5 text-[9px] font-bold ring-1 ring-white/20">
              ×{c.copies}
            </span>
          </div>
        ))}
      </div>

      {detail && <CardDetail card={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
