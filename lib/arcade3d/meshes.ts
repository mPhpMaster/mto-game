import * as THREE from 'three';
import type { Element } from '@/lib/game/types';
import { PALETTE, type Archetype } from '@/lib/arcade/theme';

/**
 * بناء مُجسّمات ثلاثية الأبعاد لوضع «البقاء 3D» من أشكال أوّلية بسيطة —
 * بثيم MTO نفسه: ستّة أشكال وحوش وستّة عناصر. الأشكال تُبنى بمقياس وحدة (نصف قطر ~1)
 * ثم يُكبّرها المحرّك بحجم العدو. الهندسات والخامات مشتركة ومخزّنة لتقليل الكلفة،
 * فاستنساخ القالب (`clone`) رخيص لأنه يشارك نفس الموارد.
 */

const G = {
  sphere: new THREE.SphereGeometry(1, 12, 10),
  box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(1, 2, 10),
  torus: new THREE.TorusGeometry(1, 0.16, 8, 20),
  octa: new THREE.OctahedronGeometry(1),
  ring: new THREE.RingGeometry(0.9, 1, 36),
};

const bodyMats = new Map<Element, THREE.MeshStandardMaterial>();
const glowMats = new Map<Element, THREE.MeshBasicMaterial>();
let sharedNormal: THREE.Texture | null = null;
function bodyNormal(): THREE.Texture {
  if (!sharedNormal) sharedNormal = makeNoiseNormalMap(96, 1.1);
  return sharedNormal;
}

function body(el: Element): THREE.MeshStandardMaterial {
  let m = bodyMats.get(el);
  if (!m) {
    const p = PALETTE[el];
    // خامة PBR: انعكاسات بيئية + معدنية معتدلة + خريطة نتوءات لتفاصيل السطح
    m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(p.main),
      emissive: new THREE.Color(p.deep),
      emissiveIntensity: 0.32,
      roughness: 0.42,
      metalness: 0.35,
      envMapIntensity: 0.9,
      normalMap: bodyNormal(),
      normalScale: new THREE.Vector2(0.45, 0.45),
    });
    bodyMats.set(el, m);
  }
  return m;
}

function glow(el: Element): THREE.MeshBasicMaterial {
  let m = glowMats.get(el);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE[el].glow) });
    glowMats.set(el, m);
  }
  return m;
}

function mesh(g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, sx: number, sy = sx, sz = sx): THREE.Mesh {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.scale.set(sx, sy, sz);
  return o;
}

function eyes(g: THREE.Group, el: Element, y: number, z: number, dx = 0.28) {
  g.add(mesh(G.sphere, glow(el), -dx, y, z, 0.13));
  g.add(mesh(G.sphere, glow(el), dx, y, z, 0.13));
}

// ===================== الأشكال الستّة (مقياس وحدة) =====================

function beast(el: Element): THREE.Group {
  const g = new THREE.Group();
  const b = body(el);
  g.add(mesh(G.sphere, b, 0, 0.8, 0, 1.1, 0.8, 1.4));
  g.add(mesh(G.sphere, b, 0, 1.15, 0.95, 0.7));
  for (const s of [-1, 1]) {
    const h = mesh(G.cone, glow(el), 0.28 * s, 1.55, 0.9, 0.14, 0.4, 0.14);
    h.rotation.x = -0.4;
    g.add(h);
  }
  for (const sx of [-0.55, 0.55]) for (const sz of [-0.7, 0.7]) g.add(mesh(G.box, b, sx, 0.28, sz, 0.2, 0.55, 0.2));
  eyes(g, el, 1.2, 1.5, 0.22);
  return g;
}

function serpent(el: Element): THREE.Group {
  const g = new THREE.Group();
  const b = body(el);
  for (let i = 0; i < 5; i++) {
    const z = -0.9 + i * 0.5;
    const x = Math.sin(i * 1.1) * 0.4;
    const s = 0.85 - i * 0.08;
    g.add(mesh(G.sphere, b, x, 0.6 + i * 0.14, z, s));
  }
  const head = mesh(G.sphere, b, Math.sin(5 * 1.1) * 0.4, 1.3, 1.35, 0.55);
  g.add(head);
  eyes(g, el, 1.42, 1.75, 0.18);
  return g;
}

function avian(el: Element): THREE.Group {
  const g = new THREE.Group();
  const b = body(el);
  g.add(mesh(G.sphere, b, 0, 0.95, 0, 0.55, 0.95, 0.6));
  for (const s of [-1, 1]) {
    const w = mesh(G.box, b, 0.95 * s, 1.15, 0, 1.2, 0.08, 0.7);
    w.rotation.z = 0.5 * s;
    g.add(w);
  }
  g.add(mesh(G.sphere, b, 0, 1.7, 0.15, 0.5));
  g.add(mesh(G.cone, glow(el), 0, 1.6, 0.6, 0.14, 0.35, 0.14).rotateX(1.4));
  eyes(g, el, 1.78, 0.55, 0.18);
  return g;
}

function orb(el: Element): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(G.sphere, body(el), 0, 1.05, 0, 0.9));
  const ring = mesh(G.torus, glow(el), 0, 1.05, 0, 1.25, 1.25, 1.25);
  ring.rotation.x = 1.1;
  g.add(ring);
  g.add(mesh(G.sphere, glow(el), 0, 1.05, 0.85, 0.28));
  return g;
}

function golem(el: Element): THREE.Group {
  const g = new THREE.Group();
  const b = body(el);
  g.add(mesh(G.box, b, 0, 1.0, 0, 1.1, 1.2, 0.7));
  g.add(mesh(G.box, b, 0, 1.95, 0, 0.7, 0.6, 0.6));
  for (const s of [-1, 1]) g.add(mesh(G.box, b, 0.8 * s, 1.0, 0, 0.28, 1.1, 0.36));
  for (const s of [-1, 1]) g.add(mesh(G.box, b, 0.4 * s, 0.35, 0, 0.34, 0.7, 0.38));
  eyes(g, el, 1.95, 0.32, 0.18);
  return g;
}

function wraith(el: Element): THREE.Group {
  const g = new THREE.Group();
  const p = PALETTE[el];
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(p.main), emissive: new THREE.Color(p.deep),
    emissiveIntensity: 0.7, roughness: 0.4, transparent: true, opacity: 0.9,
    normalMap: bodyNormal(), normalScale: new THREE.Vector2(0.35, 0.35),
  });
  m.envMapIntensity = 0.8;
  const cone = mesh(G.cone, m, 0, 0.95, 0, 0.9, 1.9, 0.9);
  g.add(cone);
  g.add(mesh(G.sphere, m, 0, 1.75, 0, 0.6));
  eyes(g, el, 1.82, 0.45, 0.22);
  return g;
}

const BUILDERS: Record<Archetype, (el: Element) => THREE.Group> = {
  beast, serpent, avian, orb, golem, wraith,
};

const templates = new Map<string, THREE.Group>();

/** يعيد قالباً مشتركاً لـ(شكل، عنصر)؛ استنسخه للعدو الواحد. */
export function enemyTemplate(shape: Archetype, el: Element): THREE.Group {
  const key = `${shape}:${el}`;
  let t = templates.get(key);
  if (!t) { t = BUILDERS[shape](el); templates.set(key, t); }
  return t;
}

export function buildTitan(): THREE.Group {
  const g = golem('dark');
  const core = mesh(G.sphere, glow('psychic'), 0, 1.2, 0, 0.5);
  g.add(core);
  // تاج من الأشواك
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spike = mesh(G.cone, glow('fire'), Math.cos(a) * 0.5, 2.4, Math.sin(a) * 0.5, 0.12, 0.5, 0.12);
    g.add(spike);
  }
  return g;
}

export function buildHero(el: Element): THREE.Group {
  const g = new THREE.Group();
  const p = PALETTE[el];
  // بطل كالبلّورة: خامة فيزيائية بطلاء لامع وانعكاسات بيئية قويّة
  const core = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(p.main), emissive: new THREE.Color(p.main),
    emissiveIntensity: 0.45, roughness: 0.14, metalness: 0.25,
    clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 1.3,
  });
  const gem = mesh(G.octa, core, 0, 1.3, 0, 0.85, 1.5, 0.85);
  g.add(gem);
  const ring = mesh(G.torus, glow(el), 0, 0.5, 0, 1.15, 1.15, 1.15);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  // مؤشّر الاتجاه (يشير إلى +Z)
  const nose = mesh(G.cone, glow(el), 0, 0.9, 1.2, 0.3, 0.6, 0.3);
  nose.rotation.x = Math.PI / 2;
  g.add(nose);
  return g;
}

export function buildProjectile(el: Element): THREE.Mesh {
  return new THREE.Mesh(G.octa, glow(el));
}

export function buildEnemyProjectile(): THREE.Mesh {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5d7a') });
  return new THREE.Mesh(G.sphere, m);
}

export function buildGem(colorHex: string): THREE.Mesh {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) });
  return new THREE.Mesh(G.octa, m);
}

export function buildAura(): THREE.Mesh {
  const m = new THREE.MeshBasicMaterial({
    color: new THREE.Color(PALETTE.grass.main), transparent: true, opacity: 0.18,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.CircleGeometry(1, 40), m);
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

export function buildOrb(): THREE.Mesh {
  return new THREE.Mesh(G.sphere, glow('dark'));
}

/** حقل جسيمات على GPU (THREE.Points) بسعة ثابتة وحلقة إعادة استخدام. */
export interface ParticleField {
  points: THREE.Points;
  spawn: (x: number, y: number, z: number, color: THREE.Color, count: number) => void;
  update: (dt: number) => void;
}

/** خريطة ضجيج رمادية قابلة للتكرار — تُستعمل roughnessMap لإكساب السطح تفاصيل مادّة. */
export function makeNoiseTexture(size = 128, repeat = 24): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (g) {
    const img = g.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 150 + ((Math.random() * 105) | 0);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  return tex;
}

/** خريطة نتوءات (normal map) إجرائية من ضجيج ناعم — تُكسِب الأسطح تفاصيل تتفاعل مع الضوء. */
export function makeNoiseNormalMap(size = 96, strength = 1.2): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (!g) return tex;
  // حقل ارتفاع منخفض التردّد: شبكة عشوائية صغيرة + استيفاء ثنائي الخطّية
  const lo = 24;
  const hgrid = new Float32Array(lo * lo);
  for (let i = 0; i < hgrid.length; i++) hgrid[i] = Math.random();
  const height = (x: number, y: number): number => {
    const fx = (x / size) * lo, fy = (y / size) * lo;
    const x0 = ((fx | 0) % lo + lo) % lo, y0 = ((fy | 0) % lo + lo) % lo;
    const x1 = (x0 + 1) % lo, y1 = (y0 + 1) % lo;
    const tx = fx - Math.floor(fx), ty = fy - Math.floor(fy);
    const a = hgrid[y0 * lo + x0], b = hgrid[y0 * lo + x1];
    const cc = hgrid[y1 * lo + x0], d = hgrid[y1 * lo + x1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (cc * (1 - tx) + d * tx) * ty;
  };
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const hl = height((x - 1 + size) % size, y), hr = height((x + 1) % size, y);
      const hd = height(x, (y - 1 + size) % size), hu = height(x, (y + 1) % size);
      let nx = (hl - hr) * strength, ny = (hd - hu) * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len;
      const idx = (y * size + x) * 4;
      img.data[idx] = (nx * 0.5 + 0.5) * 255;
      img.data[idx + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[idx + 2] = (nz / len * 0.5 + 0.5) * 255;
      img.data[idx + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  tex.needsUpdate = true;
  return tex;
}

export function buildParticles(capacity = 400): ParticleField {
  const pos = new Float32Array(capacity * 3);
  const col = new Float32Array(capacity * 3);
  const base = new Float32Array(capacity * 3);
  const vel = new Float32Array(capacity * 3);
  const life = new Float32Array(capacity);
  const age = new Float32Array(capacity);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 6, vertexColors: true, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const points = new THREE.Points(geom, mat);
  points.frustumCulled = false;
  let head = 0;

  const spawn = (x: number, y: number, z: number, color: THREE.Color, count: number) => {
    for (let i = 0; i < count; i++) {
      const j = head; head = (head + 1) % capacity;
      const a = Math.random() * Math.PI * 2;
      const b = Math.random() * Math.PI - Math.PI / 2;
      const s = 40 + Math.random() * 220;
      vel[j * 3] = Math.cos(a) * Math.cos(b) * s;
      vel[j * 3 + 1] = Math.abs(Math.sin(b)) * s * 0.8 + 20;
      vel[j * 3 + 2] = Math.sin(a) * Math.cos(b) * s;
      pos[j * 3] = x; pos[j * 3 + 1] = y; pos[j * 3 + 2] = z;
      base[j * 3] = color.r; base[j * 3 + 1] = color.g; base[j * 3 + 2] = color.b;
      col[j * 3] = color.r; col[j * 3 + 1] = color.g; col[j * 3 + 2] = color.b;
      life[j] = 0.4 + Math.random() * 0.4; age[j] = 0;
    }
  };

  const update = (dt: number) => {
    for (let j = 0; j < capacity; j++) {
      if (age[j] >= life[j]) {
        if (col[j * 3] || col[j * 3 + 1] || col[j * 3 + 2]) { col[j * 3] = col[j * 3 + 1] = col[j * 3 + 2] = 0; }
        continue;
      }
      age[j] += dt;
      pos[j * 3] += vel[j * 3] * dt;
      pos[j * 3 + 1] += vel[j * 3 + 1] * dt;
      pos[j * 3 + 2] += vel[j * 3 + 2] * dt;
      vel[j * 3] *= 0.92; vel[j * 3 + 1] = vel[j * 3 + 1] * 0.92 - 120 * dt; vel[j * 3 + 2] *= 0.92;
      const f = 1 - age[j] / life[j]; // يتلاشى مع العمر
      col[j * 3] = base[j * 3] * f;
      col[j * 3 + 1] = base[j * 3 + 1] * f;
      col[j * 3 + 2] = base[j * 3 + 2] * f;
    }
    (geom.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geom.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  };

  return { points, spawn, update };
}
