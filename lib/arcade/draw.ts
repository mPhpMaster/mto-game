import type { Archetype, Palette } from './theme';

/**
 * رسم كائنات اللعبة على Canvas. كل دالة ترسم حول النقطة (0,0) بحجم يتناسب مع
 * نصف القطر `r`، فيتولّى المُتّصل الإزاحة والدوران. الأشكال الستّة مستوحاة من
 * فنّ الكروت (وحش/أفعى/طائر/كرة/عملاق/طيف) لكن مبسّطة للأداء الحيّ.
 */

type C = CanvasRenderingContext2D;

function eyes(ctx: C, dx: number, y: number, r: number, glow: string) {
  ctx.fillStyle = '#0b0e1c';
  ctx.beginPath();
  ctx.arc(-dx, y, r, 0, Math.PI * 2);
  ctx.arc(dx, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(-dx + r * 0.3, y - r * 0.3, r * 0.4, 0, Math.PI * 2);
  ctx.arc(dx + r * 0.3, y - r * 0.3, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function beast(ctx: C, r: number, p: Palette) {
  ctx.fillStyle = p.deep;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.35, r * 0.95, r * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.main;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.25, r * 0.85, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // الرأس
  ctx.beginPath();
  ctx.arc(r * 0.55, -r * 0.35, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  // القرون
  ctx.fillStyle = p.glow;
  for (const off of [-0.2, 0.35]) {
    ctx.beginPath();
    ctx.moveTo(r * (0.45 + off), -r * 0.7);
    ctx.lineTo(r * (0.5 + off), -r * 1.15);
    ctx.lineTo(r * (0.6 + off), -r * 0.7);
    ctx.closePath();
    ctx.fill();
  }
  eyes(ctx, r * 0.22, -r * 0.4, r * 0.13, p.glow);
}

function serpent(ctx: C, r: number, p: Palette, t: number) {
  const wig = Math.sin(t * 6) * r * 0.15;
  ctx.strokeStyle = p.deep;
  ctx.lineWidth = r * 0.9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.4 + wig);
  ctx.quadraticCurveTo(0, -r * 0.5 - wig, r * 0.7, r * 0.1 + wig);
  ctx.stroke();
  ctx.strokeStyle = p.main;
  ctx.lineWidth = r * 0.55;
  ctx.stroke();
  // الرأس
  ctx.fillStyle = p.main;
  ctx.beginPath();
  ctx.ellipse(r * 0.75, r * 0.1 + wig, r * 0.5, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  eyes(ctx, r * 0.14, r * 0.02 + wig, r * 0.1, p.glow);
}

function avian(ctx: C, r: number, p: Palette, t: number) {
  const flap = Math.sin(t * 12) * r * 0.35;
  ctx.fillStyle = p.main;
  // الجناحان
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.1);
    ctx.quadraticCurveTo(s * r * 1.3, -r * 0.6 - flap, s * r * 1.1, r * 0.5 - flap);
    ctx.quadraticCurveTo(s * r * 0.5, r * 0.1, 0, r * 0.1);
    ctx.closePath();
    ctx.fill();
  }
  // الجسم
  ctx.fillStyle = p.deep;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.15, r * 0.42, r * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  // الرأس
  ctx.fillStyle = p.main;
  ctx.beginPath();
  ctx.arc(0, -r * 0.55, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  // المنقار
  ctx.fillStyle = p.glow;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.35);
  ctx.lineTo(-r * 0.16, -r * 0.05);
  ctx.lineTo(r * 0.16, -r * 0.05);
  ctx.closePath();
  ctx.fill();
  eyes(ctx, r * 0.16, -r * 0.6, r * 0.1, p.glow);
}

function orb(ctx: C, r: number, p: Palette, t: number) {
  ctx.strokeStyle = p.glow;
  ctx.lineWidth = r * 0.08;
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = 0.5 - i * 0.13;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * (1.05 - i * 0.18), r * 0.4, (t * 0.6 + i * 0.9), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = p.deep;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.main;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  // عين مركزية
  ctx.fillStyle = '#0b0e1c';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.22, r * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = p.glow;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.05, r * 0.09, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
}

function golem(ctx: C, r: number, p: Palette) {
  const w = r * 1.5;
  ctx.fillStyle = p.deep;
  // الذراعان
  ctx.fillRect(-w / 2 - r * 0.35, -r * 0.1, r * 0.32, r * 0.9);
  ctx.fillRect(w / 2 + r * 0.03, -r * 0.1, r * 0.32, r * 0.9);
  // الجذع
  ctx.fillStyle = p.main;
  roundRect(ctx, -w / 2, -r * 0.3, w, r * 1.2, r * 0.2);
  ctx.fill();
  // الرأس
  roundRect(ctx, -r * 0.5, -r * 1.05, r, r * 0.8, r * 0.18);
  ctx.fill();
  ctx.fillStyle = '#0b0e1c';
  ctx.fillRect(-r * 0.32, -r * 0.78, r * 0.64, r * 0.22);
  ctx.fillStyle = p.glow;
  ctx.beginPath();
  ctx.arc(-r * 0.16, -r * 0.67, r * 0.08, 0, Math.PI * 2);
  ctx.arc(r * 0.16, -r * 0.67, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function wraith(ctx: C, r: number, p: Palette, t: number) {
  ctx.fillStyle = p.main;
  ctx.globalAlpha = 0.16;
  ctx.beginPath();
  ctx.arc(0, -r * 0.1, r * 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = p.deep;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(r, -r * 0.6, r * 0.9, r * 0.2);
  const waves = 4;
  for (let i = 0; i <= waves; i++) {
    const x = r * 0.9 - (i / waves) * r * 1.8;
    const y = r * 0.55 + (i % 2 === 0 ? Math.sin(t * 8) * r * 0.12 : -r * 0.12);
    ctx.lineTo(x, y);
  }
  ctx.quadraticCurveTo(-r, -r * 0.6, 0, -r);
  ctx.closePath();
  ctx.fill();
  eyes(ctx, r * 0.28, -r * 0.35, r * 0.14, p.glow);
}

const SHAPES: Record<Archetype, (ctx: C, r: number, p: Palette, t: number) => void> = {
  beast, serpent, avian, orb, golem, wraith,
};

/** يرسم عدوّاً في مكانه الحالي (بعد translate) بلون عنصره وشكل فصيلته. */
export function drawMonster(ctx: C, shape: Archetype, r: number, p: Palette, t: number, flash: number) {
  ctx.save();
  ctx.shadowBlur = r * 0.5;
  ctx.shadowColor = p.glow;
  SHAPES[shape](ctx, r, p, t);
  if (flash > 0) {
    ctx.globalAlpha = flash;
    ctx.globalCompositeOperation = 'lighter';
    SHAPES[shape](ctx, r, { main: '#ffffff', deep: '#ffffff', glow: '#ffffff' }, t);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** بطل اللاعب: مثلّث حادّ بلون عنصره المختار، يشير إلى اتجاه الحركة/الهجوم. */
export function drawHero(ctx: C, r: number, p: Palette, angle: number, invuln: boolean) {
  ctx.save();
  ctx.rotate(angle);
  ctx.shadowBlur = 18;
  ctx.shadowColor = p.glow;
  if (invuln) ctx.globalAlpha = 0.5;
  ctx.fillStyle = p.main;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(-r * 0.75, r * 0.72);
  ctx.lineTo(-r * 0.35, 0);
  ctx.lineTo(-r * 0.75, -r * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = p.glow;
  ctx.beginPath();
  ctx.arc(r * 0.05, 0, r * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGem(ctx: C, r: number, color: string) {
  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.75, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.75, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function roundRect(ctx: C, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
