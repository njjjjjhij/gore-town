/* =====================================================================
   GORE TOWN — object catalogue compiler + ragdoll archetypes
   ===================================================================== */

GF.OBJECT_ICON_TINT = {
  wood: '#8a6a44', metal: '#8d949c', stone: '#8b8b86', glass: '#9fc7cf',
  plastic: '#b7b9b2', fabric: '#8e8577', cardboard: '#b08a5a', paper: '#cfc9b5',
  organic: '#a4494a', bone: '#d8d2bf', leather: '#6d4b35', ceramic: '#cfcac0'
};

GF.parseObjects = function () {
  const out = [];
  const groups = {};
  Object.assign(groups, GF_OBJ_SRC, GF_OBJ_SRC_B);
  for (const cat in groups) {
    for (const row of groups[cat]) {
      const [name, shape, w, h, d, mass, mat, blast, dmg] = row;
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      out.push({
        id, name, cat, shape, w, h, d, mass: mass || 1, mat: mat || 'wood',
        blast: blast || 0, dmg: dmg || 0,
        color: GF.OBJECT_ICON_TINT[mat] || '#9a9a92',
        explosive: (blast || 0) > 0,
        flammable: mat === 'wood' || mat === 'fabric' || mat === 'cardboard' || mat === 'paper' || /oil|fuel|gas/i.test(name),
        fragile: mat === 'glass' || mat === 'ceramic',
        heavy: (mass || 0) > 120,
        object: true
      });
    }
  }
  return out;
};
GF.OBJECTS = GF.parseObjects();
GF.objectById = (id) => GF.OBJECTS.find(o => o.id === id) || null;
GF.OBJECT_CATS = [
  { id: 'all', label: 'ALL' },
  { id: 'explosives', label: 'EXPLOSIVES' },
  { id: 'weapons', label: 'WEAPONS' },
  { id: 'furniture', label: 'FURNITURE' },
  { id: 'containers', label: 'CONTAINERS' },
  { id: 'vehicles', label: 'VEHICLES' },
  { id: 'industrial', label: 'INDUSTRIAL' },
  { id: 'construction', label: 'CONSTRUCTION' },
  { id: 'electronics', label: 'ELECTRONICS' },
  { id: 'medical', label: 'MEDICAL' },
  { id: 'street', label: 'STREET' },
  { id: 'barricades', label: 'BARRICADES' },
  { id: 'nature', label: 'NATURE' },
  { id: 'gore', label: 'GORE' },
  { id: 'food', label: 'FOOD' },
  { id: 'props_toys', label: 'PROPS' },
  { id: 'ragdolls', label: 'RAGDOLLS' }
];

/* --------------------------------------------------------------------- */
/*  Ragdoll archetypes: name, faction, behaviour, hp, speed, weapon,      */
/*  skin, shirt, pants, gear, scale, armour, voicePitch, note              */
/* --------------------------------------------------------------------- */
const GF_RAG_SRC = [
  ['Soldier', 'military', 'soldier', 120, 1.00, 'm4a1', '#caa17c', '#4b5741', '#3a4034', '#2a2c26', 1.00, 0.10, 0.95, 'Standard infantryman'],
  ['Heavy Soldier', 'military', 'soldier', 220, 0.82, 'm249-saw', '#c39a76', '#3f4a38', '#33382d', '#20221c', 1.08, 0.35, 0.80, 'Armoured support gunner'],
  ['Elite Operative', 'military', 'elite', 150, 1.10, 'hk416-a5', '#c9a37f', '#33383c', '#2a2e31', '#15181a', 1.00, 0.25, 0.90, 'Special forces operator'],
  ['Marksman', 'military', 'sniper', 110, 0.95, 'svd-dragunov', '#c8a07b', '#55583f', '#3d4032', '#26281f', 1.00, 0.15, 0.88, 'Designated marksman'],
  ['Scout', 'military', 'soldier', 95, 1.22, 'mp5a5', '#c7a17d', '#48513c', '#363b30', '#22251e', 0.97, 0.05, 1.15, 'Fast flanking scout'],
  ['Combat Medic', 'military', 'medic', 110, 1.02, 'm4a1', '#cda884', '#5a6250', '#3a3f33', '#2e3229', 1.00, 0.08, 1.05, 'Heals nearby allies'],
  ['Engineer', 'military', 'soldier', 115, 0.98, 'm4a1', '#c49c78', '#4c5143', '#353a30', '#2b2e26', 1.00, 0.12, 0.92, 'Deploys charges'],
  ['Officer', 'military', 'soldier', 120, 0.95, 'm9-beretta', '#d0a983', '#3c4a3e', '#2c332b', '#8a7a3a', 1.00, 0.10, 0.85, 'Rallies his squad'],
  ['Riot Trooper', 'police', 'soldier', 190, 0.88, 'remington-870', '#c09a76', '#2f3438', '#26292c', '#1b1e20', 1.05, 0.45, 0.82, 'Shield and buckshot'],
  ['SWAT Operative', 'police', 'elite', 160, 1.04, 'mp5a5', '#c6a07c', '#2b3034', '#22262a', '#15181b', 1.00, 0.30, 0.88, 'Urban tactical unit'],
  ['Police Officer', 'police', 'guard', 100, 1.02, 'm9-beretta', '#cba47f', '#2b3c5e', '#25304a', '#1d2438', 1.00, 0.15, 1.00, 'Patrol officer'],
  ['Security Guard', 'none', 'guard', 95, 1.00, 'glock-17', '#c7a07b', '#4a4a4a', '#2f3134', '#232526', 1.00, 0.10, 1.02, 'Private security'],
  ['Conscript', 'rebel', 'soldier', 85, 1.02, 'akm', '#c39a75', '#5d5540', '#3c3929', '#2a281f', 0.98, 0.02, 1.05, 'Untrained but armed'],
  ['Militia Fighter', 'rebel', 'soldier', 100, 1.04, 'ak-47', '#bd9470', '#4a4234', '#33302a', '#232019', 1.00, 0.05, 1.00, 'Irregular fighter'],
  ['Rebel Fighter', 'rebel', 'soldier', 105, 1.06, 'ak-74', '#c09973', '#474b38', '#31342a', '#23251d', 1.00, 0.06, 1.02, 'Insurgent rifleman'],
  ['Guerilla', 'rebel', 'hunter', 95, 1.10, 'sks', '#b78e6a', '#3f4536', '#2c3026', '#1f221a', 0.99, 0.04, 1.08, 'Ambush specialist'],
  ['Insurgent', 'rebel', 'aggressive', 105, 1.12, 'ak-47', '#bb926d', '#4b4433', '#33302b', '#25211a', 1.00, 0.05, 1.10, 'Charges without fear'],
  ['Rebel Sniper', 'rebel', 'sniper', 90, 0.94, 'mosin-nagant', '#bc936e', '#4b4f3b', '#33352a', '#22241d', 1.00, 0.03, 0.95, 'Rooftop marksman'],
  ['Cultist', 'cult', 'aggressive', 100, 1.08, 'machete', '#c9a07a', '#5a2a2a', '#3a1c1c', '#2a1212', 1.00, 0.05, 0.85, 'Robe-wearing fanatic'],
  ['Cult Zealot', 'cult', 'berserk', 130, 1.14, 'fire-axe', '#c8a077', '#6b2f24', '#40201a', '#2c1410', 1.02, 0.10, 0.78, 'Frenzied melee attacker'],
  ['Cult Leader', 'cult', 'elite', 150, 1.00, 'desert-eagle-50', '#d2ac86', '#7a3a2c', '#4a241c', '#c9a227', 1.04, 0.20, 0.72, 'Commands the flock'],
  ['Maniac', 'maniac', 'maniac', 140, 1.18, 'chainsaw', '#c9a27d', '#4a4038', '#2e2824', '#3a1c1c', 1.02, 0.05, 0.75, 'Chainsaw-wielding lunatic'],
  ['Butcher', 'maniac', 'maniac', 150, 1.10, 'butcher-cleaver', '#d4b090', '#6a625a', '#3a3530', '#7a2222', 1.06, 0.08, 0.70, 'Blood-soaked apron'],
  ['Cannibal', 'maniac', 'aggressive', 120, 1.12, 'combat-knife', '#b08a68', '#5c4c3c', '#3a3028', '#6b1f1f', 1.00, 0.03, 0.82, 'Hunts for meat'],
  ['Psycho', 'maniac', 'berserk', 130, 1.20, 'baseball-bat', '#c39c77', '#5a5148', '#38322c', '#2a201a', 1.02, 0.08, 0.72, 'Unpredictable attacker'],
  ['Brute', 'maniac', 'berserk', 340, 0.90, 'sledgehammer', '#b78c68', '#4a3a30', '#332a24', '#201814', 1.18, 0.30, 0.62, 'Massive and relentless'],
  ['Thug', 'civ', 'aggressive', 100, 1.06, 'crowbar', '#c59b76', '#3d4250', '#2e333d', '#22252c', 1.00, 0.02, 1.00, 'Street muscle'],
  ['Gangster', 'civ', 'soldier', 105, 1.04, 'tec-9', '#bd9370', '#2c2c34', '#232329', '#14141a', 1.00, 0.05, 0.98, 'Drive-by shooter'],
  ['Hitman', 'none', 'elite', 120, 1.06, 'mp5sd', '#c7a17c', '#2b2b2b', '#1f1f1f', '#3a3a3a', 1.00, 0.15, 0.90, 'Silent professional'],
  ['Bodyguard', 'none', 'guard', 140, 1.02, 'desert-eagle-44', '#c39b77', '#26262a', '#1d1d21', '#4a4a4a', 1.05, 0.25, 0.88, 'Protects his client'],
  ['Civilian Male', 'civ', 'civilian', 70, 1.00, 'fists', '#d3ac86', '#7a7468', '#4a4e58', '#55524c', 1.00, 0.00, 1.10, 'Panics and flees'],
  ['Civilian Female', 'civ', 'civilian', 65, 1.02, 'fists', '#ddb590', '#8a6a70', '#3c4250', '#6b5a56', 0.95, 0.00, 1.25, 'Panics and flees'],
  ['Tourist', 'civ', 'civilian', 65, 0.98, 'fists', '#d9b28c', '#a8623a', '#4a5a6a', '#8a3a3a', 1.00, 0.00, 1.18, 'Wrong place, wrong time'],
  ['Worker', 'civ', 'civilian', 85, 0.96, 'shovel-tool', '#c79d78', '#c9a227', '#3a4a6a', '#8a6a2a', 1.00, 0.02, 1.05, 'Hard hat and shovel'],
  ['Scientist', 'civ', 'civilian', 70, 0.98, 'fists', '#d4ae88', '#e0e0dc', '#5a5a60', '#3a6a8a', 1.00, 0.00, 1.12, 'Lab coat target'],
  ['Doctor', 'civ', 'civilian', 70, 0.99, 'fists', '#d8b48e', '#e8e8e4', '#4a6472', '#7a9aa8', 1.00, 0.00, 1.10, 'Tries to help the wounded'],
  ['Farmer', 'civ', 'civilian', 90, 0.92, 'pitchfork', '#c08f68', '#6a6a52', '#3a3a2a', '#8a7a4a', 1.00, 0.02, 1.02, 'Armed with farm tools'],
  ['Hunter', 'civ', 'hunter', 95, 1.00, 'remington-700', '#c59a74', '#5a5240', '#3a3a2e', '#4a3a2a', 1.00, 0.03, 1.00, 'Patient rifle hunter'],
  ['Survivor', 'civ', 'soldier', 120, 1.02, 'mossberg-500', '#c8a17c', '#4a5240', '#343a2e', '#2a2e24', 1.00, 0.15, 0.98, 'Prepared for the worst'],
  ['Zombie', 'zombie', 'zombie', 90, 0.72, 'fists', '#8a9a7a', '#4a5a48', '#333a30', '#2a3028', 1.00, 0.00, 0.55, 'Slow but unstoppable'],
  ['Runner Zombie', 'zombie', 'zombie', 70, 1.24, 'fists', '#94a47e', '#5a4a42', '#3a322c', '#2a241e', 0.98, 0.00, 0.60, 'Sprints at prey'],
  ['Bloater', 'zombie', 'zombie', 260, 0.62, 'fists', '#7a8a6a', '#5a5a4a', '#3a3a30', '#4a4a3a', 1.25, 0.10, 0.45, 'Explodes on death'],
  ['Armored Zombie', 'zombie', 'zombie', 300, 0.70, 'fists', '#7f8f70', '#3a4038', '#2a302a', '#5a5a52', 1.06, 0.40, 0.52, 'Riot gear host'],
  ['Soldier Zombie', 'zombie', 'zombie', 130, 0.78, 'm4a1', '#8a9a7a', '#3f4a38', '#33382d', '#20221c', 1.00, 0.10, 0.58, 'Remembers how to shoot'],
  ['Skeleton Warrior', 'zombie', 'aggressive', 80, 1.00, 'katana', '#e0dccb', '#d8d2c0', '#cfc8b4', '#8a8474', 1.02, 0.00, 0.70, 'Bone and blade'],
  ['Cyborg', 'robot', 'elite', 200, 1.08, 'hk417', '#8a9096', '#4a5056', '#33383c', '#c93a3a', 1.04, 0.40, 0.66, 'Enhanced human hybrid'],
  ['Android', 'robot', 'soldier', 170, 1.12, 'vector-45', '#a0a6ac', '#3a4046', '#2a2e32', '#3ac9a0', 1.00, 0.35, 0.70, 'Synthetic infantry unit'],
  ['Test Dummy', 'none', 'passive', 500, 0.00, 'fists', '#d8c38a', '#c9b06a', '#b8a05a', '#8a7440', 1.00, 0.60, 1.00, 'Ballistic gel dummy'],
  ['Clown', 'civ', 'maniac', 120, 1.14, 'bat-with-nails', '#e8e0d4', '#c93a3a', '#3a3a8a', '#e0b020', 1.04, 0.05, 1.30, 'Something is wrong with him'],
  ['Prisoner', 'civ', 'aggressive', 100, 1.02, 'crowbar', '#c09772', '#d8d0b0', '#6a6a5a', '#8a8a7a', 1.00, 0.02, 1.00, 'Escaped convict'],
  ['Firebug', 'maniac', 'maniac', 130, 1.06, 'flamethrower', '#bd8f68', '#6a3520', '#3a2418', '#c94a20', 1.02, 0.15, 0.78, 'Burns everything'],
  ['Bomber', 'rebel', 'bomber', 110, 1.10, 'fists', '#b78f6a', '#4a4234', '#33302a', '#8a2a2a', 1.00, 0.05, 0.95, 'Detonates himself'],
  ['Juggernaut', 'military', 'berserk', 520, 0.86, 'minigun-m134', '#a8896a', '#3a4238', '#2c302a', '#1a1c18', 1.28, 0.55, 0.55, 'Walking fortress'],
  ['Shotgunner', 'military', 'soldier', 150, 0.96, 'spas-12', '#c49b76', '#4a4c3a', '#34362a', '#22241c', 1.02, 0.25, 0.90, 'Breaching specialist'],
  ['Grenadier', 'military', 'soldier', 120, 0.98, 'm320', '#c69d78', '#4c5143', '#353a30', '#2b2e26', 1.00, 0.12, 0.92, 'Lobs 40mm shells'],
  ['Sniper Elite', 'military', 'sniper', 110, 0.98, 'awp', '#c59c77', '#3a4038', '#2a2e28', '#191c19', 1.00, 0.10, 0.88, 'One shot, one kill']
];

GF.parseRagTypes = function () {
  return GF_RAG_SRC.map(r => {
    const [name, faction, behavior, hp, speed, weapon, skin, shirt, pants, gear, scale, armor, voicePitch, note] = r;
    return {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name, faction, behavior, hp, speed, weapon, note,
      colors: { skin, shirt, pants, gear },
      scale: scale || 1, armor: armor || 0, voicePitch: voicePitch || 1,
      aggressive: behavior !== 'civilian' && behavior !== 'passive',
      ranged: !['fists', 'machete', 'fire-axe', 'chainsaw', 'butcher-cleaver', 'combat-knife', 'baseball-bat', 'sledgehammer', 'crowbar', 'shovel-tool', 'pitchfork', 'bat-with-nails', 'katana', 'fists'].includes(weapon)
    };
  });
};
GF.RAGS = GF.parseRagTypes();
GF.ragById = (id) => GF.RAGS.find(r => r.id === id) || GF.RAGS[0];
GF.RAG_FACTIONS = {
  military: { label: 'Military', color: '#6b7d54' },
  police: { label: 'Police', color: '#3f5c8a' },
  rebel: { label: 'Rebels', color: '#8a6a3a' },
  cult: { label: 'Cult', color: '#8a2a2a' },
  maniac: { label: 'Maniacs', color: '#a04a2a' },
  zombie: { label: 'Undead', color: '#5a7a4a' },
  robot: { label: 'Synthetic', color: '#6a7a86' },
  civ: { label: 'Civilians', color: '#8a8a7a' },
  none: { label: 'Neutral', color: '#7a7a7a' }
};
/* Faction relation: returns true when a will attack b (player is handled separately). */
GF.factionsHostile = function (a, b) {
  if (a === b) return false;
  if (a === 'none' || b === 'none') return false;
  if (a === 'zombie' || b === 'zombie') return true;
  if (a === 'maniac' || b === 'maniac') return true;
  if (a === 'cult') return b !== 'zombie';
  if (a === 'military') return b === 'rebel' || b === 'cult' || b === 'robot';
  if (a === 'police') return b === 'rebel' || b === 'maniac';
  if (a === 'rebel') return b === 'military' || b === 'police' || b === 'robot';
  if (a === 'robot') return true;
  if (a === 'civ') return false;
  return false;
};

GF.contentStats = function () {
  return { weapons: GF.WEAPONS.length, objects: GF.OBJECTS.length, ragdolls: GF.RAGS.length };
};
