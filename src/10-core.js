/* =====================================================================
   GORE TOWN — core runtime (namespace, math, input, prefs, quality)
   All game symbols live on GF / GFAudio / prefixed classes so they cannot
   collide with three.js top-level identifiers (which share module scope).
   ===================================================================== */

const GF = {
  name: 'GORE TOWN',
  version: '1.2.0',
  build: 'update-1.2',
  state: 'boot',          // boot | menu | loading | play | pause | dead
  device: 'pc',           // pc | mobile  (asked on the title screen)
  quality: 'high',
  time: 0,
  dt: 0,
  rawDt: 0,
  frame: 0,
  paused: false,
  goreLevel: 1.3,
  settings: {
    sensitivity: 1.0,
    touchSensitivity: 1.0,
    fov: 78,
    volume: 0.85,
    blood: true,
    shadows: true,
    voice: true,
    invertY: false,
    difficulty: 1.0,
    showFps: false,
    crosshair: true,
    autoReload: true,
    headbob: true
  },
  events: {},
  stats: { fps: 60, avgFps: 60, drawCalls: 0, tris: 0, ragdolls: 0, decals: 0, particles: 0 }
};

/* sandbox = free-play mode: passive AI until provoked, live level controls */
GF.sandbox = false;
GF.sandboxHostile = false;

/* Generated material maps are also exposed to the interface skin. */
if (typeof GT_TEX !== 'undefined') {
  if (GT_TEX.metal) document.documentElement.style.setProperty('--gt-tex-metal', 'url("' + GT_TEX.metal + '")');
  if (GT_TEX.menu_bg) document.documentElement.style.setProperty('--gt-menu-bg', 'url("' + GT_TEX.menu_bg + '")');
}

/* ---------------------------- event bus ---------------------------- */
GF.on = function (name, fn) {
  (GF.events[name] || (GF.events[name] = [])).push(fn);
};
GF.emit = function (name, data) {
  const list = GF.events[name];
  if (!list) return;
  for (let i = 0; i < list.length; i++) {
    try { list[i](data); } catch (e) { console.error('listener ' + name, e); }
  }
};

/* ------------------------------ math ------------------------------- */
GF.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
GF.lerp = (a, b, t) => a + (b - a) * t;
GF.invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
GF.smoothstep = (a, b, v) => { const t = GF.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
GF.damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
GF.rand = (a, b) => (b === undefined ? Math.random() * (a === undefined ? 1 : a) : a + Math.random() * (b - a));
GF.randInt = (a, b) => Math.floor(GF.rand(a, b + 1));
GF.randSign = () => (Math.random() < 0.5 ? -1 : 1);
GF.pick = (arr) => arr[(Math.random() * arr.length) | 0];
GF.chance = (p) => Math.random() < p;
GF.deg = (d) => d * Math.PI / 180;
GF.rad = (r) => r * 180 / Math.PI;
GF.wrapAngle = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
GF.angleDamp = (a, b, lambda, dt) => a + GF.wrapAngle(b - a) * (1 - Math.exp(-lambda * dt));
GF.dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
GF.round = (v, s) => Math.round(v / s) * s;
GF.fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n));
GF.mulberry32 = function (seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
GF.uid = (() => { let i = 0; return (p) => (p || 'id') + (++i); })();

/* ----------------------------- vectors ----------------------------- */
GF.V = {
  t1: new Vector3(), t2: new Vector3(), t3: new Vector3(), t4: new Vector3(),
  up: new Vector3(0, 1, 0), zero: new Vector3(),
  v3: (x, y, z) => new Vector3(x || 0, y || 0, z || 0)
};

/* ------------------------------ prefs ------------------------------ */
GF.Save = {
  key: 'goretown.prefs.v2',
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d && typeof d === 'object') {
        Object.assign(GF.settings, d.settings || {});
        if (d.device === 'pc' || d.device === 'mobile') GF.device = d.device;
        if (d.quality) GF.quality = d.quality;
      }
    } catch (e) { /* corrupted prefs are ignored */ }
  },
  save() {
    try {
      localStorage.setItem(this.key, JSON.stringify({
        settings: GF.settings, device: GF.device, quality: GF.quality
      }));
    } catch (e) { /* private mode */ }
  },
  clear() { try { localStorage.removeItem(this.key); } catch (e) { } }
};

/* ----------------------------- quality ----------------------------- */
GF.QUALITY = {
  /* tuned so a 2-core / 2-thread CPU with integrated graphics holds 60 fps:
     low renders at 62% resolution, no shadows, no AA, no dust and 8 ragdolls */
  low: { renderScale: 0.62, shadows: false, shadowSize: 512, decals: 100, particles: 700, maxRagdolls: 8, viewDist: 90, aa: false, anisotropy: 1, goreChunks: 8, lights: 2 },
  medium: { renderScale: 0.85, shadows: true, shadowSize: 1024, decals: 240, particles: 1600, maxRagdolls: 16, viewDist: 145, aa: false, anisotropy: 2, goreChunks: 16, lights: 4 },
  high: { renderScale: 1.0, shadows: true, shadowSize: 2048, decals: 520, particles: 3600, maxRagdolls: 28, viewDist: 240, aa: true, anisotropy: 4, goreChunks: 28, lights: 6 }
};
GF.qset = () => GF.QUALITY[GF.quality] || GF.QUALITY.high;

GF.detectDevice = function () {
  const ua = navigator.userAgent || '';
  const coarse = window.matchMedia ? matchMedia('(pointer:coarse)').matches : false;
  return (/Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile Safari/i.test(ua) || (navigator.maxTouchPoints > 1 && coarse)) ? 'mobile' : 'pc';
};
GF.guessQuality = function () {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  /* 2 cores / 2 threads: low by default, and never high on 4 threads */
  if (GF.device === 'mobile') return cores >= 6 && mem >= 4 ? 'medium' : 'low';
  if (cores <= 2) return 'low';
  if (cores >= 8 && mem >= 8) return 'high';
  if (cores >= 4) return 'medium';
  return 'low';
};

/* ------------------------------ input ------------------------------ */
GF.keys = Object.create(null);
GF.pressed = Object.create(null);   // one-shot edges, cleared each frame
GF.mouse = { x: 0, y: 0, dx: 0, dy: 0, left: false, right: false, middle: false, wheel: 0, locked: false };
GF.touch = {
  enabled: false, moveX: 0, moveY: 0, lookDX: 0, lookDY: 0,
  fire: false, aim: false, jump: false, reload: false, lean: 0, sprint: false, crouch: false,
  sticks: { moveId: null, lookId: null, moveOX: 0, moveOY: 0, lookOX: 0, lookOY: 0 }
};

GF.Input = {
  init(canvas) {
    this.canvas = canvas;
    const prevent = (e) => { if (e.target === canvas || GF.state === 'play') e.preventDefault(); };

    window.addEventListener('keydown', (e) => {
      const k = e.code;
      if (!GF.keys[k]) GF.pressed[k] = true;
      GF.keys[k] = true;
      if (['Tab', 'Space', 'KeyQ', 'KeyE', 'F1', 'F2', 'F3'].includes(k) && GF.state === 'play') e.preventDefault();
      if (k === 'Escape') GF.emit('escape');
      if (k === 'Tab') { e.preventDefault(); GF.emit('spawnMenu'); }
    }, { passive: false });

    window.addEventListener('keyup', (e) => { GF.keys[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in GF.keys) GF.keys[k] = false; GF.mouse.left = GF.mouse.right = false; });

    canvas.addEventListener('mousemove', (e) => {
      /* pointer lock is the primary path; drag-look keeps the game playable
         where an embedding iframe denies pointer lock */
      if (!GF.mouse.locked && !(GF.mouse.left || GF.mouse.right)) return;
      if (performance.now() < (GF.mouse.warpGuard || 0)) return;
      const dx = e.movementX || 0, dy = e.movementY || 0;
      /* browsers emit one huge delta when the pointer is captured; drop it */
      if (Math.abs(dx) > 220 || Math.abs(dy) > 220) return;
      GF.mouse.dx += dx;
      GF.mouse.dy += dy;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) GF.mouse.left = true;
      if (e.button === 1) GF.mouse.middle = true;
      if (e.button === 2) GF.mouse.right = true;
      if (GF.state === 'play' && !GF.mouse.locked && GF.device === 'pc') GF.Input.lock();
      GF.emit('mousedown', e);
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) GF.mouse.left = false;
      if (e.button === 1) GF.mouse.middle = false;
      if (e.button === 2) GF.mouse.right = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { GF.mouse.wheel += Math.sign(e.deltaY); if (GF.state === 'play') e.preventDefault(); }, { passive: false });

    document.addEventListener('pointerlockchange', () => {
      GF.mouse.locked = document.pointerLockElement === canvas;
      GF.emit('lockchange', GF.mouse.locked);
    });

    canvas.addEventListener('touchstart', prevent, { passive: false });
    canvas.addEventListener('touchmove', prevent, { passive: false });
  },
  lock() {
    if (GF.device !== 'pc') return;
    const c = this.canvas;
    if (c.requestPointerLock) {
      const p = c.requestPointerLock();
      if (p && p.catch) p.catch(() => { });
    }
  },
  unlock() { if (document.exitPointerLock) document.exitPointerLock(); },
  down(code) { return !!GF.keys[code]; },
  hit(code) { return !!GF.pressed[code]; },
  endFrame() {
    GF.mouse.dx = 0; GF.mouse.dy = 0; GF.mouse.wheel = 0;
    GF.pressed = Object.create(null);
  }
};

/* --------------------------- dom helpers --------------------------- */
GF.el = function (tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};
GF.$ = (sel) => document.querySelector(sel);
GF.$$ = (sel) => Array.from(document.querySelectorAll(sel));
GF.mkCanvas = function (w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};

/* ------------------------- adaptive resolution --------------------- */
GF.Adaptive = {
  acc: 0, frames: 0, ratio: 1, min: 0.45, max: 1, cool: 0,
  lowTicks: 0, degraded: false,
  tick(dt) {
    this.acc += dt; this.frames++;
    if (this.acc < 0.5) return;
    const fps = this.frames / this.acc;
    GF.stats.fps = fps;
    GF.stats.avgFps = GF.stats.avgFps * 0.8 + fps * 0.2;
    this.acc = 0; this.frames = 0;
    this.cool--;
    if (this.cool > 0) return;
    if (fps < 50 && this.ratio > this.min) {
      this.ratio = Math.max(this.min, this.ratio - 0.1);
      this.cool = 2;
      this.lowTicks = 0;
      GF.emit('scale', this.ratio);
    } else if (fps > 58 && this.ratio < this.max) {
      this.ratio = Math.min(this.max, this.ratio + 0.05);
      this.cool = 6;
      GF.emit('scale', this.ratio);
    }
    /* resolution is already at its floor and we are still far from 60 fps */
    if (!this.degraded && fps < 44 && this.ratio <= this.min + 0.001) {
      this.lowTicks++;
      if (this.lowTicks >= 6) { this.degraded = true; GF.emit('degrade'); }
    } else if (fps > 52) this.lowTicks = 0;
  }
};
