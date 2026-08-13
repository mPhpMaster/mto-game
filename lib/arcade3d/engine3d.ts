'use client';

import * as THREE from 'three';
import { playSfx } from '@/lib/audio/sfx';
import type { Element, PlayableElement } from '@/lib/game/types';
import { ENEMY_KINDS, FRAGMENTS, PALETTE, type Archetype, type EnemyKind } from '@/lib/arcade/theme';
import { baseStats, SIGNATURE, UPGRADE_BY_ID, UPGRADES, type Stats, type Upgrade } from '@/lib/arcade/upgrades';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  buildAura, buildEnemyProjectile, buildGem, buildHero, buildOrb, buildParticles,
  buildProjectile, buildTitan, enemyTemplate, makeNoiseNormalMap, makeNoiseTexture, type ParticleField,
} from './meshes';

/**
 * محرّك «البقاء 3D» بـThree.js — النظير ثلاثي الأبعاد لوضع البقاء 2D.
 * يحتفظ بنفس المقياس العددي للمحرّك ثنائي الأبعاد (البكسل = وحدة عالم) فتُعاد
 * إحصاءات وترقيات `lib/arcade` كما هي. الكاميرا تتبع البطل من أعلى-خلف،
 * والأعداء يتوافدون من حلقة حول البطل. الـHUD طبقة DOM تُحدَّث عبر `onHud`.
 */

export interface Hud {
  hpFrac: number; hp: number; maxHp: number;
  xpFrac: number; level: number;
  timeMs: number; kills: number; wave: number;
  fragments: number; ascensions: number;
  elementMain: string; elementGlow: string;
  quality: 'high' | 'medium' | 'low';
}

export interface GameStats {
  timeMs: number; level: number; kills: number; ascensions: number; best: number; isBest: boolean;
}

export interface Engine3DHooks {
  onLevelUp: (choices: Upgrade[]) => void;
  onGameOver: (s: GameStats) => void;
  onBanner: (key: string) => void;
  onHud: (h: Hud) => void;
}

interface Enemy {
  id: number; mesh: THREE.Object3D;
  x: number; z: number; vx: number; vz: number;
  r: number; hp: number; maxHp: number;
  kind: EnemyKind; shape: Archetype; element: Element;
  speed: number; touch: number; xp: number;
  flash: number; shootCd: number; orbCd: number; boss: boolean;
}
interface Proj { mesh: THREE.Object3D; x: number; z: number; vx: number; vz: number; r: number; dmg: number; pierceLeft: number; life: number; hits: Set<number>; }
interface EProj { mesh: THREE.Object3D; x: number; z: number; vx: number; vz: number; r: number; dmg: number; life: number; }
interface Gem { mesh: THREE.Object3D; x: number; z: number; vx: number; vz: number; value: number; fragment: number; }

const BEST_KEY = 'mto-arcade3d-best';
const MAX_ENEMIES = 110;
const ARENA = 700;
const SPAWN_RING = 430;
const PROJ_Y = 22;
const HERO_SCALE = 14;
const CAM_H = 360;
const CAM_BACK = 300;
const CAM_LOOK_Y = 12;
const ELEMENTS_ARR: Element[] = ['fire', 'water', 'grass', 'electric', 'psychic', 'dark'];

export class Engine3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private hero: THREE.Group;
  private aura: THREE.Mesh;
  private particles: ParticleField;
  private colors: Record<Element, THREE.Color>;
  private orbMeshes: THREE.Mesh[] = [];
  private dir!: THREE.DirectionalLight;
  private heroLight!: THREE.PointLight;
  private composer!: EffectComposer;
  private bloom!: UnrealBloomPass;
  // جودة تكيّفية حسب FPS
  private quality: 'high' | 'medium' | 'low' = 'high';
  private fpsFrames = 0; private fpsTime = 0; private qCooldown = 0; private qGood = 0;

  private w = 0; private h = 0;
  private raf = 0; private last = 0;
  running = false; paused = false;
  private awaitingLevelUp = false;

  private element: PlayableElement = 'fire';
  private stats: Stats = baseStats();
  private levels: Record<string, number> = {};

  private px = 0; private pz = 0; private pAngle = 0;
  private hp = 100; private invuln = 0; private fireCd = 0; private orbitAngle = 0;

  private time = 0; private kills = 0; private xp = 0; private level = 1; private xpNext = 8;
  private levelUpsPending = 0; private fragments = 0; private nextFragment = 0; private ascensions = 0;
  private wave = 1; private spawnAcc = 0; private waveTimer = 0; private bossTimer = 55; private bossAlive = false;

  private nextId = 1;
  private enemies: Enemy[] = [];
  private projs: Proj[] = [];
  private eProjs: EProj[] = [];
  private gems: Gem[] = [];
  private shake = 0; private hudAcc = 0;
  private lastHitSfx = 0; private lastDeathSfx = 0;

  private keys = new Set<string>();
  private joy = { active: false, ax: 0, ay: 0, cx: 0, cy: 0 };
  private bound: { [k: string]: EventListener } = {};

  constructor(private canvas: HTMLCanvasElement, private hooks: Engine3DHooks) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x05060f, 1);
    // ظلال ديناميكية ناعمة + تعيين نغمي سينمائي لواقعية أعلى
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene.background = new THREE.Color(0x05060f);
    this.scene.fog = new THREE.FogExp2(0x05060f, 0.00085);
    // إضاءة قائمة على البيئة (IBL) تمنح الخامات انعكاسات واقعية
    this.scene.environment = this.makeEnv();

    this.camera = new THREE.PerspectiveCamera(55, 1, 1, 3000);

    // إضاءة: نصف كروية خافتة + ضوء اتجاهي رئيسي يلقي الظلّ + ضوء نقطي يتبع البطل
    this.scene.add(new THREE.HemisphereLight(0x9fb4ff, 0x0a0a1a, 0.5));
    // زاوية أخفض قليلاً → ظلال أطول وأوضح، وخريطة ظلّ أكبر وأنعم
    const dir = new THREE.DirectionalLight(0xfff2e0, 1.75);
    dir.position.set(200, 250, 230);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 40;
    dir.shadow.camera.far = 1100;
    const S = 300;
    dir.shadow.camera.left = -S; dir.shadow.camera.right = S;
    dir.shadow.camera.top = S; dir.shadow.camera.bottom = -S;
    dir.shadow.bias = -0.0004;
    dir.shadow.normalBias = 2.2;
    dir.shadow.radius = 3.5;
    this.scene.add(dir);
    this.scene.add(dir.target);
    this.dir = dir;

    const heroLight = new THREE.PointLight(0xffffff, 0.9, 300, 2);
    heroLight.position.set(0, 46, 0);
    this.scene.add(heroLight);
    this.heroLight = heroLight;

    // أرضية بخامة PBR مع خريطة خشونة للتفاصيل + استقبال الظلال، فوقها شبكة خافتة
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a0e1e, roughness: 0.92, metalness: 0.1, envMapIntensity: 0.4 });
    groundMat.roughnessMap = makeNoiseTexture(128, 26);
    const groundN = makeNoiseNormalMap(128, 1.3); groundN.repeat.set(26, 26);
    groundMat.normalMap = groundN;
    groundMat.normalScale = new THREE.Vector2(0.6, 0.6);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    this.scene.add(ground);
    const grid = new THREE.GridHelper(4000, 50, 0x2a3566, 0x161d3a);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.5;
    this.scene.add(grid);

    this.colors = {} as Record<Element, THREE.Color>;
    for (const el of ELEMENTS_ARR) this.colors[el] = new THREE.Color(PALETTE[el].glow);
    this.colors.wild = new THREE.Color(PALETTE.wild.glow);

    this.hero = buildHero('fire');
    this.hero.scale.setScalar(HERO_SCALE);
    this.shadowify(this.hero);
    this.scene.add(this.hero);

    this.aura = buildAura();
    this.aura.visible = false;
    this.scene.add(this.aura);

    this.particles = buildParticles(500);
    this.scene.add(this.particles.points);

    // مُركّب post-processing: مشهد → توهّج Bloom للعناصر المضيئة → إخراج بتعيين نغمي
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.62, 0.5, 0.85);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    this.composer = composer;
    this.bloom = bloom;

    this.attachInput();
    this.resize();
  }

  // ---------- دورة الحياة ----------

  start(element: PlayableElement) {
    this.element = element;
    this.stats = baseStats();
    this.levels = {};
    const sig = UPGRADE_BY_ID[SIGNATURE[element]];
    if (sig) { sig.apply(this.stats); this.levels[sig.id] = 1; }

    // إعادة بناء البطل بلون العنصر
    this.scene.remove(this.hero);
    this.hero = buildHero(element);
    this.hero.scale.setScalar(HERO_SCALE);
    this.shadowify(this.hero);
    this.scene.add(this.hero);
    this.heroLight.color.set(PALETTE[element].glow);

    this.clearEntities();
    this.px = 0; this.pz = 0; this.pAngle = 0;
    this.hp = this.stats.maxHp; this.invuln = 1; this.fireCd = 0; this.orbitAngle = 0;
    this.time = 0; this.kills = 0; this.xp = 0; this.level = 1; this.xpNext = 8;
    this.levelUpsPending = 0; this.fragments = 0; this.nextFragment = 0; this.ascensions = 0;
    this.wave = 1; this.spawnAcc = 0; this.waveTimer = 0; this.bossTimer = 55; this.bossAlive = false;
    this.nextId = 1; this.shake = 0;

    // إعادة الجودة إلى الأعلى في كل مباراة، مع فترة إحماء قبل السماح بالهبوط
    this.fpsFrames = 0; this.fpsTime = 0; this.qCooldown = 1.5; this.qGood = 0;
    this.applyQuality('high');

    this.running = true; this.paused = false; this.awaitingLevelUp = false; this.last = 0;
    this.resize();
    this.emitHud();
    if (!this.raf) this.raf = requestAnimationFrame(this.loop);
  }

  pause() { if (this.running) this.paused = true; }
  resume() { if (this.running && !this.awaitingLevelUp) this.paused = false; }
  isPaused() { return this.paused; }
  levelOf(id: string): number { return this.levels[id] ?? 0; }

  chooseUpgrade(id: string) {
    if (!this.awaitingLevelUp) return;
    const up = UPGRADE_BY_ID[id];
    if (up) {
      up.apply(this.stats);
      this.levels[id] = (this.levels[id] ?? 0) + 1;
      if (up.heal) this.hp = Math.min(this.stats.maxHp, this.hp + up.heal);
      playSfx('fragment');
    }
    this.levelUpsPending = Math.max(0, this.levelUpsPending - 1);
    if (this.levelUpsPending > 0) this.presentLevelUp();
    else { this.awaitingLevelUp = false; this.paused = false; }
  }

  destroy() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.detachInput();
    this.renderer.dispose();
  }

  private clearEntities() {
    for (const e of this.enemies) this.scene.remove(e.mesh);
    for (const p of this.projs) this.scene.remove(p.mesh);
    for (const p of this.eProjs) this.scene.remove(p.mesh);
    for (const g of this.gems) this.scene.remove(g.mesh);
    for (const o of this.orbMeshes) this.scene.remove(o);
    this.enemies = []; this.projs = []; this.eProjs = []; this.gems = []; this.orbMeshes = [];
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
      this.joy.cx = e.clientX - r.left; this.joy.cy = e.clientY - r.top;
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
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / Math.max(1, this.h);
    this.camera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setPixelRatio(pr);
      this.composer.setSize(this.w, this.h);
    }
  }

  // ---------- الحلقة ----------

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.last) this.last = now;
    const realDt = (now - this.last) / 1000;
    this.last = now;
    const dt = realDt > 0.05 ? 0.05 : realDt;
    if (this.running && !this.paused && !this.awaitingLevelUp) this.update(dt);
    this.render();
    this.trackFps(realDt);
  };

  /** خطوة يدوية للاختبار (تتجاوز rAF المتوقّف في التبويب المخفيّ). */
  step(dt: number) { if (this.running) this.update(dt); this.render(); }

  // ---------- الجودة التكيّفية ----------

  /** يقيس FPS ويصعد/يهبط بين مستويات الجودة تلقائياً (مع hysteresis). */
  private trackFps(realDt: number) {
    const hidden = typeof document !== 'undefined' && document.visibilityState !== 'visible';
    if (!this.running || this.paused || this.awaitingLevelUp || hidden || realDt <= 0) {
      this.fpsFrames = 0; this.fpsTime = 0; return;
    }
    if (this.qCooldown > 0) this.qCooldown -= realDt;
    this.fpsFrames++; this.fpsTime += realDt;
    if (this.fpsTime < 1) return;
    const fps = this.fpsFrames / this.fpsTime;
    this.fpsFrames = 0; this.fpsTime = 0;
    if (this.qCooldown > 0) return;
    if (fps < 40 && this.quality !== 'low') {
      this.applyQuality(this.quality === 'high' ? 'medium' : 'low');
      this.qCooldown = 2.5; this.qGood = 0;
    } else if (fps > 56 && this.quality !== 'high') {
      // لا نصعد إلا بعد أداءٍ جيّد مستقرّ حتى لا يتذبذب
      if (++this.qGood >= 3) { this.applyQuality(this.quality === 'low' ? 'medium' : 'high'); this.qCooldown = 3; this.qGood = 0; }
    } else {
      this.qGood = 0;
    }
  }

  private applyQuality(tier: 'high' | 'medium' | 'low') {
    this.quality = tier;
    const dpr = window.devicePixelRatio || 1;
    if (tier === 'high') { this.setPR(Math.min(dpr, 2)); this.setShadow(true, 2048); this.bloom.enabled = true; this.bloom.strength = 0.62; }
    else if (tier === 'medium') { this.setPR(Math.min(dpr, 1.5)); this.setShadow(true, 1024); this.bloom.enabled = true; this.bloom.strength = 0.5; }
    else { this.setPR(1); this.setShadow(false, 512); this.bloom.enabled = false; }
  }

  private setPR(pr: number) {
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(this.w, this.h, false);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(this.w, this.h);
  }

  private setShadow(enabled: boolean, size: number) {
    const changed = this.renderer.shadowMap.enabled !== enabled;
    this.renderer.shadowMap.enabled = enabled;
    this.dir.castShadow = enabled;
    if (enabled && this.dir.shadow.mapSize.x !== size) {
      this.dir.shadow.mapSize.set(size, size);
      if (this.dir.shadow.map) { this.dir.shadow.map.dispose(); this.dir.shadow.map = null; }
    }
    // تبديل تفعيل الظلّ يستلزم إعادة تصريف الخامات
    if (changed) {
      this.scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.material) return;
        const mat = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((x) => (x.needsUpdate = true));
        else mat.needsUpdate = true;
      });
    }
  }

  private moveVec(): { x: number; y: number } {
    let vx = 0; let vy = 0;
    if (this.joy.active) {
      const dx = this.joy.cx - this.joy.ax;
      const dy = this.joy.cy - this.joy.ay;
      const mag = Math.hypot(dx, dy);
      if (mag > 6) { const s = Math.min(mag, 60) / 60 / mag; vx = dx * s; vy = dy * s; }
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
    const mv = this.moveVec();
    this.px = clamp(this.px + mv.x * this.stats.moveSpeed * dt, -ARENA, ARENA);
    this.pz = clamp(this.pz + mv.y * this.stats.moveSpeed * dt, -ARENA, ARENA);

    if (this.invuln > 0) this.invuln -= dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.stats.regen > 0) this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.regen * dt);

    const target = this.nearestEnemy();
    if (target) this.pAngle = Math.atan2(target.x - this.px, target.z - this.pz);
    else if (mv.x || mv.y) this.pAngle = Math.atan2(mv.x, mv.y);

    this.fireCd -= dt;
    if (target && this.fireCd <= 0) { this.fire(target); this.fireCd = 1 / this.stats.fireRate; }

    this.spawnLogic(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateAuraAndOrbits(dt);
    this.updateGems(dt);
    this.particles.update(dt);

    this.hudAcc += dt;
    if (this.hudAcc >= 0.1) { this.hudAcc = 0; this.emitHud(); }

    if (this.hp <= 0) this.gameOver();
  }

  private nearestEnemy(): Enemy | null {
    let best: Enemy | null = null; let bd = Infinity;
    for (const e of this.enemies) {
      const d = (e.x - this.px) ** 2 + (e.z - this.pz) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  private fire(target: Enemy) {
    const base = Math.atan2(target.x - this.px, target.z - this.pz);
    const n = this.stats.projCount;
    const spread = n > 1 ? 0.16 : 0;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * spread;
      const dx = Math.sin(a); const dz = Math.cos(a);
      const m = buildProjectile(this.element);
      m.scale.setScalar(this.stats.projRadius);
      m.position.set(this.px + dx * 18, PROJ_Y, this.pz + dz * 18);
      this.scene.add(m);
      this.projs.push({
        mesh: m, x: this.px + dx * 18, z: this.pz + dz * 18,
        vx: dx * this.stats.projSpeed, vz: dz * this.stats.projSpeed,
        r: this.stats.projRadius, dmg: this.stats.damage, pierceLeft: this.stats.pierce, life: 1.6, hits: new Set(),
      });
    }
    playSfx('attack');
  }

  // ---------- الظهور ----------

  private spawnLogic(dt: number) {
    this.waveTimer += dt;
    if (this.waveTimer >= 22) { this.waveTimer = 0; this.wave += 1; }

    this.bossTimer -= dt;
    if (this.bossTimer <= 0 && !this.bossAlive && this.enemies.length < MAX_ENEMIES - 1) {
      this.spawnTitan(); this.bossTimer = 75;
    }

    this.spawnAcc += dt;
    const interval = clamp(1.05 - this.wave * 0.05 - this.time * 0.003, 0.3, 1.05);
    while (this.spawnAcc >= interval && this.enemies.length < MAX_ENEMIES) {
      this.spawnAcc -= interval;
      const burst = 1 + Math.floor(this.wave / 5);
      for (let i = 0; i < burst && this.enemies.length < MAX_ENEMIES; i++) this.spawnEnemy();
    }
  }

  private pickKind(): EnemyKind {
    const w = this.wave; const roll = Math.random();
    if (w >= 3 && roll < 0.16) return 'tank';
    if (w >= 2 && roll < 0.38) return 'caster';
    if (roll < 0.62) return 'runner';
    return 'grunt';
  }

  private ringPoint(): { x: number; z: number } {
    const a = Math.random() * Math.PI * 2;
    return { x: this.px + Math.cos(a) * SPAWN_RING, z: this.pz + Math.sin(a) * SPAWN_RING };
  }

  private spawnEnemy() {
    const kind = this.pickKind();
    const def = ENEMY_KINDS[kind];
    const hpMul = 1 + this.time / 42 + this.ascensions * 0.5;
    const spdMul = Math.min(1.5, 1 + this.time / 220);
    const element = ELEMENTS_ARR[(Math.random() * ELEMENTS_ARR.length) | 0];
    const shape = def.shapes[(Math.random() * def.shapes.length) | 0];
    const p = this.ringPoint();
    const mesh = enemyTemplate(shape, element).clone();
    mesh.scale.setScalar(def.r);
    mesh.position.set(p.x, 0, p.z);
    this.shadowify(mesh);
    this.scene.add(mesh);
    this.enemies.push({
      id: this.nextId++, mesh, x: p.x, z: p.z, vx: 0, vz: 0,
      r: def.r, hp: def.hp * hpMul, maxHp: def.hp * hpMul,
      kind, shape, element, speed: def.speed * spdMul, touch: def.touch, xp: def.xp,
      flash: 0, shootCd: 1.2 + Math.random(), orbCd: 0, boss: false,
    });
  }

  private spawnTitan() {
    const p = this.ringPoint();
    const hp = (520 + this.time * 5) * (1 + this.ascensions * 0.6);
    const mesh = buildTitan();
    mesh.scale.setScalar(54);
    mesh.position.set(p.x, 0, p.z);
    this.shadowify(mesh);
    this.scene.add(mesh);
    this.enemies.push({
      id: this.nextId++, mesh, x: p.x, z: p.z, vx: 0, vz: 0,
      r: 54, hp, maxHp: hp, kind: 'tank', shape: 'golem', element: 'dark',
      speed: 34, touch: 22, xp: 40, flash: 0, shootCd: 2.4, orbCd: 0, boss: true,
    });
    this.bossAlive = true;
    playSfx('titan');
    this.hooks.onBanner('titanIncoming');
  }

  // ---------- الأعداء ----------

  private updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.flash > 0) e.flash -= dt;
      if (e.orbCd > 0) e.orbCd -= dt;

      const dx = this.px - e.x; const dz = this.pz - e.z;
      const dist = Math.hypot(dx, dz) || 1;
      const nx = dx / dist; const nz = dz / dist;
      const caster = e.kind === 'caster' && !e.boss;
      let move = 1;
      if (caster && dist < 220) move = -0.5;
      e.x += (nx * e.speed * move + e.vx) * dt;
      e.z += (nz * e.speed * move + e.vz) * dt;
      e.vx *= 0.86; e.vz *= 0.86;

      // تحديث المُجسّم
      e.mesh.position.set(e.x, 0, e.z);
      e.mesh.rotation.y = Math.atan2(nx, nz);
      if (e.flash > 0) { const s = e.r * (1 + e.flash * 0.9); e.mesh.scale.setScalar(s); }
      else if (e.mesh.scale.x !== e.r) e.mesh.scale.setScalar(e.r);

      if (caster || e.boss) {
        e.shootCd -= dt;
        if (e.shootCd <= 0) {
          e.shootCd = e.boss ? 1.9 : 2.2 + Math.random();
          if (e.boss) this.titanVolley(e); else this.enemyShot(e, nx, nz);
        }
      }

      if (dist < e.r + 14 && this.invuln <= 0) this.damagePlayer(e.touch, nx, nz);

      if (e.hp <= 0) { this.killEnemy(e, i); continue; }
      if (!e.boss && dist > SPAWN_RING * 2.4) { this.scene.remove(e.mesh); this.enemies.splice(i, 1); }
    }
  }

  private enemyShot(e: Enemy, nx: number, nz: number) {
    const m = buildEnemyProjectile(); m.scale.setScalar(7);
    m.position.set(e.x, PROJ_Y, e.z); this.scene.add(m);
    this.eProjs.push({ mesh: m, x: e.x, z: e.z, vx: nx * 190, vz: nz * 190, r: 7, dmg: 7, life: 4 });
  }

  private titanVolley(e: Enemy) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + this.time;
      const m = buildEnemyProjectile(); m.scale.setScalar(9);
      m.position.set(e.x, PROJ_Y, e.z); this.scene.add(m);
      this.eProjs.push({ mesh: m, x: e.x, z: e.z, vx: Math.sin(a) * 150, vz: Math.cos(a) * 150, r: 9, dmg: 10, life: 6 });
    }
    playSfx('combo');
  }

  private killEnemy(e: Enemy, index: number) {
    this.scene.remove(e.mesh);
    this.enemies.splice(index, 1);
    this.kills += 1;
    this.particles.spawn(e.x, e.r, e.z, this.colors[e.element], e.boss ? 60 : 14);
    if (this.stats.lifesteal > 0) this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.lifesteal);
    if (this.time - this.lastDeathSfx > 0.06) { playSfx('death'); this.lastDeathSfx = this.time; }

    if (e.boss) {
      this.bossAlive = false; this.shake = 0.5;
      this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.maxHp * 0.15);
      this.hooks.onBanner('titanDown');
      const frag = this.nextFragment % FRAGMENTS.length;
      this.addGem(e.x, e.z, 0, 0, 0, frag + 1, PALETTE[FRAGMENTS[frag].element].main);
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        this.addGem(e.x, e.z, Math.cos(a) * 120, Math.sin(a) * 120, 8, 0, PALETTE[e.element].main);
      }
    } else {
      this.addGem(e.x, e.z, 0, 0, e.xp, 0, PALETTE[e.element].main);
    }
  }

  private addGem(x: number, z: number, vx: number, vz: number, value: number, fragment: number, colorHex: string) {
    const mesh = buildGem(colorHex);
    mesh.scale.setScalar(fragment ? 13 : 7);
    mesh.position.set(x, 12, z);
    this.scene.add(mesh);
    this.gems.push({ mesh, x, z, vx, vz, value, fragment });
  }

  private damagePlayer(dmg: number, nx: number, nz: number) {
    this.hp -= dmg; this.invuln = 0.7;
    this.px = clamp(this.px - nx * 22, -ARENA, ARENA);
    this.pz = clamp(this.pz - nz * 22, -ARENA, ARENA);
    this.shake = Math.max(this.shake, 0.25);
    if (this.time - this.lastHitSfx > 0.08) { playSfx('hit'); this.lastHitSfx = this.time; }
    this.particles.spawn(this.px, 20, this.pz, this.colors[this.element], 10);
  }

  // ---------- القذائف ----------

  private updateProjectiles(dt: number) {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const b = this.projs[i];
      b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt;
      b.mesh.position.set(b.x, PROJ_Y, b.z);
      b.mesh.rotation.y += dt * 6;
      const far = Math.abs(b.x - this.px) > 900 || Math.abs(b.z - this.pz) > 900;
      if (b.life <= 0 || far) { this.scene.remove(b.mesh); this.projs.splice(i, 1); continue; }
      let removed = false;
      for (const e of this.enemies) {
        if (b.hits.has(e.id)) continue;
        const rr = e.r + b.r;
        if ((e.x - b.x) ** 2 + (e.z - b.z) ** 2 <= rr * rr) {
          e.hp -= b.dmg; e.flash = 0.14;
          const kb = this.stats.knockback;
          e.vx += (b.vx / this.stats.projSpeed) * kb; e.vz += (b.vz / this.stats.projSpeed) * kb;
          this.particles.spawn(b.x, PROJ_Y, b.z, this.colors[this.element], 3);
          b.hits.add(e.id);
          if (b.pierceLeft > 0) b.pierceLeft -= 1;
          else { this.scene.remove(b.mesh); this.projs.splice(i, 1); removed = true; break; }
        }
      }
      if (removed) continue;
    }
    for (let i = this.eProjs.length - 1; i >= 0; i--) {
      const b = this.eProjs[i];
      b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt;
      b.mesh.position.set(b.x, PROJ_Y, b.z);
      const far = Math.abs(b.x - this.px) > 900 || Math.abs(b.z - this.pz) > 900;
      if (b.life <= 0 || far) { this.scene.remove(b.mesh); this.eProjs.splice(i, 1); continue; }
      if (this.invuln <= 0) {
        const rr = 14 + b.r;
        if ((this.px - b.x) ** 2 + (this.pz - b.z) ** 2 <= rr * rr) {
          this.scene.remove(b.mesh); this.eProjs.splice(i, 1);
          const d = Math.hypot(b.x - this.px, b.z - this.pz) || 1;
          this.damagePlayer(b.dmg, (b.x - this.px) / d, (b.z - this.pz) / d);
        }
      }
    }
  }

  private updateAuraAndOrbits(dt: number) {
    // هالة السُم
    if (this.stats.auraRadius > 0) {
      this.aura.visible = true;
      this.aura.scale.setScalar(this.stats.auraRadius);
      this.aura.position.set(this.px, 0.5, this.pz);
      const rad = this.stats.auraRadius;
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if ((e.x - this.px) ** 2 + (e.z - this.pz) ** 2 <= (rad + e.r) ** 2) {
          e.hp -= this.stats.auraDps * dt;
          if (e.hp <= 0) this.killEnemy(e, i);
        }
      }
    } else {
      this.aura.visible = false;
    }

    // كرات الظلام الدائرة
    this.orbitAngle += dt * 2.4;
    const need = this.stats.orbitCount;
    while (this.orbMeshes.length < need) { const o = buildOrb(); o.scale.setScalar(9); this.scene.add(o); this.orbMeshes.push(o); }
    while (this.orbMeshes.length > need) { const o = this.orbMeshes.pop(); if (o) this.scene.remove(o); }
    if (need > 0) {
      const orbR = 60; const dmg = this.stats.damage * 0.6;
      for (let o = 0; o < need; o++) {
        const a = this.orbitAngle + (o / need) * Math.PI * 2;
        const ox = this.px + Math.cos(a) * orbR; const oz = this.pz + Math.sin(a) * orbR;
        this.orbMeshes[o].position.set(ox, 24, oz);
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (e.orbCd > 0) continue;
          if ((e.x - ox) ** 2 + (e.z - oz) ** 2 <= (e.r + 12) ** 2) {
            e.hp -= dmg; e.flash = 0.12; e.orbCd = 0.3;
            this.particles.spawn(ox, 24, oz, this.colors.dark, 2);
            if (e.hp <= 0) this.killEnemy(e, i);
          }
        }
      }
    }
  }

  // ---------- الخبرة ----------

  private updateGems(dt: number) {
    const mag = this.stats.magnet;
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      g.x += g.vx * dt; g.z += g.vz * dt; g.vx *= 0.9; g.vz *= 0.9;
      const dx = this.px - g.x; const dz = this.pz - g.z;
      const d2 = dx * dx + dz * dz;
      const pull = g.fragment ? mag + 90 : mag;
      if (d2 < pull * pull) { const d = Math.sqrt(d2) || 1; g.x += (dx / d) * 320 * dt; g.z += (dz / d) * 320 * dt; }
      g.mesh.position.set(g.x, 12 + Math.sin(this.time * 6 + g.x) * 3, g.z);
      g.mesh.rotation.y += dt * 3;
      if (d2 < 26 * 26) {
        if (g.fragment) this.collectFragment(); else this.gainXp(g.value);
        this.scene.remove(g.mesh); this.gems.splice(i, 1);
      }
    }
  }

  private gainXp(v: number) {
    this.xp += v; playSfx('draw');
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext; this.level += 1;
      this.xpNext = Math.floor(6 + this.level * 4 + this.level * this.level * 0.7);
      this.levelUpsPending += 1;
    }
    if (this.levelUpsPending > 0 && !this.awaitingLevelUp) this.presentLevelUp();
  }

  private presentLevelUp() {
    this.awaitingLevelUp = true; this.paused = true; playSfx('summon');
    this.hooks.onLevelUp(this.rollChoices());
  }

  private rollChoices(): Upgrade[] {
    const pool = UPGRADES.filter((u) => (this.levels[u.id] ?? 0) < u.max);
    const bag = [...(pool.length ? pool : UPGRADES)];
    const out: Upgrade[] = [];
    const n = Math.min(3, bag.length);
    for (let i = 0; i < n; i++) out.push(bag.splice((Math.random() * bag.length) | 0, 1)[0]);
    return out;
  }

  private collectFragment() {
    this.nextFragment += 1; this.fragments += 1; playSfx('fragment');
    this.hp = Math.min(this.stats.maxHp, this.hp + 15);
    if (this.fragments >= FRAGMENTS.length) this.ascension();
    else this.hooks.onBanner('fragmentGet');
  }

  private ascension() {
    this.fragments = 0; this.ascensions += 1;
    this.stats.damage *= 1.25; this.stats.maxHp += 20; this.hp = this.stats.maxHp; this.shake = 0.6;
    playSfx('win'); this.hooks.onBanner('ascension');
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.boss) { e.hp -= e.maxHp * 0.4; continue; }
      this.particles.spawn(e.x, e.r, e.z, this.colors[this.element], 10);
      this.addGem(e.x, e.z, 0, 0, e.xp, 0, PALETTE[e.element].main);
      this.scene.remove(e.mesh); this.enemies.splice(i, 1); this.kills += 1;
    }
    for (const b of this.eProjs) this.scene.remove(b.mesh);
    this.eProjs = [];
  }

  // ---------- HUD ونهاية ----------

  private emitHud() {
    this.hooks.onHud({
      hpFrac: clamp(this.hp / this.stats.maxHp, 0, 1), hp: Math.max(0, Math.ceil(this.hp)), maxHp: Math.round(this.stats.maxHp),
      xpFrac: clamp(this.xp / this.xpNext, 0, 1), level: this.level,
      timeMs: Math.round(this.time * 1000), kills: this.kills, wave: this.wave,
      fragments: this.fragments, ascensions: this.ascensions,
      elementMain: PALETTE[this.element].main, elementGlow: PALETTE[this.element].glow,
      quality: this.quality,
    });
  }

  private gameOver() {
    this.running = false; playSfx('lose');
    const timeMs = Math.round(this.time * 1000);
    let best = 0;
    try { best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch { /* تجاهل */ }
    const isBest = timeMs > best;
    if (isBest) { try { localStorage.setItem(BEST_KEY, String(timeMs)); } catch { /* تجاهل */ } }
    this.emitHud();
    this.hooks.onGameOver({ timeMs, level: this.level, kills: this.kills, ascensions: this.ascensions, best: Math.max(best, timeMs), isBest });
  }

  // ---------- الرسم ----------

  private render() {
    // تتبّع الكاميرا للبطل + اهتزاز
    let sx = 0; let sz = 0;
    if (this.shake > 0) { const m = this.shake * 40; sx = (Math.random() - 0.5) * m; sz = (Math.random() - 0.5) * m; }
    this.camera.position.set(this.px + sx, CAM_H, this.pz + CAM_BACK + sz);
    this.camera.lookAt(this.px, CAM_LOOK_Y, this.pz);

    this.hero.position.set(this.px, 0, this.pz);
    this.hero.rotation.y = this.pAngle;
    this.hero.visible = this.invuln > 0 ? Math.floor(this.invuln * 20) % 2 === 0 : true;

    // الضوء الاتجاهي وضوء البطل يتبعان الحركة فتبقى الظلال والإضاءة قرب المعركة
    this.dir.position.set(this.px + 200, 250, this.pz + 230);
    this.dir.target.position.set(this.px, 0, this.pz);
    this.heroLight.position.set(this.px, 46, this.pz);

    this.composer.render();
  }

  /** يفعّل إلقاء الظلّ على كل شبكات المُجسّم. */
  private shadowify(root: THREE.Object3D) {
    root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
  }

  /** بيئة IBL بسيطة من تدرّج لوني عبر PMREM — تمنح انعكاسات واقعية دون ملفّات. */
  private makeEnv(): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 64;
    const g = c.getContext('2d');
    if (g) {
      const grd = g.createLinearGradient(0, 0, 0, 64);
      grd.addColorStop(0, '#28376e');
      grd.addColorStop(0.5, '#0c1024');
      grd.addColorStop(1, '#1a1226');
      g.fillStyle = grd;
      g.fillRect(0, 0, 16, 64);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose();
    tex.dispose();
    return env;
  }
}

function clamp(v: number, a: number, b: number): number { return v < a ? a : v > b ? b : v; }
