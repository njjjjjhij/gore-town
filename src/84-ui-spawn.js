/* =====================================================================
   GORE TOWN — spawn menu + live 3D item icon renderer
   Every gun and object thumbnail is rendered from its actual game model.
   ===================================================================== */

GF.Icons = {
  renderer: null,
  scene: null,
  camera: null,
  cache: new Map(),
  queue: [],
  maxPerFrame: 5,

  init() {
    if (this.renderer) return;
    try {
      this.renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(128, 128, false);
      this.renderer.outputColorSpace = SRGBColorSpace;
      this.renderer.toneMapping = ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.85;
      this.scene = new Scene();
      this.camera = new PerspectiveCamera(34, 1, 0.1, 40);
      this.camera.position.set(1.18, 0.74, 1.58);
      this.camera.lookAt(0, 0, 0);
      const amb = new AmbientLight(0xffffff, 0.95);
      this.scene.add(amb);
      const key = new DirectionalLight(0xfff4e6, 1.85);
      key.position.set(2, 3, 2);
      this.scene.add(key);
      const rim = new DirectionalLight(0xc8d4e2, 0.5);
      rim.position.set(-2, 1, -2);
      this.scene.add(rim);
      const fill = new DirectionalLight(0xffffff, 0.35);
      fill.position.set(-1, 3, 3);
      this.scene.add(fill);
      const env = GF.envMap(this.renderer);
      if (env) this.scene.environment = env;
    } catch (e) { this.renderer = null; }
  },

  keyOf(kind, item) { return kind + ':' + item.id; },

  get(kind, item) {
    const k = this.keyOf(kind, item);
    if (this.cache.has(k)) return this.cache.get(k);
    return null;
  },

  request(kind, item, cb) {
    const k = this.keyOf(kind, item);
    if (this.cache.has(k)) { if (cb) cb(this.cache.get(k)); return; }
    const queued = this.queue.find(q => q.k === k);
    if (queued) { if (cb) queued.cbs.push(cb); return; }
    this.queue.push({ k, kind, item, cbs: cb ? [cb] : [] });
  },

  tick() {
    if (!this.renderer || !this.queue.length) return;
    const batch = Math.min(this.maxPerFrame, this.queue.length);
    for (let i = 0; i < batch; i++) {
      const job = this.queue.shift();
      if (!job) break;
      const url = this.render(kindFix(job.kind), job.item);
      if (url) this.cache.set(job.k, url);
      for (let c = 0; c < job.cbs.length; c++) job.cbs[c](url);
    }
  },

  render(kind, item) {
    if (kind === 'ragdoll') return this.renderRagdollIcon(item);
    let obj = null;
    try {
      if (kind === 'weapon') obj = GF.buildGunModel(item);
      else obj = GF.buildProp(item);
      const box = new Box3().setFromObject(obj);
      const size = box.getSize(new Vector3());
      const center = box.getCenter(new Vector3());
      const maxD = Math.max(size.x, size.y, size.z) || 1;
      const s = (kind === 'weapon' ? 1.05 : 1.15) / maxD;
      obj.position.sub(center);
      const wrap = new Group();
      wrap.add(obj);
      wrap.scale.setScalar(s);
      wrap.rotation.y = kind === 'weapon' ? -1.05 : -0.45;
      wrap.rotation.x = kind === 'weapon' ? 0.22 : 0.12;
      this.scene.add(wrap);
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);
      const url = this.renderer.domElement.toDataURL('image/png');
      this.scene.remove(wrap);
      obj.traverse(o => { if (o.isMesh) { if (o.geometry && !GF.sharedGeo.has(o.geometry)) o.geometry.dispose(); } });
      return url;
    } catch (e) { return null; }
  },

  renderRagdollIcon(item) {
    const c = GF.mkCanvas(128, 128);
    const g = c.getContext('2d');
    const col = (GF.RAG_FACTIONS[item.faction] || { color: '#888' }).color;
    g.clearRect(0, 0, 128, 128);
    g.translate(64, 74);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath(); g.ellipse(0, 46, 30, 8, 0, 0, 7); g.fill();
    const skin = item.colors.skin, shirt = item.colors.shirt, pants = item.colors.pants, gear = item.colors.gear;
    g.strokeStyle = pants; g.lineWidth = 11; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-7, 6); g.lineTo(-10, 38); g.moveTo(7, 6); g.lineTo(10, 38); g.stroke();
    g.strokeStyle = gear; g.lineWidth = 12;
    g.beginPath(); g.moveTo(-10, 38); g.lineTo(-11, 44); g.moveTo(10, 38); g.lineTo(11, 44); g.stroke();
    g.fillStyle = shirt;
    g.beginPath(); g.roundRect ? g.roundRect(-16, -24, 32, 34, 6) : g.rect(-16, -24, 32, 34); g.fill();
    g.strokeStyle = shirt; g.lineWidth = 9;
    g.beginPath(); g.moveTo(-16, -18); g.lineTo(-25, 4); g.moveTo(16, -18); g.lineTo(25, 4); g.stroke();
    g.strokeStyle = skin; g.lineWidth = 8;
    g.beginPath(); g.moveTo(-25, 4); g.lineTo(-26, 14); g.moveTo(25, 4); g.lineTo(26, 14); g.stroke();
    g.fillStyle = skin;
    g.beginPath(); g.arc(0, -36, 11, 0, 7); g.fill();
    if (item.faction === 'military' || item.faction === 'police' || item.faction === 'robot' || item.faction === 'rebel') {
      g.fillStyle = gear;
      g.beginPath(); g.arc(0, -38, 11.5, Math.PI, Math.PI * 2); g.fill();
      g.fillRect(-11.5, -39, 23, 3);
    }
    if (item.faction === 'zombie' || item.faction === 'maniac' || item.faction === 'cult') {
      g.fillStyle = item.faction === 'zombie' ? 'rgba(140,30,30,0.85)' : 'rgba(160,20,20,0.9)';
      g.beginPath(); g.arc(4, -32, 3, 0, 7); g.fill();
      g.fillRect(-6, -32, 8, 2);
    }
    g.fillStyle = col;
    g.beginPath(); g.arc(48, 40, 7, 0, 7); g.fill();
    return c.toDataURL('image/png');
  }
};

function kindFix(k) { return k === 'ragdoll' ? 'ragdoll' : k; }

GF.UI.spawnTab = 'weapons';
GF.UI.spawnCat = 'all';
GF.UI.spawnSearch = '';
GF.UI.spawnGroup = 'all';
GF.UI.spawnRail = 'weapons';
GF.UI.spawnLevel = false;
GF.UI.spawnPick = null;

GF.UI.openSpawnMenu = function () {
  const m = GF.$('#spawn-menu');
  if (!m || !GF.Player.alive) return;
  GF.state = 'spawnmenu';
  m.classList.add('on');
  GF.Input.unlock();
  GF.Icons.init();
  this.bindLevelPanel();
  this.renderSpawnMenu();
};

GF.UI.closeSpawnMenu = function () {
  const m = GF.$('#spawn-menu');
  if (m) m.classList.remove('on');
  if (GF.state === 'spawnmenu') {
    GF.state = 'play';
    GF.Input.lock();
  }
};

GF.UI.toggleSpawnMenu = function () {
  if (GF.state === 'spawnmenu') this.closeSpawnMenu();
  else if (GF.state === 'play' && GF.Player.alive) this.openSpawnMenu();
};

GF.UI.RAIL = [
  { id: 'weapons', label: 'Weapons', icon: 'gun', tab: 'weapons' },
  { id: 'props', label: 'Props', icon: 'box', tab: 'objects', group: 'props' },
  { id: 'vehicles', label: 'Vehicles', icon: 'car', tab: 'objects', group: 'vehicles' },
  { id: 'ragdolls', label: 'NPCs / AI', icon: 'body', tab: 'ragdolls' },
  { id: 'gore', label: 'Gore', icon: 'drop', tab: 'objects', group: 'gore' },
  { id: 'tools', label: 'Tools', icon: 'wrench', tab: 'objects', group: 'tools' },
  { id: 'level', label: 'Level Settings', icon: 'gear' }
];

GF.UI.railIcon = function (name) {
  const d = {
    gun: '<path d="M2 9h11l2-2h5v3h-2l-1 2h-3l-2 5H9l1-5H5L3 15H1z"/>',
    box: '<path d="M3 6h18v12H3zM7 10h6v2H7zm0 4h9v2H7z"/>',
    car: '<path d="M3 15h18M5 15l2-6h10l2 6M7 15v3M17 15v3"/>',
    body: '<path d="M12 3a3 3 0 110 6 3 3 0 010-6zM8 10h8l2 5v3h-2v5h-2v-5h-4v5H8v-5H6v-3z"/>',
    drop: '<path d="M12 3s6 7 6 11a6 6 0 11-12 0c0-4 6-11 6-11z"/>',
    wrench: '<path d="M14 6a4 4 0 105 5l-9 9-4 1 1-4 9-9a4 4 0 01-2-2z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'
  };
  return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6">' + (d[name] || d.box) + '</svg>';
};

GF.UI.buildRail = function () {
  const rail = GF.$('#spawn-rail');
  if (!rail || rail.dataset.built) return;
  rail.dataset.built = '1';
  rail.innerHTML = '<div class="rail-head">SANDBOX</div>';
  for (const r of this.RAIL) {
    const b = GF.el('button', 'rail-btn', this.railIcon(r.icon) + '<span>' + r.label + '</span>');
    b.dataset.rail = r.id;
    b.addEventListener('click', () => {
      GFAudio.ui(560);
      this.spawnRail = r.id;
      if (r.id === 'level') { this.spawnLevel = true; this.renderSpawnMenu(); return; }
      this.spawnLevel = false;
      this.spawnTab = r.tab;
      this.spawnGroup = r.group || 'all';
      this.spawnSearch = '';
      const s = GF.$('#spawn-search');
      if (s) s.value = '';
      this.renderSpawnMenu();
    });
    rail.appendChild(b);
  }
  const quick = GF.el('div');
  quick.id = 'spawn-quicklist';
  rail.appendChild(quick);
  const foot = GF.el('div', 'rail-foot', 'TAB &middot; OPEN &middot; ESC &middot; CLOSE<br>CLICK CARD &middot; SPAWN');
  rail.appendChild(foot);
  const closeBtn = GF.$('#spawn-close');
  if (closeBtn) closeBtn.addEventListener('click', () => GF.UI.closeSpawnMenu());
  const search = GF.$('#spawn-search');
  if (search) search.addEventListener('input', () => {
    GF.UI.spawnSearch = search.value.toLowerCase().trim();
    GF.UI.renderGrid();
  });
};

GF.UI.setTab = function (tab) {
  this.spawnTab = tab;
  this.spawnCat = 'all';
  this.spawnGroup = 'all';
  this.spawnSearch = '';
  const s = GF.$('#spawn-search');
  if (s) s.value = '';
  this.renderSpawnMenu();
};

GF.UI.tabList = function () {
  if (this.spawnTab === 'weapons') return [
    { id: 'all', label: 'ALL' }, { id: 'melee', label: 'MELEE' }, { id: 'light', label: 'LIGHT' },
    { id: 'heavy', label: 'HEAVY' }, { id: 'mods', label: 'MODS' }
  ];
  if (this.spawnTab === 'objects') return [
    { id: 'all', label: 'ALL' }, { id: 'props', label: 'PROPS' }, { id: 'vehicles', label: 'VEHICLES' },
    { id: 'explosives', label: 'EXPLOSIVES' }, { id: 'gore', label: 'GORE' }, { id: 'tools', label: 'TOOLS' }
  ];
  return [{ id: 'all', label: 'ALL' }].concat(Object.keys(GF.RAG_FACTIONS).map(k => ({ id: k, label: GF.RAG_FACTIONS[k].label.toUpperCase() })));
};

GF.UI.weaponGroup = function (w) {
  const m = w.model;
  const name = (w.name + ' ' + w.id).toLowerCase();
  if (m === 'melee' || w.melee) return 'melee';
  /* factory custom builds, prototype kits and exotic hardware live in MODS */
  if (/tactical|elite|prototype|custom|match|marksman|sopmod|railgun|energy|plasma|laser|tesla|arc|smart|experimental|future/.test(name)) return 'mods';
  if (m === 'pistol' || m === 'revolver' || m === 'smg') return 'light';
  if (['carbine', 'rifle', 'dmr', 'sniper', 'lmg', 'shotgun', 'launcher', 'heavy', 'blade', 'blunt', 'staff', 'knife'].indexOf(m) >= 0) return 'heavy';
  return 'mods';
};

GF.UI.objectGroup = function (o) {
  if (o.cat === 'vehicles') return 'vehicles';
  if (o.cat === 'explosives') return 'explosives';
  if (o.cat === 'gore') return 'gore';
  if (['industrial', 'construction', 'electronics', 'medical'].indexOf(o.cat) >= 0) return 'tools';
  return 'props';
};

GF.UI.renderSpawnMenu = function () {
  const tabsEl = GF.$('#spawn-tabs');
  const chipsEl = GF.$('#spawn-chips');
  const gridEl = GF.$('#spawn-grid');
  const countEl = GF.$('#spawn-count');
  const preview = GF.$('#spawn-preview');
  const level = GF.$('#spawn-level');
  if (!gridEl) return;
  this.buildRail();
  for (const btn of GF.$$('#spawn-rail .rail-btn')) btn.classList.toggle('on', btn.dataset.rail === (this.spawnLevel ? 'level' : this.spawnRail));

  if (level) level.classList.toggle('hidden', !this.spawnLevel);
  if (gridEl) gridEl.classList.toggle('hidden', this.spawnLevel);
  if (preview) preview.classList.toggle('hidden', this.spawnLevel);
  if (this.spawnLevel) {
    if (countEl) countEl.textContent = 'SANDBOX RULES';
    if (tabsEl) tabsEl.innerHTML = '';
    if (chipsEl) chipsEl.innerHTML = '';
    return;
  }

  if (tabsEl) {
    tabsEl.innerHTML = '';
    for (const t of this.tabList()) {
      const b = GF.el('button', 'tab-btn' + (t.id === this.spawnGroup ? ' on' : ''), t.label);
      b.addEventListener('click', () => {
        this.spawnGroup = t.id;
        this.spawnCat = 'all';
        GFAudio.ui(560);
        this.renderSpawnMenu();
      });
      tabsEl.appendChild(b);
    }
  }
  if (chipsEl) chipsEl.innerHTML = '';
  this.renderGrid();
};

GF.UI.currentItems = function () {
  const q = this.spawnSearch;
  const g = this.spawnGroup;
  let items;
  if (this.spawnTab === 'weapons') {
    items = GF.WEAPONS.filter(w => (g === 'all' || this.weaponGroup(w) === g) &&
      (!q || w.name.toLowerCase().includes(q) || w.caliber.toLowerCase().includes(q) || w.cat.includes(q)));
  } else if (this.spawnTab === 'objects') {
    items = GF.OBJECTS.filter(o => (g === 'all' || this.objectGroup(o) === g) &&
      (!q || o.name.toLowerCase().includes(q) || o.cat.includes(q)));
  } else {
    items = GF.RAGS.filter(r => (g === 'all' || r.faction === g) &&
      (!q || r.name.toLowerCase().includes(q) || r.behavior.includes(q)));
  }
  return items;
};

GF.UI.renderGrid = function () {
  const grid = GF.$('#spawn-grid');
  const count = GF.$('#spawn-count');
  if (!grid) return;
  this.gridItems = this.currentItems();
  this.spawnRendered = 0;
  grid.innerHTML = '';
  if (count) count.textContent = this.gridItems.length + ' ITEMS';
  this.appendSpawnChunk();
  if (this.gridItems.length) this.previewItem(this.kindOfTab(), this.gridItems[0]);
  this.renderQuickList();
};

GF.UI.renderQuickList = function () {
  const host = GF.$('#spawn-quicklist');
  if (!host) return;
  host.innerHTML = '<div class="q-head">QUICK LIST</div>';
  const kind = this.kindOfTab();
  const items = (this.gridItems || []).slice(0, 7);
  for (const item of items) {
    const b = GF.el('button', 'q-item', item.name);
    b.addEventListener('click', () => { GF.UI.previewItem(kind, item); GFAudio.ui(620); });
    host.appendChild(b);
  }
};

GF.UI.bindLevelPanel = function () {
  if (this._levelBound) return;
  this._levelBound = true;
  const hostile = GF.$('#level-hostile');
  if (hostile) {
    const sync = () => {
      hostile.textContent = GF.sandboxHostile ? 'HOSTILE' : 'PASSIVE';
      hostile.classList.toggle('on', !!GF.sandboxHostile);
    };
    sync();
    hostile.addEventListener('click', () => {
      GF.sandboxHostile = !GF.sandboxHostile;
      sync();
      GFAudio.ui(GF.sandboxHostile ? 300 : 640);
      if (GF.Actors) for (const a of GF.Actors.list) a.passive = !GF.sandboxHostile;
    });
  }
  const time = GF.$('#level-time'), timeVal = GF.$('#level-time-val');
  if (time) time.addEventListener('input', () => {
    GF.timeScale = parseFloat(time.value);
    if (timeVal) timeVal.textContent = GF.timeScale.toFixed(1) + 'x';
  });
  const gore = GF.$('#level-gore'), goreVal = GF.$('#level-gore-val');
  if (gore) {
    gore.value = GF.goreLevel;
    if (goreVal) goreVal.textContent = Number(GF.goreLevel).toFixed(1);
    gore.addEventListener('input', () => {
      GF.goreLevel = parseFloat(gore.value);
      if (goreVal) goreVal.textContent = GF.goreLevel.toFixed(1);
    });
  }
  const clear = GF.$('#level-clear');
  if (clear) clear.addEventListener('click', () => {
    let n = 0;
    for (let i = GF.Actors.list.length - 1; i >= 0; i--) {
      const a = GF.Actors.list[i];
      if (a.dead || a.grabbed) { GF.Game.scene.remove(a.rag.group); GF.Actors.list.splice(i, 1); n++; }
    }
    GF.UI.toast(n + ' bodies cleared');
  });
  const crowd = GF.$('#level-crowd');
  if (crowd) crowd.addEventListener('click', () => {
    const V = GF.Player.pos.constructor;
    for (let i = 0; i < 8; i++) {
      const ang = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 4;
      const x = GF.Player.pos.x + Math.cos(ang) * r, z = GF.Player.pos.z + Math.sin(ang) * r;
      const y = GF.World.groundAt(x, z, GF.Player.pos.y + 4);
      const a = GF.Actors.spawn(GF.pick(GF.RAGS), new V(x, y > -1e8 ? y + 0.05 : GF.Player.pos.y, z), { yaw: Math.random() * Math.PI * 2 });
      if (GF.sandbox && !GF.sandboxHostile) a.passive = true;
    }
    GF.UI.toast('8 ragdolls deployed');
  });
  const slow = GF.$('#level-slowmo');
  if (slow) slow.addEventListener('click', () => { if (GF.toggleSlowMo) GF.toggleSlowMo(); });
  const spawnBtn = GF.$('#spawn-preview-btn');
  if (spawnBtn) spawnBtn.addEventListener('click', () => {
    if (!GF.UI.spawnPick) return;
    GFAudio.ui(760);
    GF.Spawn.pick(GF.UI.spawnPick.kind, GF.UI.spawnPick.item);
  });
};

GF.UI.kindOfTab = function () {
  return this.spawnTab === 'weapons' ? 'weapon' : this.spawnTab === 'objects' ? 'prop' : 'ragdoll';
};

GF.UI.previewItem = function (kind, item, request) {
  if (!item) return;
  this.spawnPick = { kind, item };
  const img = GF.$('#spawn-preview-img');
  const name = GF.$('#spawn-preview-name');
  const meta = GF.$('#spawn-preview-meta');
  if (name) name.textContent = item.name;
  if (meta) {
    if (kind === 'weapon') meta.textContent = (item.melee ? 'MELEE' : item.caliber) + ' \u00b7 ' + (item.melee ? item.dmg + ' DMG' : item.mag + ' RDS');
    else if (kind === 'prop') meta.textContent = item.cat.toUpperCase() + (item.explosive ? ' \u00b7 EXPLOSIVE' : '') + ' \u00b7 ' + item.mass + ' KG';
    else meta.textContent = item.faction.toUpperCase() + ' \u00b7 ' + item.behavior.toUpperCase() + ' \u00b7 ' + item.hp + ' HP';
  }
  const specs = GF.$('#spawn-preview-specs');
  if (specs) {
    let rows;
    if (kind === 'weapon') rows = [
      ['DAMAGE', item.dmg], ['RPM', item.rpm || '\u2014'], ['MAGAZINE', item.mag || '\u2014'],
      ['DPS', item.dps || '\u2014'], ['VELOCITY', item.velocity ? item.velocity + ' M/S' : '\u2014'], ['MASS', (item.weight || 0) + ' KG']
    ];
    else if (kind === 'prop') rows = [
      ['CATEGORY', item.cat.toUpperCase()], ['MASS', item.mass + ' KG'], ['HP', item.hp || '\u2014'],
      ['BLAST', item.explosive ? item.blast.toFixed(1) + ' M' : '\u2014']
    ];
    else rows = [
      ['FACTION', item.faction.toUpperCase()], ['BEHAVIOUR', item.behavior.toUpperCase()],
      ['HEALTH', item.hp + ' HP'], ['SCALE', item.scale ? item.scale.toFixed(2) + '\u00d7' : '\u2014']
    ];
    specs.innerHTML = rows.map(r => '<div class="prev-spec"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('');
  }
  if (img) {
    const cached = GF.Icons.get(kind, item);
    if (cached) img.src = cached;
    else {
      img.removeAttribute('src');
      if (request !== false) GF.Icons.request(kind, item, (url) => {
        if (url && GF.UI.spawnPick && GF.UI.spawnPick.item === item) img.src = url;
      });
    }
  }
};

/* 2000+ guns and 3000+ props cannot all be DOM nodes at once: the grid
   streams in 140 cards at a time so the menu opens instantly on a 2-core
   machine and thumbnails are only rendered for cards you scroll to. */
GF.UI.SPAWN_CHUNK = 140;
GF.UI.spawnRendered = 0;

GF.UI.appendSpawnChunk = function () {
  const grid = GF.$('#spawn-grid');
  if (!grid) return;
  const count = GF.$('#spawn-count');
  const items = this.gridItems || [];
  const kind = this.kindOfTab();
  const end = Math.min(items.length, this.spawnRendered + this.SPAWN_CHUNK);
  const frag = document.createDocumentFragment();
  for (let i = this.spawnRendered; i < end; i++) {
    const item = items[i];
    const card = GF.el('button', 'item-card');
    const thumb = GF.el('div', 'item-thumb');
    const img = GF.el('img');
    img.alt = item.name;
    const cached = GF.Icons.get(kind, item);
    if (cached) img.src = cached;
    else {
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#1a080a"/><path d="M12 52h34l8-8h22v10h-12l-5 7H42l-8 14H24l6-14H18l-6 6H8z" fill="#3a1a1c"/></svg>');
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          for (const en of entries) {
            if (en.isIntersecting) {
              io.disconnect();
              GF.Icons.request(kind, item, (url) => { if (url) img.src = url; });
            }
          }
        }, { root: grid, threshold: 0.01 });
        io.observe(card);
      } else {
        GF.Icons.request(kind, item, (url) => { if (url) img.src = url; });
      }
    }
    thumb.appendChild(img);
    card.appendChild(thumb);

    const name = GF.el('div', 'item-name', item.name);
    card.appendChild(name);

    let meta = '';
    if (kind === 'weapon') meta = item.melee ? item.cat.toUpperCase() + ' · ' + item.dmg + ' DMG' : item.caliber + ' · ' + item.mag + ' RDS';
    else if (kind === 'prop') meta = item.cat.toUpperCase() + (item.explosive ? ' · ' + item.blast.toFixed(1) + 'm BLAST' : '');
    else meta = item.faction.toUpperCase() + ' · ' + item.hp + ' HP';
    card.appendChild(GF.el('div', 'item-meta', meta));

    card.addEventListener('mouseenter', () => GF.UI.previewItem(kind, item));
    card.addEventListener('focus', () => GF.UI.previewItem(kind, item));
    card.addEventListener('click', () => {
      GF.UI.previewItem(kind, item);
      GFAudio.ui(760);
      GF.Spawn.pick(kind, item);
    });
    frag.appendChild(card);
  }
  grid.appendChild(frag);
  this.spawnRendered = end;
  const old = grid.querySelector('.spawn-more');
  if (old) old.remove();
  if (count) count.textContent = items.length + ' ITEMS' + (end < items.length ? ' · SHOWING ' + end : '');
  if (end < items.length) {
    const more = GF.el('button', 'spawn-more', 'LOAD MORE · ' + (items.length - end) + ' REMAINING');
    more.addEventListener('click', () => { GF.UI.appendSpawnChunk(); GFAudio.ui(620); });
    grid.appendChild(more);
  }
};

/* ------------------------- spawning logic ------------------------- */
GF.Spawn = {
  aimPoint(maxDist) {
    const cam = GF.Player.camera;
    const dir = new Vector3();
    cam.getWorldDirection(dir);
    const hit = GF.World.raycast(cam.position, dir, maxDist || 8);
    if (hit) return { point: hit.point, normal: hit.normal, dir, hit: true };
    return { point: cam.position.clone().addScaledVector(dir, 4), normal: new Vector3(0, 1, 0), dir, hit: false };
  },

  pick(kind, item) {
    if (kind === 'weapon') return this.weapon(item);
    if (kind === 'prop') return this.prop(item);
    return this.ragdoll(item);
  },

  weapon(def) {
    const a = this.aimPoint(6);
    const y = GF.World.groundAt(a.point.x, a.point.z, a.point.y + 1);
    const pos = new Vector3(a.point.x, Math.max(y, a.point.y) + 0.05, a.point.z);
    GF.Items.spawnWeapon(def, pos);
    GF.UI.toast(def.name + ' spawned');
    GF.UI.closeSpawnMenu();
  },

  prop(def) {
    const a = this.aimPoint(9);
    let y;
    if (a.hit && a.normal.y < 0.6) {
      /* wall-mounted: spawn flush against the surface */
      y = a.point.y - def.h * 0.5;
      const p = new Vector3(a.point.x + a.normal.x * (def.d / 2 + 0.05), Math.max(y, a.point.y), a.point.z + a.normal.z * (def.d / 2 + 0.05));
      GF.World.spawnProp(def, p, { yaw: Math.atan2(a.normal.x, a.normal.z) });
    } else {
      y = GF.World.groundAt(a.point.x, a.point.z, a.point.y + 2);
      if (y < -1e7) y = a.point.y;
      const p = new Vector3(a.point.x, y + 0.02, a.point.z);
      GF.World.spawnProp(def, p);
    }
    GF.UI.toast(def.name + ' spawned');
    GF.UI.closeSpawnMenu();
  },

  ragdoll(type) {
    const a = this.aimPoint(10);
    let y = GF.World.groundAt(a.point.x, a.point.z, a.point.y + 2);
    if (y < -1e7) y = a.point.y;
    const pos = new Vector3(a.point.x, y + 0.02, a.point.z);
    const actor = GF.Actors.spawn(type, pos, { yaw: Math.random() * Math.PI * 2 });
    GF.UI.toast(type.name + ' deployed');
    GF.UI.closeSpawnMenu();
    return actor;
  }
};
