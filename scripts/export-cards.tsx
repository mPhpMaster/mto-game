/**
 * يصدّر صورة كاملة لكل تصميم كارت إلى public/cards/
 *   npm run cards:export            (SVG فقط)
 *   npm run cards:export -- --png   (SVG + PNG عبر sharp إن كان متاحاً)
 *
 * الرسم نفسه يأتي من مكوّن CardArt المستعمل داخل اللعبة، فلا تتفرّع نسختان منه.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import CardArt from '../components/game/CardArt';
import { ABILITY_NAME, CATALOG, ELEMENT_NAME, KIND_NAME } from '../lib/game/cards';
import { LOCALES, type Locale, tx } from '../lib/i18n/locale';
import type { CardDef } from '../lib/game/types';

const OUT = join(process.cwd(), 'public', 'cards');
const WANT_PNG = process.argv.includes('--png');

const W = 420;
const H = 600;

const HEX: Record<string, string> = {
  fire: '#ff6b3d',
  water: '#3da5ff',
  grass: '#46d17f',
  electric: '#ffd23d',
  psychic: '#c471ff',
  dark: '#8b8fa8',
  wild: '#ff5fa2',
};

function numberLabel(d: CardDef): string {
  if (d.number === null) return '★';
  if (d.number === 10) return '⊘';
  if (d.number === 11) return '+2';
  if (d.number === 12) return '⇄';
  return String(d.number);
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** يلفّ النص على أسطر بعدد حروف تقريبي */
function wrap(text: string, perLine: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > perLine) {
      lines.push(line.trim());
      line = w;
      if (lines.length === maxLines) break;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (lines.length < maxLines && line) lines.push(line.trim());
  return lines.slice(0, maxLines);
}

function cardSvg(card: CardDef, locale: Locale): string {
  const color = HEX[card.element];
  const FONT = "'Segoe UI', Tahoma, 'Arial Unicode MS', Arial, sans-serif";

  // رسم الكارت من نفس مكوّن اللعبة، مقصوصاً من غلاف <svg> الخارجي
  const artFull = renderToStaticMarkup(CardArt({ card }) as React.JSX.Element);
  const artInner = artFull.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const evolved = locale === 'ar' ? 'متطوّر' : 'Evolved';
  const perLine = locale === 'ar' ? 34 : 40;
  const bodyLines = wrap(tx(card.text, locale), perLine, card.kind === 'monster' ? 3 : 4);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}" direction="${dir}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.30"/>
      <stop offset="55%" stop-color="#0a0c18" stop-opacity="0.97"/>
      <stop offset="100%" stop-color="#05070f"/>
    </linearGradient>
    <clipPath id="frame"><rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="26"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" rx="30" fill="#05070f"/>
  <g clip-path="url(#frame)">
    <rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="26" fill="url(#bg)"/>

    <!-- الرأس: التكلفة والرقم -->
    <circle cx="66" cy="66" r="30" fill="${color}"/>
    <text x="66" y="66" fill="#05070f" font-size="34" font-weight="900" text-anchor="middle" dominant-baseline="central">${card.cost}</text>
    <rect x="${W - 118}" y="40" width="86" height="52" rx="14" fill="#000" opacity="0.55"/>
    <text x="${W - 75}" y="66" fill="${color}" font-size="32" font-weight="900" text-anchor="middle" dominant-baseline="central">${esc(numberLabel(card))}</text>

    <!-- لوحة الرسم -->
    <rect x="34" y="112" width="${W - 68}" height="238" rx="18" fill="#000" opacity="0.35"/>
    <rect x="34" y="112" width="${W - 68}" height="238" rx="18" fill="none" stroke="${color}" stroke-opacity="0.45" stroke-width="2"/>
    <g transform="translate(34 112) scale(${(W - 68) / 104} ${238 / 88})">${artInner}</g>

    <!-- الاسم -->
    <text x="${W / 2}" y="400" fill="#eef1ff" font-size="34" font-weight="900" text-anchor="middle">${esc(tx(card.name, locale))}</text>
    <text x="${W / 2}" y="430" fill="${color}" font-size="19" text-anchor="middle" opacity="0.9">${esc(
      tx(KIND_NAME[card.kind], locale)
    )} · ${esc(tx(ELEMENT_NAME[card.element], locale))}${card.stage === 2 ? ` · ${evolved}` : ''}</text>
    <line x1="46" y1="448" x2="${W - 46}" y2="448" stroke="${color}" stroke-opacity="0.35" stroke-width="2"/>

    <!-- النص -->
    ${bodyLines
      .map(
        (l, i) =>
          `<text x="${W / 2}" y="${478 + i * 26}" fill="#cfd5ee" font-size="18" text-anchor="middle" opacity="0.88">${esc(l)}</text>`
      )
      .join('\n    ')}

    ${
      card.kind === 'monster'
        ? // الأرقام تُكتب بمحاذاة وسطية واتجاه ltr صريح، وإلا أعاد ترتيبُ
          // النصّ ثنائيّ الاتجاه القيمَ ذات الخانتين خارج حدّ الكارت
          `<rect x="34" y="${H - 88}" width="${W - 68}" height="52" rx="14" fill="#000" opacity="0.45"/>
    <text x="${W - 96}" y="${H - 62}" fill="#ffb37a" font-size="26" font-weight="900" text-anchor="middle" direction="ltr" dominant-baseline="central">⚔ ${card.atk}</text>
    ${
      card.ability && card.ability !== 'none'
        ? `<text x="${W / 2}" y="${H - 62}" fill="${color}" font-size="19" text-anchor="middle" dominant-baseline="central">${esc(
            tx(ABILITY_NAME[card.ability], locale)
          )}</text>`
        : ''
    }
    <text x="96" y="${H - 62}" fill="#8ff0bd" font-size="26" font-weight="900" text-anchor="middle" direction="ltr" dominant-baseline="central">❤ ${card.hp}</text>`
        : ''
    }
  </g>
  <rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="26" fill="none" stroke="${color}" stroke-opacity="0.55" stroke-width="3"/>
</svg>`;
}

mkdirSync(OUT, { recursive: true });

// ملفّ لكل لغة: <id>.svg بالعربية و<id>.en.svg بالإنجليزية
const written: string[] = [];
for (const locale of LOCALES) {
  for (const card of CATALOG) {
    const suffix = locale === 'ar' ? '' : `.${locale}`;
    writeFileSync(join(OUT, `${card.id}${suffix}.svg`), cardSvg(card, locale), 'utf8');
    written.push(`${card.id}${suffix}`);
  }
}

console.log(`✓ صُدِّر ${written.length} ملفاً (${CATALOG.length} تصميماً × ${LOCALES.length} لغة)`);

if (WANT_PNG) {
  const run = async () => {
    let sharp: (typeof import('sharp'))['default'];
    try {
      sharp = (await import('sharp')).default;
    } catch {
      console.error('✗ sharp غير مثبّت — لتصدير PNG:  npm i -D sharp');
      return;
    }
    let ok = 0;
    for (const id of written) {
      try {
        await sharp(join(OUT, `${id}.svg`), { density: 220 })
          .png()
          .toFile(join(OUT, `${id}.png`));
        ok++;
      } catch (e) {
        console.error(`✗ ${id}: ${(e as Error).message}`);
      }
    }
    console.log(`✓ حُوِّل ${ok}/${written.length} إلى PNG`);
  };
  void run();
}
