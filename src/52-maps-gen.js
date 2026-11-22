/* =====================================================================
   GORE TOWN — thirty generated deployments
   Five archetypes (warehouse hall, open compound, street block, container
   yard, arena) share one deterministic builder, so every site is a real
   playable map with cover, interiors, lights and AI spawn points — not a
   renamed copy of the same room.
   ===================================================================== */

(function () {
  const SKY = {
    day: {
      top: '#6f9fc4', horizon: '#c8d2d8', bottom: '#3a4038', fog: '#a8b4bc', fogNear: 46, fogFar: 210,
      sunColor: '#fff2d8', sunIntensity: 2.7, sunPos: { x: 40, y: 70, z: 30 },
      hemiSky: '#9fb4c8', hemiGround: '#4a4238', hemiIntensity: 1.3, ambientIntensity: 0.3
    },
    dawn: {
      top: '#4a6a90', horizon: '#d8a880', bottom: '#2a2620', fog: '#8a8a92', fogNear: 32, fogFar: 170,
      sunColor: '#ffc890', sunIntensity: 2.2, sunPos: { x: -60, y: 30, z: 24 },
      hemiSky: '#a8a8b8', hemiGround: '#3a322a', hemiIntensity: 1.25, ambientIntensity: 0.3
    },
    dusk: {
      top: '#28313f', horizon: '#b06a42', bottom: '#1a1714', fog: '#4a423a', fogNear: 26, fogFar: 140,
      sunColor: '#ffb070', sunIntensity: 2.0, sunPos: { x: -50, y: 26, z: 18 },
      hemiSky: '#9a8a76', hemiGround: '#3a322a', hemiIntensity: 1.4, ambientIntensity: 0.3
    },
    night: {
      top: '#0b1220', horizon: '#2c3a52', bottom: '#070a12', fog: '#1c2638', fogNear: 26, fogFar: 150,
      sunColor: '#a8b8d8', sunIntensity: 0.9, sunPos: { x: -30, y: 60, z: 20 },
      hemiSky: '#6c7e9e', hemiGround: '#1e1e26', hemiIntensity: 1.35, ambient: '#9aa4be', ambientIntensity: 0.45
    },
    overcast: {
      top: '#8a929a', horizon: '#b0b4b6', bottom: '#4a4c4c', fog: '#9a9ea0', fogNear: 30, fogFar: 130,
      sunColor: '#e8e8e4', sunIntensity: 1.5, sunPos: { x: 20, y: 60, z: 10 },
      hemiSky: '#a8b0b8', hemiGround: '#44443e', hemiIntensity: 1.3, ambientIntensity: 0.35
    },
    toxic: {
      top: '#2a3428', horizon: '#6a7040', bottom: '#101410', fog: '#4a5030', fogNear: 14, fogFar: 80,
      sunColor: '#c8d080', sunIntensity: 1.2, sunPos: { x: 10, y: 50, z: -10 },
      hemiSky: '#7a8a5a', hemiGround: '#22281e', hemiIntensity: 1.2, ambientIntensity: 0.3
    },
    snow: {
      top: '#b8c4cc', horizon: '#e8eef2', bottom: '#8a949a', fog: '#c8d4dc', fogNear: 24, fogFar: 120,
      sunColor: '#f0f4ff', sunIntensity: 1.9, sunPos: { x: -20, y: 50, z: 30 },
      hemiSky: '#c8d8e8', hemiGround: '#7a8088', hemiIntensity: 1.5, ambientIntensity: 0.45
    },
    indoor: {
      top: '#070809', horizon: '#0e1012', bottom: '#050506', fog: '#0c0e12', fogNear: 10, fogFar: 70,
      sunColor: '#ff9070', sunIntensity: 0.1, sunPos: { x: 0, y: 30, z: 0 },
      hemiSky: '#6a7078', hemiGround: '#262420', hemiIntensity: 1.1, ambientIntensity: 0.5
    },
    red: {
      top: '#180a0c', horizon: '#4a1a18', bottom: '#0a0505', fog: '#2a1010', fogNear: 12, fogFar: 76,
      sunColor: '#ff5a3a', sunIntensity: 0.8, sunPos: { x: 0, y: 40, z: 0 },
      hemiSky: '#7a4a4a', hemiGround: '#241414', hemiIntensity: 1.2, ambientIntensity: 0.4
    },
    storm: {
      top: '#2c333a', horizon: '#5c646c', bottom: '#22262a', fog: '#3a4248', fogNear: 18, fogFar: 100,
      sunColor: '#b8c0c8', sunIntensity: 1.1, sunPos: { x: 30, y: 45, z: -20 },
      hemiSky: '#788088', hemiGround: '#2e3236', hemiIntensity: 1.2, ambientIntensity: 0.35
    }
  };

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  function ground(B, size, mat) {
    B.box(0, -0.35, 0, size, 0.7, size, mat, true, 0.5);
  }

  function perimeter(B, size, h, mat, gate) {
    const e = size / 2 - 0.4;
    const holes = gate === false ? null : [[-3, 3, 0, 4.2]];
    GF.MapKit.wall(B, 'x', -e, -e, e, 0, h, 0.5, mat, holes);
    GF.MapKit.wall(B, 'x', e, -e, e, 0, h, 0.5, mat, holes);
    GF.MapKit.wall(B, 'z', -e, -e, e, 0, h, 0.5, mat, null);
    GF.MapKit.wall(B, 'z', e, -e, e, 0, h, 0.5, mat, holes);
  }

  /* four walls with a doorway on one side, optional roof */
  function room(B, x, z, w, d, h, mat, door, roof, t) {
    t = t || 0.32;
    const hw = w / 2, hd = d / 2;
    const gap = 1.4;
    for (const sz of [-1, 1]) {
      const zz = z + sz * hd;
      const side = sz < 0 ? 'n' : 's';
      if (door === side) {
        B.box(x - (hw + gap) / 2, h / 2, zz, hw - gap, h, t, mat);
        B.box(x + (hw + gap) / 2, h / 2, zz, hw - gap, h, t, mat);
        B.box(x, h - 0.35, zz, gap * 2, 0.7, t, mat);
      } else {
        B.box(x, h / 2, zz, w, h, t, mat);
      }
    }
    for (const sx of [-1, 1]) {
      const xx = x + sx * hw;
      const side = sx < 0 ? 'w' : 'e';
      if (door === side) {
        B.box(xx, h / 2, z - (hd + gap) / 2, t, h, hd - gap, mat);
        B.box(xx, h / 2, z + (hd + gap) / 2, t, h, hd - gap, mat);
        B.box(xx, h - 0.35, z, t, 0.7, gap * 2, mat);
      } else {
        B.box(xx, h / 2, z, t, h, d, mat);
      }
    }
    if (roof) B.box(x, h + 0.16, z, w + 0.7, 0.32, d + 0.7, 'concrete', true, 0.4);
  }

  function crates(B, x, z, n, mat, r) {
    let y = 0;
    for (let i = 0; i < n; i++) {
      const s = 0.65 + r() * 0.45;
      B.box(x + (r() - 0.5) * 0.4, y + s / 2, z + (r() - 0.5) * 0.4, s, s, s, mat || 'wood');
      y += s * 0.96;
    }
  }

  function barrels(B, x, z, n, r) {
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283, rad = r() * 0.9;
      B.cyl(x + Math.cos(a) * rad, 0.45, z + Math.sin(a) * rad, 0.29, 0.9, r() < 0.5 ? 'rust' : 'metal', true, 8);
    }
  }

  function wreck(B, x, z, mat) {
    B.box(x, 0.36, z, 3.6, 0.62, 1.7, mat || 'rust');
    B.box(x + 0.15, 0.96, z, 1.8, 0.62, 1.5, 'dark');
    B.box(x - 1.2, 0.62, z, 0.9, 0.5, 1.6, mat || 'rust');
  }

  function lamp(B, W, x, z, h, color, intensity) {
    B.cyl(x, h * 0.5, z, 0.12, h, 'metal', true, 6);
    B.box(x, h + 0.08, z, 0.85, 0.14, 0.4, 'emissive', false);
    W.addLight(color || 0xffb060, intensity || 9, 26, new Vector3(x, h, z));
  }

  function spawnRing(size, n, r) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.4;
      const rad = size * (0.14 + r() * 0.22);
      out.push(new Vector3(Math.cos(a) * rad, 0.25, Math.sin(a) * rad));
    }
    return out;
  }

  /* ---------------------------- archetypes ---------------------------- */

  function buildWarehouse(B, W, spec, r) {
    const S = spec.S, h = spec.hallH || 8.5;
    ground(B, S, spec.ground);
    perimeter(B, S, h, spec.wall, false);
    B.box(0, h + 0.3, 0, S, 0.6, S, 'concrete', true, 0.4);
    /* shelving rows with aisle gaps */
    const rows = spec.rows || 4;
    for (let row = -rows; row <= rows; row++) {
      if (row === 0) continue;
      const x = row * (S * 0.075);
      for (let k = 0; k < 4; k++) {
        const z = -S * 0.3 + k * (S * 0.19);
        if (Math.abs(z - S * 0.4) < 6) continue;
        B.box(x, 1.6, z, 1.3, 3.2, S * 0.1, 'metal');
        if (r() < 0.6) crates(B, x + 1.4, z, 1 + (r() * 2 | 0), r() < 0.5 ? 'wood' : 'metal', r);
        if (r() < 0.4) barrels(B, x - 1.5, z + 1.2, 2 + (r() * 2 | 0), r);
      }
    }
    /* corner offices */
    room(B, -S * 0.33, -S * 0.32, S * 0.16, S * 0.14, 3.4, 'plaster', 'e', true);
    room(B, S * 0.33, -S * 0.32, S * 0.16, S * 0.14, 3.4, 'plaster', 'w', true);
    /* loading dock */
    B.box(0, 0.55, -S * 0.44, S * 0.5, 1.1, 3.0, 'concrete');
    B.box(0, 0.6, -S * 0.475, S * 0.5, 0.9, 0.3, 'metal');
    wreck(B, S * 0.2, -S * 0.05, 'rust');
    if (spec.cars !== false) {
      wreck(B, -S * 0.18, S * 0.1, 'metal');
      wreck(B, S * 0.12, S * 0.22, 'rust');
    }
    lamp(B, W, 0, S * 0.3, 6.5, 0xffc890, 12);
    lamp(B, W, 0, -S * 0.1, 6.5, 0xffc890, 12);
    lamp(B, W, -S * 0.26, -S * 0.1, 6.5, 0xffc890, 10);
    lamp(B, W, S * 0.26, -S * 0.1, 6.5, 0xffc890, 10);
    if (spec.hazard) {
      for (let i = 0; i < 6; i++) B.box(-S * 0.35 + i * (S * 0.14), 0.12, S * 0.36, 1.8, 0.2, 0.4, 'emissive', false);
    }
  }

  function buildCompound(B, W, spec, r) {
    const S = spec.S;
    ground(B, S, spec.ground);
    perimeter(B, S, 4.2, spec.wall, true);
    const n = 4 + (r() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.35;
      const rad = S * 0.23;
      const bx = Math.cos(a) * rad, bz = Math.sin(a) * rad;
      const w = 8 + r() * 4, d = 8 + r() * 3.5, bh = 3.2 + r() * (spec.tall ? 4.5 : 2.6);
      const door = Math.abs(bx) > Math.abs(bz) ? (bx > 0 ? 'w' : 'e') : (bz > 0 ? 'n' : 's');
      room(B, bx, bz, w, d, bh, r() < 0.5 ? spec.wall : spec.wall2 || spec.wall, door, spec.roofs !== false);
      crates(B, bx + w * 0.2, bz + d * 0.2, 1 + (r() * 2 | 0), 'wood', r);
      if (r() < 0.6) barrels(B, bx - w * 0.3, bz - d * 0.2, 2, r);
      if (r() < 0.35) wreck(B, bx * 1.5, bz * 1.2, 'rust');
    }
    /* yard clutter */
    for (let i = 0; i < 8; i++) {
      const px = (r() - 0.5) * S * 0.5, pz = (r() - 0.5) * S * 0.5;
      if (Math.hypot(px, pz) < 7) continue;
      if (Math.hypot(px, pz - S * 0.4) < 8) continue;
      if (i % 3 === 0) crates(B, px, pz, 1 + (r() * 3 | 0), 'wood', r);
      else if (i % 3 === 1) barrels(B, px, pz, 2 + (r() * 2 | 0), r);
      else B.box(px, 0.6, pz, 2.2, 1.2, 0.3, 'metal');
    }
    if (spec.fence) {
      GF.MapKit.fence(B, -S * 0.36, S * 0.28, S * 0.36, S * 0.28, 0, 2.2, 'metal', 2.4);
    }
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.7;
      lamp(B, W, Math.cos(a) * S * 0.34, Math.sin(a) * S * 0.34, 5.5, spec.lampColor || 0xffb060, 8);
    }
  }

  function buildStreet(B, W, spec, r) {
    const S = spec.S;
    ground(B, S, spec.ground);
    /* road + sidewalks */
    B.box(0, 0.04, 0, 12, 0.08, S, 'asphalt', false, 0.3);
    for (let side of [-1, 1]) {
      B.box(side * 8, 0.1, 0, 4, 0.2, S, 'concrete', false, 0.4);
      for (let i = 0; i < 5; i++) {
        const bz = -S * 0.34 + i * (S * 0.17);
        const bx = side * (S * 0.3);
        const w = 10 + r() * 5, d = 9 + r() * 4, bh = 4 + r() * (spec.tall ? 7 : 4);
        room(B, bx, bz, w, d, bh, r() < 0.5 ? spec.wall : spec.wall2 || spec.wall, side < 0 ? 'e' : 'w', true);
        if (spec.litFacades) {
          B.box(side * (S * 0.3 - side * (w / 2 + 0.06)), bh * 0.55, bz + d * 0.3, 0.12, 1.4, 3.2, 'emissive', false);
        }
        if (r() < 0.5) wreck(B, side * 5, bz + 2, 'rust');
      }
    }
    for (let i = 0; i < 4; i++) {
      const z = -S * 0.3 + i * (S * 0.2);
      lamp(B, W, -7.6, z, 6.5, 0xffc890, 10);
      lamp(B, W, 7.6, z + 3, 6.5, 0xffc890, 10);
    }
    for (let i = 0; i < 4; i++) {
      const z = -S * 0.2 + i * (S * 0.14);
      if (Math.abs(z - S * 0.4) < 8) continue;
      crates(B, (r() - 0.5) * 6, z, 1 + (r() * 2 | 0), 'wood', r);
    }
  }

  function buildYard(B, W, spec, r) {
    const S = spec.S;
    ground(B, S, spec.ground);
    perimeter(B, S, 3.6, spec.wall, true);
    for (let i = -2; i <= 2; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        if (r() < 0.3) continue;
        const x = i * (S * 0.11) + (r() - 0.5) * 2.2;
        const z = j * (S * 0.2) + (r() - 0.5) * 2.2;
        if (z > S * 0.22) continue;
        const mat = r() < 0.5 ? 'rust' : (spec.wall2 || 'metal');
        B.box(x, 1.35, z, 6, 2.7, 2.4, mat);
        if (r() < 0.35) B.box(x, 4.05, z, 6, 2.7, 2.4, mat);
        if (r() < 0.5) barrels(B, x + 4, z + 1.6, 2 + (r() * 2 | 0), r);
        if (r() < 0.4) crates(B, x - 4, z - 1.4, 2, 'wood', r);
      }
    }
    for (let i = 0; i < 5; i++) {
      const px = (r() - 0.5) * S * 0.6, pz = (r() - 0.5) * S * 0.6;
      if (Math.hypot(px, pz - S * 0.4) < 9) continue;
      if (i % 2) {
        for (let k = 0; k < 4; k++) B.cyl(px + (k % 2) * 0.7, 0.42, pz + ((k / 2) | 0) * 0.7, 0.34, 0.84, 'dark', true, 8);
      } else {
        wreck(B, px, pz, 'rust');
      }
    }
    GF.MapKit.fence(B, -S * 0.4, S * 0.2, -S * 0.1, S * 0.2, 0, 2.4, 'metal', 2.2);
    GF.MapKit.fence(B, S * 0.1, S * 0.2, S * 0.4, S * 0.2, 0, 2.4, 'metal', 2.2);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.6;
      lamp(B, W, Math.cos(a) * S * 0.38, Math.sin(a) * S * 0.38, 6, spec.lampColor || 0xffb060, 9);
    }
  }

  function buildArena(B, W, spec, r) {
    const S = spec.S;
    ground(B, S, spec.ground);
    perimeter(B, S, 5, spec.wall, true);
    /* central platform with stairs on two sides */
    const P = spec.platform || 11;
    B.box(0, 1.15, 0, P, 0.4, P, 'concrete', true, 0.4);
    B.box(0, 1.75, 0, P * 0.55, 0.8, P * 0.55, spec.wall2 || 'metal', true);
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      B.box(sx * P * 0.42, 1.4, sz * P * 0.42, 0.5, 2.8, 0.5, 'metal');
    B.stairs(0, 0, P / 2 + 2.2, 6, 0.2, 0.42, 3.2, -1, 'concrete');
    B.stairs(0, 0, -P / 2 - 2.2, 6, 0.2, 0.42, 3.2, 1, 'concrete');
    /* ring of barriers and cover */
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rad = S * 0.28;
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      if (Math.abs(x) < 3 && z > S * 0.3) continue;
      if (i % 3 === 0) crates(B, x, z, 1 + (r() * 2 | 0), 'wood', r);
      else if (i % 3 === 1) B.box(x, 0.7, z, 2.4, 1.4, 0.6, 'metal');
      else barrels(B, x, z, 2, r);
    }
    /* colonnade and outer cover so a big arena is not an empty field */
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.2;
      const x = Math.cos(a) * S * 0.19, z = Math.sin(a) * S * 0.19;
      B.box(x, 2.4, z, 0.75, 4.8, 0.75, spec.wall2 || 'concrete');
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.45;
      const x = Math.cos(a) * S * 0.37, z = Math.sin(a) * S * 0.37;
      if (i % 2) B.box(x, 0.8, z, 2.8, 1.6, 0.55, 'concrete');
      else B.box(x, 1.0, z, 0.55, 2.0, 2.8, spec.wall2 || 'metal');
      if (i % 4 === 0) barrels(B, x + 1.6, z + 1.4, 2, r);
    }
    /* stepped stands along two sides (stadium / plaza) */
    if (spec.bleachers) {
      for (const side of [-1, 1]) {
        for (let tier = 0; tier < 4; tier++) {
          B.box(side * (S * 0.42 - tier * 1.4), 0.5 + tier * 1.0, 0, 2.2, 1.0 + tier * 2.0, S * 0.6, spec.wall || 'concrete');
        }
      }
    }
    for (let i = 0; i < 6; i++) {
      const a = r() * Math.PI * 2, rad = S * (0.1 + r() * 0.14);
      crates(B, Math.cos(a) * rad, Math.sin(a) * rad, 1 + (r() * 2 | 0), 'wood', r);
    }
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.8;
      lamp(B, W, Math.cos(a) * S * 0.42, Math.sin(a) * S * 0.42, 8, spec.lampColor || 0xffe0a0, 14);
    }
    if (spec.cars !== false) {
      wreck(B, -S * 0.2, S * 0.18, 'rust');
      wreck(B, S * 0.22, S * 0.12, 'metal');
      wreck(B, S * 0.3, -S * 0.2, 'rust');
    }
  }

  const KINDS = {
    warehouse: buildWarehouse,
    compound: buildCompound,
    street: buildStreet,
    yard: buildYard,
    arena: buildArena
  };

  function make(spec) {
    return {
      id: spec.id,
      name: spec.name,
      subtitle: spec.subtitle,
      desc: spec.desc,
      size: Math.round(spec.S) + ' x ' + Math.round(spec.S) + ' m',
      accent: spec.accent,
      interior: spec.kind === 'warehouse',
      sky: spec.sky,
      spawn: new Vector3(0, 0.15, spec.S * 0.4),
      spawnYaw: 0,
      build(B, W) {
        const r = rng(spec.seed);
        (KINDS[spec.kind] || buildCompound)(B, W, spec, r);
        return { actorSpawns: spawnRing(spec.S, spec.spawns || 15, r) };
      }
    };
  }

  const SPECS = [
    {
      id: 'warehouse', name: 'DOCKSIDE WAREHOUSE', subtitle: 'Container port, 03:10',
      desc: 'A cavernous freight hall stacked to the roof with pallets and rusted shelving. Every aisle is a shooting lane and the loading dock is the only clean way out.',
      S: 72, accent: '#3f7a8a', kind: 'warehouse', seed: 1101, ground: 'concrete', wall: 'metal', sky: SKY.night, hazard: true
    },
    {
      id: 'prison', name: 'BLACKMOOR PRISON', subtitle: 'Maximum security wing',
      desc: 'Four cell blocks around a concrete yard, razor wire on the fence and a guard tower that has not been manned in years. The locks were opened from the inside.',
      S: 76, accent: '#6a6f74', kind: 'compound', seed: 2202, ground: 'concrete', wall: 'concrete', wall2: 'brick', sky: SKY.overcast, roofs: true, fence: true, tall: true
    },
    {
      id: 'mall', name: 'NORTHGATE MALL', subtitle: 'Retail concourse',
      desc: 'Two floors of dead shops, a dry fountain and escalators frozen mid-climb. The skylights still throw hard shadows across the tile.',
      S: 78, accent: '#b08a4a', kind: 'street', seed: 3303, ground: 'tile', wall: 'plaster', wall2: 'concrete', sky: SKY.day, litFacades: true, tall: true, spawns: 16
    },
    {
      id: 'hospital', name: 'ST. AGNES HOSPITAL', subtitle: 'Ward C, quarantine floor',
      desc: 'Long tiled corridors, curtained bays and an operating theatre that was sealed from the outside. The emergency lights are still on.',
      S: 64, accent: '#7aa8a0', kind: 'warehouse', seed: 4404, ground: 'tile', wall: 'plaster', hallH: 6.5, rows: 3, sky: SKY.indoor, hazard: false
    },
    {
      id: 'sewers', name: 'CITY SEWERS', subtitle: 'Storm drain network',
      desc: 'Concrete tunnels under the old town, ankle-deep in runoff. Sound carries for a hundred metres down here and nobody comes to help.',
      S: 60, accent: '#5a7a4a', kind: 'warehouse', seed: 5505, ground: 'concrete', wall: 'concrete', hallH: 5.2, rows: 2, sky: SKY.toxic, hazard: true
    },
    {
      id: 'subway', name: 'LINE 4 SUBWAY', subtitle: 'Abandoned platform',
      desc: 'A sunken platform with a dead train, third rail covers and service doors every twenty metres. The tunnel mouth is a black hole in the fog.',
      S: 80, accent: '#8a6a3a', kind: 'warehouse', seed: 6606, ground: 'concrete', wall: 'tile', hallH: 6, rows: 2, sky: SKY.indoor, hazard: true
    },
    {
      id: 'offices', name: 'MERIDIAN OFFICES', subtitle: 'Corporate tower block',
      desc: 'Glass frontage, open-plan floors and a lobby full of overturned desks. The elevators are dark but the stairwells go all the way up.',
      S: 72, accent: '#4a7ba8', kind: 'street', seed: 7707, ground: 'tile', wall: 'glass', wall2: 'concrete', sky: SKY.day, litFacades: true, tall: true
    },
    {
      id: 'steelworks', name: 'STEELWORKS', subtitle: 'Rolling mill, night shift',
      desc: 'Furnace housings, overhead cranes and miles of catwalk. The floor still radiates heat from the last pour.',
      S: 84, accent: '#c8643a', kind: 'warehouse', seed: 8808, ground: 'rust', wall: 'metal', wall2: 'rust', hallH: 11, rows: 4, sky: SKY.dusk, hazard: true
    },
    {
      id: 'farm', name: 'DRY CREEK FARM', subtitle: 'Farmstead at harvest',
      desc: 'A barn, a silo and a farmhouse ringed by dead corn. Long sight lines across the field and nowhere to hide once the shooting starts.',
      S: 86, accent: '#8a7a3a', kind: 'compound', seed: 9909, ground: 'dirt', wall: 'wood', wall2: 'brick', sky: SKY.day, roofs: true, fence: true
    },
    {
      id: 'motel', name: 'SUNSET MOTEL', subtitle: 'Route 9, room 14',
      desc: 'A strip of identical rooms around a cracked pool. Neon buzzes over the office and every door opens onto the same killing ground.',
      S: 64, accent: '#c85a6a', kind: 'street', seed: 1212, ground: 'asphalt', wall: 'plaster', wall2: 'brick', sky: SKY.dusk, litFacades: true
    },
    {
      id: 'church', name: 'ST. MICHAEL CHURCH', subtitle: 'Parish and graveyard',
      desc: 'A stone nave, a bell tower and a walled graveyard. Candles still burn in the vestry, which means someone was here recently.',
      S: 56, accent: '#9a8a6a', kind: 'compound', seed: 2323, ground: 'stone', wall: 'brick', wall2: 'stone', sky: SKY.overcast, roofs: true, tall: true
    },
    {
      id: 'school', name: 'LINCOLN HIGH', subtitle: 'Secondary school, closed',
      desc: 'Classrooms, a gym hall and lockers twisted open down every corridor. The PA system clicks on by itself.',
      S: 72, accent: '#4a8a6a', kind: 'compound', seed: 3434, ground: 'tile', wall: 'brick', wall2: 'plaster', sky: SKY.day, roofs: true, tall: true
    },
    {
      id: 'lab', name: 'BIOTECH LAB', subtitle: 'Containment level B2',
      desc: 'Sealed clean rooms, specimen freezers and a decontamination airlock that no longer cycles. Something got out of the cold storage.',
      S: 62, accent: '#6ac8b0', kind: 'warehouse', seed: 4545, ground: 'tile', wall: 'plaster', hallH: 6.8, rows: 3, sky: SKY.indoor, hazard: false
    },
    {
      id: 'shipyard', name: 'KILN SHIPYARD', subtitle: 'Dry dock and scrap berths',
      desc: 'Hulls the size of buildings, gantry cranes overhead and a maze of containers waiting for the torch. Rust dust hangs in the air.',
      S: 88, accent: '#a85a3a', kind: 'yard', seed: 5656, ground: 'rust', wall: 'metal', wall2: 'rust', sky: SKY.dusk, spawns: 17
    },
    {
      id: 'airport', name: 'REGIONAL AIRPORT', subtitle: 'Hangar 3, grounded',
      desc: 'A wide hangar with a stripped aircraft and baggage carts scattered across the apron. The control tower windows are all dark.',
      S: 86, accent: '#5a7a9a', kind: 'warehouse', seed: 6767, ground: 'concrete', wall: 'metal', hallH: 12, rows: 3, sky: SKY.overcast, hazard: true
    },
    {
      id: 'trailer', name: 'TRAILER PARK', subtitle: 'Shady Acres, lot 22',
      desc: 'A ring of aluminium trailers, clotheslines and a stagnant pond. Thin walls, no cover worth trusting and neighbours who will not call anyone.',
      S: 60, accent: '#8a9a7a', kind: 'yard', seed: 7878, ground: 'dirt', wall: 'wood', wall2: 'metal', sky: SKY.day
    },
    {
      id: 'fuel', name: 'LAST STOP FUEL', subtitle: 'Highway service station',
      desc: 'Pumps, a convenience store and a repair bay. One stray round through the fuel island will flatten the whole site.',
      S: 54, accent: '#d8a840', kind: 'compound', seed: 8989, ground: 'asphalt', wall: 'plaster', wall2: 'metal', sky: SKY.night, roofs: true, lampColor: 0xffd890
    },
    {
      id: 'cinema', name: 'ORPHEUM CINEMA', subtitle: 'Screen 2, final showing',
      desc: 'Velvet seats, a torn screen and a projection booth full of nitrate film. The emergency lighting turns every aisle red.',
      S: 58, accent: '#8a2a3a', kind: 'warehouse', seed: 9090, ground: 'fabric', wall: 'plaster', hallH: 7.5, rows: 2, sky: SKY.red
    },
    {
      id: 'casino', name: 'GOLDEN ACE CASINO', subtitle: 'Gaming floor, 04:00',
      desc: 'Rows of slot machines, felt tables and a cash cage that is very much still locked. Chandeliers swing over the carnage.',
      S: 66, accent: '#c8a040', kind: 'warehouse', seed: 1213, ground: 'fabric', wall: 'plaster', hallH: 6.2, rows: 3, sky: SKY.red, hazard: true
    },
    {
      id: 'museum', name: 'HISTORY MUSEUM', subtitle: 'Ancient wing, after hours',
      desc: 'Marble halls, glass cases and a reconstruction of a war trench that is suddenly very relevant. Every exhibit is behind something breakable.',
      S: 64, accent: '#9a8a5a', kind: 'compound', seed: 1314, ground: 'stone', wall: 'stone', wall2: 'concrete', sky: SKY.overcast, roofs: true, tall: true
    },
    {
      id: 'stadium', name: 'IRONWORKS STADIUM', subtitle: 'Home ground, floodlit',
      desc: 'An empty bowl of fifty thousand seats, a torn pitch and four floodlight towers that never went out. The tunnel under the stands is a deathtrap.',
      S: 88, accent: '#4a8ac8', kind: 'arena', seed: 1415, ground: 'grass', wall: 'concrete', wall2: 'metal', sky: SKY.night, platform: 14, spawns: 18, bleachers: true
    },
    {
      id: 'garage', name: 'PARKING GARAGE', subtitle: 'Levels 2 to 4, no lights',
      desc: 'A poured-concrete deck with pillars every bay, a dead ramp and rows of abandoned cars. Sound bounces off every wall.',
      S: 70, accent: '#7a7a7a', kind: 'warehouse', seed: 1516, ground: 'concrete', wall: 'concrete', hallH: 4.6, rows: 3, sky: SKY.indoor
    },
    {
      id: 'site12', name: 'SITE 12 CONSTRUCTION', subtitle: 'Half-built tower block',
      desc: 'Open floors, rebar forests and a tower crane that swings in the wind. Nothing here is finished and nothing here is safe.',
      S: 80, accent: '#c8a050', kind: 'yard', seed: 1617, ground: 'sand', wall: 'concrete', wall2: 'rust', sky: SKY.day
    },
    {
      id: 'marina', name: 'HARBOR MARINA', subtitle: 'Dock C at first light',
      desc: 'Timber piers, a dry-stack of hulls and a boathouse full of fuel cans. Fog rolls in off the water until you cannot see the next berth.',
      S: 74, accent: '#4a8a9a', kind: 'yard', seed: 1718, ground: 'wood', wall: 'wood', wall2: 'metal', sky: SKY.dawn
    },
    {
      id: 'lodge', name: 'PINE RIDGE LODGE', subtitle: 'Mountain retreat, blizzard',
      desc: 'A timber lodge with a stone fireplace, outbuildings and a snowbound slope. Tracks in the snow lead in and never come back out.',
      S: 70, accent: '#8aa8b8', kind: 'compound', seed: 1819, ground: 'snow', wall: 'wood', wall2: 'stone', sky: SKY.snow, roofs: true, fence: true
    },
    {
      id: 'checkpoint', name: 'MILITARY CHECKPOINT', subtitle: 'Highway 6 roadblock',
      desc: 'Concrete barriers, a guard shack and a stalled convoy. Someone dragged the heavy weapons out and never came back for them.',
      S: 66, accent: '#7a8a4a', kind: 'compound', seed: 1920, ground: 'sand', wall: 'concrete', wall2: 'metal', sky: SKY.day, roofs: true, fence: true
    },
    {
      id: 'packing', name: 'PACKING PLANT', subtitle: 'Slaughterhouse floor',
      desc: 'Stainless steel, overhead rails and a cold room that still hums. The drainage channels have not been cleaned in a very long time.',
      S: 72, accent: '#b85a4a', kind: 'warehouse', seed: 2021, ground: 'tile', wall: 'metal', hallH: 8, rows: 4, sky: SKY.indoor, hazard: true
    },
    {
      id: 'scrapyard', name: 'SCRAPYARD', subtitle: 'Twelve acres of dead machines',
      desc: 'Crusher blocks, flattened cars and stacks of girders. There is a path through it if you remember where you came in.',
      S: 78, accent: '#9a7a4a', kind: 'yard', seed: 2122, ground: 'dirt', wall: 'rust', wall2: 'metal', sky: SKY.overcast, spawns: 16
    },
    {
      id: 'plaza', name: 'CIVIC PLAZA', subtitle: 'City centre, curfew',
      desc: 'A wide paved square with a dry monument fountain, planters and a ring of government buildings. Nowhere to run and plenty to hide behind.',
      S: 76, accent: '#5a6a8a', kind: 'arena', seed: 2223, ground: 'stone', wall: 'concrete', wall2: 'stone', sky: SKY.dusk, platform: 9, spawns: 16, bleachers: true
    },
    {
      id: 'rooftops', name: 'ROOFTOP BLOCKS', subtitle: 'Skyline crossing',
      desc: 'Tar roofs, air handlers and a plank bridge between two towers. One wrong step and the fight is over for you.',
      S: 68, accent: '#6a5a7a', kind: 'arena', seed: 2324, ground: 'asphalt', wall: 'concrete', wall2: 'metal', sky: SKY.night, platform: 12, spawns: 15
    }
  ];

  for (const spec of SPECS) GF.MAPS.push(make(spec));

  /* ------------------------------------------------------------------ */
  /*  Mass deployment roster: 400 more sites from place x site-type      */
  /*  pairs. Every one has its own seed, palette, sky and layout.        */
  /* ------------------------------------------------------------------ */
  const PREFIXES = [
    'ASHFIELD', 'BLACKMOOR', 'COLDWATER', 'DUNMORE', 'EASTGATE', 'FAIRVIEW', 'GLENROCK', 'HALLOWAY',
    'IRONWOOD', 'JUNCTION', 'KILBRIDE', 'LAKEMONT', 'MARROWFIELD', 'NORTHBROOK', 'OAKHURST', 'PINEHURST',
    'QUARRY BEND', 'RAVENSDALE', 'SILVERLAKE', 'THORNBURY', 'UNDERWOOD', 'VALEMOUNT', 'WESTHAVEN', 'YELLOW CREEK',
    'ZEPHYR HILLS', 'ARLINGTON', 'BRAMBLE', 'CRESSWELL', 'DREDGE', 'ELMHURST', 'FENWICK', 'GRAVESEND',
    'HOLLOWAY', 'INGLESIDE', 'JACKSON FLATS', 'KESTREL', 'LOWELL', 'MILBROOK', 'NEW HAVEN', 'OLD TOWN',
    'PORT ALDEN', 'QUINLAN', 'RED BLUFF', 'STONEHAVEN', 'TALLGRASS', 'UPLAND', 'VERMILION', 'WOLF CREEK',
    'YARROW', 'ZION PASS', 'BLACK RIDGE', 'COPPER GULCH', 'DUST VALLEY', 'EMBER CREEK', 'FROSTBITE', 'GRANITE FALLS',
    'HAWTHORNE', 'INDIGO', 'JUNIPER', 'KETTLE', 'LANTERN', 'MOSSLEY', 'NIGHTJAR', 'ORCHARD',
    'PALLAS', 'QUILL', 'RUSTON', 'SALTWATER', 'TINDER', 'UMBER', 'VESPER', 'WREN',
    'YONDER', 'ZODIAC', 'ANVIL', 'BEACON', 'CINDER', 'DRIFTLESS', 'EVERGREEN', 'FLINTLOCK',
    'GALLOWS', 'HOLLOW', 'IRONSIDE', 'JASPER', 'KINDLING', 'LARKSPUR', 'MERCY', 'NETHERBY',
    'OCCIDENT', 'PRAIRIE', 'QUARRY', 'RIFT', 'SABLE', 'TALLOW', 'URSA', 'VAGRANT'
  ];
  const TYPES = [
    { word: 'WAREHOUSE', kind: 'warehouse', S: 68, ground: 'concrete', wall: 'metal', blurb: 'a freight hall of stacked pallets and long aisles.' },
    { word: 'PRISON', kind: 'compound', S: 74, ground: 'concrete', wall: 'concrete', wall2: 'brick', tall: true, fence: true, blurb: 'a cell block compound with a walled yard.' },
    { word: 'MALL', kind: 'street', S: 74, ground: 'tile', wall: 'plaster', wall2: 'concrete', tall: true, blurb: 'a dead retail concourse of glass and tile.' },
    { word: 'HOSPITAL', kind: 'warehouse', S: 62, ground: 'tile', wall: 'plaster', blurb: 'sealed wards, curtained bays and a dark theatre.' },
    { word: 'SEWER', kind: 'warehouse', S: 58, ground: 'concrete', wall: 'concrete', blurb: 'flooded concrete tunnels beneath the old town.' },
    { word: 'SUBWAY', kind: 'warehouse', S: 78, ground: 'concrete', wall: 'tile', blurb: 'a dead platform, a stalled train and a black tunnel mouth.' },
    { word: 'OFFICE', kind: 'street', S: 70, ground: 'tile', wall: 'glass', wall2: 'concrete', tall: true, blurb: 'open floors, glass frontage and overturned desks.' },
    { word: 'FOUNDRY', kind: 'warehouse', S: 80, ground: 'rust', wall: 'metal', wall2: 'rust', blurb: 'furnace housings and catwalks still warm from the last pour.' },
    { word: 'FARM', kind: 'compound', S: 84, ground: 'dirt', wall: 'wood', wall2: 'brick', fence: true, blurb: 'a barn, a silo and a farmhouse ringed by dead corn.' },
    { word: 'MOTEL', kind: 'street', S: 62, ground: 'asphalt', wall: 'plaster', wall2: 'brick', blurb: 'identical rooms around a cracked pool and a buzzing sign.' },
    { word: 'CHAPEL', kind: 'compound', S: 54, ground: 'stone', wall: 'brick', wall2: 'stone', tall: true, blurb: 'a stone nave, a bell tower and a walled graveyard.' },
    { word: 'SCHOOL', kind: 'compound', S: 70, ground: 'tile', wall: 'brick', wall2: 'plaster', tall: true, blurb: 'classrooms, lockers and a gym hall that still smells of chalk.' },
    { word: 'LAB', kind: 'warehouse', S: 60, ground: 'tile', wall: 'plaster', blurb: 'clean rooms, specimen freezers and a failed airlock.' },
    { word: 'SHIPYARD', kind: 'yard', S: 86, ground: 'rust', wall: 'metal', wall2: 'rust', blurb: 'hulls the size of buildings and a maze of containers.' },
    { word: 'HANGAR', kind: 'warehouse', S: 84, ground: 'concrete', wall: 'metal', blurb: 'a wide hangar, a stripped aircraft and baggage carts.' },
    { word: 'TRAILER PARK', kind: 'yard', S: 58, ground: 'dirt', wall: 'wood', wall2: 'metal', blurb: 'aluminium trailers, clotheslines and a stagnant pond.' },
    { word: 'FUEL STOP', kind: 'compound', S: 52, ground: 'asphalt', wall: 'plaster', wall2: 'metal', blurb: 'pumps, a store and a repair bay full of fuel.' },
    { word: 'CINEMA', kind: 'warehouse', S: 56, ground: 'fabric', wall: 'plaster', blurb: 'velvet seats, a torn screen and a red-lit booth.' },
    { word: 'CASINO', kind: 'warehouse', S: 64, ground: 'fabric', wall: 'plaster', blurb: 'slot rows, felt tables and a locked cash cage.' },
    { word: 'MUSEUM', kind: 'compound', S: 62, ground: 'stone', wall: 'stone', wall2: 'concrete', tall: true, blurb: 'marble halls and glass cases behind every pillar.' },
    { word: 'STADIUM', kind: 'arena', S: 84, ground: 'grass', wall: 'concrete', wall2: 'metal', platform: 14, bleachers: true, blurb: 'an empty bowl of seats under dead floodlights.' },
    { word: 'GARAGE', kind: 'warehouse', S: 68, ground: 'concrete', wall: 'concrete', blurb: 'a poured deck of pillars, ramps and abandoned cars.' },
    { word: 'CONSTRUCTION', kind: 'yard', S: 78, ground: 'sand', wall: 'concrete', wall2: 'rust', blurb: 'open floors, rebar forests and a swinging crane.' },
    { word: 'MARINA', kind: 'yard', S: 72, ground: 'wood', wall: 'wood', wall2: 'metal', blurb: 'timber piers, dry-stacked hulls and a fuelled boathouse.' },
    { word: 'LODGE', kind: 'compound', S: 68, ground: 'snow', wall: 'wood', wall2: 'stone', fence: true, blurb: 'timber buildings and tracks that never come back.' },
    { word: 'CHECKPOINT', kind: 'compound', S: 64, ground: 'sand', wall: 'concrete', wall2: 'metal', fence: true, blurb: 'barriers, a guard shack and a stalled convoy.' },
    { word: 'PACKING PLANT', kind: 'warehouse', S: 70, ground: 'tile', wall: 'metal', blurb: 'stainless steel, overhead rails and a cold room.' },
    { word: 'SCRAPYARD', kind: 'yard', S: 76, ground: 'dirt', wall: 'rust', wall2: 'metal', blurb: 'crusher blocks, flattened cars and girder stacks.' },
    { word: 'PLAZA', kind: 'arena', S: 74, ground: 'stone', wall: 'concrete', wall2: 'stone', platform: 9, bleachers: true, blurb: 'a paved square ringed by government buildings.' },
    { word: 'ROOFTOP', kind: 'arena', S: 66, ground: 'asphalt', wall: 'concrete', wall2: 'metal', platform: 12, blurb: 'tar roofs, air handlers and a plank bridge.' },
    { word: 'DEPOT', kind: 'compound', S: 66, ground: 'concrete', wall: 'metal', wall2: 'concrete', blurb: 'bus sheds, ticket offices and a fenced yard.' },
    { word: 'QUARRY', kind: 'yard', S: 82, ground: 'rock', wall: 'rock', wall2: 'metal', blurb: 'blasted terraces, gravel piles and abandoned machinery.' },
    { word: 'REFINERY', kind: 'warehouse', S: 76, ground: 'rust', wall: 'metal', wall2: 'rust', blurb: 'pipe racks, cracking towers and a leaking manifold.' },
    { word: 'APARTMENTS', kind: 'street', S: 72, ground: 'concrete', wall: 'brick', wall2: 'plaster', tall: true, blurb: 'balconies, stairwells and a courtyard full of bins.' },
    { word: 'COURTHOUSE', kind: 'compound', S: 60, ground: 'stone', wall: 'stone', wall2: 'concrete', tall: true, blurb: 'a colonnaded hall, holding cells and a sealed evidence room.' },
    { word: 'ARENA', kind: 'arena', S: 72, ground: 'concrete', wall: 'concrete', wall2: 'metal', platform: 11, blurb: 'a walled pit with a raised centre and ringed barriers.' },
    { word: 'DOCKS', kind: 'warehouse', S: 74, ground: 'concrete', wall: 'metal', blurb: 'a loading hall with a dock edge and salt-eaten steel.' },
    { word: 'CEMETERY', kind: 'compound', S: 68, ground: 'grass', wall: 'stone', wall2: 'brick', blurb: 'headstones, a chapel and a wall that is too low to trust.' },
    { word: 'POWER STATION', kind: 'warehouse', S: 80, ground: 'concrete', wall: 'metal', wall2: 'rust', blurb: 'turbine halls, switchgear and a live rail.' },
    { word: 'FIREHOUSE', kind: 'compound', S: 56, ground: 'concrete', wall: 'brick', wall2: 'concrete', blurb: 'engine bays, a pole hole and a hose-drying tower.' },
    { word: 'THEATRE', kind: 'warehouse', S: 58, ground: 'fabric', wall: 'plaster', blurb: 'a stage, fly ropes and rows of folding seats.' },
    { word: 'LAUNDRY', kind: 'warehouse', S: 54, ground: 'tile', wall: 'concrete', blurb: 'industrial washers, steam pipes and a sorting floor.' },
    { word: 'BAKERY', kind: 'warehouse', S: 52, ground: 'tile', wall: 'brick', blurb: 'ovens, proving racks and flour on every surface.' },
    { word: 'PHARMACY', kind: 'street', S: 58, ground: 'tile', wall: 'plaster', blurb: 'shelves of pills and a counter with its register open.' },
    { word: 'HOTEL', kind: 'street', S: 68, ground: 'tile', wall: 'brick', wall2: 'plaster', tall: true, blurb: 'a lobby, a lift shaft and a corridor of identical doors.' },
    { word: 'BANK', kind: 'compound', S: 60, ground: 'stone', wall: 'concrete', wall2: 'stone', tall: true, blurb: 'a marble floor, teller cages and a vault door.' },
    { word: 'CLUB', kind: 'warehouse', S: 56, ground: 'fabric', wall: 'plaster', blurb: 'a dance floor, a bar and dead speaker stacks.' },
    { word: 'TUNNEL', kind: 'warehouse', S: 82, ground: 'rock', wall: 'rock', wall2: 'concrete', blurb: 'a bored tunnel with service bays and stalled traffic.' },
    { word: 'FORT', kind: 'compound', S: 70, ground: 'stone', wall: 'stone', wall2: 'concrete', tall: true, blurb: 'earthworks, a keep and a gate that no longer closes.' },
    { word: 'OBSERVATORY', kind: 'compound', S: 58, ground: 'concrete', wall: 'concrete', wall2: 'metal', tall: true, blurb: 'a domed tower, instrument rooms and a cliff edge.' }
  ];
  const ACCENTS = ['#b5543a', '#3f7a8a', '#8a6a3a', '#4a7ba8', '#7a8a4a', '#9a5a6a', '#a85a3a', '#5a8a6a', '#b08a4a', '#6a5a8a'];
  const ALTSKY = [SKY.day, SKY.dusk, SKY.overcast, SKY.dawn, SKY.storm, SKY.day];

  let made = 0;
  for (let i = 0; i < 2400 && made < 400; i++) {
    const p = PREFIXES[i % PREFIXES.length];
    const t = TYPES[(i * 3 + Math.floor(i / PREFIXES.length)) % TYPES.length];
    const id = 'site-' + (p + '-' + t.word).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (GF.MAPS.some(m => m.id === id)) continue;
    const S = t.S + (((i / PREFIXES.length) | 0) % 3) * 4;
    const sky = ALTSKY[i % ALTSKY.length];
    GF.MAPS.push(make({
      id,
      name: p + ' ' + t.word,
      subtitle: 'SITE ' + String(made + 35).padStart(3, '0'),
      desc: p.charAt(0) + p.slice(1).toLowerCase() + ' ' + t.word.toLowerCase() + ' — ' + t.blurb,
      S, accent: ACCENTS[i % ACCENTS.length], kind: t.kind, seed: 7000 + i * 7919,
      ground: t.ground, wall: t.wall, wall2: t.wall2,
      sky: sky && sky.top ? sky : SKY.overcast,
      tall: !!t.tall, fence: !!t.fence, roofs: t.kind === 'compound' || t.kind === 'street',
      bleachers: !!t.bleachers, platform: t.platform,
      hazard: i % 3 === 0, spawns: 14 + (i % 4)
    }));
    made++;
  }
})();
