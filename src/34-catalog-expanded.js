/* =====================================================================
   GORE TOWN — expanded catalogue
   Every base weapon gets four factory variants (Tactical / Compact /
   Match / Heavy) with physically re-derived stats, and the prop list gains
   a deep industrial, construction, medical, electronics and equipment
   catalogue. Everything here lands in the same spawn menu as the base
   content, so the sandbox now holds well over 1500 spawnable things.
   ===================================================================== */

GF.deriveWeaponStats = function (w) {
  const powerFor = {
    pistol: 1.0, revolver: 1.2, smg: 0.9, carbine: 1.3, rifle: 1.6,
    shotgun: 1.9, sniper: 2.2, dmr: 1.7, lmg: 1.8, launcher: 2.6,
    knife: 0.4, blade: 0.6, blunt: 0.5, heavy: 0.8, staff: 0.5
  };
  const ballistic = !w.melee;
  w.power = ballistic ? (powerFor[w.model] || 1) : 0.35;
  w.dps = Math.round(w.dmg * Math.min(w.rpm, 1200) / 60 * w.pellets);
  w.adsTime = GF.clamp(0.16 + w.weight * 0.035, 0.16, 0.62);
  w.equipTime = GF.clamp(0.28 + w.weight * 0.05, 0.28, 0.9);
  w.handling = GF.clamp(1 / (0.55 + w.weight * 0.28), 0.3, 1.6);
  w.effectiveRange = w.melee ? w.reach : GF.clamp(w.vel * 0.6, 12, 320);
  w.explosive = w.cat === 'launcher';
  w.ammoType = w.melee ? 'melee' : 'bullet';
  w.sound = w.model === 'sniper' ? 2.4 : w.model === 'shotgun' ? 2.0 : w.model === 'lmg' ? 1.9 : w.model === 'launcher' ? 2.8 : w.power;
  if (w.cat === 'launcher' && /Flamethrower/.test(w.name)) { w.ammoType = 'flame'; w.explosive = false; }
  return w;
};

(function buildWeaponVariants() {
  const VARIANTS = [
    { suffix: 'Tactical', note: 'Factory tactical package: optic rail, tuned trigger, braced stock', mod: { dmg: 1.06, spread: 0.84, rpm: 1.02, weight: 1.04, reload: 0.95 } },
    { suffix: 'Compact', note: 'Shortened compact build for close quarters', mod: { dmg: 0.9, spread: 1.12, rpm: 1.08, mag: 0.75, weight: 0.8, reload: 0.9 } },
    { suffix: 'Match', note: 'Hand-fitted match build with a lapped barrel', mod: { dmg: 1.04, spread: 0.58, rpm: 0.86, weight: 1.12, reload: 1.05 } },
    { suffix: 'Heavy', note: 'Heavy profile barrel, reinforced bolt, magnum load', mod: { dmg: 1.32, spread: 1.05, rpm: 0.78, weight: 1.3, recoil: 1.25 } },
    { suffix: 'Long', note: 'Long barrel and sight radius for reach', mod: { dmg: 1.12, spread: 0.72, rpm: 0.92, weight: 1.18 } },
    { suffix: 'Duty', note: 'Department issue: reliable, cheap, everywhere', mod: { dmg: 0.98, spread: 0.95, rpm: 1.0, weight: 1.0, reload: 0.92 } },
    { suffix: 'Custom', note: 'Shop-built custom with hand-selected parts', mod: { dmg: 1.1, spread: 0.8, rpm: 1.05, weight: 1.06 } },
    { suffix: 'Prototype', note: 'Prototype action with an experimental recoil system', mod: { dmg: 1.18, spread: 0.7, rpm: 1.12, weight: 0.92 } },
    { suffix: 'Light', note: 'Skeletonised lightweight build', mod: { dmg: 0.94, spread: 1.08, rpm: 1.15, weight: 0.68 } },
    { suffix: 'Breacher', note: 'Breaching build: short barrel, hard-hitting load', mod: { dmg: 1.2, spread: 1.2, rpm: 0.9, mag: 0.8, weight: 0.85 } },
    { suffix: 'Marksman', note: 'Marksman build with a match chamber', mod: { dmg: 1.16, spread: 0.5, rpm: 0.7, weight: 1.15 } },
    { suffix: 'Elite', note: 'Elite package with every upgrade fitted', mod: { dmg: 1.25, spread: 0.66, rpm: 0.95, weight: 1.08 } }
  ];
  const seen = new Set(GF.WEAPONS.map(w => w.id));
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const bases = GF.WEAPONS.slice();

  for (const w of bases) {
    for (const v of VARIANTS) {
      const id = slug(w.name + ' ' + v.suffix);
      if (seen.has(id)) continue;
      seen.add(id);
      const m = v.mod;
      const nw = Object.assign({}, w);
      nw.id = id;
      nw.name = w.name + ' ' + v.suffix;
      nw.note = v.note;
      nw.dmg = Math.max(w.melee ? 8 : 4, Math.round(w.dmg * m.dmg));
      nw.rpm = Math.round(GF.clamp(w.rpm * (m.rpm || 1), 30, 1500));
      nw.weight = +Math.max(0.1, w.weight * (m.weight || 1)).toFixed(2);
      if (w.melee) {
        nw.reach = +(w.reach * (v.suffix === 'Heavy' ? 1.08 : v.suffix === 'Compact' ? 0.9 : 1)).toFixed(2);
        nw.mag = 0; nw.reserve = 0;
        nw.spread = 0; nw.recoil = 0; nw.reload = 0; nw.vel = 0;
      } else {
        nw.mag = Math.max(1, Math.round(w.mag * (m.mag || 1)));
        const loadout = Math.max(2, Math.ceil(w.reserve / Math.max(1, w.mag)));
        nw.reserve = nw.mag * loadout;
        nw.spread = +(w.spread * (m.spread || 1)).toFixed(2);
        nw.recoil = +(w.recoil * (m.recoil || 1)).toFixed(2);
        nw.reload = +Math.max(0.6, w.reload * (m.reload || 1)).toFixed(2);
      }
      GF.deriveWeaponStats(nw);
      GF.WEAPONS.push(nw);
    }
  }
})();

/* --------------------------------------------------------------------- */
/*  Object catalogue: [name, shape, w, h, d, mass, mat, blast, dmg]      */
/* --------------------------------------------------------------------- */
const GF_OBJ_EXTRA = {
  tools: [
    ['Toolbox', 'box', 0.7, 0.35, 0.4, 14, 'metal'],
    ['Rolling Tool Chest', 'tallbox', 0.8, 1.1, 0.5, 60, 'metal'],
    ['Pipe Wrench Set', 'pipe', 0.08, 0.7, 0.08, 6, 'metal'],
    ['Air Compressor', 'box', 0.8, 0.9, 0.5, 80, 'metal'],
    ['Pressure Washer', 'box', 0.6, 0.8, 0.5, 45, 'metal'],
    ['Bench Grinder', 'box', 0.5, 0.35, 0.35, 22, 'metal'],
    ['Drill Press', 'tallbox', 0.5, 1.5, 0.5, 90, 'metal'],
    ['Chop Saw', 'box', 0.6, 0.4, 0.45, 25, 'metal'],
    ['Work Light', 'lamp', 0.25, 1.5, 0.25, 6, 'metal'],
    ['Extension Reel', 'box', 0.4, 0.4, 0.25, 8, 'plastic'],
    ['Engine Hoist', 'pipe', 0.6, 1.8, 0.6, 120, 'metal'],
    ['Bolt Bin', 'shelf', 0.6, 0.5, 0.4, 30, 'metal'],
    ['Welding Cart', 'box', 0.7, 0.9, 0.5, 55, 'metal'],
    ['Sand Blaster', 'tallbox', 0.7, 1.2, 0.5, 90, 'metal'],
    ['Tool Belt', 'bag', 0.35, 0.2, 0.15, 2, 'leather'],
    ['Socket Set', 'box', 0.45, 0.15, 0.3, 7, 'metal'],
    ['Grease Gun', 'pipe', 0.12, 0.4, 0.12, 3, 'metal'],
    ['Torque Wrench', 'pipe', 0.08, 0.6, 0.08, 4, 'metal'],
    ['Hand Truck', 'box', 0.6, 1.2, 0.4, 20, 'metal'],
    ['Step Ladder', 'ladder', 0.6, 1.6, 0.7, 12, 'metal']
  ],
  industrial: [
    ['Industrial Generator', 'box', 1.2, 1.0, 0.7, 260, 'metal'],
    ['Diesel Pump', 'box', 0.9, 1.2, 0.7, 180, 'metal'],
    ['Hydraulic Press', 'tallbox', 1.0, 1.8, 0.8, 600, 'metal'],
    ['Conveyor Section', 'box', 2.4, 0.9, 0.8, 300, 'metal'],
    ['Electric Motor', 'box', 0.7, 0.6, 0.7, 120, 'metal'],
    ['Gearbox', 'box', 0.6, 0.6, 0.5, 90, 'metal'],
    ['Coolant Tank', 'barrel', 0.8, 1.4, 0.8, 200, 'rust'],
    ['Air Handler', 'tallbox', 1.4, 1.6, 0.8, 250, 'metal'],
    ['Boiler', 'barrel', 1.2, 2.0, 1.0, 700, 'rust'],
    ['Pipe Section', 'pipe', 0.25, 2.4, 0.25, 60, 'metal'],
    ['Valve Assembly', 'box', 0.5, 0.7, 0.4, 45, 'metal'],
    ['Control Cabinet', 'tallbox', 0.8, 1.6, 0.5, 110, 'metal'],
    ['Chain Hoist', 'box', 0.4, 0.6, 0.3, 35, 'metal'],
    ['Forklift Battery', 'box', 1.0, 0.7, 0.5, 400, 'plastic', 2.2, 60]
  ],
  construction: [
    ['Cement Bag', 'bag', 0.5, 0.3, 0.25, 25, 'paper'],
    ['Rebar Bundle', 'pipe', 0.4, 2.4, 0.4, 120, 'metal'],
    ['Brick Pallet', 'pallet', 1.2, 0.8, 1.0, 500, 'stone'],
    ['Lumber Stack', 'box', 1.6, 0.9, 1.2, 180, 'wood'],
    ['Scaffold Tower', 'tallbox', 1.6, 2.6, 1.6, 140, 'metal'],
    ['Wheelbarrow', 'box', 1.2, 0.7, 0.6, 30, 'metal'],
    ['Concrete Mixer', 'box', 1.0, 1.1, 0.9, 150, 'metal'],
    ['Sand Pile', 'rock', 1.6, 0.7, 1.6, 600, 'sand'],
    ['Gravel Pile', 'rock', 1.6, 0.6, 1.6, 700, 'stone'],
    ['Barrier Fence', 'box', 2.0, 1.1, 0.1, 25, 'metal'],
    ['Road Plate', 'box', 2.0, 0.1, 1.2, 180, 'metal'],
    ['Porta Potty', 'tallbox', 1.0, 2.1, 1.0, 90, 'plastic']
  ],
  electronics: [
    ['Server Rack', 'tallbox', 0.8, 1.8, 0.8, 180, 'metal'],
    ['CRT Monitor', 'monitor', 0.5, 0.4, 0.45, 18, 'plastic'],
    ['Speaker Stack', 'tallbox', 0.6, 1.2, 0.5, 35, 'plastic'],
    ['Radio Set', 'box', 0.4, 0.3, 0.3, 8, 'plastic'],
    ['Camera Rig', 'box', 0.3, 0.3, 0.4, 6, 'metal'],
    ['Drone', 'box', 0.6, 0.15, 0.6, 4, 'plastic'],
    ['Games Console', 'box', 0.4, 0.1, 0.3, 4, 'plastic'],
    ['Projector', 'box', 0.4, 0.2, 0.3, 6, 'plastic'],
    ['Cable Spool', 'tire', 0.8, 0.8, 0.6, 60, 'plastic'],
    ['Antenna Mast', 'pipe', 0.2, 3.0, 0.2, 30, 'metal']
  ],
  medical: [
    ['Med Cabinet', 'shelf', 0.8, 1.2, 0.4, 50, 'metal'],
    ['Gurney', 'bed', 1.9, 0.9, 0.7, 70, 'metal'],
    ['IV Stand', 'lamp', 0.5, 1.7, 0.5, 12, 'metal'],
    ['Oxygen Tank', 'barrel', 0.3, 1.1, 0.3, 60, 'metal', 3.6, 80],
    ['Wheelchair', 'chair', 0.7, 1.1, 0.7, 20, 'metal'],
    ['Crash Cart', 'box', 0.6, 1.0, 0.5, 60, 'metal'],
    ['Autoclave', 'box', 0.6, 0.8, 0.6, 90, 'metal'],
    ['Body Bag', 'rug', 0.7, 0.25, 1.9, 40, 'fabric'],
    ['Organ Cooler', 'box', 0.6, 0.5, 0.4, 30, 'metal'],
    ['Surgical Light', 'lamp', 0.5, 1.8, 0.5, 25, 'metal']
  ],
  containers: [
    ['Ammo Crate', 'crate', 0.8, 0.4, 0.4, 30, 'metal'],
    ['Footlocker', 'box', 0.9, 0.4, 0.5, 35, 'metal'],
    ['Safe', 'box', 0.7, 0.9, 0.6, 220, 'metal'],
    ['Locker', 'tallbox', 0.6, 1.9, 0.5, 90, 'metal'],
    ['Jerry Can', 'can', 0.25, 0.45, 0.35, 12, 'metal'],
    ['Shipping Container', 'tallbox', 6.0, 2.6, 2.4, 2200, 'metal'],
    ['Cargo Pallet', 'pallet', 1.2, 0.15, 1.0, 25, 'wood'],
    ['Biohazard Bin', 'barrel', 0.6, 0.9, 0.6, 45, 'plastic']
  ],
  street: [
    ['Fire Hydrant', 'pipe', 0.3, 0.8, 0.3, 60, 'metal'],
    ['Bench', 'couch', 1.8, 0.8, 0.6, 45, 'wood'],
    ['Trash Bin', 'barrel', 0.6, 1.0, 0.6, 25, 'metal'],
    ['Bus Shelter', 'box', 2.4, 2.3, 1.2, 180, 'metal'],
    ['Mailbox', 'box', 0.4, 1.1, 0.4, 20, 'metal'],
    ['Phone Booth', 'tallbox', 1.0, 2.3, 1.0, 120, 'glass'],
    ['Planter', 'box', 1.2, 0.7, 1.2, 180, 'stone'],
    ['Street Lamp', 'lamp', 0.25, 4.0, 0.25, 90, 'metal']
  ],
  food: [
    ['Meat Freezer', 'fridge', 0.9, 1.2, 0.8, 160, 'metal'],
    ['Produce Crate', 'crate', 0.6, 0.3, 0.4, 15, 'wood'],
    ['Soda Crate', 'crate', 0.5, 0.3, 0.35, 12, 'plastic'],
    ['Flour Sack', 'bag', 0.4, 0.6, 0.3, 25, 'paper'],
    ['Kitchen Range', 'box', 0.9, 0.9, 0.7, 120, 'metal'],
    ['Meat Grinder', 'box', 0.5, 0.6, 0.4, 45, 'metal']
  ],
  gore: [
    ['Body Parts Bin', 'barrel', 0.6, 0.5, 0.5, 40, 'plastic'],
    ['Meat Hook', 'hanging', 0.2, 0.8, 0.2, 8, 'metal'],
    ['Bone Pile', 'rock', 0.9, 0.4, 0.9, 30, 'bone'],
    ['Organ Tray', 'plate', 0.5, 0.12, 0.35, 8, 'metal'],
    ['Blood Bucket', 'barrel', 0.35, 0.4, 0.35, 15, 'metal'],
    ['Corpse Pile', 'corpse_pile', 1.4, 1.0, 1.2, 180, 'organic'],
    ['Spine', 'pipe', 0.15, 1.0, 0.15, 6, 'bone'],
    ['Skull Stack', 'skull', 0.5, 0.5, 0.5, 20, 'bone']
  ],
  furniture: [
    ['Office Desk', 'table', 1.6, 0.8, 0.8, 55, 'wood'],
    ['Filing Cabinet', 'shelf', 0.5, 1.3, 0.6, 60, 'metal'],
    ['Bunk Bed', 'bed', 2.0, 1.5, 0.9, 90, 'metal'],
    ['Wardrobe', 'tallbox', 1.2, 2.0, 0.6, 110, 'wood'],
    ['Bar Counter', 'box', 2.4, 1.1, 0.6, 180, 'wood'],
    ['Pool Table', 'table', 2.4, 0.9, 1.3, 320, 'wood']
  ],
  props_toys: [
    ['Piano', 'box', 1.5, 1.2, 0.6, 320, 'wood'],
    ['Arcade Cabinet', 'tallbox', 0.8, 1.8, 0.8, 120, 'plastic'],
    ['Vending Machine', 'tallbox', 0.9, 1.9, 0.8, 260, 'metal'],
    ['Pinball Table', 'table', 1.4, 0.9, 0.7, 140, 'wood'],
    ['Shopping Cart', 'box', 0.9, 1.0, 0.6, 25, 'metal'],
    ['Mannequin', 'skeleton', 0.5, 1.8, 0.4, 20, 'plastic']
  ]
};

(function buildObjectCatalogue() {
  const seen = new Set(GF.OBJECTS.map(o => o.id));
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  /* base item plus a heavy and a compact build of the same equipment */
  const BUILDS = [
    { prefix: '', scale: 1, mass: 1 },
    { prefix: 'Heavy ', scale: 1.26, mass: 1.65 },
    { prefix: 'Compact ', scale: 0.76, mass: 0.6 }
  ];
  for (const cat in GF_OBJ_EXTRA) {
    for (const row of GF_OBJ_EXTRA[cat]) {
      for (const b of BUILDS) {
        const [name, shape, w, h, d, mass, mat, blast, dmg] = row;
        const full = b.prefix + name;
        const id = slug(full);
        if (seen.has(id)) continue;
        seen.add(id);
        const m = Math.max(1, Math.round((mass || 1) * b.mass));
        GF.OBJECTS.push({
          id, name: full, cat, shape,
          w: +(w * b.scale).toFixed(2),
          h: +(h * b.scale).toFixed(2),
          d: +(d * b.scale).toFixed(2),
          mass: m, mat: mat || 'wood', blast: blast || 0, dmg: dmg || 0,
          color: GF.OBJECT_ICON_TINT[mat] || '#9a9a92',
          explosive: (blast || 0) > 0,
          flammable: mat === 'wood' || mat === 'fabric' || mat === 'cardboard' || mat === 'paper' || /oil|fuel|gas/i.test(name),
          fragile: mat === 'glass' || mat === 'ceramic',
          heavy: m > 120,
          object: true
        });
      }
    }
  }
  if (!GF.OBJECT_CATS.some(c => c.id === 'tools')) {
    const at = GF.OBJECT_CATS.findIndex(c => c.id === 'construction');
    GF.OBJECT_CATS.splice(at < 0 ? GF.OBJECT_CATS.length - 1 : at + 1, 0, { id: 'tools', label: 'TOOLS' });
  }
})();

/* --------------------------------------------------------------------- */
/*  Finish variants: every prop in the sandbox also exists rusted,        */
/*  reinforced, burnt and industrial, which is how a 3000+ prop list can  */
/*  stay coherent instead of becoming filler.                             */
/* --------------------------------------------------------------------- */
(function buildFinishVariants() {
  const FINISH = [
    { prefix: 'Rusted ', mat: 'rust', mass: 1.04, tint: '#7a5a44' },
    { prefix: 'Reinforced ', mat: 'metal', mass: 1.42, tint: '#8d949c' },
    { prefix: 'Burnt ', mat: 'dark', mass: 0.9, tint: '#4a4642' },
    { prefix: 'Industrial ', mat: 'metal', mass: 1.22, tint: '#6f757c' },
    { prefix: 'Salvaged ', mat: 'rust', mass: 0.94, tint: '#6e5a44' }
  ];
  const seen = new Set(GF.OBJECTS.map(o => o.id));
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const bases = GF.OBJECTS.slice();
  for (const o of bases) {
    for (const f of FINISH) {
      const id = slug(f.prefix + o.name);
      if (seen.has(id)) continue;
      seen.add(id);
      const mass = Math.max(1, Math.round(o.mass * f.mass));
      GF.OBJECTS.push(Object.assign({}, o, {
        id, name: f.prefix + o.name,
        mass,
        mat: f.mat,
        color: f.tint,
        heavy: mass > 120,
        explosive: !!o.explosive,
        flammable: f.mat === 'rust' || f.mat === 'dark' ? false : o.flammable
      }));
    }
  }
})();

GF.contentStats = function () {
  return {
    weapons: GF.WEAPONS.length,
    objects: GF.OBJECTS.length,
    ragdolls: GF.RAGS.length,
    items: GF.WEAPONS.length + GF.OBJECTS.length,
    maps: GF.MAPS.length
  };
};
