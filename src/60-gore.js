/* =====================================================================
   GORE TOWN — gore, decals, particles, tracers, explosions
   Blood reacts to the surface it lands on: walls streak and run, floors
   pool and spread, snow stains bright, metal keeps a dark smear.
   One instanced mesh draws every decal from an eight-tile atlas.
   ===================================================================== */

const GFG_UP = new Vector3(0, 1, 0);
const GFG_AX = new Vector3(), GFG_AY = new Vector3(), GFG_P = new Vector3();
const GFG_N = new Vector3(), GFG_D = new Vector3(), GFG_S = new Vector3();
const GFG_M = new Matrix4();
const GFG_Q = new Quaternion();

const GFG_TILE = {
  blood: 0, drip: 1, hole: 2, scorch: 3,
  brain: 4, crack: 5, pool: 6, spray: 7
};

/* gib meshes are sometimes a mesh with children (an eyeball has a pupil) */
function gfDisposeGib(root) {
  if (!root) return;
  if (root.traverse) root.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
  else if (root.geometry) root.geometry.dispose();
}

GF.Gore = {
  scene: null,
  decals: null,
  decalCap: 600,
  decalIndex: 0,
  decalDummy: new Object3D(),
  atlas: null,
  bloodTex: null,
  aTile: null,
  aAlpha: null,
  aTint: null,
  grow: [],
  points: null,
  pMax: 1400,
  pPos: null,
  pCol: null,
  pSize: null,
  pAlpha: null,
  parts: [],
  spurts: [],
  gibs: [],
  tracerPool: [],
  tracerIndex: 0,
  flashes: [],
  rings: [],
  lights: [],
  time: 0,
  pools: 0,

  init(scene) {
    this.scene = scene;
    this.bloodTex = this.makeBloodTexture();
    this.atlas = this.makeAtlas();
    const q = GF.qset();
    const cap = GF.quality === 'low' ? 190 : GF.quality === 'medium' ? 360 : 620;
    this.decalCap = Math.min(640, Math.max(160, Math.round(cap * (q.decals / 520))));
    this.grow.length = 0;
    this.spurts.length = 0;

    const geo = new PlaneGeometry(1, 1);
    this.aTile = new InstancedBufferAttribute(new Float32Array(this.decalCap * 2), 2);
    this.aAlpha = new InstancedBufferAttribute(new Float32Array(this.decalCap), 1);
    this.aTint = new InstancedBufferAttribute(new Float32Array(this.decalCap * 3), 3);
    geo.setAttribute('aTile', this.aTile);
    geo.setAttribute('aAlpha', this.aAlpha);
    geo.setAttribute('aTint', this.aTint);

    const mat = new ShaderMaterial({
      uniforms: { uMap: { value: this.atlas }, uGrid: { value: new Vector2(4, 2) } },
      vertexShader: [
        'attribute vec2 aTile; attribute float aAlpha; attribute vec3 aTint;',
        'uniform vec2 uGrid;',
        'varying vec2 vUv; varying float vA; varying vec3 vT;',
        'void main(){',
        ' vUv = (uv + aTile) / uGrid;',
        ' vA = aAlpha; vT = aTint;',
        ' vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);',
        ' gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D uMap;',
        'varying vec2 vUv; varying float vA; varying vec3 vT;',
        'void main(){',
        ' vec4 t = texture2D(uMap, vUv);',
        ' if (t.a < 0.03) discard;',
        ' gl_FragColor = vec4(vT * t.rgb, t.a * vA);',
        '}'
      ].join('\n'),
      transparent: true, depthWrite: false, side: DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8,
      toneMapped: false
    });

    this.decals = new InstancedMesh(geo, mat, this.decalCap);
    this.decals.frustumCulled = false;
    this.decals.instanceMatrix.setUsage(DynamicDrawUsage);
    this.decals.count = this.decalCap;
    this.decals.renderOrder = 2;
    const zero = GFG_M.makeScale(0, 0, 0);
    for (let i = 0; i < this.decalCap; i++) this.decals.setMatrixAt(i, zero);
    scene.add(this.decals);

    /* particle system */
    this.pMax = Math.max(500, GF.qset().particles);
    const pGeo = new BufferGeometry();
    this.pPos = new Float32Array(this.pMax * 3);
    this.pCol = new Float32Array(this.pMax * 3);
    this.pSize = new Float32Array(this.pMax);
    this.pAlpha = new Float32Array(this.pMax);
    pGeo.setAttribute('position', new BufferAttribute(this.pPos, 3));
    pGeo.setAttribute('color', new BufferAttribute(this.pCol, 3));
    pGeo.setAttribute('size', new BufferAttribute(this.pSize, 1));
    pGeo.setAttribute('alpha', new BufferAttribute(this.pAlpha, 1));
    const pMat = new ShaderMaterial({
      uniforms: { uTex: { value: this.bloodTex } },
      vertexShader: [
        'attribute float size; attribute float alpha; attribute vec3 color;',
        'varying vec3 vC; varying float vA;',
        'void main(){ vC = color; vA = alpha;',
        ' vec4 mv = modelViewMatrix * vec4(position,1.0);',
        ' gl_PointSize = size * (320.0 / max(0.001, -mv.z));',
        ' gl_Position = projectionMatrix * mv; }'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D uTex; varying vec3 vC; varying float vA;',
        'void main(){ vec4 t = texture2D(uTex, gl_PointCoord);',
        ' if (t.a < 0.12) discard;',
        ' gl_FragColor = vec4(vC * t.rgb, t.a * vA); }'
      ].join('\n'),
      transparent: true, depthWrite: false, blending: NormalBlending
    });
    this.points = new Points(pGeo, pMat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    /* tracer pool */
    const tGeo = new PlaneGeometry(1, 1);
    for (let i = 0; i < 24; i++) {
      const m = new Mesh(tGeo, new MeshBasicMaterial({
        color: 0xffe0a0, transparent: true, opacity: 0.85, depthWrite: false,
        blending: AdditiveBlending, toneMapped: false
      }));
      m.visible = false; m.userData.mapObject = true; m.frustumCulled = false;
      scene.add(m);
      this.tracerPool.push({ mesh: m, life: 0, max: 0 });
    }
  },

  /* ---------------------------- textures --------------------------- */
  makeBloodTexture() {
    const c = GF.mkCanvas(128, 128), g = c.getContext('2d');
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 24; i++) {
      const x = 64 + (Math.random() - 0.5) * 54, y = 64 + (Math.random() - 0.5) * 54;
      const r = 4 + Math.random() * 18;
      g.globalAlpha = 0.3 + Math.random() * 0.55;
      g.beginPath(); g.ellipse(x, y, r, r * (0.6 + Math.random() * 0.6), Math.random() * 3, 0, 7); g.fill();
    }
    g.globalAlpha = 0.95;
    g.beginPath(); g.arc(64, 64, 23, 0, 7); g.fill();
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * 7, d = 26 + Math.random() * 34;
      g.globalAlpha = 0.45 + Math.random() * 0.5;
      g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 1.5 + Math.random() * 5, 0, 7); g.fill();
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  },

  /* Eight 128px tiles: 0 splat, 1 drip, 2 hole, 3 scorch, 4 matter, 5 crack, 6 pool, 7 spray */
  makeAtlas() {
    const T = 128, W = T * 4, H = T * 2;
    const c = GF.mkCanvas(W, H), g = c.getContext('2d');
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#fff';
    const tile = (i, fn) => {
      const ox = (i % 4) * T, oy = ((i / 4) | 0) * T;
      g.save(); g.translate(ox, oy); g.beginPath(); g.rect(0, 0, T, T); g.clip(); fn(g, T); g.restore();
    };

    /* 0 — arterial splat */
    tile(0, (g) => {
      const cx = 64, cy = 64;
      const rg = g.createRadialGradient(cx, cy, 2, cx, cy, 40);
      rg.addColorStop(0, 'rgba(255,255,255,1)');
      rg.addColorStop(0.45, 'rgba(255,255,255,0.92)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg;
      g.beginPath();
      for (let a = 0; a < 40; a++) {
        const ang = a / 40 * Math.PI * 2;
        const r = 26 + Math.sin(a * 2.3) * 5 + Math.random() * 6;
        const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
        a ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath(); g.fill();
      for (let i = 0; i < 34; i++) {
        const a = Math.random() * 7, d = 30 + Math.random() * 34;
        g.globalAlpha = 0.35 + Math.random() * 0.6;
        g.beginPath();
        g.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1 + Math.random() * 4.5, 1 + Math.random() * 3.5, a, 0, 7);
        g.fill();
      }
      g.globalAlpha = 1;
    });

    /* 1 — gravity drip (hangs down the wall) */
    tile(1, (g) => {
      g.globalAlpha = 0.95;
      const grad = g.createLinearGradient(0, 10, 0, 100);
      grad.addColorStop(0, 'rgba(255,255,255,0.55)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.9)');
      grad.addColorStop(1, 'rgba(255,255,255,1)');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(52, 14); g.quadraticCurveTo(58, 52, 60, 92);
      g.quadraticCurveTo(64, 106, 68, 92); g.quadraticCurveTo(70, 52, 74, 14);
      g.closePath(); g.fill();
      g.beginPath(); g.ellipse(64, 100, 9, 11, 0, 0, 7); g.fill();
      g.globalAlpha = 0.8;
      g.beginPath(); g.ellipse(64, 18, 13, 7, 0, 0, 7); g.fill();
      for (let i = 0; i < 3; i++) {
        const x = 30 + Math.random() * 68;
        g.globalAlpha = 0.3 + Math.random() * 0.5;
        g.beginPath(); g.ellipse(x, 30 + Math.random() * 50, 1.4, 8 + Math.random() * 22, 0, 0, 7); g.fill();
      }
    });

    /* 2 — bullet hole with chipped rim */
    tile(2, (g) => {
      const rg = g.createRadialGradient(64, 64, 1, 64, 64, 26);
      rg.addColorStop(0, 'rgba(255,255,255,1)');
      rg.addColorStop(0.3, 'rgba(255,255,255,0.9)');
      rg.addColorStop(0.62, 'rgba(255,255,255,0.35)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg;
      g.beginPath(); g.arc(64, 64, 30, 0, 7); g.fill();
      g.globalAlpha = 0.9;
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * 7, d = 10 + Math.random() * 20;
        g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 1.5 + Math.random() * 4, 0, 7); g.fill();
      }
    });

    /* 3 — scorch / soot */
    tile(3, (g) => {
      const rg = g.createRadialGradient(64, 64, 4, 64, 64, 60);
      rg.addColorStop(0, 'rgba(255,255,255,0.95)');
      rg.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg;
      g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
      for (let i = 0; i < 60; i++) {
        const a = Math.random() * 7, d = Math.random() * 56;
        g.globalAlpha = 0.12 + Math.random() * 0.3;
        g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 0.8 + Math.random() * 3.4, 0, 7); g.fill();
      }
    });

    /* 4 — brain / soft tissue */
    tile(4, (g) => {
      g.globalAlpha = 0.92;
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * 7, d = Math.random() * 30;
        g.beginPath();
        g.ellipse(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 9 + Math.random() * 15, 8 + Math.random() * 12, a, 0, 7);
        g.fill();
      }
      g.globalAlpha = 0.5;
      for (let i = 0; i < 22; i++) {
        const a = Math.random() * 7, d = 26 + Math.random() * 36;
        g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 0.8 + Math.random() * 2.6, 0, 7); g.fill();
      }
    });

    /* 5 — glass crack */
    tile(5, (g) => {
      g.strokeStyle = '#fff';
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * 7;
        let x = 64, y = 64;
        g.globalAlpha = 0.5 + Math.random() * 0.5;
        g.lineWidth = 0.6 + Math.random() * 1.5;
        g.beginPath(); g.moveTo(x, y);
        const segs = 3 + (Math.random() * 3 | 0);
        for (let s = 0; s < segs; s++) {
          const d = 6 + Math.random() * 16;
          x += Math.cos(a + (Math.random() - 0.5) * 0.7) * d;
          y += Math.sin(a + (Math.random() - 0.5) * 0.7) * d;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      g.globalAlpha = 0.85; g.fillStyle = '#fff';
      g.beginPath(); g.arc(64, 64, 4, 0, 7); g.fill();
    });

    /* 6 — pool: wide irregular stain */
    tile(6, (g) => {
      g.globalAlpha = 0.95;
      g.beginPath();
      for (let a = 0; a < 56; a++) {
        const ang = a / 56 * Math.PI * 2;
        const r = 40 + Math.sin(a * 1.7) * 8 + Math.cos(a * 2.9) * 6 + Math.random() * 5;
        const x = 64 + Math.cos(ang) * r, y = 64 + Math.sin(ang) * r * 0.85;
        a ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath(); g.fill();
      g.globalAlpha = 0.55;
      g.beginPath(); g.ellipse(64, 64, 46, 38, 0, 0, 7); g.fill();
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * 7, d = 42 + Math.random() * 18;
        g.globalAlpha = 0.25 + Math.random() * 0.45;
        g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 1 + Math.random() * 3.4, 0, 7); g.fill();
      }
    });

    /* 7 — directional spray fan */
    tile(7, (g) => {
      const grad = g.createLinearGradient(0, 110, 0, 20);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.55, 'rgba(255,255,255,0.45)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(54, 116); g.lineTo(20, 30); g.quadraticCurveTo(64, 6, 108, 30); g.lineTo(74, 116);
      g.closePath(); g.fill();
      g.globalAlpha = 0.7;
      for (let i = 0; i < 34; i++) {
        const t = Math.random();
        const y = 112 - t * 92;
        const spread = 10 + t * 40;
        g.beginPath();
        g.ellipse(64 + (Math.random() - 0.5) * spread, y, 1 + Math.random() * 3, 1 + Math.random() * 3, 0, 0, 7);
        g.fill();
      }
    });

    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.generateMipmaps = false;
    t.minFilter = LinearFilter;
    t.magFilter = LinearFilter;
    return t;
  },

  /* ---------------------------- decals ---------------------------- */
  decal(pos, normal, size, color, kind) {
    kind = kind || 'blood';
    const blood = kind === 'blood' || kind === 'drip' || kind === 'brain' || kind === 'pool' || kind === 'spray';
    if (blood && !GF.settings.blood) return;
    const i = this.decalIndex++ % this.decalCap;
    const s = size || 1;
    const aspect = kind === 'drip' ? 2.1 + Math.random() * 2.2 : kind === 'spray' ? 1.35 : (0.72 + Math.random() * 0.55);
    const spin = (kind === 'blood' || kind === 'pool' || kind === 'scorch' || kind === 'brain' || kind === 'crack' || kind === 'hole');
    this.writeDecal(i, pos, normal, s, s * aspect,
      GFG_TILE[kind] === undefined ? 0 : GFG_TILE[kind],
      color === undefined ? 0x5c0d0b : color, 1, spin ? Math.random() * Math.PI * 2 : 0);
    GF.stats.decals = this.decalCap;
    return i;
  },

  /* decal that grows into place (pool spreading / drip running down a wall) */
  growDecal(pos, normal, size, color, kind, opts) {
    opts = opts || {};
    const blood = kind === 'blood' || kind === 'drip' || kind === 'pool';
    if (blood && !GF.settings.blood) return;
    if (this.grow.length > 34) this.grow.shift();
    const s = size || 1;
    const g = {
      pos: pos.clone(), normal: (normal || GFG_UP).clone(),
      s0: opts.s0 === undefined ? s * 0.25 : opts.s0,
      s1: opts.s1 === undefined ? s : opts.s1,
      aspect: kind === 'drip' ? 2.4 + Math.random() * 2.6 : kind === 'pool' ? 0.8 + Math.random() * 0.3 : 1,
      tile: GFG_TILE[kind] === undefined ? 0 : GFG_TILE[kind],
      color: color === undefined ? 0x5a0d0a : color,
      spin: kind === 'drip' ? 0 : Math.random() * Math.PI * 2,
      down: kind === 'drip' ? 1 : 0,
      t: 0, dur: opts.dur || (kind === 'drip' ? 1.4 + Math.random() * 1.6 : 1.1 + Math.random() * 1.4),
      slot: -1
    };
    g.slot = this.decalIndex++ % this.decalCap;
    g.draw = (sizeNow) => {
      GFG_P.copy(g.pos);
      if (g.down) {
        /* keep the top of the drip pinned to the impact point */
        this.surfaceBasis(g.normal, GFG_AX, GFG_AY);
        GFG_P.addScaledVector(GFG_AY, -sizeNow * g.aspect * 0.5);
      }
      this.writeDecal(g.slot, GFG_P, g.normal, sizeNow, sizeNow * g.aspect, g.tile, g.color, 1, g.spin, false);
    };
    this.grow.push(g);
    g.draw(g.s0);
    return g;
  },

  surfaceBasis(normal, outX, outY) {
    const n = normal;
    if (Math.abs(n.y) > 0.94) GFG_AX.set(1, 0, 0);
    else GFG_AX.set(0, 1, 0);
    outX.crossVectors(GFG_AX, n).normalize();
    outY.crossVectors(n, outX).normalize();
  },

  writeDecal(i, pos, normal, sx, sy, tile, color, alpha, spin, offset) {
    const n = normal || GFG_UP;
    GFG_P.copy(pos);
    this.surfaceBasis(n, GFG_AX, GFG_AY);
    GFG_N.copy(n).normalize();
    if (spin) {
      GFG_S.copy(GFG_AX).multiplyScalar(Math.cos(spin)).addScaledVector(GFG_AY, Math.sin(spin));
      GFG_D.copy(GFG_AX).multiplyScalar(-Math.sin(spin)).addScaledVector(GFG_AY, Math.cos(spin));
      GFG_AX.copy(GFG_S); GFG_AY.copy(GFG_D);
    }
    GFG_M.makeBasis(GFG_AX, GFG_AY, GFG_N);
    GFG_Q.setFromRotationMatrix(GFG_M);
    const d = this.decalDummy;
    d.position.copy(GFG_P);
    d.quaternion.copy(GFG_Q);
    d.scale.set(Math.max(0.001, sx), Math.max(0.001, sy), 1);
    d.updateMatrix();
    this.decals.setMatrixAt(i, d.matrix);
    this.aTile.array[i * 2] = tile % 4;
    this.aTile.array[i * 2 + 1] = 1 - ((tile / 4) | 0);
    this.aAlpha.array[i] = alpha;
    this.aTint.array[i * 3] = ((color >> 16) & 255) / 255;
    this.aTint.array[i * 3 + 1] = ((color >> 8) & 255) / 255;
    this.aTint.array[i * 3 + 2] = (color & 255) / 255;
    this.decals.instanceMatrix.needsUpdate = true;
    this.aTile.needsUpdate = true;
    this.aAlpha.needsUpdate = true;
    this.aTint.needsUpdate = true;
  },

  bloodOnSurface(pos, normal, size, mat, dir) {
    if (mat === 'water') return;
    const n = normal || GFG_UP;
    const s = (size || 1) * (mat === 'dirt' || mat === 'grass' ? 1.3 : mat === 'snow' ? 1.15 : 1);
    let color = 0x5c0d0b;
    if (mat === 'metal') color = 0x4c0c0a;
    if (mat === 'snow') color = 0x7e1c1c;
    if (mat === 'dirt' || mat === 'grass') color = 0x460a08;

    this.decal(pos, n, s * (0.85 + Math.random() * 0.35), color, 'blood');

    if (n.y > 0.55) {
      /* floor: pool spreads out and satellite drops land around it */
      this.growDecal(pos, n, s * 1.35, 0x3c0706, 'pool', { s0: s * 0.4, s1: s * (1.3 + Math.random() * 0.6) });
      const drops = 1 + (Math.random() * 2 | 0);
      for (let i = 0; i < drops; i++) {
        const a = Math.random() * 7, r = s * (0.8 + Math.random() * 1.8);
        GFG_P.set(pos.x + Math.cos(a) * r, pos.y + 0.01, pos.z + Math.sin(a) * r);
        this.decal(GFG_P, n, s * (0.2 + Math.random() * 0.35), 0x520b09, 'blood');
      }
      if (Math.random() < 0.5) {
        GFG_P.set(pos.x, pos.y + 0.005, pos.z);
        this.decal(GFG_P, n, s * 1.2, 0x360605, 'spray');
      }
    } else if (n.y > -0.5) {
      /* wall: run marks with a droplet head, plus a fine mist around the hit */
      const drips = 1 + (Math.random() * 3 | 0);
      for (let i = 0; i < drips; i++) {
        this.surfaceBasis(n, GFG_AX, GFG_AY);
        GFG_P.copy(pos).addScaledVector(GFG_AX, (Math.random() - 0.5) * s * 1.5).addScaledVector(GFG_AY, (Math.random() - 0.5) * s * 0.6);
        this.growDecal(GFG_P, n, s * (0.22 + Math.random() * 0.28), 0x4c0a08, 'drip', {
          s0: s * 0.15, s1: s * (0.5 + Math.random() * 0.8), dur: 1.6 + Math.random() * 2.2
        });
      }
      GFG_P.copy(pos).addScaledVector(n, 0.02);
      this.decal(GFG_P, n, s * (1.1 + Math.random() * 0.5), 0x5d0d0a, 'blood');
    } else if (n.y < -0.5) {
      /* ceiling: hanging droplets */
      this.decal(pos, n, s * 0.6, 0x5e0e0b, 'blood');
      for (let i = 0; i < 2; i++) {
        GFG_P.set(pos.x + (Math.random() - 0.5) * s, pos.y - 0.02, pos.z + (Math.random() - 0.5) * s);
        this.growDecal(GFG_P, n, s * 0.2, 0x4c0a08, 'drip', { s0: s * 0.1, s1: s * 0.4 });
      }
    }
  },

  impact(pos, normal, mat, dir) {
    const n = normal || GFG_UP;
    switch (mat) {
      case 'metal':
        this.burst(pos, n, 9, 2.6, 0xffd890, 0.035);
        this.burst(pos, n, 5, 1.2, 0xfff2c0, 0.05);
        this.decal(pos, n, 0.15 + Math.random() * 0.05, 0x141210, 'hole');
        if (Math.random() < 0.4) {
          this.decal(pos, n, 0.3, 0x2e2a24, 'scorch');
          if (dir) { GFG_D.copy(dir).reflect(n).normalize(); this.tracer(GFG_P.copy(pos), GFG_P.clone().addScaledVector(GFG_D, 6)); }
        }
        break;
      case 'glass':
        this.burst(pos, n, 14, 3.2, 0xd8f0ff, 0.045);
        this.decal(pos, n, 0.5 + Math.random() * 0.4, 0xbfe4f5, 'crack');
        this.decal(pos, n, 0.14, 0x0a0c0e, 'hole');
        break;
      case 'wood':
        this.burst(pos, n, 8, 1.6, 0xb08a50, 0.04);
        this.decal(pos, n, 0.2, 0x2a1e12, 'hole');
        break;
      case 'dirt':
      case 'grass':
        this.burst(pos, n, 7, 1.1, 0x8a7a5a, 0.06);
        this.decal(pos, n, 0.26, 0x241d14, 'hole');
        break;
      case 'snow':
        this.burst(pos, n, 8, 1.4, 0xeaf4ff, 0.05);
        this.decal(pos, n, 0.22, 0x2a3038, 'hole');
        break;
      default:
        this.burst(pos, n, 7, 1.3, 0xc8bcac, 0.045);
        this.burst(pos, n, 3, 0.7, 0x6a6258, 0.07);
        this.decal(pos, n, 0.2 + Math.random() * 0.07, 0x1a1612, 'hole');
        break;
    }
  },

  /* ------------------------- particles ------------------------- */
  spawnParticle(x, y, z, vx, vy, vz, r, g, b, size, life, opts) {
    if (this.parts.length >= this.pMax) this.parts.shift();
    const p = { x, y, z, vx, vy, vz, r, g, b, size, life, max: life, grav: 12, drag: 0.985, decal: false };
    if (opts) {
      if (opts.grav !== undefined) p.grav = opts.grav;
      if (opts.drag !== undefined) p.drag = opts.drag;
      if (opts.decal) p.decal = true;
      if (opts.wall) p.wall = true;
    }
    this.parts.push(p);
    return p;
  },

  spray(pos, dir, amount, colors, opts) {
    opts = opts || {};
    const n = Math.min(110, Math.round(amount * 15 * Math.max(0.35, GF.goreLevel)));
    const base = typeof colors === 'number' ? colors : 0x5e0f0d;
    const br = ((base >> 16) & 255) / 255, bg = ((base >> 8) & 255) / 255, bb = (base & 255) / 255;
    for (let i = 0; i < n; i++) {
      GFG_D.copy(dir || GFG_UP);
      GFG_D.x += (Math.random() - 0.5) * 1.7;
      GFG_D.y += (Math.random() - 0.15) * 1.3;
      GFG_D.z += (Math.random() - 0.5) * 1.7;
      GFG_D.normalize().multiplyScalar(1.1 + Math.random() * 5.8 * (opts.power || 1));
      const p = this.spawnParticle(
        pos.x + (Math.random() - 0.5) * 0.14, pos.y + (Math.random() - 0.5) * 0.14, pos.z + (Math.random() - 0.5) * 0.14,
        GFG_D.x, GFG_D.y, GFG_D.z,
        br * (0.55 + Math.random() * 0.7), bg * (0.4 + Math.random() * 0.5), bb * (0.4 + Math.random() * 0.5),
        0.03 + Math.random() * 0.075, 0.45 + Math.random() * 1.25
      );
      p.decal = true;
      p.wall = true;
    }
  },

  /* fine red haze that hangs in the air after a close impact */
  mist(pos, dir, amount) {
    if (!GF.settings.blood) return;
    const n = Math.min(18, Math.round((amount || 1) * 7 * Math.max(0.3, GF.goreLevel)));
    for (let i = 0; i < n; i++) {
      GFG_D.copy(dir || GFG_UP);
      GFG_D.x += (Math.random() - 0.5) * 1.1; GFG_D.y += (Math.random() - 0.2) * 0.9; GFG_D.z += (Math.random() - 0.5) * 1.1;
      GFG_D.normalize().multiplyScalar(0.5 + Math.random() * 2.2);
      this.spawnParticle(
        pos.x + (Math.random() - 0.5) * 0.3, pos.y + (Math.random() - 0.5) * 0.3, pos.z + (Math.random() - 0.5) * 0.3,
        GFG_D.x, GFG_D.y, GFG_D.z, 0.30, 0.035, 0.035,
        0.05 + Math.random() * 0.1, 0.5 + Math.random() * 0.7,
        { grav: 1.4, drag: 0.9 }
      );
    }
  },

  bloodDrip(x, y, z, amount) {
    if (!GF.settings.blood) return;
    const n = Math.round(1 + 2 * (amount || 1) * Math.max(0.3, GF.goreLevel));
    for (let i = 0; i < n; i++) {
      const p = this.spawnParticle(x + (Math.random() - 0.5) * 0.2, y, z + (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.35, -Math.random() * 0.45, (Math.random() - 0.5) * 0.35,
        0.38, 0.05, 0.05, 0.028 + Math.random() * 0.03, 1.4);
      p.decal = true;
    }
  },

  /* arterial pump: repeated bursts from a severed limb or neck */
  arterial(pos, dir, colors) {
    if (!GF.settings.blood) return;
    if (this.spurts.length > 12) this.spurts.shift();
    const base = typeof colors === 'number' ? colors : 0x681110;
    GFG_D.copy(dir || GFG_UP);
    if (GFG_D.lengthSq() < 0.01) GFG_D.set(0, 1, 0);
    GFG_D.normalize();
    this.spurts.push({
      x: pos.x, y: pos.y, z: pos.z,
      dx: GFG_D.x, dy: GFG_D.y + 0.35, dz: GFG_D.z,
      color: base, t: 0, dur: 1.1 + Math.random() * 0.9, acc: 0, pulse: Math.random() * 6
    });
  },

  headburst(pos, dir, colors) {
    this.spray(pos, dir, 3.2, colors, { power: 1.7 });
    this.mist(pos, dir, 2.2);
    this.gib(pos, dir, 'head', 1, colors);
    if (GF.settings.blood) {
      this.decal(GFG_P.copy(pos).setY(pos.y - 0.35), GFG_UP, 1.5 + Math.random() * 0.7, 0x4a0908, 'brain');
      for (let i = 0; i < 3; i++) this.gibChunk(pos, dir, 'brain', colors, 0.9);
      for (let i = 0; i < 4; i++) this.gibChunk(pos, dir, 'bone', colors, 0.6);
      this.arterial(pos, new Vector3(dir ? dir.x : 0, 0.9, dir ? dir.z : 0), colors);
    }
    if (GF.UI && GF.UI.splatter) GF.UI.splatter(0.55);
  },

  burst(pos, normal, count, speed, color, size) {
    const cr = ((color >> 16) & 255) / 255, cg = ((color >> 8) & 255) / 255, cb = (color & 255) / 255;
    for (let i = 0; i < count; i++) {
      GFG_D.set(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random()));
      if (normal) { GFG_D.x += normal.x * speed; GFG_D.y += normal.y * speed; GFG_D.z += normal.z * speed; }
      this.spawnParticle(pos.x, pos.y, pos.z, GFG_D.x, GFG_D.y, GFG_D.z, cr, cg, cb, size || 0.05, 0.25 + Math.random() * 0.45,
        { grav: 9, drag: 0.97 });
    }
  },

  smoke(pos, count, color, scale) {
    const cr = ((color === undefined ? 0x555555 : color) >> 16 & 255) / 255;
    const cg = ((color === undefined ? 0x555555 : color) >> 8 & 255) / 255;
    const cb = ((color === undefined ? 0x555555 : color) & 255) / 255;
    const n = Math.round((count || 8) * Math.max(0.4, GF.goreLevel));
    for (let i = 0; i < n; i++) {
      this.spawnParticle(pos.x + (Math.random() - 0.5) * 0.6, pos.y + Math.random() * 0.5, pos.z + (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 1.2, 0.6 + Math.random() * 1.6, (Math.random() - 0.5) * 1.2,
        cr, cg, cb, (scale || 1) * (0.25 + Math.random() * 0.55), 1.2 + Math.random() * 1.9,
        { grav: 1.2, drag: 0.94 });
    }
  },

  /* --------------------------- gibs --------------------------- */
  gib(pos, dir, part, scale, colors) {
    if (!GF.settings.blood) return;
    const s = (scale || 1);
    let geo, size, color;
    switch (part) {
      case 'head': geo = new SphereGeometry(0.115 * s, 8, 6); size = 0.24 * s; color = 0x8d3a3a; break;
      case 'lArm': case 'rArm': geo = new CylinderGeometry(0.062 * s, 0.05 * s, 0.5 * s, 7); size = 0.5 * s; color = (colors && colors.shirt) || '#6a5a44'; break;
      case 'lLeg': case 'rLeg': geo = new CylinderGeometry(0.082 * s, 0.068 * s, 0.68 * s, 7); size = 0.68 * s; color = (colors && colors.pants) || '#3a3a42'; break;
      default: geo = new IcosahedronGeometry(0.12 * s, 0); size = 0.24 * s; color = 0x7a2020;
    }
    const mat = GF.ragMat(color, 'skin');
    const mesh = new Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.castShadow = true;
    mesh.userData.dynamic = true;
    this.scene.add(mesh);
    const d = dir ? dir.clone() : new Vector3(0, 1, 0);
    const v = new Vector3(
      d.x * 3.4 + (Math.random() - 0.5) * 3,
      2.4 + Math.random() * 3.2,
      d.z * 3.4 + (Math.random() - 0.5) * 3
    );
    this.gibs.push({
      mesh, v, spin: new Vector3((Math.random() - 0.5) * 13, (Math.random() - 0.5) * 13, (Math.random() - 0.5) * 13),
      life: 30, size, bleed: 1.1, part
    });
    const cap = GF.quality === 'low' ? 34 : GF.quality === 'medium' ? 58 : 90;
    while (this.gibs.length > cap) {
      const g = this.gibs.shift();
      this.scene.remove(g.mesh);
      gfDisposeGib(g.mesh);
    }
  },

  gibChunk(pos, dir, kind, colors, scale) {
    if (!GF.settings.blood) return;
    const s = scale || 1;
    let geo, size, color, mat;
    if (kind === 'brain') {
      geo = new IcosahedronGeometry(0.055 * s, 1); size = 0.11 * s; color = 0x9a5a6a; mat = GF.ragMat('#b08090', 'skin');
    } else if (kind === 'bone') {
      geo = new BoxGeometry(0.03 * s, 0.016 * s, 0.09 * s); size = 0.09 * s; color = 0xd8ceb4; mat = GF.propMat('organic', '#ded4bc');
    } else if (kind === 'teeth') {
      geo = new BoxGeometry(0.014 * s, 0.02 * s, 0.014 * s); size = 0.03 * s; color = 0xe8e2cc; mat = GF.propMat('organic', '#e8e2cc');
    } else if (kind === 'eye') {
      geo = new SphereGeometry(0.026 * s, 8, 6); size = 0.05 * s; color = 0xd8cec0; mat = GF.ragMat('#d8cec0', 'skin');
    } else {
      geo = new IcosahedronGeometry(0.07 * s, 0); size = 0.14 * s; color = 0x8a2a2a; mat = GF.ragMat('#7a2424', 'skin');
    }
    const mesh = new Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.castShadow = false;
    mesh.userData.dynamic = true;
    this.scene.add(mesh);
    const d = dir || GFG_UP;
    this.gibs.push({
      mesh,
      v: new Vector3(d.x * 4 + (Math.random() - 0.5) * 3.4, 2.2 + Math.random() * 3.6, d.z * 4 + (Math.random() - 0.5) * 3.4),
      spin: new Vector3((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18),
      life: 26, size, bleed: kind === 'bone' ? 0.3 : 0.9, part: kind
    });
  },

  /* --------------------------- organs --------------------------- */
  /* Real viscera, not recoloured chunks: each organ has its own profile,
     bleeds steadily, pools on landing and shrivels as it cools. */
  organKinds: ['heart', 'lung', 'liver', 'intestine', 'stomach', 'kidney', 'spleen', 'pancreas'],

  organ(pos, dir, kind, scale, colors) {
    if (!GF.settings.blood) return null;
    const s = (scale || 1) * (0.85 + Math.random() * 0.3);
    const k = kind || GF.pick(this.organKinds);
    let geo, color, size, bleed;
    switch (k) {
      case 'heart':
        geo = new SphereGeometry(0.075 * s, 7, 5); geo.scale(1, 1.28, 0.82);
        color = '#6b1418'; size = 0.15 * s; bleed = 1.7; break;
      case 'lung':
        geo = new SphereGeometry(0.095 * s, 7, 5); geo.scale(0.8, 1.5, 0.62);
        color = '#8a4a4a'; size = 0.17 * s; bleed = 1.1; break;
      case 'liver':
        geo = new SphereGeometry(0.095 * s, 7, 5); geo.scale(1.5, 0.78, 0.95);
        color = '#4e1716'; size = 0.17 * s; bleed = 1.1; break;
      case 'intestine':
        geo = new TorusGeometry(0.085 * s, 0.03 * s, 5, 11);
        color = '#a25f52'; size = 0.17 * s; bleed = 1.5; break;
      case 'stomach':
        geo = new SphereGeometry(0.085 * s, 7, 5); geo.scale(1, 1.2, 0.9);
        color = '#8a5a48'; size = 0.16 * s; bleed = 1.2; break;
      case 'kidney':
        geo = new SphereGeometry(0.058 * s, 6, 5); geo.scale(0.8, 1.3, 0.72);
        color = '#5a2024'; size = 0.11 * s; bleed = 1.0; break;
      case 'spleen':
        geo = new SphereGeometry(0.07 * s, 6, 5); geo.scale(1.3, 0.62, 0.85);
        color = '#4a1a22'; size = 0.13 * s; bleed = 1.2; break;
      case 'pancreas':
        geo = new SphereGeometry(0.06 * s, 6, 5); geo.scale(1.7, 0.44, 0.55);
        color = '#b08a72'; size = 0.12 * s; bleed = 0.8; break;
      case 'eye':
        geo = new SphereGeometry(0.028 * s, 8, 6);
        color = '#d8cec0'; size = 0.05 * s; bleed = 0.35; break;
      case 'brain':
        geo = new IcosahedronGeometry(0.072 * s, 1);
        color = '#b07a86'; size = 0.13 * s; bleed = 0.8; break;
      default:
        geo = new SphereGeometry(0.07 * s, 6, 5);
        color = '#6e1a1c'; size = 0.13 * s; bleed = 1.0;
    }
    const mesh = new Mesh(geo, GF.ragMat(color, 'skin'));
    mesh.position.copy(pos);
    mesh.castShadow = false;
    mesh.userData.dynamic = true;
    if (k === 'eye') {
      const pupil = new Mesh(new SphereGeometry(0.013 * s, 6, 4), GF.ragMat('#141013', 'skin'));
      pupil.position.set(0, 0, 0.021 * s);
      mesh.add(pupil);
    }
    this.scene.add(mesh);
    const d = dir || GFG_UP;
    this.gibs.push({
      mesh,
      v: new Vector3(
        d.x * 2.4 + (Math.random() - 0.5) * 2.0,
        1.5 + Math.random() * 2.2,
        d.z * 2.4 + (Math.random() - 0.5) * 2.0
      ),
      spin: new Vector3((Math.random() - 0.5) * 11, (Math.random() - 0.5) * 11, (Math.random() - 0.5) * 11),
      life: 34, size, bleed, part: 'organ', organ: k
    });
    const cap = GF.quality === 'low' ? 34 : GF.quality === 'medium' ? 58 : 90;
    while (this.gibs.length > cap) {
      const g = this.gibs.shift();
      this.scene.remove(g.mesh);
      gfDisposeGib(g.mesh);
    }
    return mesh;
  },

  /* A torso hit that opens the abdomen: several organs, a wash of blood and
     a growing pool under the body. */
  organs(pos, dir, colors, opts) {
    if (!GF.settings.blood) return;
    opts = opts || {};
    const count = GF.clamp(Math.round(opts.count === undefined ? 3 : opts.count), 1, 6);
    const kinds = this.organKinds.slice();
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * kinds.length);
      const k = kinds.splice(idx, 1)[0] || 'heart';
      this.organ(pos, dir, k, 0.85 + Math.random() * 0.4, colors);
    }
    this.spray(pos, dir, 1.6, colors, { power: 1.4 });
    this.mist(pos, dir, 0.9);
    this.arterial(pos, new Vector3(dir ? dir.x : 0, 0.7, dir ? dir.z : 0), colors);
    const g = GF.World.groundAt(pos.x, pos.z, pos.y + 1.2);
    if (g > -1e8) {
      this.growDecal(GFG_P.set(pos.x, g + 0.012, pos.z), GFG_UP, 0.9, 0x430907, 'pool',
        { s0: 0.3, s1: 1.3 + Math.random() * 0.9, dur: 3.4 });
      this.decal(GFG_P.set(pos.x + (Math.random() - 0.5), g + 0.012, pos.z + (Math.random() - 0.5)),
        GFG_UP, 1.0, 0x490b09, 'blood');
    }
  },

  /* ------------------------- explosions ------------------------ */
  explosion(pos, radius, damage, opts) {
    opts = opts || {};
    const R = radius || 6;
    GFAudio.explosion(pos, R / 6);
    this.smoke(pos, 30, 0x22211f, R * 0.34);
    this.smoke(pos, 12, 0xff9a3c, R * 0.16);
    this.burst(pos, null, 34, 10, 0xffc060, 0.11);
    this.burst(pos, null, 20, 6, 0x3a2a1e, 0.09);
    this.mist(pos, null, 0.6);

    const g = GF.World.groundAt(pos.x, pos.z, pos.y + 1);
    if (g > -1e8) {
      this.decal(GFG_P.set(pos.x, g + 0.012, pos.z), GFG_UP, R * 0.75, 0x0e0c0a, 'scorch');
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * 7, r = R * (0.3 + Math.random() * 1.1);
        this.decal(GFG_P.set(pos.x + Math.cos(a) * r, g + 0.012, pos.z + Math.sin(a) * r), GFG_UP,
          R * (0.08 + Math.random() * 0.2), 0x17130f, 'scorch');
      }
    }

    /* dust shockwave ring */
    const ring = new Mesh(new RingGeometry(0.5, 0.75, 26), new MeshBasicMaterial({
      color: 0xd8c8a8, transparent: true, opacity: 0.5, side: DoubleSide, depthWrite: false, blending: AdditiveBlending
    }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, Math.max(g > -1e8 ? g + 0.08 : pos.y - 0.4, pos.y - 0.4), pos.z);
    ring.userData.mapObject = true;
    this.scene.add(ring);
    this.rings.push({ mesh: ring, t: 0, dur: 0.42, max: R * 2.6 });

    const flash = new PointLight(0xffb060, 40, R * 3, 2);
    flash.position.copy(pos);
    flash.userData.mapObject = true;
    this.scene.add(flash);
    this.lights.push({ light: flash, life: 0.22, max: 0.22 });

    if (GF.game && GF.game.actors) {
      for (const a of GF.game.actors) {
        if (!a.rag || a.rag.dead) continue;
        const r = a.rag;
        const chest = r.byKey.chest;
        const d = Math.hypot(chest.x - pos.x, chest.y - pos.y, chest.z - pos.z);
        if (d > R) continue;
        const falloff = 1 - d / R;
        const dirv = GFG_D.set(chest.x - pos.x, chest.y - pos.y + 0.4, chest.z - pos.z).normalize().clone();
        a.damage(damage * falloff, 'chest', { point: new Vector3(chest.x, chest.y, chest.z), dir: dirv, explosive: true });
        if (r.dead) {
          for (const n of r.nodes) {
            n.px -= dirv.x * 0.09 * falloff;
            n.py -= dirv.y * 0.07 * falloff;
            n.pz -= dirv.z * 0.09 * falloff;
          }
        }
      }
    }
    if (GF.Player && GF.Player.alive) {
      const c = GF.Player.camera.position;
      const d = Math.hypot(c.x - pos.x, c.y - pos.y, c.z - pos.z);
      if (d < R) {
        GF.Player.damage(damage * (1 - d / R) * 0.55, { source: 'explosion' });
        GF.Player.push(new Vector3(c.x - pos.x, 0.4, c.z - pos.z).normalize().multiplyScalar(6 * (1 - d / R)));
        if (GF.UI && GF.UI.splatter && d < R * 0.6) GF.UI.splatter(0.5);
      }
    }
    for (const p of GF.World.dyn.slice()) {
      if (!p.alive) continue;
      const d = Math.hypot(p.pos.x - pos.x, p.pos.y - pos.y, p.pos.z - pos.z);
      if (d > R + 1) continue;
      const falloff = 1 - Math.min(1, d / (R + 1));
      if (p.def.explosive && !p.detonated) {
        p.detonated = true;
        const pd = p.def;
        setTimeout(() => {
          if (!p.alive) return;
          GF.World.removeProp(p);
          this.explosion(new Vector3(p.pos.x, p.pos.y + 0.3, p.pos.z), pd.blast, pd.dmg, { chain: true });
        }, 60 + Math.random() * 160);
      } else if (p.def.mass < 200) {
        p.moving = true;
        p.vel.set((p.pos.x - pos.x) * 1.6 * falloff, 5 * falloff, (p.pos.z - pos.z) * 1.6 * falloff);
        p.spin = (Math.random() - 0.5) * 8;
      }
    }
    if (GF.game && GF.game.actors) {
      for (const a of GF.game.actors) {
        if (!a.rag || !a.rag.dead) continue;
        const r = a.rag;
        const ch = r.byKey.chest;
        const d = Math.hypot(ch.x - pos.x, ch.y - pos.y, ch.z - pos.z);
        if (d > R * 1.4) continue;
        const f = 1 - d / (R * 1.4);
        for (const n of r.nodes) {
          if (n.detached) continue;
          n.px -= (n.x - pos.x) * 0.02 * f;
          n.py -= (n.y - pos.y) * 0.02 * f;
          n.pz -= (n.z - pos.z) * 0.02 * f;
        }
        r.sleeping = false; r.sleepTimer = 0;
      }
    }
    if (GF.CameraShake) GF.CameraShake.add(Math.min(1.2, R / 8));
  },

  muzzleFlash(pos, scale) {
    const s = scale || 1;
    const geo = new PlaneGeometry(0.5 * s, 0.5 * s);
    const mat = new MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
    const m = new Mesh(geo, mat);
    m.position.copy(pos);
    m.userData.mapObject = true;
    m.frustumCulled = false;
    this.scene.add(m);
    this.flashes.push({ mesh: m, life: 0.055, max: 0.055 });
    const light = new PointLight(0xffb060, 9 * s, 16, 2);
    light.position.copy(pos);
    light.userData.mapObject = true;
    this.scene.add(light);
    this.lights.push({ light, life: 0.07, max: 0.07 });
  },

  tracer(from, to) {
    const t = this.tracerPool[this.tracerIndex++ % this.tracerPool.length];
    const dist = from.distanceTo(to);
    if (dist < 0.4) return;
    t.mesh.visible = true;
    t.mesh.position.copy(from).add(to).multiplyScalar(0.5);
    t.mesh.lookAt(to);
    t.mesh.scale.set(0.035, 0.035, dist);
    t.mesh.material.opacity = 0.7;
    t.life = 0.06; t.max = 0.06;
  },

  update(dt) {
    this.time += dt;

    /* growing decals */
    for (let i = this.grow.length - 1; i >= 0; i--) {
      const g = this.grow[i];
      g.t += dt;
      const p = Math.min(1, g.t / g.dur);
      const e = 1 - Math.pow(1 - p, 3);
      const size = g.s0 + (g.s1 - g.s0) * e;
      g.draw(size);
      if (p >= 1) this.grow.splice(i, 1);
    }

    /* arterial spurts */
    for (let i = this.spurts.length - 1; i >= 0; i--) {
      const s = this.spurts[i];
      s.t += dt;
      s.acc -= dt;
      if (s.acc <= 0) {
        s.acc = 0.045;
        const pulse = 0.6 + 0.6 * Math.max(0, Math.sin(s.t * 11 + s.pulse));
        const n = 2 + (Math.random() * 3 | 0);
        for (let k = 0; k < n; k++) {
          GFG_D.set(s.dx + (Math.random() - 0.5) * 0.45, s.dy + (Math.random() - 0.2) * 0.4, s.dz + (Math.random() - 0.5) * 0.45)
            .normalize().multiplyScalar((2.4 + Math.random() * 4.2) * pulse);
          const p = this.spawnParticle(
            s.x + (Math.random() - 0.5) * 0.08, s.y + (Math.random() - 0.5) * 0.08, s.z + (Math.random() - 0.5) * 0.08,
            GFG_D.x, GFG_D.y, GFG_D.z,
            0.48, 0.05, 0.05, 0.035 + Math.random() * 0.05, 0.7 + Math.random() * 0.7
          );
          p.decal = true;
        }
        if (Math.random() < 0.5) this.mist(s, GFG_D, 0.12);
      }
      if (s.t >= s.dur) this.spurts.splice(i, 1);
    }

    /* particles */
    const pos = this.pPos, col = this.pCol, size = this.pSize, alpha = this.pAlpha;
    let w = 0;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      p.vy -= p.grav * dt;
      p.vx *= p.drag; p.vz *= p.drag;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const g = GF.World.groundAt(p.x, p.z, p.y + 0.5);
      if (p.y <= g + 0.01 && p.vy < 0) {
        if (p.decal && GF.settings.blood) {
          GFG_N.set(0, 1, 0);
          GFG_P.set(p.x, g + 0.012, p.z);
          this.decal(GFG_P, GFG_N, 0.1 + p.size * 2.0, 0x5a0f0d, 'blood');
          if (Math.random() < 0.08) this.growDecal(GFG_P, GFG_N, 0.6, 0x470a08, 'pool', { s0: 0.2, s1: 0.8 + Math.random() });
        }
        this.parts.splice(i, 1);
        continue;
      }
      if (p.wall) {
        const solid = GF.World.pointSolid({ x: p.x, y: p.y, z: p.z }, 0.02);
        if (solid) {
          if (p.decal && GF.settings.blood) {
            GFG_P.set(p.x, p.y, p.z);
            const contact = GF.World.spherePush(GFG_P, 0.05);
            GFG_N.copy(contact && contact.normal ? contact.normal : GFG_UP);
            this.decal(GFG_P, GFG_N, 0.1 + p.size * 1.5, 0x4e0d0b, 'blood');
            if (GFG_N.y < 0.5 && Math.random() < 0.35) {
              this.growDecal(GFG_P, GFG_N, 0.16 + p.size, 0x4c0a08, 'drip', { s0: 0.1, s1: 0.4 + Math.random() * 0.6 });
            }
          }
          this.parts.splice(i, 1);
          continue;
        }
      }
      if (w < this.pMax) {
        pos[w * 3] = p.x; pos[w * 3 + 1] = p.y; pos[w * 3 + 2] = p.z;
        col[w * 3] = p.r; col[w * 3 + 1] = p.g; col[w * 3 + 2] = p.b;
        size[w] = p.size;
        alpha[w] = Math.min(1, p.life / (p.max * 0.45)) * 0.95;
        w++;
      }
    }
    this.points.geometry.setDrawRange(0, w);
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;
    this.points.geometry.attributes.alpha.needsUpdate = true;
    GF.stats.particles = this.parts.length;

    /* gibs */
    for (let i = this.gibs.length - 1; i >= 0; i--) {
      const g = this.gibs[i];
      g.life -= dt;
      g.v.y -= 20 * dt;
      g.mesh.position.addScaledVector(g.v, dt);
      g.mesh.rotation.x += g.spin.x * dt;
      g.mesh.rotation.y += g.spin.y * dt;
      g.mesh.rotation.z += g.spin.z * dt;
      /* wet trail behind flying meat */
      if (g.bleed > 0 && GF.settings.blood) {
        g.bleed -= dt;
        if (g.bleed <= 0 && g.v.lengthSq() > 4) {
          g.bleed = 0.16 + Math.random() * 0.1;
          if (Math.random() < 0.5) this.spawnParticle(g.mesh.position.x, g.mesh.position.y, g.mesh.position.z,
            (Math.random() - 0.5) * 0.2, -0.2, (Math.random() - 0.5) * 0.2, 0.4, 0.05, 0.05, 0.025 + Math.random() * 0.02, 0.8);
        }
      }
      const ground = GF.World.groundAt(g.mesh.position.x, g.mesh.position.z, g.mesh.position.y + 1);
      if (g.mesh.position.y <= ground + g.size * 0.4) {
        g.mesh.position.y = ground + g.size * 0.4;
        if (Math.abs(g.v.y) > 1.5) {
          if (GF.settings.blood) {
            GFG_P.set(g.mesh.position.x, ground + 0.012, g.mesh.position.z);
            this.growDecal(GFG_P, GFG_UP, 0.35 + Math.random() * 0.55, 0x4e0a08, 'pool', { s0: 0.15, s1: 0.7 + Math.random() * 0.7 });
          }
          g.v.y *= -0.26; g.v.x *= 0.55; g.v.z *= 0.55; g.spin.multiplyScalar(0.45);
        } else { g.v.set(0, 0, 0); g.spin.set(0, 0, 0); g.bleed = 0; }
      }
      /* organs cool and shrivel instead of popping out of existence */
      if (g.organ && g.life < 12) g.mesh.scale.setScalar(Math.max(0.45, g.life / 12));
      if (g.life <= 0) {
        this.scene.remove(g.mesh);
        gfDisposeGib(g.mesh);
        this.gibs.splice(i, 1);
      }
    }

    /* tracers */
    for (const t of this.tracerPool) {
      if (t.life > 0) {
        t.life -= dt;
        t.mesh.material.opacity = Math.max(0, t.life / t.max) * 0.8;
        if (t.life <= 0) t.mesh.visible = false;
      }
    }
    /* muzzle flashes */
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      f.mesh.material.opacity = Math.max(0, f.life / f.max);
      f.mesh.lookAt(GF.Player ? GF.Player.camera.position : f.mesh.position);
      if (f.life <= 0) {
        this.scene.remove(f.mesh);
        f.mesh.geometry.dispose(); f.mesh.material.dispose();
        this.flashes.splice(i, 1);
      }
    }
    /* shockwave rings */
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt;
      const p = Math.min(1, r.t / r.dur);
      const s = 0.2 + p * r.max;
      r.mesh.scale.set(s, s, s);
      r.mesh.material.opacity = 0.5 * (1 - p);
      if (p >= 1) {
        this.scene.remove(r.mesh);
        r.mesh.geometry.dispose(); r.mesh.material.dispose();
        this.rings.splice(i, 1);
      }
    }
    for (let i = this.lights.length - 1; i >= 0; i--) {
      const l = this.lights[i];
      l.life -= dt;
      l.light.intensity *= 0.86;
      if (l.life <= 0) {
        this.scene.remove(l.light);
        this.lights.splice(i, 1);
      }
    }
  },

  clear() {
    this.parts.length = 0;
    this.grow.length = 0;
    this.spurts.length = 0;
    for (const g of this.gibs) { this.scene.remove(g.mesh); gfDisposeGib(g.mesh); }
    this.gibs.length = 0;
    for (const f of this.flashes) this.scene.remove(f.mesh);
    this.flashes.length = 0;
    for (const r of this.rings) this.scene.remove(r.mesh);
    this.rings.length = 0;
    for (const l of this.lights) this.scene.remove(l.light);
    this.lights.length = 0;
    for (const t of this.tracerPool) t.mesh.visible = false;
    if (this.decals) {
      const zero = GFG_M.makeScale(0, 0, 0);
      for (let i = 0; i < this.decalCap; i++) this.decals.setMatrixAt(i, zero);
      for (let i = 0; i < this.decalCap; i++) this.aAlpha.array[i] = 0;
      this.decals.instanceMatrix.needsUpdate = true;
      this.aAlpha.needsUpdate = true;
    }
  }
};

GF.CameraShake = {
  amount: 0,
  add(v) { this.amount = Math.min(1.5, this.amount + v); },
  update(dt) { this.amount *= Math.exp(-6 * dt); return this.amount; }
};
