/**
 * يولّد أيقونات التطبيق (PWA وأندرويد) من شعار SVG واحد.
 *   npm run icons
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const OUT = join(process.cwd(), 'public', 'icons');
mkdirSync(OUT, { recursive: true });

/** الشعار: كارت مائل يحمل عين وحش ونارًا، بألوان اللعبة */
function emblem({ padding }: { padding: number }): string {
  const s = 512;
  const inner = s - padding * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1b1040"/>
      <stop offset="55%" stop-color="#0a0c1c"/>
      <stop offset="100%" stop-color="#06131f"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#ff8a4c"/>
      <stop offset="100%" stop-color="#a02b12"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#ffd08a" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#ffd08a" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${s}" height="${s}" fill="url(#bg)"/>
  <g transform="translate(${padding} ${padding}) scale(${inner / 512})">
    <circle cx="256" cy="248" r="200" fill="url(#glow)"/>

    <!-- كارت خلفي مائل -->
    <rect x="120" y="96" width="230" height="320" rx="34" fill="#2a3766" transform="rotate(-16 256 256)"/>
    <!-- الكارت الأمامي -->
    <rect x="150" y="86" width="240" height="336" rx="36" fill="#0d1024" stroke="#ff8a4c" stroke-width="10" transform="rotate(8 256 256)"/>
    <g transform="rotate(8 256 256)">
      <rect x="168" y="104" width="204" height="300" rx="26" fill="url(#card)" opacity="0.22"/>
      <!-- عين الوحش -->
      <ellipse cx="270" cy="228" rx="86" ry="66" fill="#ff8a4c"/>
      <ellipse cx="270" cy="228" rx="38" ry="62" fill="#0b0e1c"/>
      <ellipse cx="270" cy="212" rx="15" ry="26" fill="#ffd08a"/>
      <!-- أنياب -->
      <path d="M214 300 L232 344 L250 300 Z" fill="#fff" opacity="0.92"/>
      <path d="M290 300 L308 344 L326 300 Z" fill="#fff" opacity="0.92"/>
      <!-- لهب -->
      <path d="M270 128 q34 30 12 56 q-8 10 -22 4 q22 -24 10 -60 Z" fill="#ffd08a" opacity="0.9"/>
    </g>
  </g>
</svg>`;
}

async function main() {
  const standard = Buffer.from(emblem({ padding: 24 }));
  // الأيقونة القابلة للقصّ تحتاج هامشاً آمناً لأن أندرويد يقصّها دائرياً
  const maskable = Buffer.from(emblem({ padding: 92 }));

  const targets: [Buffer, number, string][] = [
    [standard, 192, 'icon-192.png'],
    [standard, 512, 'icon-512.png'],
    [maskable, 192, 'maskable-192.png'],
    [maskable, 512, 'maskable-512.png'],
    [standard, 180, 'apple-touch-icon.png'],
    [standard, 32, 'favicon-32.png'],
  ];

  for (const [buf, size, name] of targets) {
    await sharp(buf, { density: 300 }).resize(size, size).png().toFile(join(OUT, name));
  }
  writeFileSync(join(OUT, 'icon.svg'), emblem({ padding: 24 }), 'utf8');

  console.log(`✓ وُلِّدت ${targets.length} أيقونة في public/icons/`);
}

void main();
