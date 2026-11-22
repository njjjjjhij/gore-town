/* =====================================================================
   GORE TOWN — maps three and four
   "Downtown 9th" city block · "Silo 7" underground bunker
   ===================================================================== */

GF.World.addLight = function (color, intensity, distance, pos) {
  /* every point light costs per-fragment work on every lit surface; the low
     profile keeps only the two that actually shape the scene */
  const max = GF.qset().lights;
  if (this._lightCount === undefined) this._lightCount = 0;
  if (GF.quality === 'low' && this._lightCount >= max) return null;
  this._lightCount++;
  const l = new PointLight(color, intensity, distance, 2);
  l.position.copy(pos);
  l.userData.mapObject = true;
  this.scene.add(l);
  return l;
};

/* ===================================================================== */
/*  MAP 3 — Downtown 9th (city block, night)                             */
/* ===================================================================== */
GF.MAP_CITY = {
  id: 'city',
  name: 'DOWNTOWN 9TH',
  subtitle: 'City block, 02:40',
  desc: 'Six blocks of concrete, glass and rain-slick asphalt. Every window is a firing position and every alley is a trap. Bring something with a large magazine.',
  size: '120 x 120 m',
  accent: '#4a7ba8',
  interior: false,
  sky: {
    top: '#0b1220', horizon: '#2c3a52', bottom: '#070a12', fog: '#1c2638', fogNear: 26, fogFar: 170,
    sunColor: '#a8b8d8', sunIntensity: 0.85, sunPos: { x: -30, y: 60, z: 20 },
    hemiSky: '#6c7e9e', hemiGround: '#1e1e26', hemiIntensity: 1.4, ambient: '#9aa4be', ambientIntensity: 0.5
  },
  spawn: new Vector3(0, 0.2, 26),
  spawnYaw: 0,
  build(B, W) {
    const S = 120;
    B.box(0, -0.4, 0, S, 0.8, S, 'asphalt', true, 0.25);
    /* sidewalks around the crossroads */
    B.box(0, 0.12, 34, S, 0.24, 6, 'concrete', true, 0.4);
    B.box(0, 0.12, -34, S, 0.24, 6, 'concrete', true, 0.4);
    B.box(34, 0.12, 0, 6, 0.24, S, 'concrete', true, 0.4);
    B.box(-34, 0.12, 0, 6, 0.24, S, 'concrete', true, 0.4);

    /* road markings */
    for (let i = -12; i <= 12; i++) {
      B.box(i * 4, 0.05, 0, 2.2, 0.03, 0.22, 'plaster', false);
      B.box(0, 0.05, i * 4, 0.22, 0.03, 2.2, 'plaster', false);
    }

    const building = (x, z, w, d, floors, mat, lit) => {
      const h = floors * 3.4;
      /* shell */
      GF.MapKit.wall(B, 'x', z + d / 2, x - w / 2, x + w / 2, 0, h, 0.4, mat, [
        [x - 1.1, x + 1.1, 0, 2.5],
        [x - w / 2 + 1.4, x - w / 2 + 3.4, 1.3, 2.7],
        [x + w / 2 - 3.4, x + w / 2 - 1.4, 1.3, 2.7],
        [x - 1.0, x + 1.0, 4.2, 6.2],
        [x - 1.0, x + 1.0, 7.6, 9.6]
      ]);
      GF.MapKit.wall(B, 'x', z - d / 2, x - w / 2, x + w / 2, 0, h, 0.4, mat, [
        [x - 2.0, x + 2.0, 1.3, 2.7],
        [x - 2.0, x + 2.0, 4.2, 6.2],
        [x - 2.0, x + 2.0, 7.6, 9.6]
      ]);
      GF.MapKit.wall(B, 'z', x - w / 2, z - d / 2, z + d / 2, 0, h, 0.4, mat, [
        [z - 2.0, z + 2.0, 1.3, 2.7],
        [z - 2.0, z + 2.0, 4.2, 6.2]
      ]);
      GF.MapKit.wall(B, 'z', x + w / 2, z - d / 2, z + d / 2, 0, h, 0.4, mat, [
        [z - 2.0, z + 2.0, 1.3, 2.7],
        [z - 2.0, z + 2.0, 4.2, 6.2]
      ]);
      for (let f = 1; f < floors; f++) B.box(x, f * 3.4, z, w - 0.4, 0.25, d - 0.4, mat === 'brick' ? 'wood' : 'concrete', true, 0.4);
      B.box(x, h + 0.2, z, w + 0.6, 0.4, d + 0.6, 'concrete', false);
      /* rooftop clutter */
      B.box(x + w * 0.2, h + 0.9, z - d * 0.2, 2.2, 1.4, 1.6, 'metal');
      B.box(x - w * 0.25, h + 0.6, z + d * 0.2, 1.4, 0.8, 1.2, 'rust');
      if (lit) {
        B.box(x, 2.0, z + d / 2 + 0.25, 3.0, 1.6, 0.12, 'emissive', false);
        B.box(x + w / 2 + 0.25, 5.0, z, 0.12, 1.2, 4.0, 'emissive', false);
      }
    };

    building(-46, 52, 20, 18, 4, 'brick', true);
    building(-46, 24, 20, 20, 3, 'concrete', false);
    building(-12, 54, 16, 14, 5, 'plaster', true);
    building(20, 50, 22, 16, 3, 'brick', true);
    building(48, 34, 18, 24, 6, 'concrete', true);
    building(48, -14, 18, 22, 4, 'plaster', false);
    building(22, -46, 24, 18, 3, 'brick', false);
    building(-16, -50, 20, 16, 5, 'concrete', true);
    building(-46, -22, 18, 22, 4, 'plaster', true);
    building(-50, -52, 16, 16, 3, 'brick', false);

    /* storefront awnings */
    for (let i = 0; i < 6; i++) {
      B.box(-24 + i * 12, 2.9, 33.5, 5.0, 0.15, 1.6, 'fabric', false);
    }

    /* alley walls and dumpsters */
    B.box(30, 1.4, 26, 0.4, 2.8, 12, 'brick');
    B.box(30, 1.4, 38, 12, 2.8, 0.4, 'brick');
    B.box(-30, 1.2, -6, 10, 2.4, 0.4, 'concrete');

    /* street furniture */
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1;
      const x = -38 + i * 11;
      B.cyl(x, 3.0, 31 * side, 0.14, 6.0, 'metal');
      B.box(x, 6.1, 31 * side, 0.9, 0.16, 0.5, 'emissive', false);
      W.addLight(0xffb060, 16, 30, new Vector3(x, 5.8, 31 * side));
    }
    B.box(0, 0.5, 31, 2.0, 1.0, 0.6, 'metal');

    /* crashed bus */
    W.spawnProp(GF.objectById('bus'), new Vector3(-14, 0.1, 6), { kind: 'vehicle', yaw: 0.4 });
    W.spawnProp(GF.objectById('police-cruiser'), new Vector3(10, 0.1, 21), { kind: 'vehicle', yaw: -0.2 });
    W.spawnProp(GF.objectById('sedan'), new Vector3(-22, 0.1, -6), { kind: 'vehicle', yaw: 1.4 });
    W.spawnProp(GF.objectById('sports-car'), new Vector3(4, 0.1, -20), { kind: 'vehicle', yaw: 0.1 });
    W.spawnProp(GF.objectById('van'), new Vector3(38, 0.1, 8), { kind: 'vehicle', yaw: Math.PI / 2 });
    W.spawnProp(GF.objectById('ambulance'), new Vector3(-36, 0.1, -32), { kind: 'vehicle', yaw: 0.6 });

    /* barricades + street objects */
    for (let i = 0; i < 5; i++) B.box(-6 + i * 2.6, 0.7, 12, 2.2, 1.2, 0.3, 'metal');
    for (let i = 0; i < 4; i++) B.box(6, 0.55, -4 + i * 2.4, 0.3, 1.1, 2.2, 'metal');
    for (let i = 0; i < 8; i++) B.cyl(-14 + i * 4.5, 0.4, 15, 0.25, 0.8, 'plastic', true, 8);
    W.spawnProp(GF.objectById('dumpster'), new Vector3(-27, 0.15, 33), { yaw: 0.2 });
    W.spawnProp(GF.objectById('dumpster'), new Vector3(31.4, 0.15, 29), { yaw: 1.5 });
    W.spawnProp(GF.objectById('gas-canister'), new Vector3(-26, 0.2, 35));
    W.spawnProp(GF.objectById('explosive-barrel'), new Vector3(30, 0.1, 33));
    W.spawnProp(GF.objectById('c4-block'), new Vector3(-2, 0.15, -2));
    W.spawnProp(GF.objectById('landmine'), new Vector3(13, 0.1, -30));

    /* plaza planters */
    for (let i = 0; i < 4; i++) B.box(-6 + i * 4, 0.35, 30, 2.6, 0.7, 1.4, 'concrete');

    /* interiors: a few static props in the reachable ground floors */
    const P = (name, x, y, z, yaw) => { const d = GF.objectById(name); if (d) GF.World.decor(d, new Vector3(x, y, z), yaw || 0); };
    P('kitchen-counter', -46, 0.2, 50, 0);
    P('wooden-crate', -46, 0.2, 47, 0.3);
    P('sofa', -14, 0.2, 56, Math.PI);
    P('pool-table', 20, 0.2, 52, 0.2);
    P('lockers', 24, 0.2, 48, 0);
    P('desk', -12, 0.2, 52, 0);
    P('vending-machine', -40, 0.2, 22, Math.PI / 2);
    P('atm-machine', 44, 0.2, -12, -Math.PI / 2);
    P('human-skull', -2, 0.3, 4, 0.4);
    P('blood-splatter', -2, 0.06, 4, 0.4);

    W.staticWeapon(GF.weaponById('mp5a5'), new Vector3(-46, 1.2, 49), 0.6);
    W.staticWeapon(GF.weaponById('ak-74'), new Vector3(20, 1.2, 53), -0.4);
    W.staticWeapon(GF.weaponById('awp'), new Vector3(48, 14.0, 34), 0.3);

    return {
      actorSpawns: [
        new Vector3(-4, 0.2, 8), new Vector3(8, 0.2, -6), new Vector3(-22, 0.3, 20),
        new Vector3(30, 0.3, 26), new Vector3(-46, 0.3, 50), new Vector3(20, 0.3, 50),
        new Vector3(48, 0.3, -14), new Vector3(-16, 0.3, -50), new Vector3(0, 0.3, -30),
        new Vector3(-34, 0.3, -34), new Vector3(22, 0.3, 30), new Vector3(40, 0.3, 44)
      ]
    };
  }
};

/* ===================================================================== */
/*  MAP 4 — Silo 7 (underground bunker)                                  */
/* ===================================================================== */
GF.MAP_BUNKER = {
  id: 'bunker',
  name: 'SILO 7',
  subtitle: 'Underground bunker',
  desc: 'A decommissioned launch facility four floors underground. Catwalks, coolant pipes and a reactor that still hums. Nobody has come out since the evacuation order.',
  size: '66 x 66 m',
  accent: '#a8442a',
  interior: true,
  sky: {
    top: '#050505', horizon: '#0a0a0a', bottom: '#030303', fog: '#0a0a0c', fogNear: 6, fogFar: 60,
    sunColor: '#ff8060', sunIntensity: 0.08, sunPos: { x: 0, y: 30, z: 0 },
    hemiSky: '#6a4444', hemiGround: '#221818', hemiIntensity: 1.15, ambient: '#a88a80', ambientIntensity: 0.58
  },
  spawn: new Vector3(4.5, 0.2, 27),
  spawnYaw: 0.16,
  build(B, W) {
    const H = 10, W2 = 66, D = 66;

    /* shell */
    B.box(0, -0.4, 0, W2, 0.8, D, 'concrete', true, 0.25);
    B.box(0, H + 0.3, 0, W2, 0.8, D, 'concrete', true, 0.25);
    GF.MapKit.wall(B, 'x', D / 2, -W2 / 2, W2 / 2, 0, H, 0.6, 'concrete', []);
    GF.MapKit.wall(B, 'x', -D / 2, -W2 / 2, W2 / 2, 0, H, 0.6, 'concrete', []);
    GF.MapKit.wall(B, 'z', -W2 / 2, -D / 2, D / 2, 0, H, 0.6, 'concrete', []);
    GF.MapKit.wall(B, 'z', W2 / 2, -D / 2, D / 2, 0, H, 0.6, 'concrete', []);

    /* central reactor hall */
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      B.box(Math.cos(a) * 9, H / 2, Math.sin(a) * 9, 0.7, H, 0.7, 'concrete');
    }
    B.cyl(0, 1.0, 0, 4.5, 2.0, 'metal');
    B.cyl(0, 3.4, 0, 3.2, 3.0, 'rust');
    B.cyl(0, 5.6, 0, 2.4, 1.6, 'metal');
    B.cyl(0, 7.0, 0, 1.2, 1.4, 'metal');
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      B.cyl(Math.cos(a) * 5.2, 2.0, Math.sin(a) * 5.2, 0.4, 4.0, 'metal');
    }
    W.addLight(0xff5a2a, 16, 28, new Vector3(0, 4.0, 0));

    /* catwalk ring at 4.5m */
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      const x = Math.cos(a) * 14, z = Math.sin(a) * 14;
      B.box(x, 4.5, z, Math.abs(Math.cos(a)) > 0.5 ? 2.4 : 26, 0.3, Math.abs(Math.sin(a)) > 0.5 ? 2.4 : 26, 'metal');
    }
    /* railings (thin, still solid) */
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      const x = Math.cos(a) * 12.8, z = Math.sin(a) * 12.8;
      B.box(x, 5.5, z, Math.abs(Math.cos(a)) > 0.5 ? 0.1 : 26, 1.6, Math.abs(Math.sin(a)) > 0.5 ? 0.1 : 26, 'metal', false);
    }

    /* side rooms */
    const room = (x0, z0, x1, z1, doorWall) => {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0);
      const hx = [[cx - 1.2, cx + 1.2, 0, 2.7]];
      const hz = [[cz - 1.2, cz + 1.2, 0, 2.7]];
      GF.MapKit.wall(B, 'x', z0, x0, x1, 0, H * 0.85, 0.3, 'concrete', doorWall === 'z0' ? hx : null);
      GF.MapKit.wall(B, 'x', z1, x0, x1, 0, H * 0.85, 0.3, 'concrete', doorWall === 'z1' ? hx : null);
      GF.MapKit.wall(B, 'z', x0, z0, z1, 0, H * 0.85, 0.3, 'concrete', doorWall === 'x0' ? hz : null);
      GF.MapKit.wall(B, 'z', x1, z0, z1, 0, H * 0.85, 0.3, 'concrete', doorWall === 'x1' ? hz : null);
      B.box(cx, H * 0.85, cz, w, 0.3, d, 'concrete', true);
      return { cx, cz, w, d };
    };

    room(-31, 6, -12, 26, 'z0');
    room(12, 6, 31, 26, 'z0');
    room(-31, -26, -12, -6, 'z1');
    room(12, -26, 31, -6, 'z1');

    /* corridor supports */
    for (let i = 0; i < 12; i++) {
      B.box(-31 + i * 5.6, H / 2, 0, 0.6, H, 0.6, 'metal');
      B.box(0, H / 2, -31 + i * 5.2, 0.6, H, 0.6, 'metal');
    }
    /* pipes along the ceiling */
    for (let i = 0; i < 6; i++) {
      B.cyl(0, H - 0.9, -30 + i * 10, 0.22, 56, 'rust', false, 8);
      B.cyl(-20 + i * 8, H - 0.7, 0, 0.18, 56, 'metal', false, 8);
    }
    /* ceiling strip lights */
    const strips = [
      [0, 7, 26], [0, 7, -26], [22, 7, 0], [-22, 7, 0],
      [0, 7, 12], [0, 7, -12], [0, 7, 34], [0, 7, -34]
    ];
    for (let i = 0; i < strips.length; i++) {
      const [sx, sy, sz] = strips[i];
      B.box(sx, sy + 0.5, sz, 3.2, 0.12, 0.5, 'emissive', false);
      if (i % 2 === 0) W.addLight(0xffd0a0, 9, 19, new Vector3(sx, sy, sz));
    }

    /* hazard lights along floor */
    for (let i = 0; i < 10; i++) {
      const x = -30 + i * 6.6;
      B.box(x, 0.15, 30.4, 0.9, 0.25, 0.3, 'emissive', false);
      B.box(x, 0.15, -30.4, 0.9, 0.25, 0.3, 'emissive', false);
    }

    /* storage & crates */
    for (let i = 0; i < 6; i++) {
      B.box(-27 + i * 1.3, 0.7, 20, 1.2, 1.4, 1.2, 'metal');
      B.box(13 + i * 1.3, 0.6, 20, 1.2, 1.2, 1.2, 'rust');
    }
    for (let i = 0; i < 4; i++) W.spawnProp(GF.objectById('ammo-crate'), new Vector3(-27 + i * 1.6, 1.5, 20));
    W.spawnProp(GF.objectById('explosive-barrel'), new Vector3(-20, 0.2, 14));
    W.spawnProp(GF.objectById('explosive-barrel'), new Vector3(-19, 0.2, 15));
    W.spawnProp(GF.objectById('gas-canister'), new Vector3(24, 0.2, 14));
    W.spawnProp(GF.objectById('propane-tank'), new Vector3(24.8, 0.2, 15));
    W.spawnProp(GF.objectById('nuclear-briefcase'), new Vector3(0, 0.2, -25));
    W.spawnProp(GF.objectById('landmine'), new Vector3(-4, 0.15, 26));

    /* desks / gurneys / military gear */
    const P = (name, x, y, z, yaw) => { const d = GF.objectById(name); if (d) GF.World.decor(d, new Vector3(x, y, z), yaw || 0); };
    P('surgical-table', -26, 0.2, 10, 0);
    P('gurney', -22, 0.2, 12, 0);
    P('medical-cabinet', -30, 0.2, 22, 0);
    P('gurney', 16, 0.2, 10, 0);
    P('hospital-bed', 20, 0.2, 12, 0);
    P('lockers', 30, 0.2, 22, -Math.PI / 2);
    P('server-rack', 24, 0.2, 18, 0);
    P('generator', 22, 0.2, 22, 0);
    P('barrel-of-beer', -13, 0.2, 0, 0);
    P('pile-of-corpses', -16, 0.2, 16, 0.4);
    P('bloody-tarp', -16, 0.03, 16, 0);
    P('human-skull', 3, 0.3, 3, 0.7);
    P('skeleton', 6, 0.2, 18, 0.5);
    P('spike-with-head', -9, 0.2, -18, 0);

    W.staticWeapon(GF.weaponById('ak-47'), new Vector3(-26, 0.5, 11), 1.0);
    W.staticWeapon(GF.weaponById('m249-saw'), new Vector3(14, 0.5, 8), -0.4);
    W.staticWeapon(GF.weaponById('rpg-7'), new Vector3(0, 4.7, 14), 0.2);

    return {
      actorSpawns: [
        new Vector3(-20, 0.2, 16), new Vector3(20, 0.2, 16), new Vector3(0, 0.2, -18),
        new Vector3(-22, 0.2, -18), new Vector3(22, 0.2, -18), new Vector3(-24, 0.2, 9),
        new Vector3(24, 0.2, 9), new Vector3(0, 4.8, 14), new Vector3(-14, 4.8, 0),
        new Vector3(14, 4.8, 0), new Vector3(0, 0.2, 26), new Vector3(-9, 0.2, -9)
      ]
    };
  }
};

GF.MAPS = [GF.MAP_HOUSE, GF.MAP_OUTPOST, GF.MAP_CITY, GF.MAP_BUNKER];
GF.mapById = (id) => GF.MAPS.find(m => m.id === id) || GF.MAPS[0];
