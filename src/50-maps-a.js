/* =====================================================================
   GORE TOWN — map kit and the first two maps
   "The Hollow" abandoned house · "Blackpine" open-world outpost
   ===================================================================== */

/* Static decorative prop (mesh + collider, no rigid body). */
GF.World.decor = function (def, pos, yaw) {
  if (!def) return null;
  const mesh = GF.buildProp(def);
  mesh.position.copy(pos);
  if (yaw) mesh.rotation.y = yaw;
  mesh.userData.mapObject = true;
  this.scene.add(mesh);
  const hw = def.w / 2, hd = def.d / 2;
  if (def.shape !== 'rug' && def.shape !== 'curtain') {
    this.addCollider(pos.x - hw, pos.y, pos.z - hd, pos.x + hw, pos.y + def.h, pos.z + hd, def.mat);
  }
  return mesh;
};

GF.World.staticWeapon = function (def, pos, yaw) {
  const g = GF.buildGunModelMerged(def);
  g.position.copy(pos);
  g.rotation.y = yaw || 0;
  g.userData.mapObject = true;
  this.scene.add(g);
  return g;
};

/* Wall with rectangular holes, runs along X (axis 'x') or Z (axis 'z'). */
GF.MapKit = {
  wall(B, axis, at, from, to, y0, h, thick, mat, holes) {
    const seg = (u0, u1, yy, hh) => {
      if (u1 - u0 < 0.02 || hh < 0.02) return;
      const mid = (u0 + u1) / 2;
      if (axis === 'x') B.box(mid, yy + hh / 2, at, u1 - u0, hh, thick, mat);
      else B.box(at, yy + hh / 2, mid, thick, hh, u1 - u0, mat);
    };
    let cursor = from;
    const list = (holes || []).slice().sort((a, b) => a[0] - b[0]);
    for (const hl of list) {
      const u0 = Math.max(from, hl[0]), u1 = Math.min(to, hl[1]);
      const v0 = Math.max(y0, hl[2]), v1 = Math.min(y0 + h, hl[3]);
      if (u1 <= cursor) continue;
      if (u0 > cursor) seg(cursor, u0, y0, h);
      if (v0 > y0) seg(u0, u1, y0, v0 - y0);
      if (v1 < y0 + h) seg(u0, u1, v1, y0 + h - v1);
      cursor = Math.max(cursor, u1);
    }
    if (cursor < to) seg(cursor, to, y0, h);
  },
  fence(B, x0, z0, x1, z1, y0, h, mat, gap) {
    const post = (x, z) => B.box(x, y0 + h / 2, z, 0.14, h, 0.14, mat);
    if (Math.abs(x1 - x0) > Math.abs(z1 - z0)) {
      const n = Math.max(2, Math.round(Math.abs(x1 - x0) / (gap || 2)));
      for (let i = 0; i <= n; i++) post(GF.lerp(x0, x1, i / n), z0);
      B.box((x0 + x1) / 2, y0 + h * 0.65, z0, Math.abs(x1 - x0), 0.08, 0.06, mat);
      B.box((x0 + x1) / 2, y0 + h * 0.3, z0, Math.abs(x1 - x0), 0.08, 0.06, mat);
    } else {
      const n = Math.max(2, Math.round(Math.abs(z1 - z0) / (gap || 2)));
      for (let i = 0; i <= n; i++) post(x0, GF.lerp(z0, z1, i / n));
      B.box(x0, y0 + h * 0.65, (z0 + z1) / 2, 0.06, 0.08, Math.abs(z1 - z0), mat);
      B.box(x0, y0 + h * 0.3, (z0 + z1) / 2, 0.06, 0.08, Math.abs(z1 - z0), mat);
    }
  },
  tower(B, x, z, h) {
    const legs = 1.7;
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      B.box(x + sx * legs / 2, h / 2, z + sz * legs / 2, 0.16, h, 0.16, 'wood');
    B.box(x, h, z, 2.0, 0.2, 2.0, 'wood');
    for (let i = 1; i < 4; i++) {
      const yy = (h / 4) * i;
      B.box(x, yy, z + legs / 2, 1.8, 0.08, 0.08, 'wood');
      B.box(x, yy, z - legs / 2, 1.8, 0.08, 0.08, 'wood');
    }
    B.box(x, h + 0.55, z + 0.95, 2.0, 0.9, 0.08, 'wood');
    B.box(x, h + 0.55, z - 0.95, 2.0, 0.9, 0.08, 'wood');
    B.box(x - 0.95, h + 0.55, z, 0.08, 0.9, 2.0, 'wood');
    B.box(x + 0.95, h + 0.55, z, 0.08, 0.9, 2.0, 'wood');
    B.box(x, h + 2.0, z, 2.4, 0.16, 2.4, 'metal', false);
    for (let i = 0; i < 8; i++) B.box(x - 0.6, h + 0.1 + i * 0.35, z, 0.05, 0.05, 0.18, 'metal', false);
  }
};

/* ===================================================================== */
/*  MAP 1 — The Hollow (abandoned house)                                  */
/* ===================================================================== */
GF.MAP_HOUSE = {
  id: 'house',
  name: 'THE HOLLOW',
  subtitle: 'Abandoned farmhouse',
  desc: 'A rotting two-storey house surrounded by dead pines. Tight corridors, broken stairs and a basement full of drums. The blood on the wallpaper is not paint.',
  size: '46 x 46 m',
  accent: '#b5543a',
  interior: true,
  sky: {
    top: '#28313f', horizon: '#b06a42', bottom: '#1a1714', fog: '#4a423a', fogNear: 24, fogFar: 130,
    sunColor: '#ffb070', sunIntensity: 2.3, sunPos: { x: -50, y: 26, z: 18 },
    hemiSky: '#9a8a76', hemiGround: '#3a322a', hemiIntensity: 1.45, ambientIntensity: 0.28
  },
  spawn: new Vector3(0, 0, 14),
  spawnYaw: 0,
  build(B, W) {
    const H = 3.15, TOP = H * 2;
    const F = 0.06;

    /* ground */
    B.box(0, -0.3, 0, 46, 0.6, 46, 'dirt', true, 0.32);
    B.box(0, 0.02, 22, 12, 0.08, 2.4, 'asphalt', false, 0.5);
    /* path */
    for (let i = 0; i < 5; i++) B.box((Math.random() - 0.5) * 0.5, 0.03, 8 + i * 1.6, 1.6, 0.06, 1.0, 'rock', false);

    /* foundation + ground floor */
    B.box(0, F / 2, 0, 16.6, F, 12.6, 'concrete', false, 0.5);
    B.box(0, 0.1, 0, 16, 0.12, 12, 'wood', false, 0.6);

    /* exterior walls with door + windows */
    GF.MapKit.wall(B, 'x', 6, -8, 8, 0, TOP, 0.32, 'plaster', [
      [-0.85, 0.85, 0, 2.25],      // front door
      [-5.6, -3.6, 1.15, 2.5],     // window
      [3.6, 5.6, 1.15, 2.5],       // window
      [-5.6, -3.6, H + 1.1, H + 2.5],
      [3.6, 5.6, H + 1.1, H + 2.5]
    ]);
    GF.MapKit.wall(B, 'x', -6, -8, 8, 0, TOP, 0.32, 'plaster', [
      [-1.4, 1.4, 0, 2.3],
      [-6.2, -4.2, 1.15, 2.5],
      [4.2, 6.2, 1.15, 2.5],
      [-6.2, -4.2, H + 1.1, H + 2.5]
    ]);
    GF.MapKit.wall(B, 'z', -8, -6, 6, 0, TOP, 0.32, 'plaster', [
      [-0.9, 0.9, 1.1, 2.5],
      [-4.8, -3.0, 1.2, 2.6],
      [-4.8, -3.0, H + 1.1, H + 2.5]
    ]);
    GF.MapKit.wall(B, 'z', 8, -6, 6, 0, TOP, 0.32, 'plaster', [
      [-1.0, 1.0, 1.1, 2.5],
      [3.0, 4.8, 1.2, 2.6],
      [3.0, 4.8, H + 1.1, H + 2.5]
    ]);

    /* interior spine wall with hallway doors */
    GF.MapKit.wall(B, 'z', -3.2, -6, 6, 0, H, 0.22, 'plaster', [
      [-4.4, -2.6, 0, 2.2],
      [1.4, 3.0, 0, 2.2]
    ]);
    GF.MapKit.wall(B, 'x', 1.8, -8, -3.2, 0, H, 0.22, 'plaster', [[-7.0, -5.4, 0, 2.2]]);
    GF.MapKit.wall(B, 'x', -2.2, 0.6, 8, 0, H, 0.22, 'plaster', [[3.4, 4.9, 0, 2.2]]);

    /* ceilings / floors */
    B.box(-5.6, H, -3.5, 4.8, 0.25, 5.0, 'plaster', true, 0.5);
    B.box(2.4, H, -3.5, 11.2, 0.25, 4.8, 'wood', true, 0.5);
    B.box(4.2, H, 1.6, 7.6, 0.25, 8.8, 'wood', true, 0.5);
    /* stair opening + upper landing */
    B.box(-2.6, H, 3.5, 9.0, 0.25, 5.0, 'wood', true, 0.5);

    /* staircase to upper floor */
    const steps = 14, rise = H / steps, run = 0.3;
    for (let i = 0; i < steps; i++) {
      B.box(-1.4, rise * (i + 0.5), 4.2 - run * (i + 0.5), 2.2, rise, run, 'wood');
    }
    B.box(-1.4, H + 0.5, 4.5, 2.2, 0.1, 0.1, 'wood', false);
    B.box(-2.5, H * 0.5, 4.5, 0.08, H, 0.08, 'wood', false);
    B.box(-0.3, H * 0.5, 4.5, 0.08, H, 0.08, 'wood', false);

    /* roof + parapet */
    B.box(0, TOP, 0, 17, 0.3, 13, 'wood', false, 0.4);
    B.box(0, TOP + 0.45, 6, 17, 0.9, 0.2, 'wood', false);
    B.box(0, TOP + 0.45, -6, 17, 0.9, 0.2, 'wood', false);
    B.box(-8, TOP + 0.45, 0, 0.2, 0.9, 13, 'wood', false);
    B.box(8, TOP + 0.45, 0, 0.2, 0.9, 13, 'wood', false);
    /* broken roof holes made of missing panels handled visually by gaps */
    B.box(-4.2, TOP + 0.28, -2.6, 4.0, 0.06, 4.0, 'rust', false);

    /* door slabs (ajar) */
    B.box(0.72, 1.1, 5.95, 1.35, 2.2, 0.08, 'wood', true, 1);
    B.box(-7.0, 1.1, -5.9, 1.25, 2.2, 0.08, 'wood', true, 1);

    /* porch */
    B.box(0, 0.14, 6.9, 3.2, 0.16, 1.8, 'wood', true);
    B.box(-1.4, 1.4, 7.7, 0.15, 2.8, 0.15, 'wood');
    B.box(1.4, 1.4, 7.7, 0.15, 2.8, 0.15, 'wood');
    B.box(0, 2.85, 7.3, 3.4, 0.14, 2.4, 'wood', false);

    /* yard fences */
    GF.MapKit.fence(B, -22, -20, 22, -20, 0, 1.7, 'wood', 3.0);
    GF.MapKit.fence(B, -22, 22, 22, 22, 0, 1.7, 'wood', 3.0);
    GF.MapKit.fence(B, -22, -20, -22, 22, 0, 1.7, 'wood', 3.0);
    GF.MapKit.fence(B, 22, -20, 22, 22, 0, 1.7, 'wood', 3.0);
    /* gate gap */
    B.box(-1.6, 1.0, 22, 0.2, 2.0, 0.2, 'wood');
    B.box(1.6, 1.0, 22, 0.2, 2.0, 0.2, 'wood');

    /* shed */
    B.box(-15, 1.3, 6, 5.0, 2.6, 4.0, 'wood', false);
    B.box(-15, 2.7, 6, 5.4, 0.2, 4.4, 'rust', false);
    B.box(-12.6, 1.0, 6, 0.2, 2.0, 3.6, 'wood');
    B.box(-15, 1.0, 4.1, 5.0, 2.0, 0.2, 'wood');
    B.box(-16.8, 1.0, 8.0, 1.4, 2.0, 0.2, 'wood');

    /* well */
    B.cyl(13, 0.5, -10, 1.5, 1.0, 'rock');
    B.cyl(13, 1.05, -10, 1.2, 0.12, 'wood', false);
    B.box(13, 1.8, -10, 0.12, 1.4, 0.12, 'wood');
    B.box(12.2, 2.4, -10, 1.8, 0.1, 1.8, 'wood', false);

    /* wrecked car */
    B.box(14, 0.75, 8, 4.2, 1.1, 1.9, 'rust');
    B.box(14, 1.45, 8, 2.2, 0.6, 1.7, 'rust');
    B.cyl(15.3, 0.36, 9.0, 0.36, 0.25, 'dark', false);
    B.cyl(12.7, 0.36, 9.0, 0.36, 0.25, 'dark', false);

    /* basements stairs (open pit near kitchen) */
    B.box(-6.6, 0.03, 1.2, 2.4, 0.02, 2.4, 'dark', false);
    for (let i = 0; i < 6; i++) B.box(-6.6, -0.15 - i * 0.3, 0.2 + i * 0.35, 2.0, 0.18, 0.35, 'stone');
    B.box(-6.6, -1.9, 1.2, 2.2, 0.12, 2.2, 'stone');

    /* scattered lumber + debris colliders */
    B.box(-3, 0.1, 9, 1.4, 0.18, 0.2, 'wood');
    B.box(-3.4, 0.3, 9.4, 1.2, 0.16, 0.2, 'wood');
    B.box(9, 0.12, 2, 0.2, 0.24, 2.6, 'wood');

    /* ---------------- furniture ---------------- */
    const D = (name, x, z, yaw) => {
      const def = GF.objectById(name);
      if (def) GF.World.decor(def, new Vector3(x, 0.12, z), yaw || 0);
    };
    D('sofa', 4.4, 3.2, 0);
    D('coffee-table', 4.4, 1.8, 0);
    D('bookshelf', 7.2, -1.0, -Math.PI / 2);
    D('dining-table', -5.8, 3.4, 0);
    D('wooden-chair', -6.9, 3.4, 1.2);
    D('wooden-chair', -4.7, 3.4, -1.2);
    D('fridge', -7.2, 4.9, Math.PI);
    D('kitchen-counter', -5.4, 5.4, 0);
    D('kitchen-cabinet', -3.4, 5.4, 0);
    D('trash-can', -2.2, 4.6, 0);
    D('bed-frame', 4.6, -4.4, 0);
    D('wardrobe', 7.2, -2.4, -Math.PI / 2);
    D('dresser', 2.2, -5.6, 0);
    D('office-chair', 4.6, -1.6, 0.5);
    D('desk', 5.8, -1.0, Math.PI / 2);
    D('safe', 6.7, -5.3, 0);
    D('floor-lamp', 1.6, 3.4, 0);
    D('picture-frame', 2.4, -5.95, 0);
    D('rug', 4.0, 1.4, 0);
    D('bunk-bed', -5.4, -4.2, 0);
    D('bed-frame', 4.8, -4.2, Math.PI / 2);
    D('nightstand', 6.5, -4.4, 0);
    D('mirror', 6.8, 0.6, -Math.PI / 2);
    D('curtain', -6.8, -5.9, 0);
    /* upstairs */
    GF.World.decor(GF.objectById('bed-frame'), new Vector3(4.0, H + 0.12, -3.6), Math.PI / 2);
    GF.World.decor(GF.objectById('wardrobe'), new Vector3(7.2, H + 0.12, 1.0), -Math.PI / 2);
    GF.World.decor(GF.objectById('sofa'), new Vector3(-5.4, H + 0.12, -2.0), Math.PI);
    GF.World.decor(GF.objectById('bookshelf'), new Vector3(-7.2, H + 0.12, 2.0), Math.PI / 2);
    GF.World.decor(GF.objectById('gurney'), new Vector3(0.4, H + 0.12, -3.4), 0);
    GF.World.decor(GF.objectById('medical-cabinet'), new Vector3(1.8, H + 0.12, -5.4), 0);
    GF.World.decor(GF.objectById('human-skull'), new Vector3(-1.0, H + 0.25, 2.4), 1.0);
    GF.World.decor(GF.objectById('hanging-corpse'), new Vector3(6.0, H + 0.12, 4.4), 0.4);

    /* practical lights */
    W.addLight(0xffb070, 9, 13, new Vector3(4.4, 2.5, 2.0));
    W.addLight(0xffa060, 7, 11, new Vector3(-5.2, 2.3, 3.2));
    W.addLight(0xffc890, 6, 11, new Vector3(3.6, H + 1.8, -2.6));
    W.addLight(0xffa858, 8, 12, new Vector3(0, 2.9, 7.0));

    /* exterior props */
    GF.World.decor(GF.objectById('dumpster'), new Vector3(-9.6, 0.12, 8.4), 0.2);
    GF.World.decor(GF.objectById('wooden-crate'), new Vector3(-12.8, 0.12, 8.8), 0.4);
    GF.World.decor(GF.objectById('wooden-pallet'), new Vector3(-12.4, 0.12, 10.2), 1.1);
    GF.World.decor(GF.objectById('trash-can'), new Vector3(-8.2, 0.12, 9.4), 0);
    GF.World.decor(GF.objectById('barrel-of-beer'), new Vector3(-16.2, 0.12, 3.2), 0);
    GF.World.decor(GF.objectById('tire'), new Vector3(11.4, 0.12, 4.0), 0);
    GF.World.decor(GF.objectById('wooden-chair'), new Vector3(9.2, 0.12, 6.2), 2.1);
    GF.World.decor(GF.objectById('dead-tree'), new Vector3(-18, 0.1, -12), 0.4);
    GF.World.decor(GF.objectById('dead-tree'), new Vector3(18, 0.1, -6), 1.2);
    GF.World.decor(GF.objectById('dead-tree'), new Vector3(-19, 0.1, 14), 2.4);
    GF.World.decor(GF.objectById('bush'), new Vector3(11, 0.1, -14), 0.2);
    GF.World.decor(GF.objectById('bush'), new Vector3(-12, 0.1, 12), 1.4);
    GF.World.decor(GF.objectById('boulder'), new Vector3(18, 0.1, 14), 0.6);
    GF.World.decor(GF.objectById('gravel-pile'), new Vector3(-18, 0.1, -4), 0);

    /* explosive props (dynamic) */
    const barrel = GF.objectById('explosive-barrel');
    W.spawnProp(barrel, new Vector3(-10.2, 0.05, 4.2));
    W.spawnProp(barrel, new Vector3(-9.4, 0.05, 4.9));
    W.spawnProp(GF.objectById('propane-tank'), new Vector3(7.4, 0.12, 5.2));
    W.spawnProp(GF.objectById('gasoline-drum'), new Vector3(-13.4, 0.1, -8.2));
    W.spawnProp(GF.objectById('c4-block'), new Vector3(3.2, 0.14, -0.4));

    /* weapon pickups for flavour */
    W.staticWeapon(GF.weaponById('m1911a1'), new Vector3(4.7, 0.22, 1.9), 0.6);
    W.staticWeapon(GF.weaponById('remington-870'), new Vector3(-7.2, H + 0.3, 2.2), -0.8);
    return {
      actorSpawns: [
        new Vector3(3, 0.1, -4), new Vector3(-5, 0.1, -3), new Vector3(6, H + 0.1, 1.5),
        new Vector3(0, 0.1, 10), new Vector3(-14, 0.1, 8), new Vector3(12, 0.1, 12),
        new Vector3(-16, 0.1, -10), new Vector3(2, 0.1, 20)
      ]
    };
  }
};

/* ===================================================================== */
/*  MAP 2 — Blackpine (open-world military outpost)                      */
/* ===================================================================== */
GF.MAP_OUTPOST = {
  id: 'outpost',
  name: 'BLACKPINE',
  subtitle: 'Forest outpost',
  desc: 'Four square kilometres of pine, mud and razor wire compressed into a forward operating base. Watchtowers cover every approach and the armoury is not locked.',
  size: '150 x 150 m',
  accent: '#6d8a52',
  interior: false,
  sky: {
    top: '#54647a', horizon: '#8d9aa6', bottom: '#3a4038', fog: '#78828c', fogNear: 45, fogFar: 220,
    sunColor: '#eaf0f8', sunIntensity: 2.3, sunPos: { x: 30, y: 70, z: -20 },
    hemiSky: '#9fb0c0', hemiGround: '#3a3a2c', hemiIntensity: 1.4, ambientIntensity: 0.3
  },
  spawn: new Vector3(0, 0, 34),
  spawnYaw: 0,
  build(B, W) {
    /* ground */
    B.box(0, -0.35, 0, 150, 0.7, 150, 'grass', true, 0.3);
    B.box(0, 0.01, 10, 70, 0.06, 44, 'dirt', false, 0.4);
    B.box(0, 0.02, 20, 10, 0.08, 40, 'asphalt', false, 0.4);
    B.box(-20, 0.02, -4, 26, 0.07, 8, 'asphalt', false, 0.4);

    /* perimeter berm + fence */
    const R = 62;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      const x = Math.cos(a) * R, z = Math.sin(a) * R;
      B.box(x, 0.9, z, Math.abs(Math.cos(a)) > 0.5 ? 4 : R * 2, 1.8, Math.abs(Math.sin(a)) > 0.5 ? 4 : R * 2, 'dirt');
    }
    GF.MapKit.fence(B, -R, -R, R, -R, 0, 2.0, 'metal', 5);
    GF.MapKit.fence(B, -R, R, R, R, 0, 2.0, 'metal', 5);
    GF.MapKit.fence(B, -R, -R, -R, R, 0, 2.0, 'metal', 5);
    GF.MapKit.fence(B, R, -R, R, R, 0, 2.0, 'metal', 5);

    /* watchtowers */
    GF.MapKit.tower(B, -34, 30, 6.5);
    GF.MapKit.tower(B, 36, 26, 6.5);
    GF.MapKit.tower(B, -32, -30, 6.5);
    GF.MapKit.tower(B, 34, -32, 6.5);

    /* barracks */
    B.box(-28, 1.6, -6, 18, 3.2, 9, 'concrete', false);
    B.box(-28, 3.3, -6, 18.6, 0.25, 9.6, 'metal', false);
    GF.MapKit.wall(B, 'x', -1.6, -37, -19, 0, 3.2, 0.25, 'concrete', [[-30, -28, 0, 2.2], [-24, -22, 0, 2.2]]);
    GF.MapKit.wall(B, 'x', -10.4, -37, -19, 0, 3.2, 0.25, 'concrete', [[-34, -32, 1.2, 2.4]]);
    GF.MapKit.wall(B, 'z', -37, -10.4, -1.6, 0, 3.2, 0.25, 'concrete', [[-8, -6, 1.2, 2.4]]);
    GF.MapKit.wall(B, 'z', -19, -10.4, -1.6, 0, 3.2, 0.25, 'concrete', [[-8, -6, 1.2, 2.4]]);
    B.box(-28, 2.4, -6, 16, 0.2, 7.4, 'plaster', false);

    /* armoury */
    B.box(24, 1.8, 2, 12, 3.6, 9, 'concrete', false);
    B.box(24, 3.7, 2, 12.6, 0.3, 9.6, 'concrete', false);
    GF.MapKit.wall(B, 'x', 6.4, 18, 30, 0, 3.6, 0.28, 'concrete', [[22, 24, 0, 2.4], [26, 28, 1.2, 2.6]]);
    GF.MapKit.wall(B, 'x', -2.4, 18, 30, 0, 3.6, 0.28, 'concrete', []);
    GF.MapKit.wall(B, 'z', 18, -2.4, 6.4, 0, 3.6, 0.28, 'concrete', [[0, 2, 1.2, 2.6]]);
    GF.MapKit.wall(B, 'z', 30, -2.4, 6.4, 0, 3.6, 0.28, 'concrete', [[0, 2, 1.2, 2.6]]);
    B.box(24, 2.6, 2, 10, 0.2, 7.0, 'plaster', false);

    /* bunker entrance */
    B.box(0, 1.4, -24, 10, 2.8, 8, 'concrete', false);
    B.box(0, 3.0, -24, 11, 0.4, 9, 'concrete', false);
    B.box(0, 1.2, -20.1, 2.4, 2.4, 0.4, 'dark', false);
    B.box(0, 2.7, -20.2, 3.0, 0.5, 0.5, 'metal', false);
    B.box(0, 0.1, -24, 8, 0.2, 6, 'concrete', false);
    B.box(-3, 0.9, -20, 0.4, 1.8, 0.4, 'metal');
    B.box(3, 0.9, -20, 0.4, 1.8, 0.4, 'metal');

    /* hangar / garage */
    B.box(34, 2.4, -16, 14, 4.8, 11, 'metal', false);
    B.box(34, 4.9, -16, 14.6, 0.3, 11.6, 'rust', false);
    GF.MapKit.wall(B, 'x', -10.4, 27, 41, 0, 4.8, 0.3, 'metal', [[32, 36, 0, 4.2]]);
    GF.MapKit.wall(B, 'x', -21.6, 27, 41, 0, 4.8, 0.3, 'metal', []);
    GF.MapKit.wall(B, 'z', 27, -21.6, -10.4, 0, 4.8, 0.3, 'metal', [[-18, -16, 1.6, 3.4]]);
    GF.MapKit.wall(B, 'z', 41, -21.6, -10.4, 0, 4.8, 0.3, 'metal', []);

    /* container yard */
    for (let i = 0; i < 5; i++) {
      B.box(-40 + i * 6.4, 1.3, 20, 6.0, 2.6, 2.4, i % 2 ? 'rust' : 'metal');
    }
    B.box(-28, 3.9, 20, 6.0, 2.6, 2.4, 'metal');
    B.box(-34, 3.9, 20, 6.0, 2.6, 2.4, 'rust');

    /* sandbag lines */
    for (let i = 0; i < 7; i++) {
      B.box(-8 + i * 2.2, 0.55, 26, 2.0, 1.1, 0.8, 'dirt');
      B.box(-10 + i * 2.2, 0.55, -12, 2.0, 1.1, 0.8, 'dirt');
    }
    for (let i = 0; i < 4; i++) B.box(14 + i * 2.0, 0.5, 22, 1.8, 1.0, 0.7, 'dirt');

    /* helipad */
    B.cyl(-8, 0.05, 34, 5.0, 0.1, 'concrete', false, 20);
    B.box(-8, 0.09, 34, 3.2, 0.06, 0.5, 'wood', false);
    B.box(-8, 0.09, 34, 0.5, 0.06, 3.2, 'wood', false);

    /* crates, tents, fuel point */
    B.box(12, 0.5, 12, 2.0, 1.0, 1.2, 'wood');
    B.box(14.2, 0.4, 12, 1.2, 0.8, 1.2, 'wood');
    B.box(12.6, 1.4, 12, 1.2, 0.8, 1.0, 'wood');
    for (let i = 0; i < 3; i++) {
      B.box(-18 + i * 4, 1.0, 16, 3.4, 2.0, 3.2, 'fabric', false);
      B.box(-18 + i * 4, 2.1, 16, 3.6, 0.2, 3.4, 'fabric', false);
    }
    for (let i = 0; i < 5; i++) W.spawnProp(GF.objectById('explosive-barrel'), new Vector3(-20 + i * 1.3, 0.1, 10.5));
    W.spawnProp(GF.objectById('fuel-air-bomb'), new Vector3(-22, 0.1, 12.4));
    for (let i = 0; i < 4; i++) W.spawnProp(GF.objectById('ammo-crate'), new Vector3(22 + i * 1.4, 0.1, 8.8));

    /* vehicles */
    W.spawnProp(GF.objectById('military-truck'), new Vector3(6, 0.05, 16), { kind: 'vehicle' });
    W.spawnProp(GF.objectById('military-truck'), new Vector3(18, 0.05, -18), { kind: 'vehicle' });
    W.spawnProp(GF.objectById('armoured-personnel-carrier'), new Vector3(-14, 0.05, -18), { kind: 'vehicle' });
    W.spawnProp(GF.objectById('pickup-truck'), new Vector3(32, 0.05, 12), { kind: 'vehicle' });
    W.spawnProp(GF.objectById('helicopter'), new Vector3(-8, 0.05, 34), { kind: 'vehicle' });

    /* trees ring (trunks collide, canopies do not) */
    const rnd = GF.mulberry32(7734);
    for (let i = 0; i < 90; i++) {
      const a = rnd() * Math.PI * 2, r = 46 + rnd() * 22;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      B.cyl(x, 2.0, z, 0.22, 4.0, 'wood');
      B.cyl(x, 5.4, z, 2.0, 3.2, 'grass', false, 8);
    }
    for (let i = 0; i < 26; i++) {
      const x = (rnd() - 0.5) * 100, z = (rnd() - 0.5) * 100;
      if (Math.abs(x) < 44 && Math.abs(z) < 40) continue;
      B.cyl(x, 1.6, z, 0.28, 3.2, 'wood');
      B.cyl(x, 4.2, z, 1.6, 2.4, 'grass', false, 8);
    }
    /* rocks */
    for (let i = 0; i < 18; i++) {
      const x = (rnd() - 0.5) * 110, z = (rnd() - 0.5) * 110;
      B.box(x, 0.3, z, 1 + rnd() * 2, 0.6 + rnd(), 1 + rnd() * 2, 'rock');
    }

    /* sandbag emplacements */
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      B.box(Math.cos(a) * 40, 0.5, Math.sin(a) * 40, 2.4, 1.0, 1.0, 'dirt');
    }

    /* scattered weapons */
    W.staticWeapon(GF.weaponById('m4a1'), new Vector3(23.4, 1.25, 4.2), 0.4);
    W.staticWeapon(GF.weaponById('ak-47'), new Vector3(-27, 1.25, -4.4), -1.2);
    W.staticWeapon(GF.weaponById('barrett-m82'), new Vector3(-34, 7.0, 30), 0.9);
    W.staticWeapon(GF.weaponById('rpg-7'), new Vector3(30, 1.2, 2.0), 1.5);

    return {
      actorSpawns: [
        new Vector3(-28, 0.1, -3), new Vector3(24, 0.1, 4), new Vector3(0, 0.1, -20),
        new Vector3(-34, 6.6, 30), new Vector3(36, 6.6, 26), new Vector3(-32, 6.6, -30), new Vector3(34, 6.6, -32),
        new Vector3(34, 0.1, -16), new Vector3(-40, 0.1, 20), new Vector3(6, 0.1, 16),
        new Vector3(-18, 0.1, 16), new Vector3(14, 0.1, 22), new Vector3(-14, 0.1, -18),
        new Vector3(40, 0.1, 40), new Vector3(-42, 0.1, -40), new Vector3(0, 0.1, 48)
      ]
    };
  }
};
