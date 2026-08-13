'use client';

import { playSfx } from '@/lib/audio/sfx';
import type { Element, PlayableElement } from '@/lib/game/types';
import { drawGem, drawHero, drawMonster, roundRect } from './draw';
import {
  ENEMY_KINDS,
  FRAGMENTS,
  PALETTE,
  type Archetype,
  type EnemyKind,
} from './theme';
import { baseStats, SIGNATURE, UPGRADE_BY_ID, UPGRADES, type Stats, type Upgrade } from './upgrades';

/**
 * محرّك وضع «البقاء» — لعبة أكشن 2D على Canvas بثيم وحوش MTO.
 *
 * تصميم: كائن واحد يملك حلقة اللعب والإدخال والرسم. الشاشة نفسها هي الساحة
 * (اللاعب محصور داخلها، والأعداء يتوافدون من الحواف)، فلا حاجة لكاميرا.
 * الـHUD يُرسم على Canvas مباشرةً؛ القوائم (بداية/ترقية/نهاية) طبقة React فوقه.
 */

export interface GameStats {
  timeMs: number;
  level: number;
  kills: number;
  ascensions: number;
  best: number;
  isBest: boolean;
}

export interface EngineHooks {
  onLevelUp: (choices: Upgrade[]) => void;
  onGameOver: (stats: GameStats) => void;
  /** حدث يُعرض كلافتة مؤقتة في React (مفتاح من strings.ts) */
  onBanner: (key: string) => void;
}

interface Enemy {
  id: number;
  x: number; y: number; vx: number; vy: number;
  r: number; hp: number; maxHp: number;
  kind: EnemyKind; shape: Archetype; element: Element;
  speed: number; touch: number; xp: number;
  flash: number; shootCd: number; orbCd: number;
  boss: boolean;
}

interface Proj {
  x: number; y: number; vx: number; vy: number;
  r: number; dmg: number; pierceLeft: number; life: number;
  hits: Set<number>;
}
interface EProj { x: number; y: number; vx: number; vy: number; r: number; dmg: number; life: number; color: string; }
interface Gem { x: number; y: number; vx: number; vy: number; value: number; color: string; fragment: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; t: number; color: string; r: number; }

const BEST_KEY = 'mto-arcade-best';
const MAX_ENEMIES = 190;

export class ArcadeEngine {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private topInset = 12;

  private raf = 0;
  private last = 0;
  running = false;
  paused = false;
  private awaitingLevelUp = false;

  private element: PlayableElement = 'fire';
  private pal = PALETTE.fire;

  private stats: Stats = baseStats();
  private levels: Record<string, number> = {};

  // اللاعب
  private px = 0; private py = 0; private pAngle = 0;
  private hp = 100; private invuln = 0; private fireCd = 0; private orbitAngle = 0;

  // تقدّم
  private time = 0; private kills = 0; private xp = 0; private level = 1; private xpNext = 8;
  private levelUpsPending = 0;
  private fragments = 0; private nextFragment = 0; private ascensions = 0;

  // موجات وزعماء
  private wave = 1; private spawnAcc = 0; private waveTimer = 0;
  private bossTimer = 55; private bossAlive = false;

  private nextId = 1;
  private enemies: Enemy[] = [];
  private projs: Proj[] = [];
  private eProjs: EProj[] = [];
  private gems: Gem[] = [];
  private particles: Particle[] = [];
  // خلفية منظورية (parallax): نجوم بعوامل عمق مختلفة + سُدُم تنجرف ببطء
  private bgStars: { x: number; y: number; s: number; a: number; f: number }[] = [];
  private nebulae: { x: number; y: number; r: number; c: string; f: number }[] = [];
  // أضواء ديناميكية عابرة (ومضات الانفجارات)
  private lights: { x: number; y: number; c: string; r: number; life: number; t: number }[] = [];
  private scrollX = 0; private scrollY = 0;
  private shake = 0;

  // إدخال
  private keys = new Set<string>();
  private joy = { active: false, ax: 0, ay: 0, cx: 0, cy: 0 };
  private lastHitSfx = 0; private lastDeathSfx = 0;

  private bound: { [k: string]: EventListener } = {};

  constructor(private canvas: HTMLCanvasElement, private hooks: EngineHooks) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d unavailable');
    this.ctx = ctx;
    this.attachInput();
    this.resize();
  }

  // ---------- دورة الحياة ----------

  start(element: PlayableElement) {
    this.element = element;
    this.pal = PALETTE[element];
    this.stats = baseStats();
    this.levels = {};
    // قوّة البداية التوقيعية للعنصر
    const sig = UPGRADE_BY_ID[SIGNATURE[element]];
    if (sig) { sig.apply(this.stats); this.levels[sig.id] = 1; }

    this.resize();
    this.px = this.w / 2; this.py = this.h / 2; this.pAngle = 0;
    this.hp = this.stats.maxHp; this.invuln = 1; this.fireCd = 0; this.orbitAngle = 0;
    this.time = 0; this.kills = 0; this.xp = 0; this.level = 1; this.xpNext = 8;
    this.levelUpsPending = 0; this.fragments = 0; this.nextFragment = 0; this.ascensions = 0;
    this.wave = 1; this.spawnAcc = 0; this.waveTimer = 0; this.bossTimer = 55; this.bossAlive = false;
    this.enemies = []; this.projs = []; this.eProjs = []; this.gems = []; this.particles = [];
    this.lights = []; this.scrollX = 0; this.scrollY = 0;
    this.nextId = 1; this.shake = 0;
    this.makeBg();

    this.running = true; this.paused = false; this.awaitingLevelUp = false;
    this.last = 0;
    if (!this.raf) this.raf = requestAnimationFrame(this.loop);
  }

  pause() { if (this.running) this.paused = true; }
  resume() { if (this.running && !this.awaitingLevelUp) this.paused = false; }
  isPaused() { return this.paused; }

  chooseUpgrade(id: string) {
    // حارس ضدّ النقر المكرّر قبل أن تزيل الواجهة القائمة — يمنع تطبيق ترقية
    // زائدة أو هبوط عدّاد الترقيات تحت الصفر (فيُبتلع ارتقاء لاحق).
    if (!this.awaitingLevelUp) return;
    const up = UPGRADE_BY_ID[id];
    if (up) {
      up.apply(this.stats);
      this.levels[id] = (this.levels[id] ?? 0) + 1;
      if (up.heal) this.hp = Math.min(this.stats.maxHp, this.hp + up.heal);
      playSfx('fragment');
    }
    this.levelUpsPending = Math.max(0, this.levelUpsPending - 1);
    if (this.levelUpsPending > 0) {
      this.presentLevelUp();
    } else {
      this.awaitingLevelUp = false;
      this.paused = false;
    }
  }

  setInsets(top: number) { this.topInset = Math.max(12, top); }

  destroy() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.detachInput();
  }

  // ---------- الإدخال ----------

  private attachInput() {
    const c = this.canvas;
    this.bound.down = ((e: PointerEvent) => {
      e.preventDefault();
      const r = c.getBoundingClientRect();
      this.joy.active = true;
      this.joy.ax = this.joy.cx = e.clientX - r.left;
      this.joy.ay = this.joy.cy = e.clientY - r.top;
      try { c.setPointerCapture(e.pointerId); } catch { /* تجاهل */ }
    }) as EventListener;
    this.bound.move = ((e: PointerEvent) => {
      if (!this.joy.active) return;
      const r = c.getBoundingClientRect();
      this.joy.cx = e.clientX - r.left;
      this.joy.cy = e.clientY - r.top;
    }) as EventListener;
    this.bound.up = (() => { this.joy.active = false; }) as EventListener;
    this.bound.key = ((e: KeyboardEvent) => {
      if (e.type === 'keydown') this.keys.add(e.key.toLowerCase());
      else this.keys.delete(e.key.toLowerCase());
    }) as EventListener;
    this.bound.resize = (() => this.resize()) as EventListener;

    c.addEventListener('pointerdown', this.bound.down, { passive: false });
    c.addEventListener('pointermove', this.bound.move, { passive: false });
    c.addEventListener('pointerup', this.bound.up);
    c.addEventListener('pointercancel', this.bound.up);
    window.addEventListener('keydown', this.bound.key);
    window.addEventListener('keyup', this.bound.key);
    window.addEventListener('resize', this.bound.resize);
  }

  private detachInput() {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.bound.down);
    c.removeEventListener('pointermove', this.bound.move);
    c.removeEventListener('pointerup', this.bound.up);
    c.removeEventListener('pointercancel', this.bound.up);
    window.removeEventListener('keydown', this.bound.key);
    window.removeEventListener('keyup', this.bound.key);
    window.removeEventListener('resize', this.bound.resize);
  }

  resize() {
    const c = this.canvas;
    this.w = c.clientWidth || window.innerWidth;
    this.h = c.clientHeight || window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.floor(this.w * this.dpr);
    c.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.bgStars.length === 0) this.makeBg();
  }

  private makeBg() {
    // ثلاث طبقات نجوم بعوامل منظور مختلفة (بعيد/متوسط/قريب) تعطي عمقاً عند الحركة
    const n = Math.round((this.w * this.h) / 5200);
    this.bgStars = [];
    for (let i = 0; i < n; i++) {
      const band = Math.random();
      const f = band < 0.5 ? 0.18 : band < 0.82 ? 0.42 : 0.8;
      this.bgStars.push({
        x: Math.random() * this.w, y: Math.random() * this.h,
        s: f < 0.3 ? 1 : f < 0.6 ? 1.7 : 2.5, a: 0.22 + f * 0.7, f,
      });
    }
    // سُدُم كبيرة ناعمة بعوامل منظور صغيرة
    this.nebulae = [];
    const cols = [PALETTE.psychic.deep, PALETTE.water.deep, PALETTE.fire.deep, PALETTE.dark.deep];
    for (let i = 0; i < 4; i++) {
      this.nebulae.push({
        x: Math.random() * this.w, y: Math.random() * this.h,
        r: 220 + Math.random() * 260, c: cols[i % cols.length], f: 0.08 + Math.random() * 0.06,
      });
    }
  }

  // ---------- الحلقة ----------

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.last) this.last = now;
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    if (this.running && !this.paused && !this.awaitingLevelUp) this.update(dt);
    this.draw();
  };

  // ---------- التحديث ----------

  private moveVec(): { x: number; y: number } {
    let vx = 0; let vy = 0;
    if (this.joy.active) {
      const dx = this.joy.cx - this.joy.ax;
      const dy = this.joy.cy - this.joy.ay;
      const mag = Math.hypot(dx, dy);
      if (mag > 6) {
        const scale = Math.min(mag, 60) / 60 / mag;
        vx = dx * scale; vy = dy * scale;
      }
    }
    const k = this.keys;
    if (k.has('arrowleft') || k.has('a')) vx -= 1;
    if (k.has('arrowright') || k.has('d')) vx += 1;
    if (k.has('arrowup') || k.has('w')) vy -= 1;
    if (k.has('arrowdown') || k.has('s')) vy += 1;
    const m = Math.hypot(vx, vy);
    if (m > 1) { vx /= m; vy /= m; }
    return { x: vx, y: vy };
  }

  private update(dt: number) {
    this.time += dt;

    // حركة اللاعب
    const mv = this.moveVec();
    this.px = clamp(this.px + mv.x * this.stats.moveSpeed * dt, 14, this.w - 14);
    this.py = clamp(this.py + mv.y * this.stats.moveSpeed * dt, 14, this.h - 14);
    // إزاحة الخلفية المنظورية: تتحرّك عكس البطل، مع انجراف خفيف دائم يبقيها حيّة
    this.scrollX += mv.x * this.stats.moveSpeed * dt;
    this.scrollY += mv.y * this.stats.moveSpeed * dt + 9 * dt;

    if (this.invuln > 0) this.invuln -= dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.stats.regen > 0) this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.regen * dt);

    // الهدف الأقرب
    const target = this.nearestEnemy();
    if (target) this.pAngle = Math.atan2(target.y - this.py, target.x - this.px);
    else if (mv.x || mv.y) this.pAngle = Math.atan2(mv.y, mv.x);

    // إطلاق تلقائي
    this.fireCd -= dt;
    if (target && this.fireCd <= 0) {
      this.fire(target);
      this.fireCd = 1 / this.stats.fireRate;
    }

    this.spawnLogic(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateAuraAndOrbits(dt);
    this.updateGems(dt);
    this.updateParticles(dt);

    if (this.hp <= 0) this.gameOver();
  }

  private nearestEnemy(): Enemy | null {
    let best: Enemy | null = null; let bd = Infinity;
    for (const e of this.enemies) {
      const d = (e.x - this.px) ** 2 + (e.y - this.py) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  private fire(target: Enemy) {
    const base = Math.atan2(target.y - this.py, target.x - this.px);
    const n = this.stats.projCount;
    const spread = n > 1 ? 0.16 : 0;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * spread;
      this.projs.push({
        x: this.px + Math.cos(a) * 16, y: this.py + Math.sin(a) * 16,
        vx: Math.cos(a) * this.stats.projSpeed, vy: Math.sin(a) * this.stats.projSpeed,
        r: this.stats.projRadius, dmg: this.stats.damage, pierceLeft: this.stats.pierce,
        life: 1.6, hits: new Set(),
      });
    }
    playSfx('attack');
  }

  // ---------- ظهور الأعداء ----------

  private spawnLogic(dt: number) {
    this.waveTimer += dt;
    if (this.waveTimer >= 22) { this.waveTimer = 0; this.wave += 1; }

    // زعيم دوري
    this.bossTimer -= dt;
    if (this.bossTimer <= 0 && !this.bossAlive && this.enemies.length < MAX_ENEMIES - 1) {
      this.spawnTitan();
      this.bossTimer = 75;
    }

    this.spawnAcc += dt;
    const interval = clamp(1.05 - this.wave * 0.05 - this.time * 0.003, 0.26, 1.05);
    while (this.spawnAcc >= interval && this.enemies.length < MAX_ENEMIES) {
      this.spawnAcc -= interval;
      const burst = 1 + Math.floor(this.wave / 4);
      for (let i = 0; i < burst && this.enemies.length < MAX_ENEMIES; i++) this.spawnEnemy();
    }
  }

  private pickKind(): EnemyKind {
    const w = this.wave;
    const roll = Math.random();
    if (w >= 3 && roll < 0.16) return 'tank';
    if (w >= 2 && roll < 0.38) return 'caster';
    if (roll < 0.62) return 'runner';
    return 'grunt';
  }

  private spawnEnemy() {
    const kind = this.pickKind();
    const def = ENEMY_KINDS[kind];
    const hpMul = 1 + this.time / 42 + this.ascensions * 0.5;
    const spdMul = Math.min(1.5, 1 + this.time / 220);
    const element = ELEMENTS_ARR[(Math.random() * ELEMENTS_ARR.length) | 0];
    const shape = def.shapes[(Math.random() * def.shapes.length) | 0];
    const p = this.edgePoint();
    this.enemies.push({
      id: this.nextId++, x: p.x, y: p.y, vx: 0, vy: 0,
      r: def.r, hp: def.hp * hpMul, maxHp: def.hp * hpMul,
      kind, shape, element, speed: def.speed * spdMul, touch: def.touch, xp: def.xp,
      flash: 0, shootCd: 1.2 + Math.random(), orbCd: 0, boss: false,
    });
  }

  private spawnTitan() {
    const p = this.edgePoint();
    const hp = (520 + this.time * 5) * (1 + this.ascensions * 0.6);
    this.enemies.push({
      id: this.nextId++, x: p.x, y: p.y, vx: 0, vy: 0,
      r: 54, hp, maxHp: hp,
      kind: 'tank', shape: 'golem', element: 'dark', speed: 34, touch: 22, xp: 40,
      flash: 0, shootCd: 2.4, orbCd: 0, boss: true,
    });
    this.bossAlive = true;
    playSfx('titan');
    this.hooks.onBanner('titanIncoming');
  }

  private edgePoint(): { x: number; y: number } {
    const m = 40;
    const side = (Math.random() * 4) | 0;
    if (side === 0) return { x: Math.random() * this.w, y: -m };
    if (side === 1) return { x: this.w + m, y: Math.random() * this.h };
    if (side === 2) return { x: Math.random() * this.w, y: this.h + m };
    return { x: -m, y: Math.random() * this.h };
  }

  // ---------- الأعداء ----------

  private updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.flash > 0) e.flash -= dt;
      if (e.orbCd > 0) e.orbCd -= dt;

      const ang = Math.atan2(this.py - e.y, this.px - e.x);
      const caster = e.kind === 'caster' && !e.boss;
      const dist = Math.hypot(this.px - e.x, this.py - e.y);

      // القذّاف يحافظ على مسافة
      let move = 1;
      if (caster && dist < 220) move = -0.5;
      e.x += Math.cos(ang) * e.speed * move * dt + e.vx * dt;
      e.y += Math.sin(ang) * e.speed * move * dt + e.vy * dt;
      e.vx *= 0.86; e.vy *= 0.86;

      // إطلاق
      if (caster || e.boss) {
        e.shootCd -= dt;
        if (e.shootCd <= 0) {
          e.shootCd = e.boss ? 1.9 : 2.2 + Math.random();
          if (e.boss) this.titanVolley(e);
          else this.enemyShot(e, ang);
        }
      }

      // تلامس اللاعب
      if (dist < e.r + 12 && this.invuln <= 0) {
        this.damagePlayer(e.touch, ang);
      }

      if (e.hp <= 0) { this.killEnemy(e, i); continue; }
      // تنظيف الشاردين بعيداً
      if (e.x < -120 || e.x > this.w + 120 || e.y < -120 || e.y > this.h + 120) {
        if (!e.boss && dist > Math.max(this.w, this.h)) { this.enemies.splice(i, 1); }
      }
    }
  }

  private enemyShot(e: Enemy, ang: number) {
    const p = PALETTE[e.element];
    this.eProjs.push({
      x: e.x, y: e.y, vx: Math.cos(ang) * 190, vy: Math.sin(ang) * 190,
      r: 6, dmg: 7, life: 4, color: p.glow,
    });
  }

  private titanVolley(e: Enemy) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + this.time;
      this.eProjs.push({
        x: e.x, y: e.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160,
        r: 7, dmg: 10, life: 5, color: PALETTE.dark.glow,
      });
    }
    playSfx('combo');
  }

  private killEnemy(e: Enemy, index: number) {
    this.enemies.splice(index, 1);
    this.kills += 1;
    this.burst(e.x, e.y, PALETTE[e.element].glow, e.boss ? 42 : 12);
    this.lights.push({ x: e.x, y: e.y, c: PALETTE[e.element].glow, r: e.boss ? 300 : 78, life: e.boss ? 0.55 : 0.28, t: 0 });
    if (this.stats.lifesteal > 0) this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.lifesteal);
    if (this.time - this.lastDeathSfx > 0.06) { playSfx('death'); this.lastDeathSfx = this.time; }

    const col = PALETTE[e.element].main;
    if (e.boss) {
      this.bossAlive = false;
      this.shake = 0.5;
      this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.maxHp * 0.15);
      this.hooks.onBanner('titanDown');
      // قطعة الوحش الأعظم + خبرة غزيرة
      const frag = this.nextFragment % FRAGMENTS.length;
      this.gems.push({ x: e.x, y: e.y, vx: 0, vy: 0, value: 0, color: PALETTE[FRAGMENTS[frag].element].main, fragment: frag + 1 });
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        this.gems.push({ x: e.x, y: e.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, value: 8, color: col, fragment: 0 });
      }
    } else {
      this.gems.push({ x: e.x, y: e.y, vx: 0, vy: 0, value: e.xp, color: col, fragment: 0 });
    }
  }

  private damagePlayer(dmg: number, awayAng: number) {
    this.hp -= dmg;
    this.invuln = 0.7;
    this.px = clamp(this.px - Math.cos(awayAng) * 22, 14, this.w - 14);
    this.py = clamp(this.py - Math.sin(awayAng) * 22, 14, this.h - 14);
    this.shake = Math.max(this.shake, 0.25);
    if (this.time - this.lastHitSfx > 0.08) { playSfx('hit'); this.lastHitSfx = this.time; }
    this.burst(this.px, this.py, this.pal.glow, 8);
  }

  // ---------- القذائف ----------

  private updateProjectiles(dt: number) {
    // قذائف اللاعب
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const b = this.projs[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -30 || b.x > this.w + 30 || b.y < -30 || b.y > this.h + 30) {
        this.projs.splice(i, 1); continue;
      }
      for (const e of this.enemies) {
        if (b.hits.has(e.id)) continue;
        const rr = e.r + b.r;
        if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 <= rr * rr) {
          e.hp -= b.dmg; e.flash = 0.14;
          const kb = this.stats.knockback;
          e.vx += (b.vx / this.stats.projSpeed) * kb;
          e.vy += (b.vy / this.stats.projSpeed) * kb;
          this.burst(b.x, b.y, this.pal.glow, 3);
          b.hits.add(e.id);
          if (b.pierceLeft > 0) { b.pierceLeft -= 1; }
          else { this.projs.splice(i, 1); break; }
        }
      }
    }
    // قذائف الأعداء
    for (let i = this.eProjs.length - 1; i >= 0; i--) {
      const b = this.eProjs[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -30 || b.x > this.w + 30 || b.y < -30 || b.y > this.h + 30) {
        this.eProjs.splice(i, 1); continue;
      }
      if (this.invuln <= 0) {
        const rr = 12 + b.r;
        if ((this.px - b.x) ** 2 + (this.py - b.y) ** 2 <= rr * rr) {
          this.eProjs.splice(i, 1);
          this.damagePlayer(b.dmg, Math.atan2(b.y - this.py, b.x - this.px) + Math.PI);
        }
      }
    }
  }

  private updateAuraAndOrbits(dt: number) {
    // هالة السُم
    if (this.stats.auraDps > 0) {
      const rad = this.stats.auraRadius;
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if ((e.x - this.px) ** 2 + (e.y - this.py) ** 2 <= (rad + e.r) ** 2) {
          e.hp -= this.stats.auraDps * dt;
          if (Math.random() < 0.08) this.burst(e.x, e.y, PALETTE.grass.glow, 1);
          if (e.hp <= 0) this.killEnemy(e, i);
        }
      }
    }
    // كرات الظلام الدائرة
    this.orbitAngle += dt * 2.4;
    if (this.stats.orbitCount > 0) {
      const orbR = 48;
      const dmg = this.stats.damage * 0.6;
      for (let o = 0; o < this.stats.orbitCount; o++) {
        const a = this.orbitAngle + (o / this.stats.orbitCount) * Math.PI * 2;
        const ox = this.px + Math.cos(a) * orbR;
        const oy = this.py + Math.sin(a) * orbR;
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (e.orbCd > 0) continue;
          if ((e.x - ox) ** 2 + (e.y - oy) ** 2 <= (e.r + 9) ** 2) {
            e.hp -= dmg; e.flash = 0.12; e.orbCd = 0.3;
            this.burst(ox, oy, PALETTE.dark.glow, 2);
            if (e.hp <= 0) this.killEnemy(e, i);
          }
        }
      }
    }
  }

  // ---------- الخبرة والمستوى ----------

  private updateGems(dt: number) {
    const mag = this.stats.magnet;
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      g.x += g.vx * dt; g.y += g.vy * dt; g.vx *= 0.9; g.vy *= 0.9;
      const dx = this.px - g.x; const dy = this.py - g.y;
      const d2 = dx * dx + dy * dy;
      const pull = g.fragment ? mag + 90 : mag;
      if (d2 < pull * pull) {
        const d = Math.sqrt(d2) || 1;
        g.x += (dx / d) * 320 * dt; g.y += (dy / d) * 320 * dt;
      }
      if (d2 < 22 * 22) {
        if (g.fragment) this.collectFragment();
        else this.gainXp(g.value);
        this.gems.splice(i, 1);
      }
    }
  }

  private gainXp(v: number) {
    this.xp += v;
    playSfx('draw');
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level += 1;
      this.xpNext = Math.floor(6 + this.level * 4 + this.level * this.level * 0.7);
      this.levelUpsPending += 1;
    }
    if (this.levelUpsPending > 0 && !this.awaitingLevelUp) this.presentLevelUp();
  }

  private presentLevelUp() {
    this.awaitingLevelUp = true;
    this.paused = true;
    playSfx('summon');
    this.hooks.onLevelUp(this.rollChoices());
  }

  private rollChoices(): Upgrade[] {
    const pool = UPGRADES.filter((u) => (this.levels[u.id] ?? 0) < u.max);
    const src = pool.length ? pool : UPGRADES;
    const bag = [...src];
    const out: Upgrade[] = [];
    const n = Math.min(3, bag.length);
    for (let i = 0; i < n; i++) {
      const idx = (Math.random() * bag.length) | 0;
      out.push(bag.splice(idx, 1)[0]);
    }
    return out;
  }

  /** المستوى الحالي لترقية — تقرأه القائمة لعرض «مستوى n / أقصى». */
  levelOf(id: string): number { return this.levels[id] ?? 0; }

  private collectFragment() {
    this.nextFragment += 1;
    this.fragments += 1;
    playSfx('fragment');
    this.hp = Math.min(this.stats.maxHp, this.hp + 15);
    if (this.fragments >= FRAGMENTS.length) {
      this.ascension();
    } else {
      this.hooks.onBanner('fragmentGet');
    }
  }

  private ascension() {
    this.fragments = 0;
    this.ascensions += 1;
    this.stats.damage *= 1.25;
    this.stats.maxHp += 20;
    this.hp = this.stats.maxHp;
    this.shake = 0.6;
    playSfx('win');
    this.hooks.onBanner('ascension');
    // ومضة ضوء كبيرة تملأ الساحة
    this.lights.push({ x: this.px, y: this.py, c: this.pal.glow, r: Math.max(this.w, this.h), life: 0.7, t: 0 });
    // نوفا تمسح الأعداء غير الزعماء
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.boss) { e.hp -= e.maxHp * 0.4; e.flash = 0.3; continue; }
      this.burst(e.x, e.y, this.pal.glow, 10);
      this.gems.push({ x: e.x, y: e.y, vx: 0, vy: 0, value: e.xp, color: PALETTE[e.element].main, fragment: 0 });
      this.enemies.splice(i, 1);
      this.kills += 1;
    }
    this.eProjs = [];
  }

  // ---------- جسيمات ----------

  private burst(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 30 + Math.random() * 200;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.4, t: 0, color, r: 1 + Math.random() * 2.5 });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92;
      if (p.t >= p.life) this.particles.splice(i, 1);
    }
    for (let i = this.lights.length - 1; i >= 0; i--) {
      const l = this.lights[i]; l.t += dt;
      if (l.t >= l.life) this.lights.splice(i, 1);
    }
  }

  // ---------- النهاية ----------

  private gameOver() {
    this.running = false;
    playSfx('lose');
    const timeMs = Math.round(this.time * 1000);
    let best = 0;
    try { best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch { /* تجاهل */ }
    const isBest = timeMs > best;
    if (isBest) { try { localStorage.setItem(BEST_KEY, String(timeMs)); } catch { /* تجاهل */ } }
    this.hooks.onGameOver({ timeMs, level: this.level, kills: this.kills, ascensions: this.ascensions, best: Math.max(best, timeMs), isBest });
  }

  // ---------- الرسم ----------

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    ctx.save();
    if (this.shake > 0) {
      const m = this.shake * 26;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }

    this.drawBackground();

    // هالة السُم
    if (this.stats.auraRadius > 0) {
      ctx.save();
      ctx.globalAlpha = 0.12 + Math.sin(this.time * 4) * 0.03;
      ctx.fillStyle = PALETTE.grass.main;
      ctx.beginPath(); ctx.arc(this.px, this.py, this.stats.auraRadius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // كرات الخبرة
    for (const g of this.gems) {
      ctx.save(); ctx.translate(g.x, g.y);
      if (g.fragment) {
        const s = 1 + Math.sin(this.time * 8) * 0.18;
        ctx.scale(s, s);
        drawGem(ctx, 13, g.color);
        ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      } else {
        drawGem(ctx, 4.5, g.color);
      }
      ctx.restore();
    }

    // قذائف الأعداء
    for (const b of this.eProjs) {
      ctx.beginPath(); ctx.fillStyle = b.color;
      ctx.shadowBlur = 10; ctx.shadowColor = b.color;
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;

    // قذائف اللاعب
    ctx.fillStyle = this.pal.glow; ctx.shadowBlur = 12; ctx.shadowColor = this.pal.main;
    for (const b of this.projs) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.shadowBlur = 0;

    // الأعداء
    for (const e of this.enemies) {
      ctx.save(); ctx.translate(e.x, e.y);
      drawMonster(ctx, e.shape, e.r, PALETTE[e.element], this.time + e.id, Math.max(0, e.flash / 0.14));
      if (e.boss) this.drawBossBar(e);
      ctx.restore();
    }

    // كرات الظلام
    if (this.stats.orbitCount > 0) {
      for (let o = 0; o < this.stats.orbitCount; o++) {
        const a = this.orbitAngle + (o / this.stats.orbitCount) * Math.PI * 2;
        const ox = this.px + Math.cos(a) * 48; const oy = this.py + Math.sin(a) * 48;
        ctx.beginPath(); ctx.fillStyle = PALETTE.dark.glow;
        ctx.shadowBlur = 12; ctx.shadowColor = PALETTE.psychic.main;
        ctx.arc(ox, oy, 8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    // البطل
    ctx.save(); ctx.translate(this.px, this.py);
    drawHero(ctx, 15, this.pal, this.pAngle, this.invuln > 0);
    ctx.restore();

    // جسيمات
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.drawLights();

    ctx.restore(); // نهاية الاهتزاز

    this.drawVignette();
    this.drawHud();

    // مفصل الجويستيك
    if (this.joy.active) this.drawJoystick();
  }

  private drawBackground() {
    const ctx = this.ctx;
    const wrap = (v: number, m: number) => ((v % m) + m) % m;

    // سُدُم ناعمة — أعمق طبقة، تنجرف أبطأ الجميع
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const nb of this.nebulae) {
      const nx = wrap(nb.x - this.scrollX * nb.f, this.w);
      const ny = wrap(nb.y - this.scrollY * nb.f, this.h);
      const grd = ctx.createRadialGradient(nx, ny, 0, nx, ny, nb.r);
      grd.addColorStop(0, nb.c); grd.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(nx, ny, nb.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // نجوم بثلاث طبقات منظور — الأقرب أكبر وأسرع
    for (const s of this.bgStars) {
      const sx = wrap(s.x - this.scrollX * s.f, this.w);
      const sy = wrap(s.y - this.scrollY * s.f, this.h);
      ctx.globalAlpha = s.a;
      ctx.fillStyle = s.f > 0.6 ? '#cfe0ff' : s.f > 0.35 ? '#9fb0e0' : '#54608f';
      ctx.fillRect(sx, sy, s.s, s.s);
    }
    ctx.globalAlpha = 1;

    // شبكة خافتة تنزلق مع الطبقة القريبة
    ctx.strokeStyle = 'rgba(120,150,220,0.05)'; ctx.lineWidth = 1;
    const step = 60;
    const gx = wrap(-this.scrollX * 0.8, step);
    const gy = wrap(-this.scrollY * 0.8, step);
    ctx.beginPath();
    for (let x = gx - step; x <= this.w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, this.h); }
    for (let y = gy - step; y <= this.h; y += step) { ctx.moveTo(0, y); ctx.lineTo(this.w, y); }
    ctx.stroke();

    // هالة ضوء البطل — إضاءة ديناميكية تنير ما حوله
    const hr = 150 + Math.sin(this.time * 5) * 10;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const hl = ctx.createRadialGradient(this.px, this.py, 0, this.px, this.py, hr);
    hl.addColorStop(0, this.pal.main); hl.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = hl;
    ctx.beginPath(); ctx.arc(this.px, this.py, hr, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /** ومضات ضوء إضافية عند الانفجارات (تُرسم في فضاء المشهد). */
  private drawLights() {
    const ctx = this.ctx;
    if (this.lights.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of this.lights) {
      const k = Math.max(0, 1 - l.t / l.life);
      const grd = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      grd.addColorStop(0, l.c); grd.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.55 * k;
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /** تظليل الحواف (vignette) يعمّق المشهد ويركّز النظر على المركز. */
  private drawVignette() {
    const ctx = this.ctx;
    const cx = this.w / 2, cy = this.h / 2, r = Math.hypot(cx, cy);
    const grd = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
    grd.addColorStop(0, 'transparent');
    grd.addColorStop(1, 'rgba(3,4,10,0.55)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  private drawBossBar(e: Enemy) {
    const ctx = this.ctx;
    const w = 90; const y = -e.r - 16;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(ctx, -w / 2, y, w, 7, 3); ctx.fill();
    ctx.fillStyle = '#ff5470'; roundRect(ctx, -w / 2, y, w * clamp(e.hp / e.maxHp, 0, 1), 7, 3); ctx.fill();
  }

  private drawHud() {
    const ctx = this.ctx;
    const top = this.topInset;
    const pad = 14;

    // شريط الحياة
    const barW = Math.min(220, this.w - pad * 2 - 90);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(ctx, pad, top, barW, 16, 8); ctx.fill();
    const hpFrac = clamp(this.hp / this.stats.maxHp, 0, 1);
    ctx.fillStyle = hpFrac > 0.35 ? '#4ade80' : '#ff5470';
    roundRect(ctx, pad, top, barW * hpFrac, 16, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.max(0, Math.ceil(this.hp))}/${Math.round(this.stats.maxHp)}`, pad + 8, top + 8);

    // شريط الخبرة
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(ctx, pad, top + 20, barW, 9, 5); ctx.fill();
    ctx.fillStyle = this.pal.main;
    roundRect(ctx, pad, top + 20, barW * clamp(this.xp / this.xpNext, 0, 1), 9, 5); ctx.fill();

    // مستوى
    ctx.fillStyle = this.pal.glow; ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillText(`LV ${this.level}`, pad + barW + 8, top + 8);

    // الزمن (وسط) + عدّادات (يمين)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.font = '800 20px system-ui, sans-serif';
    ctx.fillText(fmtTime(this.time), this.w / 2, top + 12);

    ctx.textAlign = 'right'; ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillStyle = '#cbd5ff';
    ctx.fillText(`⚔ ${this.kills}`, this.w - pad, top + 6);
    ctx.fillStyle = '#9fb0e0';
    ctx.fillText(`〜 ${this.wave}`, this.w - pad, top + 24);

    // قطع الوحش الأعظم
    const fx = this.w / 2 - (FRAGMENTS.length * 20) / 2 + 10;
    for (let i = 0; i < FRAGMENTS.length; i++) {
      const filled = i < this.fragments;
      ctx.save(); ctx.translate(fx + i * 20, top + 34);
      ctx.globalAlpha = filled ? 1 : 0.28;
      drawGem(ctx, 7, PALETTE[FRAGMENTS[i].element].main);
      ctx.restore();
    }
    if (this.ascensions > 0) {
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffd24d'; ctx.font = '800 12px system-ui, sans-serif';
      ctx.fillText(`⭐×${this.ascensions}`, this.w / 2, top + 50);
    }
  }

  private drawJoystick() {
    const ctx = this.ctx;
    const { ax, ay, cx, cy } = this.joy;
    const dx = cx - ax; const dy = cy - ay; const mag = Math.hypot(dx, dy);
    const r = Math.min(mag, 60);
    const nx = mag > 0 ? ax + (dx / mag) * r : ax;
    const ny = mag > 0 ? ay + (dy / mag) * r : ay;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = this.pal.glow; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ax, ay, 60, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.6; ctx.fillStyle = this.pal.main;
    ctx.beginPath(); ctx.arc(nx, ny, 22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// عناصر اللعب (بلا «بري») — تُستنسخ هنا لتفادي استيراد الكتالوج كاملاً في مسار الرسم.
const ELEMENTS_ARR: Element[] = ['fire', 'water', 'grass', 'electric', 'psychic', 'dark'];

function clamp(v: number, a: number, b: number): number { return v < a ? a : v > b ? b : v; }

function fmtTime(sec: number): string {
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
