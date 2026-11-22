/* =====================================================================
   GORE TOWN — title screen (PC / Mobile prompt), settings, map select,
   pause and death flow.
   ===================================================================== */

GF.UI.selectedMap = 'house';
GF.UI.panelReturn = null;

GF.UI.initMenus = function () {
  const self = this;
  this.selectedMap = 'house';

  /* device question */
  const pc = GF.$('#device-pc'), mob = GF.$('#device-mobile');
  const choose = (d) => {
    GF.device = d;
    GF.Save.save();
    self.setBootDevice(d);
    GFAudio.init();
    GFAudio.ui(520);
  };
  if (pc) pc.addEventListener('click', () => choose('pc'));
  if (mob) mob.addEventListener('click', () => choose('mobile'));

  const enter = GF.$('#menu-enter');
  if (enter) enter.addEventListener('click', () => {
    GFAudio.init();
    const m = GF.mapById(self.selectedMap);
    GF.Game.start(m.id, { sandbox: false });
  });

  /* sandbox drops into the same map with passive AI, free spawning and
     no score pressure — the GoreBox-style playground. */
  const sandbox = GF.$('#menu-sandbox');
  if (sandbox) sandbox.addEventListener('click', () => {
    GFAudio.init();
    GF.Game.start(self.selectedMap, { sandbox: true });
  });

  const editors = GF.$('#menu-editors');
  if (editors) editors.addEventListener('click', () => { GFAudio.ui(600); self.openMapSelect('start'); });

  const credits = GF.$('#menu-credits');
  if (credits) credits.addEventListener('click', () => {
    const s = GF.contentStats();
    self.openModal('GORE TOWN',
      '<p>A single-file ragdoll sandbox about meat, momentum and very bad decisions.</p>' +
      '<p>Everything runs in one HTML file: ' + s.maps + ' maps, ' + s.weapons +
      ' weapons, ' + s.objects + ' props and ' + s.ragdolls + ' ragdoll archetypes, generated procedurally.</p>' +
      '<p>Rendering: three.js. Physics: hand-written verlet ragdolls. Audio: synthesised WebAudio. No assets, no servers, no accounts.</p>' +
      '<p style="color:#8f5f58">Built by Freebuff &middot; build ' + GF.version + '</p>');
  });

  const quit = GF.$('#menu-quit');
  if (quit) quit.addEventListener('click', () => {
    self.openModal('LEAVE TOWN',
      '<p>GORE TOWN is a browser sandbox, so it cannot close the tab for you.</p>' +
      '<p>Close this tab when you are done. Your device, quality and control settings are saved locally.</p>');
  });

  const navSettings = GF.$('#gt-settings-nav');
  if (navSettings) navSettings.addEventListener('click', () => self.openSettings('boot'));

  const modalClose = GF.$('#gt-modal-close');
  if (modalClose) modalClose.addEventListener('click', () => self.closeModal());
  const modal = GF.$('#gt-modal');
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) self.closeModal(); });

  const browse = GF.$('#menu-maps');
  if (browse) browse.addEventListener('click', () => { GFAudio.ui(600); self.openMapSelect('start'); });

  const search = GF.$('#map-search');
  if (search) search.addEventListener('input', () => {
    self.mapQuery = search.value.toLowerCase().trim();
    self.renderMapList(true);
  });

  const quality = GF.$('#menu-quality');
  if (quality) {
    quality.value = GF.quality;
    quality.addEventListener('change', () => {
      GF.quality = quality.value;
      GF.Save.save();
      if (GF.Game && GF.Game.applyQuality) GF.Game.applyQuality();
    });
  }

  const settingsBtn = GF.$('#menu-settings');
  if (settingsBtn) settingsBtn.addEventListener('click', () => self.openSettings('boot'));

  /* pause */
  const bind = (id, fn) => { const e = GF.$(id); if (e) e.addEventListener('click', fn); };
  bind('#pause-resume', () => self.togglePause());
  bind('#pause-spawn', () => { self.togglePause(); self.openSpawnMenu(); });
  bind('#pause-sandbox', () => {
    self.togglePause();
    GF.state = 'play';
    if (!GF.Player.alive) return;
    self.openSpawnMenu();
    self.spawnLevel = true;
    self.spawnRail = 'level';
    self.renderSpawnMenu();
  });
  bind('#pause-settings', () => self.openSettings('pause'));
  bind('#pause-maps', () => self.openMapSelect('switch'));
  bind('#pause-restart', () => { self.togglePause(); GF.Game.start(GF.World.map ? GF.World.map.id : 'house'); });
  bind('#pause-menu', () => GF.Game.toMainMenu());
  bind('#pause-device', () => {
    GF.device = GF.device === 'pc' ? 'mobile' : 'pc';
    GF.Save.save();
    self.layout();
    self.toast('Controls: ' + (GF.device === 'mobile' ? 'touch' : 'keyboard + mouse'));
  });

  /* death */
  bind('#death-respawn', () => GF.Player.respawn());
  bind('#death-maps', () => self.openMapSelect('switch'));
  bind('#death-menu', () => GF.Game.toMainMenu());

  /* overlay panel */
  const close = GF.$('#panel-close');
  if (close) close.addEventListener('click', () => self.closePanel());

  this.mapQuery = '';
  this.mapShown = 40;
  this.renderMapStrip();
  this.updateBootInfo();
  this.setBootDevice(GF.device, true);
  this.buildSettingsInto(GF.$('#settings-body'));
};

GF.UI.setBootDevice = function (device, silent) {
  document.body.classList.toggle('device-mobile', device === 'mobile');
  const pc = GF.$('#device-pc'), mob = GF.$('#device-mobile');
  if (pc) pc.classList.toggle('selected', device === 'pc');
  if (mob) mob.classList.toggle('selected', device === 'mobile');
  const enter = GF.$('#menu-enter');
  if (enter) enter.classList.add('ready');
  const modeLabel = GF.$('#menu-mode-label');
  if (modeLabel) modeLabel.textContent = device === 'mobile' ? 'TOUCH CONTROLS · AUTO-AIM ASSIST OFF' : 'KEYBOARD + MOUSE · POINTER LOCK';
  this.layout();
};

GF.UI.updateBootInfo = function () {
  const s = GF.contentStats();
  const e = GF.$('#menu-stats');
  if (e) e.innerHTML =
    '<span><b>' + s.items + '</b> ITEMS</span>' +
    '<span><b>' + s.weapons + '</b> GUNS</span>' +
    '<span><b>' + s.objects + '</b> PROPS</span>' +
    '<span><b>' + s.ragdolls + '</b> RAGDOLLS</span>' +
    '<span><b>' + s.maps + '</b> MAPS</span>';
  const set = (id, n) => { const el = GF.$(id); if (el) el.textContent = n; };
  set('#gt-chip-maps', s.maps);
  set('#gt-chip-items', s.items);
  const v = GF.$('#boot-version');
  if (v) v.textContent = 'GORE TOWN \u00b7 UPDATE 1.2 \u00b7 ELEVENLABS AUDIO \u00b7 SINGLE FILE';
  const b = GF.$('#boot-build');
  if (b) b.textContent = '1.2';
  const mc = GF.$('#menu-mapcount');
  if (mc) mc.textContent = s.maps;
  set('#sys-maps', s.maps);
  set('#sys-guns', s.weapons);
  set('#sys-objects', s.objects);
  set('#sys-ragdolls', s.ragdolls);
  const ms = GF.$('#map-search');
  if (ms) ms.placeholder = 'SEARCH ' + s.maps + ' MAPS';
  this.syncMapName();
};

GF.UI.syncMapName = function () {
  const el = GF.$('#gt-map-name');
  const m = GF.mapById(this.selectedMap);
  if (el && m) el.textContent = m.name;
};

GF.UI.openModal = function (title, html) {
  const modal = GF.$('#gt-modal');
  if (!modal) return;
  GF.$('#gt-modal-title').textContent = title || '';
  GF.$('#gt-modal-body').innerHTML = html || '';
  modal.classList.add('on');
};
GF.UI.closeModal = function () {
  const modal = GF.$('#gt-modal');
  if (modal) modal.classList.remove('on');
};

/* the title screen shows a curated eight, not the whole roster */
GF.UI.FEATURED = ['house', 'outpost', 'city', 'bunker', 'warehouse', 'prison', 'stadium', 'lodge'];

GF.UI.renderMapStrip = function () {
  const strip = GF.$('#menu-mapstrip');
  if (!strip) return;
  strip.innerHTML = '';
  const featured = this.FEATURED.map(id => GF.MAPS.find(m => m.id === id)).filter(Boolean);
  for (const m of featured) {
    const card = GF.el('button', 'map-card' + (m.id === this.selectedMap ? ' selected' : ''));
    card.innerHTML =
      '<div class="map-thumb" style="--accent:' + m.accent + '">' +
      '<span class="map-size">' + m.size + '</span>' +
      '<span class="map-name">' + m.name + '</span>' +
      '<span class="map-sub">' + m.subtitle + '</span>' +
      '</div>';
    card.addEventListener('click', () => {
      this.selectedMap = m.id;
      GF.$$('#menu-mapstrip .map-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      this.syncMapName();
      GFAudio.ui(680);
    });
    strip.appendChild(card);
  }
};

GF.UI.buildSettingsInto = function (host) {
  if (!host) return;
  host.innerHTML = '';
  const S = GF.settings;
  const rows = [
    { k: 'sensitivity', label: 'Mouse sensitivity', type: 'range', min: 0.2, max: 3, step: 0.05, get: () => S.sensitivity, set: v => S.sensitivity = v },
    { k: 'touchSensitivity', label: 'Touch sensitivity', type: 'range', min: 0.2, max: 3, step: 0.05, get: () => S.touchSensitivity, set: v => S.touchSensitivity = v },
    { k: 'fov', label: 'Field of view', type: 'range', min: 60, max: 110, step: 1, get: () => S.fov, set: v => { S.fov = v; if (GF.Player) GF.Player.fov = v; } },
    { k: 'volume', label: 'Master volume', type: 'range', min: 0, max: 1, step: 0.02, get: () => S.volume, set: v => GFAudio.setVolume(v) },
    { k: 'goreLevel', label: 'Gore intensity', type: 'range', min: 0.2, max: 2, step: 0.1, get: () => GF.goreLevel, set: v => GF.goreLevel = v },
    { k: 'difficulty', label: 'AI difficulty', type: 'range', min: 0.4, max: 2, step: 0.1, get: () => S.difficulty, set: v => S.difficulty = v },
    { k: 'blood', label: 'Blood effects', type: 'toggle', get: () => S.blood, set: v => S.blood = v },
    { k: 'voice', label: 'Synthesised voices', type: 'toggle', get: () => S.voice, set: v => S.voice = v },
    { k: 'shadows', label: 'Dynamic shadows', type: 'toggle', get: () => S.shadows, set: v => { S.shadows = v; GF.Game.applyQuality(); } },
    { k: 'headbob', label: 'View bob', type: 'toggle', get: () => S.headbob, set: v => S.headbob = v },
    { k: 'invertY', label: 'Invert look Y', type: 'toggle', get: () => S.invertY, set: v => S.invertY = v },
    { k: 'autoReload', label: 'Auto reload', type: 'toggle', get: () => S.autoReload, set: v => S.autoReload = v },
    { k: 'showFps', label: 'Show FPS', type: 'toggle', get: () => S.showFps, set: v => S.showFps = v }
  ];
  for (const r of rows) {
    const row = GF.el('div', 'set-row');
    row.appendChild(GF.el('div', 'set-label', r.label));
    const ctrl = GF.el('div', 'set-ctrl');
    if (r.type === 'range') {
      const input = GF.el('input');
      input.type = 'range'; input.min = r.min; input.max = r.max; input.step = r.step;
      input.value = r.get();
      const val = GF.el('span', 'set-val', Number(r.get()).toFixed(2));
      input.addEventListener('input', () => { r.set(parseFloat(input.value)); val.textContent = Number(input.value).toFixed(2); GF.Save.save(); });
      ctrl.appendChild(input); ctrl.appendChild(val);
    } else {
      const b = GF.el('button', 'toggle' + (r.get() ? ' on' : ''));
      b.innerHTML = '<i></i>';
      b.addEventListener('click', () => {
        const v = !r.get();
        r.set(v);
        b.classList.toggle('on', v);
        GF.Save.save();
        GFAudio.ui(v ? 720 : 480);
      });
      ctrl.appendChild(b);
    }
    row.appendChild(ctrl);
    host.appendChild(row);
  }
  const qRow = GF.el('div', 'set-row');
  qRow.appendChild(GF.el('div', 'set-label', 'Graphics quality'));
  const sel = GF.el('select', 'set-select');
  for (const q of ['low', 'medium', 'high']) {
    const o = GF.el('option', '', q.toUpperCase());
    o.value = q;
    if (q === GF.quality) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => { GF.quality = sel.value; GF.Save.save(); GF.Game.applyQuality(); });
  const qc = GF.el('div', 'set-ctrl'); qc.appendChild(sel);
  qRow.appendChild(qc);
  host.appendChild(qRow);

  const devRow = GF.el('div', 'set-row');
  devRow.appendChild(GF.el('div', 'set-label', 'Input device'));
  const devBtn = GF.el('button', 'mini-btn', GF.device === 'mobile' ? 'MOBILE / TOUCH' : 'PC / KEYBOARD');
  devBtn.addEventListener('click', () => {
    GF.device = GF.device === 'mobile' ? 'pc' : 'mobile';
    devBtn.textContent = GF.device === 'mobile' ? 'MOBILE / TOUCH' : 'PC / KEYBOARD';
    GF.Save.save();
    GF.UI.layout();
  });
  const dc = GF.el('div', 'set-ctrl'); dc.appendChild(devBtn);
  devRow.appendChild(dc);
  host.appendChild(devRow);
};

GF.UI.openSettings = function (from) {
  this.panelReturn = from;
  const p = GF.$('#panel');
  if (!p) return;
  p.classList.add('on');
  GF.$('#panel-title').textContent = 'SETTINGS';
  GF.$('#settings-body').style.display = '';
  GF.$('#map-list').style.display = 'none';
  const ms = GF.$('#map-search');
  if (ms) { ms.classList.remove('on'); ms.value = ''; }
  this.mapQuery = '';
  this.buildSettingsInto(GF.$('#settings-body'));
  GF.Input.unlock();
};

GF.UI.openMapSelect = function (mode) {
  this.mapMode = mode || 'switch';
  const p = GF.$('#panel');
  if (!p) return;
  p.classList.add('on');
  GF.$('#panel-title').textContent = this.mapMode === 'start' ? 'SELECT DEPLOYMENT' : 'CHANGE MAP';
  GF.$('#settings-body').style.display = 'none';
  const ms = GF.$('#map-search');
  if (ms) {
    ms.classList.add('on');
    ms.value = this.mapQuery || '';
    ms.placeholder = 'SEARCH ' + GF.MAPS.length + ' MAPS';
  }
  this.renderMapList(true);
};

GF.UI.renderMapList = function (reset) {
  const list = GF.$('#map-list');
  if (!list) return;
  list.style.display = 'grid';
  if (reset) {
    this.mapShown = 40;
    list.scrollTop = 0;
  }
  const q = this.mapQuery || '';
  const items = q
    ? GF.MAPS.filter(m => m.name.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q) || String(m.subtitle).toLowerCase().includes(q))
    : GF.MAPS;
  list.innerHTML = '';
  const end = Math.min(items.length, this.mapShown);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < end; i++) {
    const m = items[i];
    const card = GF.el('button', 'map-row');
    card.innerHTML =
      '<div class="map-row-accent" style="background:' + m.accent + '"></div>' +
      '<div class="map-row-body"><h4>' + m.name + '</h4><p>' + m.desc + '</p>' +
      '<span class="map-meta">' + m.subtitle + ' · ' + m.size + '</span></div>' +
      '<div class="map-row-go">DEPLOY</div>';
    card.addEventListener('click', () => {
      GF.UI.selectedMap = m.id;
      GF.UI.closePanel();
      GF.Game.start(m.id);
    });
    frag.appendChild(card);
  }
  list.appendChild(frag);
  if (end < items.length) {
    const more = GF.el('button', 'map-more', 'LOAD MORE · ' + (items.length - end) + ' REMAINING');
    more.addEventListener('click', () => {
      const keep = list.scrollTop;
      GF.UI.mapShown += 80;
      GF.UI.renderMapList(false);
      list.scrollTop = keep;
      GFAudio.ui(560);
    });
    this.mapShown = end;
    list.appendChild(more);
  }
};

GF.UI.closePanel = function () {
  const p = GF.$('#panel');
  if (p) p.classList.remove('on');
  if (this.panelReturn === 'pause' && GF.state === 'pause') { /* stay paused */ }
  else if (GF.state === 'play') GF.Input.lock();
};

GF.UI.setLoading = function (show, text) {
  const l = GF.$('#loading');
  if (!l) return;
  l.classList.toggle('on', !!show);
  if (text) {
    const t = GF.$('#loading-text');
    if (t) t.textContent = text;
  }
};

GF.UI.showMainMenu = function () {
  const b = GF.$('#boot');
  if (b) b.classList.remove('hidden');
  this.showHUD(false);
  this.hideDeath();
  const p = GF.$('#panel');
  if (p) p.classList.remove('on');
  const pa = GF.$('#pause');
  if (pa) pa.classList.remove('on');
  this.closeModal();
  this.updateBootInfo();
};

GF.UI.hideMainMenu = function () {
  const b = GF.$('#boot');
  if (b) b.classList.add('hidden');
  this.showHUD(true);
};
