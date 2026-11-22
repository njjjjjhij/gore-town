/* =====================================================================
   GORE TOWN — bootstrap, map loading, main loop
   ===================================================================== */

GF.game = null;

GF.Game = {
  renderer: null,
  scene: null,
  camera: null,
  viewScene: null,
  viewCamera: null,
  clock: null,
  last: 0,
  orbit: 0,
  started: false,
  mapId: 'house',

  init() {
    const canvas = GF.$('#game');
    this.renderer = new WebGLRenderer({
      canvas, antialias: GF.qset().aa, powerPreference: 'high-performance',
      stencil: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5) * GF.qset().renderScale);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = GF.qset().shadows;
    this.renderer.shadowMap.type = GF.quality === 'high' ? PCFSoftShadowMap : BasicShadowMap;
    this.renderer.autoClear = false;

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(GF.settings.fov, window.innerWidth / window.innerHeight, 0.05, 400);

    this.viewScene = new Scene();
    this.viewCamera = new PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.01, 8);

    GF.World.init(this.scene);
    /* one studio environment lights every metal, glass and polymer surface */
    const env = GF.envMap(this.renderer);
    if (env) {
      this.scene.environment = env;
      this.viewScene.environment = env;
    }
    GF.Gore.init(this.scene);
    GF.Projectiles.init(this.scene);
    GF.Items.init(this.scene);
    GF.Actors.init(this.scene);
    GF.game = { actors: GF.Actors.list };

    GF.Player.init(this.scene, this.camera, this.viewScene, this.viewCamera);
    GF.Input.init(canvas);
    GF.UI.init();
    GF.UI.initMenus();
    GF.Icons.init();

    GF.on('escape', () => {
      if (GF.state === 'spawnmenu') GF.UI.closeSpawnMenu();
      else if (GF.state === 'play' || GF.state === 'pause') GF.UI.togglePause();
    });
    GF.on('spawnMenu', () => {
      if (GF.state === 'play' || GF.state === 'spawnmenu') GF.UI.toggleSpawnMenu();
    });
    GF.on('scale', () => this.applyScale());
    GF.on('degrade', () => this.degrade());
    GF.on('lockchange', (locked) => {
      if (locked) {
        this.hadLock = true;
        GF.mouse.warpGuard = performance.now() + 180;
        GF.mouse.dx = GF.mouse.dy = 0;
        clearTimeout(this.pauseTimer);
        return;
      }
      if (GF.device !== 'pc' || !this.hadLock) return;
      if (GF.state === 'play' && GF.mouse.left === false) {
        this.pauseTimer = setTimeout(() => {
          if (GF.state === 'play' && !GF.mouse.locked) GF.UI.togglePause();
        }, 250);
      }
    });
    GF.on('mousedown', () => { if (GF.state === 'play' && GF.device === 'pc' && !GF.mouse.locked) GF.Input.lock(); });
    window.addEventListener('resize', () => this.resize());

    this.loadMap('house', true);
    GF.UI.setBootDevice(GF.device, true);
    GF.UI.updateBootInfo();
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  },

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.viewCamera.aspect = w / h; this.viewCamera.updateProjectionMatrix();
  },

  applyScale() {
    const cap = GF.device === 'mobile' ? 1.25 : 1.5;
    const base = Math.min(window.devicePixelRatio || 1, cap) * GF.qset().renderScale;
    this.renderer.setPixelRatio(base * GF.Adaptive.ratio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  /* last-resort quality drop for very weak GPUs: no shadows, shorter fog */
  degrade() {
    this.renderer.shadowMap.enabled = false;
    if (GF.World.sun) GF.World.sun.castShadow = false;
    if (this.scene.fog && this.scene.fog.far > 85) this.scene.fog.far = 85;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.15) * GF.Adaptive.ratio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    GF.UI && GF.UI.toast && GF.UI.toast('Performance mode engaged', 3);
  },

  applyQuality() {
    const q = GF.qset();
    this.renderer.shadowMap.enabled = GF.settings.shadows && q.shadows;
    this.renderer.shadowMap.type = GF.quality === 'high' ? PCFSoftShadowMap : BasicShadowMap;
    if (GF.World.sun) {
      GF.World.sun.castShadow = GF.settings.shadows && q.shadows;
      if (GF.World.sun.shadow) GF.World.sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5) * q.renderScale * GF.Adaptive.ratio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    for (const m of Object.values(GF._tex)) { m.anisotropy = q.anisotropy; m.needsUpdate = true; }
  },

  loadMap(id, menuOnly) {
    const def = GF.mapById(id);
    this.mapId = id;
    GF.World.clear();
    GF.Gore.clear();
    GF.Actors.clear();
    GF.Items.clear();
    GF.Projectiles.clear();
    GF.Damage.fires.length = 0;
    if (GF.Player.clearShells) GF.Player.clearShells();
    if (window.speechSynthesis) speechSynthesis.cancel();

    GF.World.map = def;
    GF.World.setSky(def.sky);
    GF.World.bounds = { x0: -60, x1: 60, z0: -60, z1: 60 };
    const B = GF.World.begin();
    let out = {};
    try {
      out = def.build(B, GF.World) || {};
    } catch (e) {
      console.error('Map build failed', e);
    }
    B.finish();
    GF.World.indexColliders();

    this.mapActors = out.actorSpawns || [];
    GF.Player.reset(def.spawn.clone(), def.spawnYaw || 0);
    this.applyQuality();
    this.started = true;
  },

  populate() {
    const max = GF.quality === 'low' ? 5 : GF.quality === 'medium' ? 9 : 13;
    const spawn = GF.World.map ? GF.World.map.spawn : new Vector3();
    const pts = (this.mapActors || []).filter((p) => Math.hypot(p.x - spawn.x, p.z - spawn.z) > 16);
    const shuffled = pts.slice().sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(max, shuffled.length); i++) {
      const p = shuffled[i].clone();
      p.y = Math.max(p.y, GF.World.groundAt(p.x, p.z, p.y + 3));
      p.y += 0.05;
      let type;
      const r = Math.random();
      if (r < 0.18) type = GF.ragById('civilian-male');
      else if (r < 0.26) type = GF.ragById('civilian-female');
      else type = GF.pick(GF.RAGS.filter(t => t.aggressive));
      GF.Actors.spawn(type, p, { yaw: Math.random() * Math.PI * 2 });
    }
    /* a couple of corpses for atmosphere in the house */
    if (GF.World.map.id === 'house') {
      const c = GF.Actors.spawn(GF.ragById('worker'), new Vector3(-5.4, 0.15, -4.2), {});
      c.feedShown = true;
      c.damage(500, 'chest', { dir: new Vector3(0.4, 0, 0.2) });
    }
  },

  start(mapId, opts) {
    if (opts && opts.sandbox !== undefined) GF.sandbox = !!opts.sandbox;
    GF.UI.setLoading(true, 'BUILDING ' + (GF.mapById(mapId).name));
    GF.AudioUnlock && GF.AudioUnlock();
    if (GF.device === 'mobile') GF.requestFullscreen && GF.requestFullscreen();
    GFAudio.init();
    GFAudio.resume();
    setTimeout(() => {
      try {
        this.loadMap(mapId, false);
        this.populate();
        if (GF.sandbox) {
          for (const a of GF.Actors.list) { a.passive = !GF.sandboxHostile; a.target = null; a.targetPlayer = false; a.state = 'idle'; }
        }
        GF.UI.setLoading(false);
        GF.UI.closeAllOverlays();
        GF.UI.hideMainMenu();
        GF.state = 'play';
        GF.Player.alive = true;
        if (GF.device === 'pc') GF.Input.lock();
        GF.UI.updateHealth(GF.Player.health);
        GF.UI.setWeapon(GF.Player.weapon, GF.Player.ammo, GF.Player.reserve);
        GF.UI.showHUD(true);
        const compass = GF.$('#compass');
        if (compass) compass.textContent = GF.sandbox ? 'GORE TOWN \u00b7 SANDBOX' : 'GORE TOWN \u00b7 SURVIVAL';
        const brand = document.querySelector('.hud-brand');
        if (brand) brand.textContent = GF.sandbox ? 'GORE TOWN / SANDBOX' : 'GORE TOWN / SURVIVAL';
        GF.UI.toast((GF.sandbox ? 'Sandbox: ' : 'Deployment: ') + GF.mapById(mapId).name, 3);
      } catch (e) {
        console.error(e);
        GF.UI.setLoading(false, 'ERROR');
        GF.UI.toast('Map failed to load: ' + e.message, 6);
      }
    }, 60);
  },

  toMainMenu() {
    GF.state = 'menu';
    GF.sandbox = false;
    GF.sandboxHostile = false;
    GF.Input.unlock();
    GF.UI.closeSpawnMenu();
    GF.UI.showMainMenu();
    const p = GF.$('#pause');
    if (p) p.classList.remove('on');
    if (GF.TouchReset) GF.TouchReset();
  },

  loop(t) {
    requestAnimationFrame((nt) => this.loop(nt));
    try { this.frame(t); } catch (e) {
      if (!this._errLogged) { this._errLogged = true; console.error('frame error', e); }
    }
  },

  frame(t) {
    let dt = (t - this.last) / 1000;
    this.last = t;
    if (!isFinite(dt) || dt < 0) dt = 0.016;
    dt = Math.min(dt, 0.05);
    GF.rawDt = dt;
    GF.time += dt;
    GF.frame++;

    GF.Adaptive.tick(dt);

    const inGame = GF.state === 'play';
    const simDt = dt * (GF.timeScale === undefined ? 1 : GF.timeScale);
    if (inGame) {
      GF.Player.update(simDt);
      GF.Actors.update(simDt);
      GF.Projectiles.update(simDt);
      GF.Damage.update(simDt);
      GF.World.updateProps(simDt);
      GF.Items.update(dt);
      GF.Gore.update(simDt);
      GFAudio.update(dt);
    } else if (GF.state === 'menu' || GF.state === 'boot') {
      this.orbit += dt * 0.05;
      const r = 26;
      this.camera.position.set(Math.cos(this.orbit) * r, 7.5 + Math.sin(this.orbit * 0.7) * 2, Math.sin(this.orbit) * r);
      this.camera.lookAt(0, 2.4, 0);
      if (this.camera.fov !== 62) { this.camera.fov = 62; this.camera.updateProjectionMatrix(); }
      GF.Items.update(dt);
      GF.World.updateProps(dt);
    } else if (GF.state === 'pause' || GF.state === 'spawnmenu') {
      GF.Gore.update(dt * 0.35);
    }

    if (GF.state === 'spawnmenu') GF.Icons.tick();
    if (GF.state === 'play') GF.Input.endFrame();

    if (GF.World.updateDust) GF.World.updateDust(dt, this.camera);

    /* render */
    if (GF.World.skyMesh) GF.World.skyMesh.position.copy(this.camera.position);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.worldCalls = this.renderer.info.render.calls;
    this.worldTris = this.renderer.info.render.triangles;
    const showGun = (GF.state === 'play' || GF.state === 'pause' || GF.state === 'spawnmenu') && GF.Player.alive;
    if (GF.Player.gunRoot) GF.Player.gunRoot.visible = showGun;
    if (showGun) {
      this.renderer.clearDepth();
      this.viewCamera.fov = this.camera.fov === 62 ? 58 : this.camera.fov * 0.78;
      this.viewCamera.updateProjectionMatrix();
      this.renderer.render(this.viewScene, this.viewCamera);
    }
    GF.stats.drawCalls = this.worldCalls;
    GF.stats.tris = this.worldTris;
  }
};

/* --------------------------- boot helpers --------------------------- */
GF.AudioUnlock = function () {
  GFAudio.init();
  GFAudio.resume();
};

/* exposed for debugging and for embedding / modding from the console */
/* bullet time: slows the simulation, never the mouse look */
GF.timeScale = 1;
GF.toggleSlowMo = function () {
  GF.timeScale = GF.timeScale < 1 ? 1 : 0.32;
  if (GF.UI && GF.UI.toast) GF.UI.toast(GF.timeScale < 1 ? 'Bullet time' : 'Real time', 1.6);
  GFAudio.ui(GF.timeScale < 1 ? 140 : 220);
};

/* mobile browsers: go full-screen and hide the URL bar so the sticks get the space */
GF.requestFullscreen = function () {
  if (GF.device !== 'mobile' || document.fullscreenElement) return;
  const el = document.documentElement;
  if (!el.requestFullscreen) return;
  try {
    const p = el.requestFullscreen({ navigationUI: 'hide' });
    if (p && p.catch) p.catch(() => { });
  } catch (e) { }
  try {
    if (screen.orientation && screen.orientation.lock) {
      const q = screen.orientation.lock('landscape');
      if (q && q.catch) q.catch(() => { });
    }
  } catch (e) { }
};

window.GF = GF;

window.addEventListener('DOMContentLoaded', () => {
  let stored = null;
  try { stored = localStorage.getItem(GF.Save.key); } catch (e) { }
  GF.Save.load();
  if (!stored) {
    GF.device = GF.detectDevice();
    GF.quality = GF.guessQuality();
  }
  GF.goreLevel = GF.settings.blood === false ? 0.4 : 1.3;
  try {
    GF.Game.init();
  } catch (e) {
    console.error(e);
    const b = GF.$('#boot');
    if (b) {
      const err = GF.el('div', 'boot-error', 'WebGL failed to start: ' + e.message + '<br>Try a different browser or enable hardware acceleration.');
      b.appendChild(err);
    }
  }

  /* unlock audio on first gesture */
  const unlock = () => {
    GFAudio.init();
    GFAudio.resume();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  /* click canvas to lock */
  const canvas = GF.$('#game');
  if (canvas) canvas.addEventListener('click', () => {
    if (GF.state === 'play' && GF.device === 'pc' && !GF.mouse.locked) GF.Input.lock();
  });
});
