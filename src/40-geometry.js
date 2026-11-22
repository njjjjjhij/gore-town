/* =====================================================================
   GORE TOWN — procedural textures, materials, static geometry batch,
   spawnable prop models and firearm models.
   ===================================================================== */

GF._tex = {};
GF._mat = {};
GF.canvasNoise = function (g, w, h, count, alpha, colors) {
  for (let i = 0; i < count; i++) {
    const c = colors[(Math.random() * colors.length) | 0];
    g.fillStyle = c;
    g.globalAlpha = alpha * Math.random();
    const s = 1 + Math.random() * 3;
    g.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
  g.globalAlpha = 1;
};

/* ---------------------------------------------------------------------
   Surface relief. A normal map is baked from the same canvas that supplies
   the albedo, so paint, grain, pores and cracks catch the light instead of
   reading as a flat painted sheet. The Sobel pass runs once per material
   family and is refreshed when an embedded photo finishes decoding.
   --------------------------------------------------------------------- */
GF._nrm = {};
GF.NRM_STRENGTH = {
  metal: 0.5, polymer: 0.5, wood: 0.9, leather: 0.85, fabric: 0.75, skin: 0.55,
  meat: 1.0, bone: 0.6, brick: 1.0, rock: 1.15, concrete: 0.85, plaster: 0.7,
  camo: 0.6, sand: 0.6, snow: 0.4, dirt: 0.85, asphalt: 1.0, rust: 1.2, tile: 0.75, grass: 0.8
};

GF.bakeNormal = function (src, dst, strength) {
  if (!src || !dst) return;
  const S = src.width;
  let data;
  try { data = src.getContext('2d').getImageData(0, 0, S, S); } catch (e) { return; }
  const px = data.data;
  const h = new Float32Array(S * S);
  for (let i = 0, p = 0; i < S * S; i++, p += 4) {
    h[i] = (px[p] * 0.299 + px[p + 1] * 0.587 + px[p + 2] * 0.114) / 255;
  }
  const out = dst.getContext('2d').createImageData(S, S);
  const o = out.data;
  const k = (strength || 0.7) * 3.4;
  for (let y = 0; y < S; y++) {
    const yc = y * S, ym = ((y - 1 + S) % S) * S, yp = ((y + 1) % S) * S;
    for (let x = 0; x < S; x++) {
      const dx = (h[yc + (x + 1) % S] - h[yc + (x - 1 + S) % S]) * k;
      const dy = (h[yp + x] - h[ym + x]) * k;
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      const i4 = (yc + x) * 4;
      o[i4] = ((-dx / len) * 0.5 + 0.5) * 255;
      o[i4 + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      o[i4 + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      o[i4 + 3] = 255;
    }
  }
  dst.getContext('2d').putImageData(out, 0, 0);
};

GF.normalFor = function (kind) {
  const base = GF._tex[kind];
  const cv = base && base.userData && base.userData.canvas;
  if (!cv) return null;
  let t = GF._nrm[kind];
  if (!t) {
    const nc = GF.mkCanvas(cv.width, cv.height);
    GF.bakeNormal(cv, nc, GF.NRM_STRENGTH[kind] || 0.7);
    t = new CanvasTexture(nc);
    t.wrapS = base.wrapS;
    t.wrapT = base.wrapT;
    t.repeat.copy(base.repeat);
    t.colorSpace = NoColorSpace;
    t.anisotropy = base.anisotropy;
    t.userData.canvas = nc;
    GF._nrm[kind] = t;
  }
  return t;
};

GF.refreshNormal = function (kind) {
  const t = GF._nrm[kind];
  const base = GF._tex[kind];
  if (!t || !base || !base.userData || !base.userData.canvas) return;
  GF.bakeNormal(base.userData.canvas, t.userData.canvas, GF.NRM_STRENGTH[kind] || 0.7);
  t.needsUpdate = true;
};

GF.tex = function (kind) {
  if (GF._tex[kind]) return GF._tex[kind];
  const src = (typeof GT_TEX !== 'undefined' && GT_TEX[kind]) || null;
  const S = (src || kind === 'skin' || kind === 'meat') ? 512 : 256;
  const c = GF.mkCanvas(S, S);
  const g = c.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, S, S);

  const grime = (base, tones, n) => {
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    GF.canvasNoise(g, S, S, n || 4000, 0.22, tones);
  };

  switch (kind) {
    case 'concrete':
      grime('#8d8d88', ['#6f6f6b', '#a3a39d', '#787873', '#b0b0a9'], 6000);
      for (let i = 0; i < 14; i++) {
        g.strokeStyle = 'rgba(60,60,58,' + (0.1 + Math.random() * 0.2) + ')';
        g.lineWidth = 1 + Math.random() * 2;
        g.beginPath();
        let x = Math.random() * S, y = Math.random() * S;
        g.moveTo(x, y);
        for (let j = 0; j < 5; j++) { x += (Math.random() - 0.5) * 40; y += Math.random() * 30; g.lineTo(x, y); }
        g.stroke();
      }
      break;
    case 'plaster':
      grime('#b8b1a2', ['#a09a8d', '#cfc8b8', '#8d887c'], 5000);
      for (let i = 0; i < 9; i++) {
        const x = Math.random() * S, y = Math.random() * S, r = 10 + Math.random() * 45;
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, 'rgba(90,80,62,0.35)');
        rg.addColorStop(1, 'rgba(90,80,62,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      break;
    case 'brick':
      g.fillStyle = '#9c9488'; g.fillRect(0, 0, S, S);
      const bh = 26, bw = 62;
      for (let row = 0; row < S / bh + 1; row++) {
        for (let col = -1; col < S / bw + 1; col++) {
          const off = (row % 2) * bw * 0.5;
          const x = col * bw + off + 2, y = row * bh + 2;
          const shade = 0.75 + Math.random() * 0.35;
          g.fillStyle = 'rgb(' + Math.floor(124 * shade) + ',' + Math.floor(66 * shade) + ',' + Math.floor(52 * shade) + ')';
          g.fillRect(x, y, bw - 4, bh - 4);
          g.fillStyle = 'rgba(255,255,255,0.05)';
          g.fillRect(x, y, bw - 4, 2);
        }
      }
      GF.canvasNoise(g, S, S, 2400, 0.14, ['#3a2a22', '#000000', '#b09080']);
      break;
    case 'wood':
      g.fillStyle = '#6b4a2c'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 26; i++) {
        const x = (i / 26) * S;
        g.fillStyle = 'rgba(0,0,0,' + (0.06 + Math.random() * 0.12) + ')';
        g.fillRect(x, 0, 1.5, S);
      }
      for (let i = 0; i < 300; i++) {
        g.strokeStyle = 'rgba(' + (60 + Math.random() * 60) + ',' + (38 + Math.random() * 30) + ',20,' + (0.1 + Math.random() * 0.25) + ')';
        g.lineWidth = 0.6 + Math.random();
        const y = Math.random() * S;
        g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(S * 0.3, y + 4, S * 0.6, y - 5, S, y + 2); g.stroke();
      }
      break;
    case 'metal':
      g.fillStyle = '#6a6f74'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 900; i++) {
        g.strokeStyle = 'rgba(255,255,255,' + Math.random() * 0.08 + ')';
        g.beginPath();
        const x = Math.random() * S;
        g.moveTo(x, 0); g.lineTo(x + (Math.random() - 0.5) * 6, S); g.stroke();
      }
      GF.canvasNoise(g, S, S, 1400, 0.12, ['#3a3e42', '#9aa0a6']);
      break;
    case 'rust':
      g.fillStyle = '#7a4526'; g.fillRect(0, 0, S, S);
      GF.canvasNoise(g, S, S, 9000, 0.35, ['#5a2f18', '#a05a2a', '#c47a3a', '#3a1e10']);
      break;
    case 'dirt':
      grime('#6a5942', ['#55462f', '#7d6a4e', '#4a3c28', '#8a7454'], 9000);
      break;
    case 'asphalt':
      grime('#3d3d40', ['#2e2e31', '#4c4c50', '#585860', '#212124'], 9000);
      for (let i = 0; i < 10; i++) {
        g.strokeStyle = 'rgba(20,20,22,0.5)'; g.lineWidth = 1;
        g.beginPath(); let x = Math.random() * S, y = Math.random() * S; g.moveTo(x, y);
        for (let j = 0; j < 4; j++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; g.lineTo(x, y); }
        g.stroke();
      }
      break;
    case 'tile':
      g.fillStyle = '#c9c4b8'; g.fillRect(0, 0, S, S);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        const on = (x + y) % 2 === 0;
        g.fillStyle = on ? '#d6d1c4' : '#8e8a80';
        g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
      }
      GF.canvasNoise(g, S, S, 2000, 0.1, ['#6a665c', '#ffffff']);
      break;
    case 'grass':
      grime('#4a5a30', ['#3a4a24', '#5d6f3c', '#6f7f44', '#2e3a1e'], 12000);
      for (let i = 0; i < 900; i++) {
        g.strokeStyle = 'rgba(' + (50 + Math.random() * 60) + ',' + (70 + Math.random() * 60) + ',30,0.4)';
        const x = Math.random() * S, y = Math.random() * S;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 3, y - 3 - Math.random() * 4); g.stroke();
      }
      break;
    case 'sand':
      grime('#b6a17c', ['#a08b66', '#c9b48d', '#8d7a58', '#d2bf9a'], 9000);
      break;
    case 'rock':
      grime('#6e6d66', ['#575650', '#85847c', '#4a4944', '#98978e'], 7000);
      break;
    case 'snow':
      grime('#dde4e8', ['#c9d2d8', '#f0f5f8', '#b6c0c6'], 5000);
      break;
    case 'fabric':
      g.fillStyle = '#7a6a54'; g.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 3) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, y, S, 1); }
      for (let x = 0; x < S; x += 3) { g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(x, 0, 1, S); }
      GF.canvasNoise(g, S, S, 3000, 0.12, ['#55483a', '#9a8a70']);
      break;
    case 'polymer': {
      g.fillStyle = '#7c7c78'; g.fillRect(0, 0, S, S);
      GF.canvasNoise(g, S, S, 6000, 0.14, ['#62625f', '#91918c', '#6e6e6a']);
      for (let y = 4; y < S; y += 7) {
        for (let x = 4; x < S; x += 7) {
          const j = (Math.random() - 0.5) * 2;
          g.fillStyle = 'rgba(45,45,43,0.35)';
          g.fillRect(x - 1.5 + j, y - 1.5 + j, 3, 3);
          g.fillStyle = 'rgba(205,205,200,0.22)';
          g.fillRect(x - 1.5 + j, y - 2.2 + j, 3, 1);
        }
      }
      break;
    }
    case 'skin': {
      g.fillStyle = '#cbb8a9'; g.fillRect(0, 0, S, S);
      GF.canvasNoise(g, S, S, 12000, 0.13, ['#b19a8b', '#ddcdc0', '#9d8577', '#d3bfae']);
      for (let i = 0; i < 5200; i++) {
        const x = Math.random() * S, y = Math.random() * S, r = 0.35 + Math.random() * 1.15;
        g.fillStyle = 'rgba(82,64,54,' + (0.07 + Math.random() * 0.12) + ')';
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,240,226,0.06)';
        g.beginPath(); g.arc(x - r * 0.4, y - r * 0.4, r * 0.7, 0, 7); g.fill();
      }
      for (let i = 0; i < 28; i++) {
        g.strokeStyle = 'rgba(92,72,60,' + (0.05 + Math.random() * 0.07) + ')';
        g.lineWidth = 0.7 + Math.random() * 0.8;
        let x = Math.random() * S, y = Math.random() * S;
        g.beginPath(); g.moveTo(x, y);
        for (let j = 0; j < 3; j++) { x += (Math.random() - 0.5) * 46; y += (Math.random() - 0.5) * 26; g.lineTo(x, y); }
        g.stroke();
      }
      break;
    }
    case 'meat': {
      g.fillStyle = '#ad837a'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 26; i++) {
        const x = Math.random() * S, y = Math.random() * S, r = 24 + Math.random() * 80;
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        const dark = Math.random() < 0.5;
        rg.addColorStop(0, dark ? 'rgba(112,68,63,0.38)' : 'rgba(208,158,143,0.30)');
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      GF.canvasNoise(g, S, S, 11000, 0.18, ['#8d5a53', '#c9a092', '#7c4b46', '#d8b4a4']);
      /* branching veins and sinew */
      for (let i = 0; i < 24; i++) {
        g.strokeStyle = 'rgba(86,48,46,' + (0.2 + Math.random() * 0.25) + ')';
        g.lineWidth = 0.7 + Math.random() * 1.8;
        let x = Math.random() * S, y = Math.random() * S;
        g.beginPath(); g.moveTo(x, y);
        for (let j = 0; j < 5; j++) { x += (Math.random() - 0.5) * 54; y += (Math.random() - 0.35) * 42; g.lineTo(x, y); }
        g.stroke();
      }
      for (let i = 0; i < 700; i++) {
        g.fillStyle = 'rgba(232,204,186,' + (0.15 + Math.random() * 0.25) + ')';
        const r = 0.8 + Math.random() * 1.8;
        g.beginPath(); g.arc(Math.random() * S, Math.random() * S, r, 0, 7); g.fill();
      }
      break;
    }
    case 'leather': {
      g.fillStyle = '#584c41'; g.fillRect(0, 0, S, S);
      GF.canvasNoise(g, S, S, 9000, 0.16, ['#463b32', '#6b5d50', '#3c332c', '#756657']);
      for (let i = 0; i < 4200; i++) {
        g.fillStyle = 'rgba(28,22,18,' + (0.1 + Math.random() * 0.16) + ')';
        g.beginPath(); g.arc(Math.random() * S, Math.random() * S, 0.5 + Math.random() * 1.2, 0, 7); g.fill();
      }
      for (let i = 0; i < 14; i++) {
        g.strokeStyle = 'rgba(190,170,150,0.10)'; g.lineWidth = 0.8 + Math.random();
        let x = Math.random() * S, y = Math.random() * S;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 90, y + (Math.random() - 0.5) * 60); g.stroke();
      }
      break;
    }
    case 'bone': {
      g.fillStyle = '#d2cab6'; g.fillRect(0, 0, S, S);
      GF.canvasNoise(g, S, S, 8000, 0.13, ['#b9b09a', '#e6dfcc', '#a89f8a', '#c6bda8']);
      for (let i = 0; i < 3600; i++) {
        g.fillStyle = 'rgba(96,88,72,' + (0.06 + Math.random() * 0.12) + ')';
        g.beginPath(); g.arc(Math.random() * S, Math.random() * S, 0.4 + Math.random() * 1.1, 0, 7); g.fill();
      }
      for (let i = 0; i < 16; i++) {
        g.strokeStyle = 'rgba(96,86,68,' + (0.12 + Math.random() * 0.14) + ')';
        g.lineWidth = 0.6 + Math.random() * 0.9;
        let x = Math.random() * S, y = Math.random() * S;
        g.beginPath(); g.moveTo(x, y);
        for (let j = 0; j < 3; j++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 34; g.lineTo(x, y); }
        g.stroke();
      }
      break;
    }
    case 'camo': {
      g.fillStyle = '#8f8f88'; g.fillRect(0, 0, S, S);
      const tones = ['#5f5f59', '#a9a9a1', '#76766f', '#c3c3ba'];
      for (let i = 0; i < 34; i++) {
        g.fillStyle = tones[i % tones.length];
        const cx = Math.random() * S, cy = Math.random() * S, r = 16 + Math.random() * 42;
        g.beginPath();
        for (let a = 0; a < 9; a++) {
          const ang = (a / 9) * Math.PI * 2;
          const rr = r * (0.6 + Math.random() * 0.7);
          const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
          if (a === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.closePath(); g.fill();
      }
      GF.canvasNoise(g, S, S, 5000, 0.10, ['#4f4f4a', '#d0d0c6']);
      break;
    }
    case 'bloodtex':
      g.clearRect(0, 0, S, S);
      break;
    default:
      grime('#8a8a86', ['#6f6f6b', '#a3a39d'], 4000);
  }
  const t = new CanvasTexture(c);
  t.userData.canvas = c;
  const mirrored = !!src || kind === 'skin' || kind === 'meat';
  t.wrapS = t.wrapT = mirrored ? MirroredRepeatWrapping : RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = GF.qset().anisotropy || 1;
  if (kind === 'polymer') t.repeat.set(3, 3);
  if (kind === 'concrete' || kind === 'asphalt') t.repeat.set(2, 2);
  if (src) {
    const im = new Image();
    im.onload = () => {
      g.drawImage(im, 0, 0, S, S);
      t.needsUpdate = true;
      GF.refreshNormal(kind);
    };
    im.src = src;
  }
  GF._tex[kind] = t;
  return t;
};

GF.mat = function (kind) {
  if (GF._mat[kind]) return GF._mat[kind];
  let m;
  switch (kind) {
    case 'glass':
      m = new MeshStandardMaterial({ color: 0x9fc0cc, transparent: true, opacity: 0.26, roughness: 0.05, metalness: 0.35, side: DoubleSide });
      break;
    case 'water':
      m = new MeshStandardMaterial({ color: 0x2a4a55, transparent: true, opacity: 0.75, roughness: 0.15, metalness: 0.4 });
      break;
    case 'foliage':
      m = new MeshStandardMaterial({ map: GF.tex('grass'), color: 0x88a060, roughness: 0.9, metalness: 0.0 });
      break;
    case 'emissive':
      m = new MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffc060, emissiveIntensity: 2.0, roughness: 0.4 });
      break;
    case 'chrome':
      m = new MeshStandardMaterial({ color: 0xbfc6cc, map: GF.tex('metal'), roughness: 0.18, metalness: 0.9 });
      break;
    case 'dark':
      m = new MeshStandardMaterial({ color: 0x18181a, roughness: 0.6, metalness: 0.35 });
      break;
    default:
      m = new MeshStandardMaterial({
        map: GF.tex(kind === 'wood' || kind === 'metal' || kind === 'dirt' || kind === 'asphalt' || kind === 'grass' || kind === 'brick' || kind === 'plaster' || kind === 'concrete' || kind === 'rock' || kind === 'sand' || kind === 'snow' || kind === 'rust' || kind === 'tile' || kind === 'fabric' ? kind : 'concrete'),
        roughness: kind === 'metal' ? 0.45 : kind === 'glass' ? 0.1 : 0.92,
        metalness: kind === 'metal' ? 0.55 : 0.02
      });
  }
  /* relief + image-based reflections: the two biggest material wins */
  let nk = null;
  if (m.map) {
    const textured = ['metal', 'wood', 'brick', 'plaster', 'concrete', 'rock', 'tile', 'fabric', 'rust', 'dirt', 'sand', 'snow', 'grass'];
    nk = textured.indexOf(kind) >= 0 ? kind : 'concrete';
  }
  if (nk && GF.quality !== 'low') {
    const nt = GF.normalFor(nk);
    if (nt) {
      m.normalMap = nt;
      const s = (GF.NRM_STRENGTH[nk] || 0.7) * 0.85;
      m.normalScale = new Vector2(s, s);
    }
  }
  m.envMapIntensity = kind === 'chrome' ? 1.5 : kind === 'metal' ? 1.15
    : kind === 'glass' || kind === 'water' ? 1.25 : 0.45;
  GF._mat[kind] = m;
  return m;
};

/* ---------------------- merged static geometry ---------------------- */
class GFBatch {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.idx = []; this.count = 0; }

  quad(a, b, c, d, n, uvScale) {
    const i = this.count;
    const s = uvScale || 1;
    this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
    for (let k = 0; k < 4; k++) this.nor.push(n[0], n[1], n[2]);
    this.uv.push(0, 0, s, 0, s, s, 0, s);
    this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
    this.count += 4;
  }

  box(cx, cy, cz, w, h, d, uvScale) {
    const x0 = cx - w / 2, x1 = cx + w / 2;
    const y0 = cy - h / 2, y1 = cy + h / 2;
    const z0 = cz - d / 2, z1 = cz + d / 2;
    const s = uvScale || 1;
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], w * s);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], w * s);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], w * s);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], w * s);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], d * s);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], d * s);
    return this;
  }
  cyl(cx, cy, cz, r, h, seg) {
    seg = seg || 10;
    const y0 = cy - h / 2, y1 = cy + h / 2;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const x0 = cx + Math.cos(a0) * r, z0 = cz + Math.sin(a0) * r;
      const x1 = cx + Math.cos(a1) * r, z1 = cz + Math.sin(a1) * r;
      const nx = Math.cos((a0 + a1) / 2), nz = Math.sin((a0 + a1) / 2);
      const i0 = this.count;
      this.pos.push(x0, y0, z0, x1, y0, z1, x1, y1, z1, x0, y1, z0);
      for (let k = 0; k < 4; k++) this.nor.push(nx, 0, nz);
      this.uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      this.idx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
      this.count += 4;
    }
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const i0 = this.count;
      this.pos.push(cx, y1, cz, cx + Math.cos(a0) * r, y1, cz + Math.sin(a0) * r, cx + Math.cos(a1) * r, y1, cz + Math.sin(a1) * r);
      for (let k = 0; k < 3; k++) this.nor.push(0, 1, 0);
      this.uv.push(0.5, 0.5, 0, 0, 1, 1);
      this.idx.push(i0, i0 + 1, i0 + 2);
      this.count += 3;
    }
    return this;
  }
  build(mat) {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    const m = new Mesh(g, mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
}

/* ------------------------ better primitives ------------------------ */
/* Cached, chamfered boxes give props and guns a manufactured edge instead
   of razor-sharp game-jam corners. The normal is analytic (the direction
   out of the inner box) so the bevel is perfectly smooth with no seams,
   while the box UVs are untouched so textures still tile correctly. */
GF.sharedGeo = new Set();
GF._bev = new Map();
GF.bevGeo = function (w, h, d, r) {
  r = Math.min(r, Math.min(w, h, d) * 0.48);
  const key = w.toFixed(3) + '|' + h.toFixed(3) + '|' + d.toFixed(3) + '|' + r.toFixed(4);
  const hit = GF._bev.get(key);
  if (hit) return hit;
  const g = new BoxGeometry(w, h, d, 2, 2, 2);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const hw = Math.max(1e-4, w / 2 - r), hh = Math.max(1e-4, h / 2 - r), hd = Math.max(1e-4, d / 2 - r);
  const v = new Vector3(), n = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ix = GF.clamp(v.x, -hw, hw), iy = GF.clamp(v.y, -hh, hh), iz = GF.clamp(v.z, -hd, hd);
    const dx = v.x - ix, dy = v.y - iy, dz = v.z - iz;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len > 1e-6) n.set(dx / len, dy / len, dz / len);
    else {
      n.set(0, 0, 0);
      if (Math.abs(v.x) > hw + 1e-6) n.x = v.x > 0 ? 1 : -1;
      else if (Math.abs(v.y) > hh + 1e-6) n.y = v.y > 0 ? 1 : -1;
      else if (Math.abs(v.z) > hd + 1e-6) n.z = v.z > 0 ? 1 : -1;
      if (n.lengthSq() < 0.5) n.set(0, 1, 0);
    }
    pos.setXYZ(i, ix + n.x * r, iy + n.y * r, iz + n.z * r);
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  nor.needsUpdate = true;
  g.computeBoundingSphere();
  g.userData.shared = true;
  GF.sharedGeo.add(g);
  GF._bev.set(key, g);
  return g;
};
/* hairline parts stay simple boxes: cheaper and just as sharp in silhouette */
GF.boxGeo = function (w, h, d, rel, maxR) {
  const m = Math.min(w, h, d);
  if (m < 0.014) return new BoxGeometry(w, h, d);
  const r = Math.min(m * (rel || 0.18), maxR || 0.02);
  if (r < 0.0012) return new BoxGeometry(w, h, d);
  return GF.bevGeo(w, h, d, r);
};
GF.partGeo = function (w, h, d) { return GF.boxGeo(w, h, d, 0.14, 0.006); };

/* -------------------------- prop models --------------------------- */
GF._propMatCache = {};
GF.propMat = function (matKey, tint) {
  const key = matKey + ':' + (tint || '');
  if (GF._propMatCache[key]) return GF._propMatCache[key];
  const color = tint ? new Color(tint) : new Color(0xffffff);
  let m, nk = null, env = 0.5;
  if (matKey === 'glass') {
    m = new MeshStandardMaterial({ color: 0xbcd6de, transparent: true, opacity: 0.3, roughness: 0.04, metalness: 0.22 });
    env = 1.4;
  } else if (matKey === 'organic') {
    nk = 'meat';
    m = new MeshStandardMaterial({ map: GF.tex('meat'), color, roughness: 0.42, metalness: 0.0 });
    env = 0.35;
  } else if (matKey === 'bone') {
    nk = 'bone';
    m = new MeshStandardMaterial({ map: GF.tex('bone'), color, roughness: 0.7 });
    env = 0.4;
  } else {
    const mapKind = matKey === 'plastic' ? 'polymer' : matKey === 'ceramic' ? 'tile' : matKey === 'cardboard' ? 'wood' :
      matKey === 'paper' ? 'plaster' : matKey === 'leather' || matKey === 'rubber' || matKey === 'dark' ? 'leather' :
      matKey === 'organic' ? 'meat' : matKey === 'bone' ? 'bone' : matKey;
    nk = mapKind;
    const isMetal = matKey === 'metal';
    const rough = isMetal ? 0.34 : matKey === 'plastic' ? 0.52 : matKey === 'leather' ? 0.6 : mapKind === 'polymer' ? 0.55 : 0.8;
    /* the canvas textures already sit mid-dark, so tinting them by a raw dark
       value turned receivers and slides near-black: lift the albedo toward
       white before it is multiplied by the map */
    const albedo = color.clone().lerp(new Color(0xffffff), isMetal ? 0.16 : 0.18);
    m = new MeshStandardMaterial({
      map: GF.tex(mapKind), color: albedo, roughness: rough,
      metalness: isMetal ? 0.44 : matKey === 'plastic' ? 0.06 : 0.03
    });
    env = isMetal ? 1.4 : mapKind === 'polymer' ? 0.8 : 0.45;
  }
  if (nk && GF.quality !== 'low') {
    const nt = GF.normalFor(nk);
    if (nt) {
      m.normalMap = nt;
      const s = (GF.NRM_STRENGTH[nk] || 0.7) * (matKey === 'metal' ? 0.55 : 1);
      m.normalScale = new Vector2(s, s);
    }
  }
  m.envMapIntensity = env;
  GF._propMatCache[key] = m;
  return m;
};

GF.addBox = function (parent, mat, w, h, d, x, y, z, rx, ry, rz) {
  const m = new Mesh(GF.boxGeo(w, h, d), mat);
  m.position.set(x || 0, y || 0, z || 0);
  if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
};
GF.addCyl = function (parent, mat, r, h, x, y, z, rx, rz, seg) {
  const m = new Mesh(new CylinderGeometry(r, r, h, seg || 12), mat);
  m.position.set(x || 0, y || 0, z || 0);
  if (rx || rz) m.rotation.set(rx || 0, 0, rz || 0);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
};

GF.buildProp = function (def) {
  if (!def) return new Group();
  const g = new Group();
  const mat = GF.propMat(def.mat, def.color);
  const dark = GF.propMat('metal', '#4a4c4e');
  const w = def.w, h = def.h, d = def.d;
  const shape = def.shape;
  g.userData.kind = 'prop';
  g.userData.def = def;

  switch (shape) {
    case 'chair': {
      const seat = h * 0.48;
      GF.addBox(g, mat, w, h * 0.08, d, 0, seat, 0);
      GF.addBox(g, mat, w * 0.14, seat, d * 0.14, -w * 0.4, seat / 2, -d * 0.4);
      GF.addBox(g, mat, w * 0.14, seat, d * 0.14, w * 0.4, seat / 2, -d * 0.4);
      GF.addBox(g, mat, w * 0.14, seat, d * 0.14, -w * 0.4, seat / 2, d * 0.4);
      GF.addBox(g, mat, w * 0.14, seat, d * 0.14, w * 0.4, seat / 2, d * 0.4);
      GF.addBox(g, mat, w, h * 0.5, d * 0.1, 0, seat + h * 0.24, -d * 0.42);
      /* stretchers and a back rail stop it reading as five loose sticks */
      GF.addBox(g, mat, w * 0.82, h * 0.04, d * 0.06, 0, seat * 0.4, -d * 0.4);
      GF.addBox(g, mat, w * 0.82, h * 0.04, d * 0.06, 0, seat * 0.4, d * 0.4);
      GF.addBox(g, mat, w * 0.9, h * 0.05, d * 0.09, 0, seat + h * 0.44, -d * 0.42);
      break;
    }
    case 'table': {
      const top = h * 0.9;
      GF.addBox(g, mat, w, h * 0.1, d, 0, top, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1])
        GF.addBox(g, mat, w * 0.07, top, d * 0.07, sx * w * 0.42, top / 2, sz * d * 0.4);
      /* apron rails and a lower shelf */
      GF.addBox(g, mat, w * 0.86, h * 0.09, d * 0.05, 0, top - h * 0.1, -d * 0.4);
      GF.addBox(g, mat, w * 0.86, h * 0.09, d * 0.05, 0, top - h * 0.1, d * 0.4);
      GF.addBox(g, mat, w * 0.05, h * 0.09, d * 0.8, -w * 0.42, top - h * 0.1, 0);
      GF.addBox(g, mat, w * 0.05, h * 0.09, d * 0.8, w * 0.42, top - h * 0.1, 0);
      GF.addBox(g, mat, w * 0.8, h * 0.05, d * 0.76, 0, top * 0.32, 0);
      break;
    }
    case 'couch': {
      GF.addBox(g, mat, w, h * 0.4, d, 0, h * 0.3, 0);
      GF.addBox(g, mat, w, h * 0.55, d * 0.22, 0, h * 0.62, -d * 0.38);
      GF.addBox(g, mat, w * 0.13, h * 0.45, d, -w * 0.44, h * 0.5, 0);
      GF.addBox(g, mat, w * 0.13, h * 0.45, d, w * 0.44, h * 0.5, 0);
      GF.addBox(g, mat, w * 0.28, h * 0.16, d * 0.75, -w * 0.26, h * 0.57, d * 0.05);
      GF.addBox(g, mat, w * 0.28, h * 0.16, d * 0.75, w * 0.26, h * 0.57, d * 0.05);
      break;
    }
    case 'bed': {
      GF.addBox(g, mat, w, h * 0.16, d, 0, h * 0.4, 0);
      GF.addBox(g, GF.propMat('fabric', '#c9c0aa'), w * 0.95, h * 0.22, d * 0.9, 0, h * 0.55, 0);
      GF.addBox(g, GF.propMat('fabric', '#e0d8c4'), w * 0.4, h * 0.18, d * 0.3, 0, h * 0.66, -d * 0.3);
      for (const sx of [-1, 1]) for (const sz of [-1, 1])
        GF.addBox(g, mat, w * 0.07, h * 0.4, d * 0.07, sx * w * 0.45, h * 0.2, sz * d * 0.45);
      break;
    }
    case 'shelf': {
      GF.addBox(g, mat, w * 0.08, h, d, -w * 0.46, h / 2, 0);
      GF.addBox(g, mat, w * 0.08, h, d, w * 0.46, h / 2, 0);
      GF.addBox(g, mat, w, h * 0.05, d, 0, h * 0.98, 0);
      for (let i = 1; i < 4; i++) GF.addBox(g, mat, w, h * 0.04, d * 0.9, 0, (i / 4) * h, 0);
      const books = GF.propMat('fabric', '#7a4a3a');
      for (let i = 0; i < 8; i++) GF.addBox(g, i % 2 ? books : GF.propMat('fabric', '#3a5a6a'), w * 0.06, h * 0.16, d * 0.6, -w * 0.36 + i * w * 0.09, h * 0.74, 0);
      break;
    }
    case 'fridge': {
      GF.addBox(g, mat, w, h, d, 0, h / 2, 0);
      GF.addBox(g, dark, w * 0.9, h * 0.06, d * 0.02, 0, h * 0.62, d / 2);
      GF.addBox(g, dark, w * 0.05, h * 0.18, d * 0.04, w * 0.36, h * 0.72, d / 2);
      GF.addBox(g, dark, w * 0.012, h * 0.94, 0.01, 0, h * 0.5, d * 0.505);
      GF.addBox(g, GF.propMat('metal', '#a8aeb2'), w * 0.04, h * 0.16, 0.035, -w * 0.4, h * 0.74, d * 0.52);
      GF.addBox(g, GF.propMat('metal', '#a8aeb2'), w * 0.04, h * 0.22, 0.035, -w * 0.4, h * 0.3, d * 0.52);
      GF.addBox(g, GF.propMat('metal', '#8f9599'), w * 0.2, h * 0.03, 0.012, w * 0.18, h * 0.82, d * 0.51);
      break;
    }
    case 'tv': {
      GF.addBox(g, dark, w, h, d, 0, h / 2, 0);
      GF.addBox(g, GF.mat('glass'), w * 0.88, h * 0.8, d * 0.05, 0, h / 2, d / 2 + 0.005);
      GF.addBox(g, dark, w * 0.06, h * 0.5, d * 0.55, 0, h * 0.16, 0);
      GF.addBox(g, dark, w * 0.46, h * 0.035, d * 0.4, 0, h * 0.02, 0);
      GF.addBox(g, GF.propMat('metal', '#8c9296'), w * 0.16, h * 0.03, 0.012, 0, h * 0.08, d * 0.5);
      break;
    }
    case 'monitor': {
      GF.addBox(g, dark, w, h, d * 0.6, 0, h * 0.55, 0);
      GF.addBox(g, GF.mat('glass'), w * 0.88, h * 0.8, 0.01, 0, h * 0.6, d * 0.32);
      GF.addBox(g, dark, w * 0.3, h * 0.1, d * 0.5, 0, h * 0.06, 0);
      break;
    }
    case 'car': {
      const bodyY = h * 0.45;
      GF.addBox(g, mat, w, h * 0.42, d, 0, bodyY, 0);
      GF.addBox(g, mat, w * 0.72, h * 0.34, d * 0.5, -w * 0.02, h * 0.78, 0);
      GF.addBox(g, GF.mat('glass'), w * 0.66, h * 0.24, d * 0.02, -w * 0.02, h * 0.78, d * 0.25);
      GF.addBox(g, GF.mat('glass'), w * 0.66, h * 0.24, d * 0.02, -w * 0.02, h * 0.78, -d * 0.26);
      const wheel = GF.propMat('dark', '#1a1a1a');
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const wh = addWheel(g, wheel, h * 0.22, sx * w * 0.46, h * 0.22, sz * d * 0.32);
        wh.rotation.z = Math.PI / 2;
      }
      GF.addBox(g, GF.propMat('emissive'), w * 0.18, h * 0.1, 0.04, -w * 0.3, bodyY, -d / 2);
      GF.addBox(g, GF.propMat('emissive'), w * 0.18, h * 0.1, 0.04, w * 0.3, bodyY, -d / 2);
      /* trim: bumpers, mirrors, door gaps and brightwork */
      const trim = GF.propMat('dark', '#202226');
      const chrome = GF.propMat('metal', '#9aa0a6');
      GF.addBox(g, trim, w * 1.01, h * 0.12, d * 0.08, 0, bodyY - h * 0.16, -d * 0.48);
      GF.addBox(g, trim, w * 1.01, h * 0.12, d * 0.08, 0, bodyY - h * 0.16, d * 0.48);
      GF.addBox(g, trim, w * 0.16, h * 0.05, d * 0.11, -w * 0.56, h * 0.76, d * 0.1);
      GF.addBox(g, trim, w * 0.16, h * 0.05, d * 0.11, w * 0.56, h * 0.76, d * 0.1);
      for (const sx of [-1, 1]) {
        GF.addBox(g, trim, 0.02, h * 0.3, d * 0.62, sx * w * 0.505, bodyY + h * 0.02, 0);
        GF.addBox(g, chrome, w * 0.2, h * 0.03, 0.03, sx * w * 0.28, bodyY + h * 0.16, -d * 0.5);
      }
      GF.addBox(g, chrome, w * 0.14, h * 0.06, d * 0.14, 0, bodyY - h * 0.24, d * 0.52);
      break;
    }
    case 'truck': {
      GF.addBox(g, mat, w * 0.32, h * 0.55, d, -w * 0.32, h * 0.55, 0);
      GF.addBox(g, mat, w * 0.62, h * 0.62, d, w * 0.16, h * 0.62, 0);
      GF.addBox(g, GF.mat('glass'), w * 0.3, h * 0.22, d * 0.02, -w * 0.34, h * 0.82, d * 0.5);
      const wheel = GF.propMat('dark', '#1a1a1a');
      for (const sz of [-1, 1]) for (const sx of [-1, 1]) addWheel(g, wheel, h * 0.26, sx * w * 0.4, h * 0.26, sz * d * 0.32);
      GF.addBox(g, GF.propMat('dark', '#22262a'), w * 0.62, h * 0.06, d * 0.04, w * 0.16, h * 0.94, d * 0.49);
      for (let i = 0; i < 5; i++) GF.addBox(g, GF.propMat('dark', '#2a2e32'), w * 0.6, h * 0.03, 0.05, w * 0.16, h * 0.9, -d * 0.3 + i * d * 0.15);
      GF.addBox(g, GF.propMat('dark', '#1e2024'), w * 1.02, h * 0.1, d * 0.06, 0, h * 0.2, -d * 0.5);
      break;
    }
    case 'tank': {
      GF.addBox(g, mat, w, h * 0.45, d, 0, h * 0.42, 0);
      GF.addBox(g, mat, w * 0.55, h * 0.3, d * 0.5, 0, h * 0.78, 0);
      GF.addCyl(g, GF.propMat('metal', '#3a3d3f'), 0.055, w * 0.7, 0, h * 0.78, d * 0.42, Math.PI / 2, 0);
      const tr = GF.propMat('dark', '#1e1e1e');
      GF.addBox(g, tr, w * 1.02, h * 0.34, d * 0.16, 0, h * 0.2, -d * 0.34);
      GF.addBox(g, tr, w * 1.02, h * 0.34, d * 0.16, 0, h * 0.2, d * 0.34);
      for (let i = 0; i < 6; i++) addWheel(g, GF.propMat('metal', '#3a3a3a'), h * 0.13, 0, h * 0.2, -d * 0.3 + i * d * 0.12);
      break;
    }
    case 'bike': {
      const wheel = GF.propMat('dark', '#1a1a1a');
      const w1 = addWheel(g, wheel, h * 0.38, 0, h * 0.38, -d * 0.34); w1.rotation.y = Math.PI / 2;
      const w2 = addWheel(g, wheel, h * 0.38, 0, h * 0.38, d * 0.34); w2.rotation.y = Math.PI / 2;
      GF.addBox(g, mat, w * 0.2, h * 0.18, d * 0.55, 0, h * 0.7, 0);
      GF.addBox(g, mat, w * 0.8, h * 0.05, 0.05, 0, h * 0.95, d * 0.32);
      break;
    }
    case 'cone':
      GF.addCyl(g, GF.propMat('plastic', '#d4692a'), w * 0.15, h * 0.9, 0, h * 0.55, 0, 0, 0, 10);
      GF.addBox(g, GF.propMat('plastic', '#d4692a'), w, h * 0.08, d, 0, h * 0.04, 0);
      GF.addCyl(g, GF.propMat('plastic', '#e8e8e0'), w * 0.22, h * 0.1, 0, h * 0.62, 0, 0, 0, 10);
      break;
    case 'sign': {
      GF.addCyl(g, GF.propMat('metal', '#7a7e82'), 0.04, h * 0.9, 0, h * 0.45, 0);
      GF.addBox(g, mat, w, w * 0.9, 0.04, 0, h * 0.82, 0);
      break;
    }
    case 'door': {
      GF.addBox(g, mat, w, h, d, 0, h / 2, 0);
      GF.addBox(g, GF.propMat('metal', '#9a8a4a'), w * 0.08, h * 0.08, d * 2.5, w * 0.36, h * 0.5, 0);
      break;
    }
    case 'window': {
      const fm = GF.propMat('wood', '#5a4a36');
      GF.addBox(g, fm, w, h * 0.08, d, 0, h * 0.96, 0);
      GF.addBox(g, fm, w, h * 0.08, d, 0, h * 0.04, 0);
      GF.addBox(g, fm, w * 0.08, h, d, -w * 0.46, h / 2, 0);
      GF.addBox(g, fm, w * 0.08, h, d, w * 0.46, h / 2, 0);
      GF.addBox(g, GF.mat('glass'), w * 0.84, h * 0.84, 0.015, 0, h / 2, 0);
      break;
    }
    case 'sandbag': {
      const n = Math.max(1, Math.round(h / 0.25));
      for (let i = 0; i < n; i++) {
        GF.addBox(g, GF.propMat('fabric', '#8a7a54'), w * (1 - i * 0.02), 0.24, d, 0, 0.13 + i * 0.25, (i % 2 ? 0.04 : -0.04));
      }
      break;
    }
    case 'tree': {
      GF.addCyl(g, GF.propMat('wood', '#5a4530'), w * 0.18, h * 0.7, 0, h * 0.35, 0, 0, 0, 8);
      const leaf = GF.propMat('organic', '#4a5f34');
      for (let i = 0; i < 3; i++) {
        const s = new Mesh(new IcosahedronGeometry(w * (0.8 - i * 0.15), 0), leaf);
        s.position.set((Math.random() - 0.5) * w, h * (0.62 + i * 0.13), (Math.random() - 0.5) * w);
        s.castShadow = true; g.add(s);
      }
      break;
    }
    case 'bush': {
      const leaf = GF.propMat('organic', '#3f5230');
      for (let i = 0; i < 3; i++) {
        const s = new Mesh(new IcosahedronGeometry(w * 0.45, 0), leaf);
        s.position.set((Math.random() - 0.5) * w * 0.5, h * 0.4 + Math.random() * h * 0.35, (Math.random() - 0.5) * d * 0.5);
        s.castShadow = true; g.add(s);
      }
      break;
    }
    case 'rock': {
      const s = new Mesh(new IcosahedronGeometry(w * 0.6, 0), GF.propMat('rock', '#6e6d66'));
      s.scale.set(1, h / w, d / w);
      s.position.y = h * 0.4;
      s.castShadow = true; s.receiveShadow = true; g.add(s);
      break;
    }
    case 'log':
      GF.addCyl(g, GF.propMat('wood', '#5a4530'), w * 0.5, d, 0, h * 0.5, 0, Math.PI / 2, 0, 10);
      break;
    case 'barrel':
      GF.addCyl(g, mat, w * 0.5, h, 0, h / 2, 0, 0, 0, 14);
      GF.addCyl(g, dark, w * 0.52, h * 0.04, 0, h * 0.25, 0, 0, 0, 14);
      GF.addCyl(g, dark, w * 0.52, h * 0.04, 0, h * 0.75, 0, 0, 0, 14);
      GF.addCyl(g, mat, w * 0.49, h * 0.03, 0, h * 0.99, 0, 0, 0, 14);
      GF.addCyl(g, GF.propMat('metal', '#5a5e62'), w * 0.12, 0.03, w * 0.26, h * 0.98, 0, 0, 0, 8);
      break;
    case 'crate': {
      GF.addBox(g, mat, w, h, d, 0, h / 2, 0);
      const edge = GF.propMat('wood', '#4a3a26');
      for (const sx of [-1, 1]) {
        GF.addBox(g, edge, w * 0.06, h, d * 1.01, sx * w * 0.46, h / 2, 0);
      }
      GF.addBox(g, edge, w * 1.01, h * 0.06, d * 1.01, 0, h * 0.94, 0);
      GF.addBox(g, edge, w * 1.01, h * 0.06, d * 1.01, 0, h * 0.06, 0);
      /* battens across the faces and a stencilled panel */
      GF.addBox(g, edge, w * 0.94, h * 0.05, 0.012, 0, h * 0.72, d * 0.5);
      GF.addBox(g, edge, w * 0.94, h * 0.05, 0.012, 0, h * 0.32, d * 0.5);
      GF.addBox(g, GF.propMat('paper', '#c9c0a8'), w * 0.32, h * 0.16, 0.008, w * 0.16, h * 0.55, d * 0.505);
      break;
    }
    case 'pallet': {
      for (let i = 0; i < 4; i++) GF.addBox(g, mat, w, h * 0.3, d * 0.12, 0, h * 0.75, -d * 0.4 + i * d * 0.27);
      GF.addBox(g, mat, w, h * 0.25, d, 0, h * 0.25, 0);
      break;
    }
    case 'lamp': {
      GF.addCyl(g, dark, w * 0.08, h * 0.9, 0, h * 0.45, 0, 0, 0, 8);
      GF.addBox(g, GF.propMat('emissive'), w * 0.5, h * 0.12, d * 0.5, 0, h * 0.92, 0);
      break;
    }
    case 'fan': {
      GF.addCyl(g, dark, w * 0.5, h * 0.15, 0, h * 0.5, 0, 0, 0, 16);
      for (let i = 0; i < 4; i++) {
        const b = GF.addBox(g, GF.propMat('metal', '#8a8e92'), w * 0.4, h * 0.06, d * 0.2, 0, h * 0.5, 0);
        b.rotation.y = i * Math.PI / 2;
      }
      break;
    }
    case 'rug': {
      const p = new Mesh(new PlaneGeometry(w, d), GF.propMat('fabric', '#5a2a2a'));
      p.rotation.x = -Math.PI / 2; p.position.y = h + 0.01; p.receiveShadow = true; g.add(p);
      break;
    }
    case 'curtain': {
      GF.addBox(g, GF.propMat('fabric', '#6a5a44'), w, h, d, 0, h / 2, 0);
      break;
    }
    case 'skull': {
      const bone = GF.propMat('bone', '#ddd6c2');
      const s = new Mesh(new SphereGeometry(w * 0.45, 10, 8), bone);
      s.position.y = h * 0.6; s.scale.set(1, 1.05, 1.1); s.castShadow = true; g.add(s);
      GF.addBox(g, bone, w * 0.55, h * 0.25, d * 0.5, 0, h * 0.28, d * 0.06);
      GF.addBox(g, GF.propMat('dark', '#141210'), w * 0.16, h * 0.16, d * 0.06, -w * 0.18, h * 0.66, d * 0.45);
      GF.addBox(g, GF.propMat('dark', '#141210'), w * 0.16, h * 0.16, d * 0.06, w * 0.18, h * 0.66, d * 0.45);
      break;
    }
    case 'limb':
      GF.addCyl(g, GF.propMat('organic', '#8d3a3a'), w * 0.45, h, 0, h / 2, 0, 0, 0, 8);
      GF.addCyl(g, GF.propMat('bone', '#d8d2bf'), w * 0.3, h * 0.08, 0, h, 0, 0, 0, 8);
      break;
    case 'torso': {
      GF.addBox(g, GF.propMat('organic', '#8d3a3a'), w, h, d, 0, h / 2, 0);
      GF.addBox(g, GF.propMat('organic', '#6d2a2a'), w * 0.6, h * 0.3, d * 1.05, 0, h * 0.3, 0);
      break;
    }
    case 'gib': {
      const s = new Mesh(new IcosahedronGeometry(w * 0.5, 0), GF.propMat('organic', '#7d2f2f'));
      s.position.y = h * 0.4; s.scale.y = 0.7; s.castShadow = true; g.add(s);
      break;
    }
    case 'skeleton': {
      const bone = GF.propMat('bone', '#ddd6c2');
      GF.addBox(g, bone, w * 0.3, h * 0.35, d * 0.3, 0, h * 0.72, 0);
      GF.addCyl(g, bone, 0.05, h * 0.28, 0, h * 0.4, 0, 0, 0, 6);
      GF.addBox(g, bone, w * 0.7, h * 0.04, d * 0.2, 0, h * 0.86, 0);
      GF.addCyl(g, bone, 0.04, h * 0.4, -w * 0.3, h * 0.4, 0, 0, 0.2, 6);
      GF.addCyl(g, bone, 0.04, h * 0.4, w * 0.3, h * 0.4, 0, 0, -0.2, 6);
      GF.addCyl(g, bone, 0.05, h * 0.35, -w * 0.2, h * 0.15, 0, 0, 0.08, 6);
      GF.addCyl(g, bone, 0.05, h * 0.35, w * 0.2, h * 0.15, 0, 0, -0.08, 6);
      GF.addBox(g, bone, w * 0.4, h * 0.12, d * 0.4, 0, h * 0.95, 0);
      break;
    }
    case 'grenade': {
      const s = new Mesh(new SphereGeometry(w * 0.5, 10, 8), GF.propMat('metal', '#4a5a3a'));
      s.position.y = h * 0.45; s.scale.y = 1.1; s.castShadow = true; g.add(s);
      GF.addBox(g, GF.propMat('metal', '#8a8a8a'), w * 0.16, h * 0.5, d * 0.16, w * 0.35, h * 0.6, 0);
      GF.addBox(g, GF.propMat('metal', '#9a9a9a'), w * 0.7, h * 0.08, d * 0.3, 0, h * 0.9, 0);
      break;
    }
    case 'mine': {
      GF.addCyl(g, GF.propMat('metal', '#4a4f3a'), w * 0.5, h, 0, h / 2, 0, 0, 0, 14);
      GF.addCyl(g, GF.propMat('dark', '#1a1a1a'), w * 0.16, h * 0.3, 0, h * 0.9, 0, 0, 0, 8);
      break;
    }
    case 'bag': {
      GF.addBox(g, mat, w, h, d, 0, h / 2, 0);
      GF.addBox(g, GF.propMat('leather', '#4a3a2a'), w * 0.3, h * 0.12, d * 0.4, 0, h * 0.98, 0);
      break;
    }
    case 'pipe': {
      GF.addCyl(g, mat, w * 0.5, h, 0, h / 2, 0, 0, 0, 12);
      break;
    }
    case 'can': {
      GF.addCyl(g, mat, w * 0.5, h, 0, h / 2, 0, 0, 0, 12);
      break;
    }
    case 'bottle': {
      GF.addCyl(g, mat, w * 0.5, h * 0.7, 0, h * 0.35, 0, 0, 0, 12);
      GF.addCyl(g, mat, w * 0.2, h * 0.3, 0, h * 0.85, 0, 0, 0, 10);
      break;
    }
    case 'plate': {
      GF.addCyl(g, mat, w * 0.5, h, 0, h / 2, 0, 0, 0, 16);
      break;
    }
    case 'tire': {
      const t = new Mesh(new TorusGeometry(w * 0.35, w * 0.15, 8, 16), GF.propMat('dark', '#1a1a1a'));
      t.rotation.x = Math.PI / 2; t.position.y = h; t.castShadow = true; g.add(t);
      break;
    }
    case 'ladder': {
      GF.addBox(g, dark, w * 0.08, h, d * 0.5, -w * 0.4, h / 2, 0);
      GF.addBox(g, dark, w * 0.08, h, d * 0.5, w * 0.4, h / 2, 0);
      for (let i = 0; i < 7; i++) GF.addBox(g, dark, w * 0.85, h * 0.03, d * 0.4, 0, h * (0.08 + i * 0.13), 0);
      break;
    }
    case 'spike': {
      GF.addCyl(g, dark, 0.05, h * 0.7, 0, h * 0.35, 0, 0, 0, 6);
      GF.addCyl(g, GF.propMat('bone', '#ddd6c2'), w * 0.4, h * 0.3, 0, h * 0.85, 0, 0, 0, 8);
      break;
    }
    case 'hanging': {
      GF.addCyl(g, GF.propMat('fabric', '#4a3a2a'), 0.02, h * 0.3, 0, h * 0.85, 0, 0, 0, 6);
      GF.addBox(g, GF.propMat('organic', '#7d2f2f'), w * 0.5, h * 0.55, d * 0.5, 0, h * 0.42, 0);
      break;
    }
    case 'corpse_pile': {
      for (let i = 0; i < 5; i++) {
        const b = GF.addBox(g, GF.propMat('organic', i % 2 ? '#7d2f2f' : '#5a2424'), w * 0.7, h * 0.22, d * 0.5,
          (Math.random() - 0.5) * w * 0.4, h * 0.12 + i * h * 0.15, (Math.random() - 0.5) * d * 0.4);
        b.rotation.y = Math.random() * 3;
      }
      break;
    }
    case 'box':
    case 'tallbox':
    case 'widebox':
    case 'box2':
    default:
      GF.addBox(g, mat, w, h, d, 0, h / 2, 0);
      break;
  }
  g.userData.size = new Vector3(w, h, d);
  return g;

  function addWheel(parent, m, r, x, y, z) {
    const wm = new Mesh(new CylinderGeometry(r, r, 0.16, 12), m);
    wm.rotation.z = Math.PI / 2;
    wm.position.set(x, y, z);
    wm.castShadow = true;
    parent.add(wm);
    return wm;
  }
};

/* --------------------------- gun models --------------------------- */
GF.GUN_LEN = { pistol: 0.21, revolver: 0.24, smg: 0.44, carbine: 0.78, rifle: 0.92, shotgun: 0.95, sniper: 1.06, dmr: 0.98, lmg: 1.0, launcher: 1.0, knife: 0.22, blade: 0.7, blunt: 0.65, heavy: 0.8, staff: 1.2 };

/* Twelve factory finishes. The uniqueness pass below picks one per weapon and
   also varies furniture, stock, magazine, muzzle device, optic and wear, so
   the 2,249 catalogue entries do not share a silhouette. */
GF.GUN_SCHEMES = [
  { fur: '#2e3236', metal: '#6a7076', accent: '#b9a06a', wood: null },
  { fur: '#414a36', metal: '#5f665c', accent: '#2a2e28', wood: null },
  { fur: '#8a7758', metal: '#7d838a', accent: '#4a4034', wood: null },
  { fur: '#1c1e20', metal: '#4a4f54', accent: '#8a2a24', wood: null },
  { fur: '#3a4658', metal: '#87909a', accent: '#d8d0c0', wood: null },
  { fur: '#5a3f27', metal: '#6b5a44', accent: '#c9a227', wood: '#6b4a2c' },
  { fur: '#6b3a30', metal: '#5a4a44', accent: '#2a2222', wood: '#7a4630' },
  { fur: '#54504a', metal: '#9aa0a6', accent: '#30363a', wood: null },
  { fur: '#2f3a3a', metal: '#68727a', accent: '#6d8a52', wood: null },
  { fur: '#4a3a4a', metal: '#7a7280', accent: '#c0b0a0', wood: null },
  { fur: '#7a7264', metal: '#585d62', accent: '#3a2a20', wood: '#5e4a32' },
  { fur: '#22262c', metal: '#b4bac0', accent: '#c8452f', wood: null }
];

GF.gunSeed = function (def) {
  const s = String(def.id || '') + '|' + String(def.name || '') + '|' + String(def.cat || '');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
};

GF.buildGunModel = function (def) {
  const g = new Group();
  const parts = {};
  const idl = ((def.id || '') + ' ' + (def.name || '') + ' ' + (def.cat || '')).toLowerCase();
  /* variant silhouettes have physically different proportions */
  const lenMul = /compact|breacher/.test(idl) ? 0.86 : /long|marksman|match/.test(idl) ? 1.12 : 1;
  const L = (GF.GUN_LEN[def.model] || 0.8) * lenMul;
  const steelTone = /chrome|silver|stainless|nickel/.test(idl) ? '#b4bac0' : /blued|black|night/.test(idl) ? '#5a5f64' : '#7d838a';
  const stockTone = /tan|fde|desert|sand/.test(idl) ? '#8a7758'
    : /od|olive|green|forest|woodland/.test(idl) ? '#414a36'
      : /wood|walnut|classic/.test(idl) ? '#5a3f27'
        : /urban|grey|gray/.test(idl) ? '#565a60'
          : '#2e3236';
  const metal = GF.propMat('metal', '#4c5155');
  const polymer = GF.propMat('plastic', stockTone);
  const wood = GF.propMat('wood', '#7a5633');
  const steel = GF.propMat('metal', steelTone);
  const accent = GF.propMat('metal', '#646a70');
  const isWood = /ak-47|akm|ak-74|sks|mosin|kar98|m1-|m14|fal|svd|wood/i.test(def.id);
  const bodyMat = isWood ? wood : polymer;
  const barrelMat = def.model === 'melee' || GF.GUN_LEN[def.model] ? metal : steel;

  const add = (parent, name, geo, mat, x, y, z, rx, ry, rz) => {
    const m = new Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx || 0, ry || 0, rz || 0);
    m.castShadow = true;
    parent.add(m);
    if (name) parts[name] = m;
    return m;
  };
  const B = (parent, name, w, h, d, mat, x, y, z, rx) => add(parent, name, GF.partGeo(w, h, d), mat, x, y, z, rx);
  const C = (parent, name, r, h, mat, x, y, z, rx, rz) => add(parent, name, new CylinderGeometry(r, r, h, 12), mat, x, y, z, rx, rz);

  switch (def.model) {
    case 'pistol': {
      B(g, 'slide', 0.038, 0.052, L * 0.92, steel, 0, 0.042, -L * 0.42);
      B(g, 'body', 0.034, 0.036, L * 0.8, bodyMat, 0, 0.005, -L * 0.34);
      const grip = B(g, 'grip', 0.036, 0.115, 0.052, bodyMat, 0, -0.062, 0.015, 0.3);
      B(g, 'mag', 0.026, 0.085, 0.04, accent, 0, -0.028, 0.026, 0.3);
      B(g, 'trigger', 0.012, 0.03, 0.02, metal, 0, -0.022, -0.02);
      C(g, 'barrel', 0.008, 0.02, metal, 0, 0.042, -L * 0.9, Math.PI / 2);
      B(g, 'sight_rear', 0.03, 0.008, 0.012, metal, 0, 0.072, L * 0.02);
      B(g, 'sight_front', 0.006, 0.01, 0.012, metal, 0, 0.074, -L * 0.84);
      C(g, 'muzzle', 0.011, 0.012, metal, 0, 0.042, -L * 0.93, Math.PI / 2);
      parts.muzzle = parts.muzzle || parts.barrel;
      break;
    }
    case 'revolver': {
      B(g, 'body', 0.034, 0.05, L * 0.45, steel, 0, 0.04, -0.02);
      add(g, 'cylinder', new CylinderGeometry(0.032, 0.032, 0.05, 12), steel, 0, 0.035, -L * 0.28, Math.PI / 2);
      C(g, 'barrel', 0.012, L * 0.6, metal, 0, 0.05, -L * 0.62, Math.PI / 2);
      B(g, 'grip', 0.032, 0.11, 0.045, wood, 0, -0.05, 0.03, 0.4);
      B(g, 'sight_front', 0.006, 0.012, 0.01, metal, 0, 0.068, -L * 0.85);
      B(g, 'trigger', 0.012, 0.028, 0.02, metal, 0, -0.012, 0.0);
      parts.muzzle = parts.barrel;
      break;
    }
    case 'smg': {
      const bodyL = L * 0.55;
      B(g, 'body', 0.05, 0.075, bodyL, bodyMat, 0, 0.03, -L * 0.2);
      C(g, 'barrel', 0.013, L * 0.35, metal, 0, 0.045, -L * 0.62, Math.PI / 2);
      C(g, 'shroud', 0.024, L * 0.18, polymer, 0, 0.045, -L * 0.52, Math.PI / 2);
      B(g, 'grip', 0.038, 0.11, 0.05, bodyMat, 0, -0.055, 0.0, 0.28);
      B(g, 'mag', 0.03, 0.17, 0.05, accent, 0, -0.075, -L * 0.22, 0.1);
      B(g, 'stock', 0.035, 0.055, L * 0.22, bodyMat, 0, 0.045, L * 0.28);
      B(g, 'sight_rear', 0.03, 0.018, 0.02, metal, 0, 0.078, -0.02);
      B(g, 'sight_front', 0.01, 0.022, 0.015, metal, 0, 0.078, -L * 0.66);
      C(g, 'muzzle', 0.017, 0.03, metal, 0, 0.045, -L * 0.8, Math.PI / 2);
      break;
    }
    case 'carbine':
    case 'rifle':
    case 'dmr':
    case 'sniper':
    case 'lmg': {
      const receiverL = L * 0.34;
      B(g, 'body', 0.052, 0.082, receiverL, bodyMat, 0, 0.03, -L * 0.06);
      B(g, 'handguard', 0.048, 0.062, L * 0.34, bodyMat === wood ? wood : polymer, 0, 0.032, -L * 0.4);
      C(g, 'barrel', 0.0115, L * 0.5, metal, 0, 0.05, -L * 0.66, Math.PI / 2);
      C(g, 'muzzle', def.model === 'sniper' ? 0.02 : 0.017, L * 0.06, metal, 0, 0.05, -L * 0.9, Math.PI / 2);
      B(g, 'grip', 0.036, 0.115, 0.05, bodyMat, 0, -0.062, L * 0.04, 0.32);
      B(g, 'mag', def.model === 'lmg' ? 0.09 : 0.036, def.model === 'lmg' ? 0.16 : 0.15, 0.07, accent,
        def.model === 'lmg' ? 0 : 0, def.model === 'lmg' ? -0.12 : -0.06, -L * 0.1, 0.12);
      if (def.model === 'lmg') add(g, 'drum', new CylinderGeometry(0.075, 0.075, 0.06, 14), accent, 0, -0.1, -L * 0.08, 0, Math.PI / 2);
      B(g, 'stock', 0.045, 0.1, L * 0.24, bodyMat, 0, 0.01, L * 0.3, -0.06);
      B(g, 'cheek', 0.05, 0.03, L * 0.14, bodyMat, 0, 0.075, L * 0.24);
      B(g, 'rail', 0.028, 0.014, L * 0.4, metal, 0, 0.078, -L * 0.2);
      B(g, 'sight_rear', 0.026, 0.026, 0.02, metal, 0, 0.095, L * 0.02);
      B(g, 'sight_front', 0.008, 0.03, 0.016, metal, 0, 0.095, -L * 0.62);
      if (def.model === 'sniper' || def.model === 'dmr') {
        C(g, 'optic', 0.026, L * 0.24, metal, 0, 0.115, -L * 0.16, Math.PI / 2);
        C(g, 'optic_lens', 0.023, 0.008, GF.mat('glass'), 0, 0.115, -L * 0.28, Math.PI / 2);
        B(g, 'mount', 0.02, 0.03, 0.03, metal, 0, 0.09, -L * 0.08);
        B(g, 'mount2', 0.02, 0.03, 0.03, metal, 0, 0.09, -L * 0.24);
      }
      if (def.model === 'lmg') {
        B(g, 'bipod_l', 0.012, 0.16, 0.012, metal, -0.035, -0.03, -L * 0.6, 0, 0, 0.4);
        B(g, 'bipod_r', 0.012, 0.16, 0.012, metal, 0.035, -0.03, -L * 0.6, 0, 0, -0.4);
      }
      break;
    }
    case 'shotgun': {
      B(g, 'body', 0.055, 0.08, L * 0.3, metal, 0, 0.03, -L * 0.02);
      C(g, 'barrel', 0.018, L * 0.55, metal, 0, 0.055, -L * 0.55, Math.PI / 2);
      C(g, 'tube', 0.016, L * 0.42, metal, 0, 0.02, -L * 0.48, Math.PI / 2);
      B(g, 'pump', 0.05, 0.05, L * 0.16, isWood ? wood : polymer, 0, 0.018, -L * 0.42);
      B(g, 'stock', 0.05, 0.11, L * 0.26, isWood ? wood : polymer, 0, 0.0, L * 0.28, -0.05);
      B(g, 'grip', 0.038, 0.09, 0.05, isWood ? wood : polymer, 0, -0.05, L * 0.02, 0.3);
      B(g, 'sight_front', 0.008, 0.014, 0.014, GF.propMat('metal', '#d0d0d0'), 0, 0.082, -L * 0.8);
      C(g, 'muzzle', 0.024, 0.03, metal, 0, 0.055, -L * 0.83, Math.PI / 2);
      break;
    }
    case 'launcher': {
      if (/m320|m203|m79|milkor|china lake/i.test(def.id)) {
        B(g, 'body', 0.07, 0.1, L * 0.35, GF.propMat('metal', '#4a4f42'), 0, 0.03, 0);
        C(g, 'barrel', 0.032, L * 0.42, metal, 0, 0.05, -L * 0.4, Math.PI / 2);
        B(g, 'grip', 0.04, 0.11, 0.05, polymer, 0, -0.06, L * 0.06, 0.3);
        B(g, 'stock', 0.05, 0.09, L * 0.2, polymer, 0, 0.01, L * 0.28);
        add(g, 'drum', new CylinderGeometry(0.09, 0.09, 0.12, 14), GF.propMat('metal', '#3a3d32'), 0, -0.02, -L * 0.05, 0, Math.PI / 2);
      } else {
        C(g, 'body', 0.045, L * 0.8, GF.propMat('metal', '#4a503a'), 0, 0.04, -L * 0.3, Math.PI / 2);
        C(g, 'muzzle', 0.075, L * 0.14, GF.propMat('metal', '#3a402c'), 0, 0.04, -L * 0.72, Math.PI / 2);
        B(g, 'grip', 0.04, 0.12, 0.05, wood, 0, -0.06, L * 0.0, 0.35);
        B(g, 'grip2', 0.035, 0.1, 0.045, wood, 0, -0.05, -L * 0.3, 0.3);
        B(g, 'sight', 0.02, 0.05, 0.02, metal, 0.05, 0.1, -L * 0.12);
        C(g, 'warhead', 0.06, L * 0.16, GF.propMat('metal', '#6a5a3a'), 0, 0.04, -L * 0.82, Math.PI / 2);
      }
      break;
    }
    case 'knife': {
      B(g, 'blade', 0.005, 0.03, L * 0.7, GF.propMat('metal', '#c8ccd0'), 0, 0.03, -L * 0.45);
      B(g, 'guard', 0.05, 0.01, 0.015, metal, 0, 0.03, -L * 0.12);
      B(g, 'grip', 0.022, 0.035, L * 0.25, GF.propMat('plastic', '#2a2a2a'), 0, 0.03, 0.02);
      break;
    }
    case 'blade': {
      B(g, 'blade', 0.008, 0.06, L * 0.75, GF.propMat('metal', '#c8ccd0'), 0, 0.03, -L * 0.42);
      B(g, 'guard', 0.07, 0.012, 0.02, metal, 0, 0.03, -L * 0.06);
      B(g, 'grip', 0.028, 0.04, L * 0.2, GF.propMat('fabric', '#3a2a22'), 0, 0.03, 0.06);
      break;
    }
    case 'blunt': {
      C(g, 'body', 0.018, L, metal, 0, 0.03, -L * 0.3, Math.PI / 2);
      B(g, 'head', 0.07, 0.07, 0.16, metal, 0, 0.03, -L * 0.78);
      B(g, 'grip', 0.03, 0.035, L * 0.3, GF.propMat('fabric', '#3a2a22'), 0, 0.03, 0.12);
      break;
    }
    case 'heavy': {
      C(g, 'body', 0.025, L * 0.85, metal, 0, 0.03, -L * 0.2, Math.PI / 2);
      B(g, 'head', 0.12, 0.12, 0.2, GF.propMat('metal', '#4a4e50'), 0, 0.03, -L * 0.65);
      B(g, 'grip', 0.032, 0.04, L * 0.3, GF.propMat('fabric', '#3a2a22'), 0, 0.03, 0.18);
      break;
    }
    case 'staff': {
      C(g, 'body', 0.02, L, GF.propMat('wood', '#5a4530'), 0, 0.03, -L * 0.2, Math.PI / 2);
      B(g, 'head', 0.1, 0.05, 0.25, steel, 0, 0.03, -L * 0.62);
      break;
    }
    default: {
      B(g, 'body', 0.05, 0.08, L * 0.6, bodyMat, 0, 0.03, -L * 0.1);
      C(g, 'barrel', 0.015, L * 0.4, metal, 0, 0.05, -L * 0.55, Math.PI / 2);
      B(g, 'grip', 0.036, 0.1, 0.05, bodyMat, 0, -0.05, 0.02, 0.3);
      B(g, 'mag', 0.03, 0.12, 0.06, accent, 0, -0.06, -L * 0.08);
    }
  }
  /* -------- universal attachments inferred from the weapon name -------- */
  const isGun = ['pistol', 'revolver', 'smg', 'carbine', 'rifle', 'dmr', 'sniper', 'lmg', 'shotgun'].indexOf(def.model) >= 0;
  if (isGun) {
    const mz = parts.muzzle;
    if (mz) {
      const mzY = mz.position.y, mzZ = mz.position.z;
      if (/suppress|silenc/.test(idl)) {
        C(g, 'suppressor', 0.027, L * 0.2, GF.propMat('metal', '#2a2e30'), 0, mzY, mzZ - L * 0.11, Math.PI / 2);
        B(g, 'supp_grip', 0.05, 0.05, 0.02, metal, 0, mzY - 0.03, mzZ - L * 0.02);
      } else if (/brake|compensat|ported|muzzle/.test(idl)) {
        B(g, 'brake', 0.038, 0.03, L * 0.045, GF.propMat('metal', '#3c4145'), 0, mzY, mzZ - L * 0.025);
        B(g, 'brake_port', 0.042, 0.012, L * 0.03, metal, 0, mzY + 0.012, mzZ - L * 0.03);
      }
      if (/tactical|night|urban|cqb|rail/.test(idl)) {
        B(g, 'light_body', 0.024, 0.024, 0.08, metal, -0.032, mzY - 0.028, -L * 0.48);
        C(g, 'light_lens', 0.012, 0.008, GF.mat('glass'), -0.032, mzY - 0.028, -L * 0.52, Math.PI / 2);
      }
    }
    if (def.model !== 'pistol' && def.model !== 'revolver') {
      B(g, 'sling', 0.012, 0.022, L * 0.46, GF.propMat('fabric', '#2c2820'), 0.032, -0.018, L * 0.06);
      B(g, 'sling_loop', 0.014, 0.03, 0.03, metal, 0.032, -0.018, -L * 0.26);
      /* ejection port + charging handle catch the light on close inspection */
      B(g, 'port', 0.006, 0.02, L * 0.1, GF.propMat('metal', '#1c2022'), 0.027, 0.048, -L * 0.02);
    }
    if (!parts.optic && parts.sight_rear) {
      B(g, 'reticle', 0.018, 0.012, 0.01, GF.propMat('metal', '#121212'),
        0, parts.sight_rear.position.y + 0.014, parts.sight_rear.position.z - 0.005);
    }
    /* wood-stocked guns get a metal butt plate */
    if (isWood && parts.stock) {
      B(g, 'buttplate', 0.05, 0.105, 0.012, metal, 0, parts.stock.position.y, parts.stock.position.z + L * 0.11);
    }
  }

  /* ---------------- machined detail pass ---------------- */
  if (isGun) {
    const gp = parts.grip;
    if (gp) {
      B(g, 'trigger_guard', 0.034, 0.008, 0.075, metal, gp.position.x, gp.position.y + 0.05, gp.position.z - 0.055);
      B(g, 'trigger_guard_front', 0.006, 0.05, 0.008, metal, gp.position.x, gp.position.y + 0.075, gp.position.z - 0.092);
      B(g, 'trigger_shoe', 0.008, 0.024, 0.012, GF.propMat('metal', '#1b1e20'), gp.position.x, gp.position.y + 0.056, gp.position.z - 0.058);
      if (parts.mag) B(g, 'magwell', 0.052, 0.02, 0.062, metal, parts.mag.position.x, parts.mag.position.y + 0.074, parts.mag.position.z);
      B(g, 'selector', 0.014, 0.012, 0.028, metal, 0.031, 0.05, gp.position.z + 0.03);
    }
    if (parts.body) {
      const bz = parts.body.position.z, by = parts.body.position.y;
      B(g, 'ejection_port', 0.012, 0.022, 0.085, GF.propMat('metal', '#15181a'), 0.031, by + 0.02, bz - 0.015);
      if (def.model !== 'shotgun') B(g, 'charging_handle', 0.04, 0.013, 0.018, metal, 0.021, by + 0.002, bz - 0.11);
      B(g, 'sling_swivel', 0.02, 0.014, 0.014, metal, 0, by - 0.046, bz + 0.05);
      B(g, 'pin_front', 0.008, 0.008, 0.008, metal, 0.028, by - 0.016, bz - 0.06);
      B(g, 'pin_rear', 0.008, 0.008, 0.008, metal, 0.028, by - 0.016, bz + 0.04);
    }
    if (parts.stock) {
      const sz = parts.stock.position.z, sy = parts.stock.position.y;
      B(g, 'butt_pad', 0.046, 0.095, 0.018, GF.propMat('plastic', '#1e2024'), 0, sy, sz + L * 0.115);
    }
    if (parts.rail) {
      const rz = parts.rail.position.z, ry = parts.rail.position.y;
      for (let i = 0; i < 6; i++) B(g, 'rail_slot' + i, 0.02, 0.006, 0.018, GF.propMat('metal', '#141618'), 0, ry + 0.009, rz - 0.14 + i * 0.056);
    }
    if (parts.handguard) {
      B(g, 'heat_shield', 0.05, 0.012, L * 0.24, GF.propMat('metal', '#2a2c2e'), 0, parts.handguard.position.y - 0.032, parts.handguard.position.z);
      B(g, 'barrel_nut', 0.026, 0.026, 0.02, metal, 0, parts.handguard.position.y, parts.handguard.position.z - L * 0.15);
    }
    /* muzzle crown, gas system, magazine ribs and receiver fasteners */
    if (parts.muzzle) {
      const my = parts.muzzle.position.y, mz = parts.muzzle.position.z;
      C(g, 'crown', 0.0152, 0.014, GF.propMat('metal', '#171a1c'), 0, my, mz - L * 0.012, Math.PI / 2);
      if (def.model === 'rifle' || def.model === 'carbine' || def.model === 'lmg' || def.model === 'dmr') {
        B(g, 'gas_block', 0.03, 0.036, 0.05, metal, 0, my + 0.014, mz + L * 0.44);
        B(g, 'gas_tube', 0.011, 0.011, L * 0.3, metal, 0, my + 0.03, mz + L * 0.6);
      }
    }
    if (parts.mag) {
      for (let i = 0; i < 3; i++) B(g, 'mag_rib' + i, 0.031, 0.009, 0.058, GF.propMat('metal', '#282c2e'),
        0, parts.mag.position.y + 0.026 - i * 0.028, parts.mag.position.z + 0.006);
    }
    if (parts.body) {
      const bz2 = parts.body.position.z, by2 = parts.body.position.y;
      B(g, 'top_cover', 0.046, 0.012, L * 0.2, metal, 0, by2 + 0.042, bz2 + 0.012);
      B(g, 'screw0', 0.008, 0.008, 0.008, GF.propMat('metal', '#8e959a'), -0.027, by2 + 0.008, bz2 + 0.09);
      B(g, 'screw1', 0.008, 0.008, 0.008, GF.propMat('metal', '#8e959a'), -0.027, by2 - 0.008, bz2 - 0.08);
    }
    /* optic package on the upgraded variants */
    if (/tactical|elite|marksman|match|prototype|custom/.test(idl) && parts.rail) {
      const rz = parts.rail.position.z, ry = parts.rail.position.y;
      B(g, 'riser', 0.026, 0.024, 0.05, metal, 0, ry + 0.02, rz - 0.04);
      C(g, 'red_dot', 0.016, 0.05, GF.propMat('metal', '#101214'), 0, ry + 0.046, rz - 0.06, Math.PI / 2);
      C(g, 'red_dot_lens', 0.013, 0.006, GF.mat('glass'), 0, ry + 0.046, rz - 0.086, Math.PI / 2);
    }
  }

  /* ---------------- per-weapon uniqueness pass ---------------- */
  {
    const rng = GF.mulberry32(GF.gunSeed(def));
    const pick = (a) => a[(rng() * a.length) | 0];
    const roll = (n) => (rng() * n) | 0;
    const chance = (p) => rng() < p;
    /* the catalogue hero rifle stays a clean black/red factory build */
    const scheme = def.id === 'm4a1' ? GF.GUN_SCHEMES[3] : pick(GF.GUN_SCHEMES);
    const furniture = new Set(['body', 'handguard', 'stock', 'grip', 'grip2', 'cheek', 'pump', 'butt_pad']);
    const poly = GF.propMat('plastic', scheme.fur);
    const furnMat = (isWood && scheme.wood) ? GF.propMat('wood', scheme.wood) : poly;
    const metalM = GF.propMat('metal', def.id === 'm4a1' ? '#4a4f54' : pick([scheme.metal, '#3a3e42', '#22262a', '#4a4f54', '#565c62', '#6a7076']));
    const accentM = GF.propMat('metal', scheme.accent);
    /* two-tone slides and painted receivers break the grey-gun look */
    const twoTone = chance(0.35) ? accentM : metalM;
    if (parts.slide) parts.slide.material = twoTone;
    if (parts.body && chance(0.55)) parts.body.material = GF.propMat('plastic', pick(['#2e3236', '#8a7758', '#414a36', '#3a4658', '#6b3a30', '#1c1e20', '#54504a', '#7a7264']));
    for (const name in parts) {
      const m = parts[name];
      if (!m || !m.isMesh) continue;
      if (furniture.has(name) && m.material !== GF.mat('glass')) m.material = furnMat;
      else if (name === 'barrel' || name === 'muzzle' || name === 'slide' || name === 'cylinder') m.material = metalM;
    }
    const isGunNow = isGun;
    if (isGunNow) {
      /* stock: solid, skeletonised, folding or bare */
      if (parts.stock) {
        const style = roll(4);
        parts.stock.scale.z *= 0.86 + rng() * 0.3;
        if (style === 0) {
          parts.stock.visible = false;
          B(g, 'u_fold_rod', 0.024, 0.024, L * 0.2, metalM, 0, 0.02, L * 0.22);
          B(g, 'u_fold_pad', 0.04, 0.08, 0.014, GF.propMat('plastic', '#1c1e20'), 0, 0.02, L * 0.33);
        } else if (style === 2) {
          B(g, 'u_skel_top', 0.02, 0.02, L * 0.24, metalM, 0, 0.06, L * 0.3);
          B(g, 'u_skel_bot', 0.02, 0.02, L * 0.22, metalM, 0, -0.035, L * 0.29);
        }
        if (chance(0.35)) B(g, 'u_stock_wrap', parts.stock.scale.x * 0.052, 0.012, 0.05, accentM, 0, 0.035, L * 0.26);
      }
      /* magazine: standard, extended, angled or drum */
      if (parts.mag) {
        const magStyle = roll(6);
        if (magStyle === 0) {
          parts.mag.scale.y *= 1.45;
          parts.mag.position.y -= 0.03;
        } else if (magStyle === 1) {
          parts.mag.rotation.z += 0.22;
          parts.mag.position.z += 0.015;
        } else if (magStyle === 2 && (def.model === 'rifle' || def.model === 'smg' || def.model === 'lmg')) {
          parts.mag.scale.z *= 0.7;
          add(g, 'u_drum', new CylinderGeometry(0.062, 0.062, 0.045, 14), accentM, 0, parts.mag.position.y - 0.02, parts.mag.position.z, 0, 0, Math.PI / 2);
        }
        B(g, 'u_mag_pull', 0.03, 0.012, 0.02, accentM, 0, parts.mag.position.y - 0.05, parts.mag.position.z);
      }
      /* muzzle device ------------------------------------------------ */
      if (parts.muzzle && !parts.suppressor && !parts.brake) {
        const my = parts.muzzle.position.y, mzz = parts.muzzle.position.z;
        const kind = roll(5);
        if (kind === 0) {
          C(g, 'u_suppressor', 0.024, L * 0.16, GF.propMat('metal', '#24282a'), 0, my, mzz - L * 0.09, Math.PI / 2);
        } else if (kind === 1) {
          B(g, 'u_brake', 0.032, 0.026, 0.05, metalM, 0, my, mzz - 0.02);
          B(g, 'u_brake_port', 0.036, 0.01, 0.03, GF.propMat('metal', '#171a1c'), 0, my + 0.011, mzz - 0.02);
        } else if (kind === 2) {
          C(g, 'u_comp', 0.019, 0.045, metalM, 0, my, mzz - 0.02, Math.PI / 2);
        }
      }
      /* optic: iron sights, red dot, scope or holo -------------------- */
      if (!parts.optic) {
        const baseY = (parts.rail ? parts.rail.position.y : (parts.body ? parts.body.position.y : 0.03)) + 0.025;
        const baseZ = parts.rail ? parts.rail.position.z + 0.05 : (parts.body ? parts.body.position.z : 0);
        const kind = roll(4);
        if (kind === 1) {
          B(g, 'u_dot_base', 0.024, 0.018, 0.04, metalM, 0, baseY, baseZ);
          C(g, 'u_dot_tube', 0.014, 0.042, GF.propMat('metal', '#141618'), 0, baseY + 0.025, baseZ, Math.PI / 2);
          C(g, 'u_dot_lens', 0.012, 0.006, GF.mat('glass'), 0, baseY + 0.025, baseZ - 0.024, Math.PI / 2);
        } else if (kind === 2 && (def.model === 'rifle' || def.model === 'dmr' || def.model === 'carbine' || def.model === 'sniper' || def.model === 'lmg')) {
          C(g, 'u_scope', 0.02, L * 0.18, GF.propMat('metal', '#1a1d1f'), 0, baseY + 0.04, baseZ - 0.02, Math.PI / 2);
          C(g, 'u_scope_lens', 0.018, 0.008, GF.mat('glass'), 0, baseY + 0.04, baseZ - L * 0.09, Math.PI / 2);
          B(g, 'u_scope_mount', 0.018, 0.026, 0.02, metalM, 0, baseY + 0.015, baseZ + 0.01);
        } else if (kind === 3) {
          B(g, 'u_holo', 0.038, 0.042, 0.03, GF.propMat('metal', '#22262a'), 0, baseY + 0.015, baseZ);
          B(g, 'u_holo_glass', 0.03, 0.026, 0.004, GF.mat('glass'), 0, baseY + 0.017, baseZ - 0.014);
        }
      }
      /* underbarrel furniture ---------------------------------------- */
      if (parts.handguard) {
        const hz = parts.handguard.position.z, hy = parts.handguard.position.y;
        if (chance(0.34)) B(g, 'u_foregrip', 0.026, 0.09, 0.035, GF.propMat('plastic', '#1c1e20'), 0, hy - 0.065, hz + 0.02, 0.1);
        if (chance(0.22)) {
          B(g, 'u_mlok0', 0.006, 0.018, 0.06, GF.propMat('metal', '#171a1c'), 0.026, hy, hz - 0.06);
          B(g, 'u_mlok1', 0.006, 0.018, 0.06, GF.propMat('metal', '#171a1c'), 0.026, hy, hz + 0.03);
        }
        if (def.model === 'lmg' || (def.model === 'rifle' && chance(0.16))) {
          B(g, 'u_bipod_l', 0.01, 0.13, 0.01, metalM, -0.03, hy - 0.06, hz - L * 0.12, 0, 0, 0.35);
          B(g, 'u_bipod_r', 0.01, 0.13, 0.01, metalM, 0.03, hy - 0.06, hz - L * 0.12, 0, 0, -0.35);
        }
        if (chance(0.2)) B(g, 'u_tape', 0.052, 0.012, 0.05, accentM, 0, hy + 0.03, hz - 0.04);
      }
      /* receiver wear + painted ID stripe ----------------------------- */
      if (parts.body) {
        const bx = parts.body.position.x, by = parts.body.position.y, bz = parts.body.position.z;
        if (chance(0.5)) {
          B(g, 'u_wear0', 0.003, 0.014, 0.03, GF.propMat('metal', '#3a3632'), 0.027, by - 0.01, bz + 0.03);
          B(g, 'u_wear1', 0.003, 0.01, 0.02, GF.propMat('metal', '#3a3632'), 0.027, by + 0.02, bz - 0.02);
        }
        if (chance(0.3)) B(g, 'u_stripe', 0.054, 0.01, 0.05, accentM, 0, by + 0.028, bz + 0.06);
        if (chance(0.25)) B(g, 'u_plate', 0.008, 0.028, 0.04, metalM, -0.028, by, bz + 0.01);
      }
      /* handguns get slide cuts or a long slide ----------------------- */
      /* receiver and barrel proportions drift between individual guns */
      if (parts.body) parts.body.scale.z *= 0.9 + rng() * 0.22;
      if (parts.barrel) {
        const bk = 0.86 + rng() * 0.4;
        parts.barrel.scale.y *= bk;
        parts.barrel.position.z -= (bk - 1) * 0.06;
      }
      if (def.model === 'pistol' && chance(0.14)) {
        /* machine-pistol kit: shoulder stock and foregrip change the profile */
        B(g, 'u_pistol_stock', 0.024, 0.028, 0.17, furnMat, 0, 0.012, 0.13);
        B(g, 'u_pistol_pad', 0.034, 0.08, 0.018, accentM, 0, -0.005, 0.22);
        B(g, 'u_pistol_fore', 0.024, 0.07, 0.03, GF.propMat('plastic', '#1c1e20'), 0, -0.045, -L * 0.28);
      }
      if (def.model === 'pistol' && chance(0.1)) {
        C(g, 'u_race_barrel', 0.007, L * 0.4, metalM, 0, 0.042, -L * 1.05, Math.PI / 2);
        B(g, 'u_race_comp', 0.026, 0.024, 0.05, accentM, 0, 0.042, -L * 1.22);
      }
      if (def.model === 'pistol') {
        if (parts.slide) {
          parts.slide.scale.z *= 0.84 + rng() * 0.4;
          parts.slide.position.z += (rng() - 0.5) * 0.02;
          if (chance(0.4)) for (let i = 0; i < 4; i++) B(g, 'u_serr' + i, 0.036, 0.024, 0.004, GF.propMat('metal', '#15181a'), 0, 0.042, -L * 0.82 + i * 0.012);
        }
        if (parts.grip) {
          parts.grip.rotation.x = 0.2 + rng() * 0.22;
          parts.grip.scale.y *= 0.88 + rng() * 0.3;
        }
        if (parts.mag) B(g, 'u_floorplate', 0.042 + rng() * 0.02, 0.012, 0.05, accentM, 0, parts.mag.position.y - 0.05, parts.mag.position.z);
        if (parts.barrel) parts.barrel.position.z -= 0.015 + rng() * 0.045;
        if (chance(0.5)) {
          for (let i = 0; i < 3; i++) B(g, 'u_cut' + i, 0.004, 0.03, 0.012, GF.propMat('metal', '#15181a'), 0.019, 0.05, -L * 0.12 - i * 0.03, 0);
        }
        if (chance(0.3)) B(g, 'u_hammer', 0.014, 0.02, 0.012, metalM, 0, 0.055, 0.055);
        if (chance(0.45)) B(g, 'u_engrave', 0.03, 0.008, 0.05, accentM, 0, 0.02, -L * 0.2);
      }
      if (def.model === 'revolver') {
        if (parts.cylinder) {
          parts.cylinder.scale.y *= 0.8 + rng() * 0.45;
          for (let i = 0; i < 4; i++) B(g, 'u_flute' + i, 0.008, 0.03, 0.008, GF.propMat('metal', '#15181a'), 0.032, 0.035, parts.cylinder.position.z - 0.02 + i * 0.013);
        }
        if (chance(0.45)) B(g, 'u_rib', 0.016, 0.012, L * 0.5, metalM, 0, 0.068, -L * 0.5);
        if (chance(0.35)) B(g, 'u_lanyard', 0.01, 0.03, 0.01, accentM, 0, -0.1, 0.05);
      }
      if (def.model === 'shotgun' && chance(0.5)) {
        for (let i = 0; i < 4; i++) C(g, 'u_shell' + i, 0.009, 0.035, GF.propMat('plastic', i % 2 ? '#8a2a24' : '#c9a227'), 0.038, 0.02 + i * 0.008, -0.02 - i * 0.03, Math.PI / 2);
      }
    } else {
      /* melee weapons get hand-forged variety ----------------------- */
      const blade = parts.blade;
      if (blade) {
        blade.scale.x *= 0.7 + rng() * 0.9;
        blade.rotation.y += (rng() - 0.5) * 0.08;
        const style = roll(3);
        if (style === 1) {
          for (let i = 0; i < 5; i++) B(g, 'u_tooth' + i, 0.006, 0.014, 0.012, metalM, 0.012, 0.01 + i * 0.012, -L * 0.2 - i * 0.05);
        } else if (style === 2) {
          B(g, 'u_spine', 0.012, 0.02, L * 0.6, metalM, -0.01, 0.03, -L * 0.4);
        }
      }
      if (parts.grip) {
        for (let i = 0; i < 3; i++) B(g, 'u_wrap' + i, 0.032, 0.01, 0.012, GF.propMat('fabric', i % 2 ? '#2a2420' : '#6b4a2c'), 0, parts.grip.position.y + i * 0.02, parts.grip.position.z);
        B(g, 'u_pommel', 0.034, 0.02, 0.02, metalM, 0, parts.grip.position.y - 0.02, parts.grip.position.z + 0.03);
      }
    }
  }

  g.userData.parts = parts;
  g.userData.def = def;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return g;
};

/* Concatenate non-indexed geometries that share a material. */
GF.concatGeometries = function (geos) {
  const attrs = [['position', 3], ['normal', 3], ['uv', 2]];
  let total = 0;
  for (const g of geos) total += g.attributes.position.count;
  const out = new BufferGeometry();
  for (const [name, size] of attrs) {
    const arr = new Float32Array(total * size);
    let off = 0;
    for (const g of geos) {
      const src = g.attributes[name];
      if (src) arr.set(src.array.subarray(0, src.count * size), off * size);
      off += g.attributes.position.count;
    }
    out.setAttribute(name, new BufferAttribute(arr, size));
  }
  for (const g of geos) g.dispose();
  return out;
};

/* Static gun: bake every part into one mesh per material. World weapons and
   ragdoll-held guns do not animate their parts, so this cuts an actor's
   draw calls from ~25 to ~5 without changing how the gun looks. */
GF.buildGunModelMerged = function (def) {
  const src = GF.buildGunModel(def);
  src.updateMatrixWorld(true);
  const inv = new Matrix4().copy(src.matrixWorld).invert();
  const m4 = new Matrix4();
  const buckets = new Map();
  src.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    m4.copy(inv).multiply(o.matrixWorld);
    g.applyMatrix4(m4);
    const list = buckets.get(o.material);
    if (list) list.push(g); else buckets.set(o.material, [g]);
  });
  const out = new Group();
  for (const [mat, geos] of buckets) {
    const mesh = new Mesh(GF.concatGeometries(geos), mat);
    mesh.castShadow = true;
    out.add(mesh);
  }
  out.userData.def = def;
  return out;
};

GF.buildViewWeapon = function (def) {
  const root = new Group();
  const model = GF.buildGunModel(def);
  // view-model scale: real firearms are long, but the camera sits ~0.45m away.
  const s = def.model === 'sniper' ? 0.55 : def.model === 'lmg' ? 0.58 :
    def.model === 'pistol' || def.model === 'revolver' ? 0.9 : 0.64;
  model.scale.setScalar(s);
  /* the rifle reads clean without block hands at this scale */
  root.add(model);
  root.userData.parts = model.userData.parts;
  root.userData.model = model;
  return root;
};

/* ---------------------------------------------------------------------
   Studio image-based lighting. Metals, glass and polymer need something
   to reflect: a tiny procedural sky with three soft light panels is run
   through PMREM once and shared by the world, the view model and the
   spawn-menu thumbnails.
   --------------------------------------------------------------------- */
GF._env = undefined;
GF.envMap = function (renderer) {
  if (GF._env !== undefined) return GF._env;
  GF._env = null;
  if (!renderer || GF.quality === 'low') return null;
  try {
    const pm = new PMREMGenerator(renderer);
    const sc = new Scene();
    const sky = new Mesh(new SphereGeometry(1, 24, 16), new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new Color(0xb4c8d8) },
        mid: { value: new Color(0x8d949a) },
        bot: { value: new Color(0x39332c) }
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'varying vec3 vP;',
        'uniform vec3 top; uniform vec3 mid; uniform vec3 bot;',
        'void main(){',
        '  float h = normalize(vP).y;',
        '  vec3 c = mix(mid, top, smoothstep(0.0, 0.85, h));',
        '  c = mix(bot, c, smoothstep(-0.45, 0.05, h));',
        '  gl_FragColor = vec4(c, 1.0);',
        '}'
      ].join('\n')
    }));
    sky.scale.setScalar(20);
    sc.add(sky);
    const panel = (x, y, z, w, h, col, k) => {
      const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({
        color: new Color(col).multiplyScalar(k), side: DoubleSide, fog: false
      }));
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      sc.add(m);
    };
    panel(0.5, 9, -1.5, 16, 10, 0xfff2dd, 3.4);
    panel(-9, 4, 3, 11, 9, 0xa9c8ea, 1.5);
    panel(8, 2.5, 6, 9, 7, 0xffd8ac, 1.15);
    panel(0, -8, 0, 20, 20, 0x4a4238, 0.5);
    const rt = pm.fromScene(sc, 0.035, 0.1, 60);
    GF._env = rt.texture;
    pm.dispose();
    sc.traverse((o) => {
      if (o.isMesh) { o.geometry.dispose(); if (o.material) o.material.dispose(); }
    });
  } catch (e) { GF._env = null; }
  return GF._env;
};
