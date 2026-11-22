/* =====================================================================
   GORE TOWN — verlet ragdoll: 12 deformable bones, 16 nodes, procedural
   walk/aim animation while alive, full physics once dead, limb loss.
   ===================================================================== */

const GFR_UP = new Vector3(0, 1, 0);
const GFR_V1 = new Vector3();
const GFR_V2 = new Vector3();
const GFR_V3 = new Vector3();
const GFR_Q = new Quaternion();

GF.RAG_NODES = [
  /* key,      x,     y,     z,   radius, mass, part */
  ['head', 0, 1.66, 0, 0.135, 1.0, 'head'],
  ['neck', 0, 1.52, 0, 0.085, 1.0, 'head'],
  ['chest', 0, 1.34, 0, 0.175, 3.0, 'torso'],
  ['pelvis', 0, 1.00, 0, 0.165, 2.4, 'torso'],
  ['lArmU', -0.22, 1.40, 0, 0.070, 0.8, 'lArm'],
  ['lArmF', -0.30, 1.14, 0, 0.058, 0.7, 'lArm'],
  ['rArmU', 0.22, 1.40, 0, 0.070, 0.8, 'rArm'],
  ['rArmF', 0.30, 1.14, 0, 0.058, 0.7, 'rArm'],
  ['lLegU', -0.11, 1.00, 0, 0.090, 1.6, 'lLeg'],
  ['lLegF', -0.12, 0.56, 0, 0.075, 1.4, 'lLeg'],
  ['rLegU', 0.11, 1.00, 0, 0.090, 1.6, 'rLeg'],
  ['rLegF', 0.12, 0.56, 0, 0.075, 1.4, 'rLeg'],
  ['lHand', -0.33, 0.92, 0, 0.055, 0.3, 'lArm'],
  ['rHand', 0.33, 0.92, 0, 0.055, 0.3, 'rArm'],
  ['lFoot', -0.13, 0.08, 0, 0.070, 0.4, 'lLeg'],
  ['rFoot', 0.13, 0.08, 0, 0.070, 0.4, 'rLeg']
];

GF.RAG_BONES = [
  /* from,   to,     width, depth, part,      kind */
  ['head', 'neck', 0.20, 0.21, 'head', 'head'],
  ['neck', 'chest', 0.13, 0.13, 'torso', 'skin'],
  ['chest', 'pelvis', 0.36, 0.22, 'torso', 'shirt'],
  ['chest', 'lArmU', 0.12, 0.13, 'lArm', 'shirt'],
  ['lArmU', 'lArmF', 0.105, 0.105, 'lArm', 'shirt'],
  ['chest', 'rArmU', 0.12, 0.13, 'rArm', 'shirt'],
  ['rArmU', 'rArmF', 0.105, 0.105, 'rArm', 'shirt'],
  ['pelvis', 'lLegU', 0.17, 0.18, 'lLeg', 'pants'],
  ['lLegU', 'lLegF', 0.155, 0.16, 'lLeg', 'pants'],
  ['pelvis', 'rLegU', 0.17, 0.18, 'rLeg', 'pants'],
  ['rLegU', 'rLegF', 0.155, 0.16, 'rLeg', 'pants'],
  ['lArmF', 'lHand', 0.085, 0.085, 'lArm', 'skin'],
  ['rArmF', 'rHand', 0.085, 0.085, 'rArm', 'skin'],
  ['lLegF', 'lFoot', 0.11, 0.11, 'lLeg', 'boots'],
  ['rLegF', 'rFoot', 0.11, 0.11, 'rLeg', 'boots']
];

/* Shared unit meshes: every ragdoll bone is a scaled instance of one of
   these, so a hundred corpses cost a handful of geometries instead of
   thousands. Lathe profiles round the ends of every limb, so arms and legs
   meet at the joints instead of showing flat cylinder caps. */
/* A head with an actual jaw, chin and brow instead of a bare sphere. */
GF.headGeo = function () {
  const g = new SphereGeometry(0.5, 18, 14);
  const pos = g.attributes.position;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const front = v.z > -0.06;
    const low = Math.max(0, -v.y * 1.85);
    if (front) {
      const f = low * low;
      v.z += f * 0.17 * v.z;
      v.y -= f * 0.11;
      v.x *= 1 - f * 0.2;
    }
    if (v.z < 0) v.z *= 0.9;
    if (front) {
      const brow = Math.exp(-Math.pow((v.y - 0.19) * 4.2, 2));
      v.z += brow * 0.045;
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  g.userData.shared = true;
  return g;
};

GF.lathe = function (pts, seg) {
  const g = new LatheGeometry(pts.map(p => new Vector2(p[0], p[1])), seg || 12);
  g.userData.shared = true;
  return g;
};
GF.RAG_GEO = {
  limb: GF.lathe([[0, -0.5], [0.28, -0.5], [0.40, -0.465], [0.47, -0.40], [0.5, -0.30],
    [0.5, 0.30], [0.47, 0.40], [0.40, 0.465], [0.28, 0.5], [0, 0.5]], 12),
  torso: GF.lathe([[0, -0.5], [0.24, -0.5], [0.36, -0.46], [0.42, -0.34], [0.45, -0.05],
    [0.5, 0.20], [0.48, 0.36], [0.40, 0.46], [0.26, 0.5], [0, 0.5]], 14),
  head: GF.headGeo(),
  eye: new SphereGeometry(0.5, 8, 6),
  joint: new SphereGeometry(0.5, 10, 8),
  gear: GF.bevGeo(1, 1, 1, 0.16),
  hand: GF.bevGeo(1, 1, 1, 0.26),
  helmet: new SphereGeometry(0.5, 16, 9, 0, Math.PI * 2, 0, Math.PI * 0.58),
  organ: new SphereGeometry(0.5, 8, 6),
  gut: new CylinderGeometry(0.5, 0.5, 1, 8),
  wound: new TorusGeometry(0.5, 0.13, 6, 16)
};
GF.RAG_SHARED = new Set(Object.keys(GF.RAG_GEO).map(k => GF.RAG_GEO[k]));
for (const g of GF.RAG_SHARED) GF.sharedGeo.add(g);

GF.ragMatCache = {};
GF.ragMat = function (color, kind) {
  const key = color + kind;
  if (GF.ragMatCache[key]) return GF.ragMatCache[key];
  const texKind = kind === 'skin' ? 'skin' : kind === 'meat' ? 'meat' : kind === 'boots' ? 'leather' : 'camo';
  const rough = kind === 'skin' ? 0.62 : kind === 'meat' ? 0.3 : kind === 'boots' ? 0.55 : 0.82;
  const base = new Color(color);
  if (kind === 'skin') base.multiplyScalar(1.14);
  const m = new MeshStandardMaterial({
    color: base,
    map: GF.tex(texKind),
    roughness: rough,
    metalness: kind === 'boots' ? 0.24 : 0.0
  });
  if (GF.quality !== 'low') {
    const nt = GF.normalFor(texKind);
    if (nt) {
      m.normalMap = nt;
      const s = (GF.NRM_STRENGTH[texKind] || 0.7) * (kind === 'skin' ? 0.7 : 1);
      m.normalScale = new Vector2(s, s);
    }
  }
  m.envMapIntensity = kind === 'boots' ? 0.55 : kind === 'meat' ? 0.5 : 0.3;
  GF.ragMatCache[key] = m;
  return m;
};

class GFRagdoll {
  constructor(type, pos, yaw, opts) {
    opts = opts || {};
    this.type = type;
    this.scale = opts.scale || type.scale || 1;
    this.yaw = yaw || 0;
    this.dead = false;
    this.group = new Group();
    this.nodes = [];
    this.bones = [];
    this.parts = { head: 1, torso: 1, lArm: 1, rArm: 1, lLeg: 1, rLeg: 1 };
    this.partHp = { head: 55, torso: 120, lArm: 55, rArm: 55, lLeg: 65, rLeg: 65 };
    this.blood = 1;
    this.sleepTimer = 0;
    this.sleeping = false;
    this.gibbed = [];
    this.hitFlash = 0;
    this.aimPitch = 0;
    this.weapon = null;
    this.gun = null;
    this.phase = Math.random() * Math.PI * 2;
    this.pinnedRoot = new Vector3(pos.x, pos.y, pos.z);
    this.velocity = new Vector3();
    this.colors = type.colors;
    this.mats = {
      skin: GF.ragMat(type.colors.skin, 'skin'),
      shirt: GF.ragMat(type.colors.shirt, 'shirt'),
      pants: GF.ragMat(type.colors.pants, 'pants'),
      boots: GF.ragMat(type.colors.gear, 'boots'),
      gloves: GF.ragMat(type.colors.gear, 'boots')
    };

    const S = this.scale;
    for (const def of GF.RAG_NODES) {
      const [key, x, y, z, r] = def;
      const p = {
        key, r: r * S, mass: def[5], part: def[6],
        x: pos.x + x * S, y: pos.y + y * S, z: pos.z + z * S,
        px: 0, py: 0, pz: 0, rx: x * S, ry: y * S, rz: z * S, detached: false
      };
      p.px = p.x; p.py = p.y; p.pz = p.z;
      this.nodes.push(p);
    }
    this.byKey = {};
    for (const n of this.nodes) this.byKey[n.key] = n;

    /* constraints */
    this.constraints = [];
    const addC = (a, b, stiff) => {
      const A = this.byKey[a], B = this.byKey[b];
      const d = Math.hypot(A.rx - B.rx, A.ry - B.ry, A.rz - B.rz);
      this.constraints.push({ a: A, b: B, len: d, stiff: stiff || 1 });
    };
    for (const [a, b] of [
      ['head', 'neck'], ['neck', 'chest'], ['chest', 'pelvis'],
      ['chest', 'lArmU'], ['lArmU', 'lArmF'], ['lArmF', 'lHand'],
      ['chest', 'rArmU'], ['rArmU', 'rArmF'], ['rArmF', 'rHand'],
      ['pelvis', 'lLegU'], ['lLegU', 'lLegF'], ['lLegF', 'lFoot'],
      ['pelvis', 'rLegU'], ['rLegU', 'rLegF'], ['rLegF', 'rFoot'],
      /* bracing */
      ['head', 'chest', 0.55], ['lArmU', 'rArmU', 0.35], ['lLegU', 'rLegU', 0.4],
      ['chest', 'lArmF', 0.25], ['chest', 'rArmF', 0.25]
    ]) addC(a, b, 1);

    const tactical = !/civilian|tourist|scientist|doctor|farmer|hunter|survivor|worker|zombie|skeleton/i.test(type.name);
    for (const [from, to, w, d, part, kind] of GF.RAG_BONES) {
      const geo = from === 'head' ? GF.RAG_GEO.head : (part === 'torso' ? GF.RAG_GEO.torso : GF.RAG_GEO.limb);
      const mat = tactical && (to === 'lHand' || to === 'rHand' || (from === 'neck' && to === 'chest'))
        ? this.mats.gloves : (this.mats[kind] || this.mats.skin);
      const m = new Mesh(geo, mat);
      m.castShadow = true;
      m.userData.part = part;
      this.group.add(m);
      this.bones.push({ from, to, w: w * S, d: d * S, mesh: m, part, kind, head: from === 'head' });
    }
    this.chestBone = this.bones.find(b => b.from === 'chest' && b.to === 'pelvis') || this.bones[2];
    /* head detail */
    const headMesh = this.bones[0].mesh;
    this.helmet = null;
    if (/soldier|operative|swat|riot|juggernaut|marksman|sniper|police|military|cyborg|android|zombie/i.test(type.name) && !/civil|tourist|worker|scientist|doctor|farmer|hunter|survivor/i.test(type.name)) {
      const h = new Mesh(GF.RAG_GEO.helmet, GF.ragMat(type.colors.shirt, 'shirt'));
      h.scale.set(0.30 * S, 0.22 * S, 0.32 * S);
      h.castShadow = true;
      this.group.add(h);
      this.helmet = { mesh: h, offset: 0.055 * S };
    }
    /* face */
    const eyeMat = GF.ragMat('#101010', 'boots');
    this.eyes = [];
    for (const sx of [-1, 1]) {
      const e = new Mesh(GF.RAG_GEO.eye, eyeMat);
      e.scale.set(0.038 * S, 0.026 * S, 0.02 * S);
      this.group.add(e);
      this.eyes.push(e);
    }
    /* shoulders, elbows, knees and the pelvis cap close the gaps between
       bones so the body reads as one silhouette instead of a puppet */
    this.joints = [];
    if (GF.quality !== 'low') {
      for (const [key, r, kind] of [
        ['lArmU', 0.088, 'shirt'], ['rArmU', 0.088, 'shirt'],
        ['lArmF', 0.062, 'skin'], ['rArmF', 0.062, 'skin'],
        ['lLegF', 0.08, 'pants'], ['rLegF', 0.08, 'pants'],
        ['pelvis', 0.104, 'pants'], ['neck', 0.068, 'skin']
      ]) {
        const m = new Mesh(GF.RAG_GEO.joint, this.mats[kind] || this.mats.skin);
        m.castShadow = true;
        m.scale.setScalar(r * 2 * S);
        this.group.add(m);
        this.joints.push({ mesh: m, node: key });
      }
    }
    /* gloved hands: palm plus a thumb, so limbs end in a hand */
    this.hands = [];
    if (GF.quality !== 'low') {
      const hm = this.mats.gloves || this.mats.skin;
      for (const key of ['lHand', 'rHand']) {
        const m = new Mesh(GF.RAG_GEO.hand, hm);
        m.castShadow = true;
        this.group.add(m);
        this.hands.push({ mesh: m, node: key, side: key === 'lHand' ? -1 : 1 });
      }
    }
    /* visor, face mask and ear protection for tactical archetypes */
    this.faceGear = [];
    if (tactical && GF.quality !== 'low') {
      const visorMat = GF.propMat('plastic', '#0b0e13');
      const maskMat = GF.ragMat('#22201d', 'boots');
      const cupMat = GF.ragMat(type.colors.gear, 'boots');
      const addFace = (w, h, d, ox, oy, oz, mat) => {
        const m = new Mesh(GF.RAG_GEO.gear, mat);
        m.castShadow = true;
        this.group.add(m);
        this.faceGear.push({ mesh: m, w: w * S, h: h * S, d: d * S, ox: ox * S, oy: oy * S, oz: oz * S });
      };
      addFace(0.20, 0.05, 0.035, 0, 0.032, 0.113, visorMat);
      addFace(0.18, 0.075, 0.04, 0, -0.05, 0.102, maskMat);
      addFace(0.04, 0.065, 0.05, -0.138, 0.0, 0.0, cupMat);
      addFace(0.04, 0.065, 0.05, 0.138, 0.0, 0.0, cupMat);
    }
    /* boots follow the foot nodes so the silhouette has real feet */
    this.boots = [];
    if (GF.quality !== 'low') {
      const bootMat = GF.ragMat(type.colors.gear, 'boots');
      const soleMat = GF.ragMat('#131211', 'boots');
      for (let i = 0; i < 2; i++) {
        const grp = new Group();
        const upper = new Mesh(GF.RAG_GEO.gear, bootMat);
        upper.scale.set(0.14 * S, 0.072 * S, 0.25 * S);
        upper.position.y = 0.008 * S;
        upper.castShadow = true;
        const sole = new Mesh(GF.RAG_GEO.gear, soleMat);
        sole.scale.set(0.152 * S, 0.03 * S, 0.27 * S);
        sole.position.set(0, -0.036 * S, 0.012 * S);
        sole.castShadow = true;
        grp.add(upper, sole);
        this.group.add(grp);
        this.boots.push({ group: grp, node: i ? 'rFoot' : 'lFoot', y: -0.036 * S, fwd: 0.03 * S });
      }
    }
    /* webbing, plate carrier, pouches and belt on tactical archetypes */
    this.gear = [];
    this.gearQ = new Quaternion();
    if (tactical && GF.quality !== 'low') {
      const gearMat = GF.ragMat(type.colors.gear, 'boots');
      const beltMat = GF.ragMat('#2a2420', 'boots');
      const addGear = (w, h, d, ox, oy, oz, mat) => {
        const m = new Mesh(GF.RAG_GEO.gear, mat || gearMat);
        m.castShadow = true;
        this.group.add(m);
        this.gear.push({ mesh: m, w: w * S, h: h * S, d: d * S, ox: ox * S, oy: oy * S, oz: oz * S });
      };
      addGear(0.30, 0.30, 0.11, 0, 0.03, 0.12);
      addGear(0.10, 0.11, 0.08, -0.13, -0.09, 0.07);
      addGear(0.10, 0.11, 0.08, 0.13, -0.09, 0.07);
      addGear(0.34, 0.06, 0.21, 0, -0.18, 0, beltMat);
    }

    /* exposed viscera: a torso hit tears the abdomen open and the organs
       stay visible inside until they are shot out or the body is looted */
    this.cavityOpen = false;
    this.gearTorn = false;
    this.cavityMesh = null;
    this.viscera = [];
    {
      const cav = new Mesh(GF.RAG_GEO.organ, GF.ragMat('#2a0809', 'meat'));
      cav.scale.set(0.23 * S, 0.29 * S, 0.075 * S);
      cav.visible = false;
      cav.castShadow = false;
      this.group.add(cav);
      this.cavityMesh = cav;
      const rim = new Mesh(GF.RAG_GEO.wound, GF.ragMat('#611013', 'skin'));
      rim.scale.set(0.19 * S, 0.24 * S, 0.10 * S);
      rim.visible = false;
      this.group.add(rim);
      this.woundRim = rim;
      const list = [
        ['heart', 0.07, 0.08, 0.065, 0.00, 0.05],
        ['lung', 0.078, 0.11, 0.075, -0.055, 0.05],
        ['lung', 0.078, 0.11, 0.075, 0.055, 0.05],
        ['liver', 0.09, 0.06, 0.075, 0.042, -0.05],
        ['intestine', 0.12, 0.06, 0.06, -0.015, -0.088]
      ];
      for (const [kind, w, h, d, ox, oy] of list) {
        const mesh = new Mesh(kind === 'intestine' ? GF.RAG_GEO.gut : GF.RAG_GEO.organ,
          GF.ragMat(kind === 'heart' ? '#c22b33' : kind === 'liver' ? '#86543a' : kind === 'lung' ? '#c47f7f' : '#c9937f', 'meat'));
        mesh.scale.set(w * 1.2 * S, h * 1.2 * S, d * 1.2 * S);
        if (kind === 'intestine') mesh.rotation.z = Math.PI / 2;
        mesh.visible = false;
        this.group.add(mesh);
        this.viscera.push({ mesh, ox: ox * S, oy: oy * S, oz: 0.012 * S, kind, ejected: false });
      }
    }

    /* weapon model in hand */
    if (opts.weapon && opts.weapon !== 'fists') {
      const def = GF.weaponById(opts.weapon);
      if (def) {
        this.weapon = def;
        this.gun = GF.buildGunModelMerged(def);
        this.gun.scale.setScalar(0.9);
        this.group.add(this.gun);
      }
    }

    this.setPose(0, 0, 'idle', 0);
  }

  /* ------------------------------ pose ------------------------------ */
  setPose(dt, speed, mode, aimPitch) {
    if (this.dead) return;
    const S = this.scale;
    const n = this.byKey;
    const t = GF.time * 1.0 + this.phase;
    const walk = GF.clamp(speed / 3.2, 0, 1);
    const stride = Math.sin(t * 6.5) * 0.28 * walk;
    const stride2 = Math.cos(t * 6.5) * 0.28 * walk;
    const bob = Math.abs(Math.sin(t * 6.5)) * 0.035 * walk;
    const breathe = Math.sin(t * 1.6) * 0.008;

    const local = {};
    const set = (k, x, y, z) => { local[k] = [x, y, z]; };
    set('pelvis', 0, 0.99 + bob + breathe, 0);
    set('chest', 0, 1.33 + bob + breathe, 0.01);
    set('neck', 0, 1.51 + bob + breathe, 0.01);
    set('head', 0, 1.65 + bob + breathe, 0.02);
    set('lHand', -0.33, 0.92 + bob, stride * 0.5);
    set('rHand', 0.33, 0.92 + bob, -stride * 0.5);
    set('lFoot', -0.13, 0.08, stride);
    set('rFoot', 0.13, 0.08, -stride);
    set('lLegU', -0.11, 0.99 + bob, stride * 0.12);
    set('rLegU', 0.11, 0.99 + bob, -stride * 0.12);
    set('lLegF', -0.12, 0.55 + bob + Math.max(0, -stride2) * 0.06, stride * 0.75);
    set('rLegF', 0.12, 0.55 + bob + Math.max(0, stride2) * 0.06, -stride * 0.75);
    set('lArmU', -0.22, 1.38 + bob, -stride * 0.12);
    set('rArmU', 0.22, 1.38 + bob, stride * 0.12);
    set('lArmF', -0.29, 1.12 + bob, stride * 0.3);
    set('rArmF', 0.29, 1.12 + bob, -stride * 0.3);

    if (mode === 'aim' && this.weapon) {
      const p = aimPitch || 0;
      const reach = 0.52 + Math.sin(p) * 0.18;
      set('rHand', 0.13, 1.28 + bob - Math.sin(p) * 0.1, reach);
      set('rArmF', 0.20, 1.28 + bob, reach * 0.55);
      set('lHand', 0.02, 1.30 + bob, reach + 0.14);
      set('lArmF', -0.06, 1.26 + bob, reach * 0.55);
      set('lArmU', -0.16, 1.38 + bob, 0.1);
      set('rArmU', 0.19, 1.38 + bob, 0.08);
      set('chest', 0, 1.33 + bob, 0.02);
    } else if (mode === 'melee') {
      const sw = Math.sin(GF.time * 9 + this.phase);
      set('rHand', 0.2 + sw * 0.18, 1.28 + sw * 0.12, 0.42);
      set('rArmF', 0.26, 1.2 + sw * 0.1, 0.24);
      set('rArmU', 0.22, 1.38, 0.06);
    } else if (mode === 'cower') {
      set('chest', 0, 1.1, -0.02);
      set('head', 0, 1.38, -0.06);
      set('neck', 0, 1.28, -0.04);
      set('lHand', -0.2, 1.34, 0.16);
      set('rHand', 0.2, 1.34, 0.16);
      set('lArmF', -0.24, 1.24, 0.14);
      set('rArmF', 0.24, 1.24, 0.14);
    } else if (mode === 'downed') {
      set('pelvis', 0, 0.35, 0);
      set('chest', 0, 0.55, 0.3);
      set('neck', 0, 0.62, 0.4);
      set('head', 0, 0.66, 0.46);
      set('lLegU', -0.15, 0.3, 0.1);
      set('rLegU', 0.15, 0.3, 0.1);
      set('lLegF', -0.3, 0.16, 0.45);
      set('rLegF', 0.3, 0.16, 0.45);
      set('lFoot', -0.42, 0.08, 0.62);
      set('rFoot', 0.42, 0.08, 0.62);
      set('lHand', -0.4, 0.2, 0.6);
      set('rHand', 0.4, 0.2, 0.6);
    }

    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    for (const k in local) {
      const nd = n[k];
      if (!nd || nd.detached) continue;
      const [lx, ly, lz] = local[k];
      /* local +Z is forward */
      nd.x = this.pinnedRoot.x + (lx * cy + lz * sy) * S;
      nd.y = this.pinnedRoot.y + ly * S;
      nd.z = this.pinnedRoot.z + (-lx * sy + lz * cy) * S;
      nd.px = nd.x; nd.py = nd.y; nd.pz = nd.z;
    }
    this.updateBones();
    this.updateWeapon(mode, aimPitch);
  }

  updateWeapon(mode, aimPitch) {
    if (!this.gun) return;
    const hand = this.byKey.rHand;
    const chest = this.byKey.chest;
    if (!hand || hand.detached) { this.gun.visible = false; return; }
    this.gun.visible = true;
    this.gun.position.set(hand.x, hand.y + 0.02, hand.z);
    if (mode === 'aim') {
      this.gun.rotation.set(-(aimPitch || 0), this.yaw, 0, 'YXZ');
    } else {
      this.gun.rotation.set(0, this.yaw, 0.5);
    }
  }

  muzzlePos() {
    const hand = this.byKey.rHand || this.byKey.chest;
    const dir = new Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    return new Vector3(hand.x + dir.x * 0.5, hand.y + 0.02, hand.z + dir.z * 0.5);
  }

  updateBones() {
    for (let i = 0; i < this.bones.length; i++) {
      const b = this.bones[i];
      const A = this.byKey[b.from], B = this.byKey[b.to];
      if (!A || !B) continue;
      if (A.detached || B.detached || (b.hidden)) { b.mesh.visible = false; continue; }
      b.mesh.visible = true;
      GFR_V1.set(B.x - A.x, B.y - A.y, B.z - A.z);
      const len = GFR_V1.length() || 0.001;
      GFR_V2.copy(GFR_V1).multiplyScalar(1 / len);
      GFR_Q.setFromUnitVectors(GFR_UP, GFR_V2);
      b.mesh.position.set((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
      b.mesh.quaternion.copy(GFR_Q);
      b.mesh.scale.set(b.w, len * (b.head ? 1.45 : 1), b.d);
    }
    const head = this.bones[0].mesh;
    if (this.helmet) {
      this.helmet.mesh.position.copy(head.position);
      this.helmet.mesh.quaternion.copy(head.quaternion);
      this.helmet.mesh.position.y += this.helmet.offset;
      this.helmet.mesh.visible = !this.byKey.head.detached;
    }
    const hfx = Math.sin(this.yaw), hfz = Math.cos(this.yaw);
    const hrx = Math.cos(this.yaw), hrz = -Math.sin(this.yaw);
    for (let i = 0; i < this.eyes.length; i++) {
      const e = this.eyes[i];
      const ox = (i ? 0.055 : -0.055) * this.scale;
      const oz = 0.1 * this.scale;
      e.position.set(
        head.position.x + hrx * ox + hfx * oz,
        head.position.y + 0.04 * this.scale,
        head.position.z + hrz * ox + hfz * oz
      );
      e.quaternion.setFromAxisAngle(GFR_UP, this.yaw);
      e.visible = !this.byKey.head.detached;
    }
    for (const j of this.joints || []) {
      const nd = this.byKey[j.node];
      if (!nd) continue;
      j.mesh.visible = !nd.detached;
      j.mesh.position.set(nd.x, nd.y, nd.z);
    }
    for (const h of this.hands || []) {
      const nd = this.byKey[h.node];
      if (!nd) continue;
      h.mesh.visible = !nd.detached;
      h.mesh.position.set(nd.x, nd.y, nd.z);
      h.mesh.quaternion.setFromAxisAngle(GFR_UP, this.yaw);
      h.mesh.scale.set(0.086 * this.scale, 0.062 * this.scale, 0.13 * this.scale);
    }
    for (const g of this.faceGear || []) {
      g.mesh.position.set(
        head.position.x + hrx * g.ox + hfx * g.oz,
        head.position.y + g.oy,
        head.position.z + hrz * g.ox + hfz * g.oz
      );
      g.mesh.quaternion.setFromAxisAngle(GFR_UP, this.yaw);
      g.mesh.scale.set(g.w, g.h, g.d);
      g.mesh.visible = !this.byKey.head.detached;
    }
    for (const b of this.boots || []) {
      const f = this.byKey[b.node];
      b.group.position.set(f.x + hfx * b.fwd, f.y + b.y, f.z + hfz * b.fwd);
      b.group.quaternion.setFromAxisAngle(GFR_UP, this.yaw);
      b.group.visible = !f.detached;
    }
    if (this.gear && this.gear.length) {
      const chest = this.chestBone.mesh;
      for (let i = 0; i < this.gear.length; i++) {
        const g = this.gear[i];
        GFR_V1.set(g.ox, g.oy, g.oz).applyQuaternion(chest.quaternion);
        g.mesh.position.copy(chest.position).add(GFR_V1);
        g.mesh.quaternion.copy(chest.quaternion);
        g.mesh.scale.set(g.w, g.h, g.d);
        g.mesh.visible = chest.visible && !this.gearTorn;
      }
    }
    if (this.cavityMesh && this.cavityOpen) {
      const chest = this.chestBone.mesh;
      this.cavityMesh.visible = chest.visible;
      /* the wound opens on the body's front, so use yaw rather than the
         torso bone's rolled quaternion */
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      const cx = chest.position.x + fx * 0.14 * this.scale;
      const cy = chest.position.y;
      const cz = chest.position.z + fz * 0.14 * this.scale;
      this.cavityMesh.position.set(cx, cy, cz);
      GFR_V2.set(fx, 0, fz);
      GFR_Q.setFromUnitVectors(GFR_V3.set(0, 0, 1), GFR_V2);
      this.cavityMesh.quaternion.copy(GFR_Q);
      if (this.woundRim) {
        this.woundRim.position.set(cx + fx * 0.015 * this.scale, cy, cz + fz * 0.015 * this.scale);
        this.woundRim.quaternion.copy(GFR_Q);
        this.woundRim.visible = chest.visible;
      }
      for (let i = 0; i < this.viscera.length; i++) {
        const v = this.viscera[i];
        if (v.ejected) continue;
        v.mesh.position.set(
          cx + rx * v.ox + fx * v.oz,
          cy + v.oy,
          cz + rz * v.ox + fz * v.oz
        );
        v.mesh.quaternion.copy(GFR_Q);
        if (v.kind === 'intestine') v.mesh.rotation.z = Math.PI / 2;
        v.mesh.visible = chest.visible;
      }
    }
  }

  openCavity(dir) {
    if (this.cavityOpen) return;
    this.cavityOpen = true;
    /* the plate carrier and webbing tear away with the wound */
    this.gearTorn = true;
    for (const g of this.gear) g.mesh.visible = false;
    if (this.cavityMesh) this.cavityMesh.visible = true;
    if (this.woundRim) this.woundRim.visible = true;
    for (const v of this.viscera) v.mesh.visible = true;
    if (GF.Gore) {
      const c = this.byKey.chest;
      GF.Gore.spray(new Vector3(c.x, c.y, c.z), dir || new Vector3(0, 1, 0), 1.8, this.colors);
      GF.Gore.mist(new Vector3(c.x, c.y, c.z), dir || new Vector3(0, 1, 0), 0.7);
    }
  }

  spillCavity(dir) {
    if (!this.cavityOpen) return 0;
    let n = 0;
    for (const v of this.viscera) {
      if (v.ejected) continue;
      v.ejected = true;
      v.mesh.visible = false;
      if (GF.Gore) {
        GF.Gore.organ(new Vector3(v.mesh.position.x, v.mesh.position.y, v.mesh.position.z), dir || new Vector3(0, 1, 0), v.kind, 0.9, this.colors);
      }
      n++;
    }
    if (n && GF.Gore) {
      const c = this.byKey.chest;
      GF.Gore.arterial(new Vector3(c.x, c.y, c.z), dir || new Vector3(0, 1, 0), this.colors);
    }
    return n;
  }

  /* ---------------------------- physics ---------------------------- */
  kill(impulse, dir, opts) {
    if (this.dead) return;
    this.dead = true;
    this.sleeping = false;
    this.sleepTimer = 0;
    const dt = 1 / 60;
    for (const n of this.nodes) {
      if (n.detached) continue;
      n.px = n.x - (impulse ? impulse.x * dt : 0);
      n.py = n.y - (impulse ? impulse.y * dt : 0);
      n.pz = n.z - (impulse ? impulse.z * dt : 0);
    }
    if (dir) {
      /* 0.012 per step (~1.5 m/s) — the old 0.55 was 66 m/s and rocketed
         every corpse across the map the instant it died */
      const d = new Vector3(dir.x, 0.2, dir.z).normalize().multiplyScalar(0.012);
      for (const n of this.nodes) { n.px -= d.x; n.pz -= d.z; }
    }
    /* no node may leave the kill call with more than ~14 m/s */
    for (const n of this.nodes) {
      if (n.detached) continue;
      const vx = n.x - n.px, vy = n.y - n.py, vz = n.z - n.pz;
      const sp = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (sp > 0.12) {
        const k = 0.12 / sp;
        n.px = n.x - vx * k; n.py = n.y - vy * k; n.pz = n.z - vz * k;
      }
    }
    if (this.gun) this.gun.visible = false;
  }

  update(dt) {
    if (!this.dead) return this.updateBones();
    if (this.sleeping) {
      this.sleepTimer += dt;
      if (this.sleepTimer < 1.2) return;
    }
    const steps = 2, h = Math.min(dt, 1 / 30) / steps;
    for (let s = 0; s < steps; s++) this.stepPhysics(h);
    this.updateBones();
    /* sleep when calm */
    let motion = 0;
    for (const n of this.nodes) {
      if (n.detached) continue;
      motion += Math.abs(n.x - n.px) + Math.abs(n.y - n.py) + Math.abs(n.z - n.pz);
    }
    if (motion < 0.02) {
      this.sleepTimer += dt;
      if (this.sleepTimer > 1.4) this.sleeping = true;
    } else {
      this.sleepTimer = 0;
      this.sleeping = false;
    }
  }

  stepPhysics(dt) {
    const world = GF.World;
    for (const n of this.nodes) {
      if (n.detached) continue;
      if (n.pinned) { n.px = n.x; n.py = n.y; n.pz = n.z; continue; }
      const vx = (n.x - n.px) * 0.997;
      const vy = (n.y - n.py) * 0.997;
      const vz = (n.z - n.pz) * 0.997;
      n.px = n.x; n.py = n.y; n.pz = n.z;
      n.x += vx;
      n.y += vy - 9.8 * dt * dt;
      n.z += vz;
      /* hard velocity ceiling: keeps constraint explosions, blast shoves and
         point-blank impacts from launching the body into orbit */
      const sp2 = vx * vx + vy * vy + vz * vz;
      if (sp2 > 0.0784) {
        const k2 = 0.28 / Math.sqrt(sp2);
        n.px = n.x - vx * k2;
        n.py = n.y - vy * k2;
        n.pz = n.z - vz * k2;
      }
    }
    for (let it = 0; it < 4; it++) {
      for (let i = 0; i < this.constraints.length; i++) {
        const c = this.constraints[i];
        if (c.a.detached || c.b.detached) continue;
        const dx = c.b.x - c.a.x, dy = c.b.y - c.a.y, dz = c.b.z - c.a.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001;
        const diff = (d - c.len) / d * 0.5 * c.stiff;
        const ax = dx * diff, ay = dy * diff, az = dz * diff;
        c.a.x += ax; c.a.y += ay; c.a.z += az;
        c.b.x -= ax; c.b.y -= ay; c.b.z -= az;
      }
    }
    /* world collision + friction, once per substep */
    for (const n of this.nodes) {
      if (n.detached) continue;
      GFR_V1.set(n.x, n.y, n.z);
      const hit = world.spherePush(GFR_V1, n.r * 0.9);
      if (hit) {
        n.x = GFR_V1.x; n.y = GFR_V1.y; n.z = GFR_V1.z;
        const vx = (n.x - n.px), vy = (n.y - n.py), vz = (n.z - n.pz);
        n.px = n.x - vx * 0.55;
        n.py = n.y - vy * 0.55;
        n.pz = n.z - vz * 0.55;
        if (GF.chance(0.02) && GF.Gore) GF.Gore.bloodDrip(n.x, n.y - n.r * 0.5, n.z, 0.5);
      }
    }
    /* blood trail for fresh corpses */
    if (this.blood > 0 && Math.random() < dt * 1.6 && GF.Gore) {
      const p = this.byKey.chest;
      if (p && !p.detached && Math.random() < 0.5) GF.Gore.bloodDrip(p.x, p.y - 0.2, p.z, 0.35);
    }
  }

  /* --------------------------- damage ----------------------------- */
  damage(amount, nodeKey, dir, opts) {
    opts = opts || {};
    const key = nodeKey || 'chest';
    const node = this.byKey[key];
    if (!node || node.detached) return { dead: this.dead, part: key, mult: 1 };
    const part = node.part;
    const mult = part === 'head' ? 3.2 : part === 'torso' ? 1.0 : 0.55;
    const dealt = amount * mult * (1 - (this.type.armor || 0));

    if (part !== 'head' && part !== 'torso') {
      this.partHp[part] -= dealt;
      if (this.partHp[part] <= 0 && this.parts[part]) {
        this.detach(part, dir, opts);
      }
    }
    this.blood -= 0.02;
    this.hitFlash = 1;
    return { dealt, mult, part, dead: this.dead };
  }

  detach(part, dir, opts) {
    if (!this.parts[part]) return;
    this.parts[part] = 0;
    const map = { lArm: ['lArmU', 'lArmF', 'lHand'], rArm: ['rArmU', 'rArmF', 'rHand'], lLeg: ['lLegU', 'lLegF', 'lFoot'], rLeg: ['rLegU', 'rLegF', 'rFoot'], head: ['head', 'neck'] };
    const keys = map[part] || [];
    let cx = 0, cy = 0, cz = 0, count = 0;
    for (const k of keys) {
      const n = this.byKey[k];
      if (!n || n.detached) continue;
      cx += n.x; cy += n.y; cz += n.z; count++;
      n.detached = true;
    }
    for (const b of this.bones) {
      if (b.part === part) b.hidden = true;
    }
    if (part === 'head' && this.helmet) this.helmet.mesh.visible = false;
    if (part === 'head') for (const g of this.faceGear || []) g.mesh.visible = false;
    if (!count) return;
    cx /= count; cy /= count; cz /= count;
    if (GF.Gore) {
      GF.Gore.gib(new Vector3(cx, cy, cz), dir, part, this.scale, this.colors);
      GF.Gore.spray(new Vector3(cx, cy, cz), dir || new Vector3(0, 1, 0), part === 'head' ? 2.0 : 1.2, this.colors);
      GFAudio.flesh(new Vector3(cx, cy, cz), true);
    }
    if (part === 'head') this.blood = 0;
  }

  dispose() {
    this.group.removeFromParent();
    for (const b of this.bones) {
      if (b.mesh.geometry && !GF.sharedGeo.has(b.mesh.geometry)) b.mesh.geometry.dispose();
    }
    if (this.helmet && this.helmet.mesh.geometry && !GF.sharedGeo.has(this.helmet.mesh.geometry)) {
      this.helmet.mesh.geometry.dispose();
    }
    for (const e of this.eyes) {
      if (e.geometry && !GF.sharedGeo.has(e.geometry)) e.geometry.dispose();
    }
  }
}
