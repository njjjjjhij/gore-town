/* =====================================================================
   GORE TOWN — first person player: movement, lean(Q/E), ADS, recoil,
   reload animation, weapon pickups, grenades and death.
   ===================================================================== */

const GFP_FWD = new Vector3(), GFP_RIGHT = new Vector3(), GFP_WISH = new Vector3();
const GFP_DIR = new Vector3(), GFP_TO = new Vector3(), GFP_CUR = new Vector3();
const GFP_HIP = new Vector3(0.185, -0.215, -0.52);
const GFP_ADS = new Vector3(0, -0.072, -0.4);
const GFP_POS = new Vector3();
const GFP_SHELL_GEO = new BoxGeometry(0.012, 0.012, 0.03);
const GFP_SHELL_MAT = GF.propMat('metal', '#b08a3a');

GF.Items = {
  pickups: [],
  scene: null,
  init(scene) { this.scene = scene; },
  spawnWeapon(def, pos, ammo) {
    const g = new Group();
    const model = GF.buildGunModelMerged(def);
    model.rotation.set(0.15, 0, 0.2);
    model.position.y = 0.1;
    model.scale.setScalar(0.9);
    g.add(model);
    const ring = new Mesh(new RingGeometry(0.3, 0.36, 20), new MeshBasicMaterial({ color: 0xffc060, transparent: true, opacity: 0.35, side: DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    g.add(ring);
    g.position.copy(pos);
    g.userData.dynamic = true;
    this.scene.add(g);
    const p = { mesh: g, def, pos: pos.clone(), spin: Math.random() * Math.PI, ammo: ammo || def.mag, kind: 'weapon' };
    this.pickups.push(p);
    return p;
  },
  dropWeapon(def, pos) {
    if (!def || def.melee) return null;
    const y = Math.max(pos.y, GF.World.groundAt(pos.x, pos.z, pos.y + 1) + 0.02);
    return this.spawnWeapon(def, new Vector3(pos.x, y, pos.z));
  },
  nearest(pos, radius) {
    let best = null, bestD = radius || 3;
    for (const p of this.pickups) {
      const d = Math.hypot(p.pos.x - pos.x, p.pos.y - pos.y, p.pos.z - pos.z);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  },
  remove(p) {
    const i = this.pickups.indexOf(p);
    if (i >= 0) this.pickups.splice(i, 1);
    this.scene.remove(p.mesh);
  },
  update(dt) {
    for (const p of this.pickups) {
      p.spin += dt * 0.9;
      p.mesh.rotation.y = p.spin;
      p.mesh.position.y = p.pos.y + 0.06 + Math.sin(GF.time * 2 + p.spin) * 0.03;
    }
  },
  clear() {
    for (const p of this.pickups) this.scene.remove(p.mesh);
    this.pickups.length = 0;
  }
};

GF.Player = {
  camera: null,
  scene: null,
  viewScene: null,
  viewCamera: null,
  gunRoot: null,
  pos: new Vector3(0, 0, 10),
  vel: new Vector3(),
  yaw: 0,
  pitch: 0,
  roll: 0,
  lean: 0,
  leanTarget: 0,
  crouch: 0,
  crouchTarget: 0,
  adsT: 0,
  health: 100,
  maxHealth: 100,
  alive: true,
  weapon: null,
  ammo: 0,
  reserve: 0,
  reloadT: 0,
  reloadTotal: 0,
  fireCd: 0,
  recoil: 0,
  recoilPitch: 0,
  bobT: 0,
  landT: 0,
  onGround: false,
  sprint: false,
  score: 0,
  kills: 0,
  damageT: 0,
  regenT: 0,
  throwCd: 0,
  grenades: 6,
  carried: null,
  sway: new Vector2(),
  shellPool: [],
  muzzleT: 0,
  fov: 78,
  deadT: 0,

  init(scene, camera, viewScene, viewCamera) {
    this.scene = scene;
    this.camera = camera;
    this.viewScene = viewScene;
    this.viewCamera = viewCamera;
    camera.rotation.order = 'YXZ';
    /* kept moderate: with PBR metal and the studio env map, the old
       ~9 total intensity washed every receiver out to white */
    const amb = new AmbientLight(0xffffff, 1.25);
    viewScene.add(amb);
    const key = new DirectionalLight(0xfff0e0, 1.85);
    key.position.set(1.2, 1.8, 1.0);
    viewScene.add(key);
    const rim = new DirectionalLight(0xc6d2de, 0.8);
    rim.position.set(-1.4, 0.4, -1.2);
    viewScene.add(rim);
    /* front fill keeps dark polymer receivers readable against bright maps */
    const fill = new DirectionalLight(0xffe6cc, 1.15);
    fill.position.set(0.3, 0.5, 1.8);
    viewScene.add(fill);
    this.gunRoot = new Group();
    viewScene.add(this.gunRoot);
    this.held = null;
    this.fov = GF.settings.fov;
    this.reset(new Vector3(0, 0, 10), 0);
  },

  reset(pos, yaw) {
    this.pos.copy(pos);
    this.vel.set(0, 0, 0);
    this.yaw = yaw === undefined ? 0 : yaw;
    this.pitch = 0; this.roll = 0; this.lean = 0; this.leanTarget = 0;
    this.health = this.maxHealth;
    this.alive = true;
    this.spawnTime = GF.time;
    this.reloadT = 0;
    this.adsT = 0;
    this.crouch = 0; this.crouchTarget = 0;
    this.deadT = 0;
    this.damageT = 0;
    this.regenT = 0;
    this.grenades = 6;
    this.carried = null;
    this.score = 0;
    this.wasFiring = false;
    this.equipT = 0;
    this.swingT = 0;
    this.stepAcc = 0;
    if (this.gunRoot) this.gunRoot.clear();
    this.held = null;
    this.weapon = null;
    this.ammo = 0;
    const start = GF.weaponById('m4a1');
    this.prevWeapon = null;
    this.equip(start, true);
    this.eyeY = 1.66;
    this.updateCamera(0);
  },

  equip(def, silent) {
    if (!def) return;
    if (this.weapon && this.weapon !== def && !silent) this.prevWeapon = this.weapon;
    if (this.weapon && !silent && this.reloadT > 0) this.reloadT = 0;
    this.weapon = def;
    this.ammo = def.mag || 0;
    this.reserve = def.reserve || 0;
    this.reloadT = 0;
    this.adsT = 0;
    this.equipT = def.equipTime || 0.35;
    if (this.gunRoot) this.gunRoot.clear();
    const view = GF.buildViewWeapon(def);
    this.gunRoot.add(view);
    this.held = view;
    if (GF.UI) GF.UI.setWeapon(def, this.ammo, this.reserve);
    GFAudio.reload('in');
  },

  /* ------------------------------ input ------------------------------ */
  readInput() {
    const k = GF.keys;
    const mobile = GF.device === 'mobile';
    let mx = 0, mz = 0;
    if (mobile) {
      mx = GF.touch.moveX;
      mz = GF.touch.moveY;
      this.sprint = GF.touch.sprint;
      if (GF.touch.crouch !== this.crouchTarget) this.crouchTarget = GF.touch.crouch ? 1 : 0;
    } else {
      if (k.KeyW) mz += 1;
      if (k.KeyS) mz -= 1;
      if (k.KeyD) mx += 1;
      if (k.KeyA) mx -= 1;
      this.sprint = !!(k.ShiftLeft || k.ShiftRight);
      this.crouchTarget = (k.KeyC || k.ControlLeft) ? 1 : 0;
    }
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    this.moveInput.set(mx, mz);

    /* look */
    let dx = 0, dy = 0;
    if (mobile) {
      dx = GF.touch.lookDX; dy = GF.touch.lookDY;
      GF.touch.lookDX = 0; GF.touch.lookDY = 0;
      dx *= GF.settings.touchSensitivity * 1.6;
      dy *= GF.settings.touchSensitivity * 1.6;
    } else {
      dx = GF.mouse.dx; dy = GF.mouse.dy;
      dx *= 0.0022 * GF.settings.sensitivity;
      dy *= 0.0022 * GF.settings.sensitivity;
    }
    const zoom = 1 - this.adsT * 0.35;
    this.yaw -= dx * zoom;
    this.pitch -= dy * zoom * (GF.settings.invertY ? -1 : 1);
    this.pitch = GF.clamp(this.pitch, -1.45, 1.45);
    this.sway.x = GF.clamp(dx * 22, -1, 1);
    this.sway.y = GF.clamp(dy * 22, -1, 1);

    /* lean */
    let lt = 0;
    if (mobile) lt = GF.touch.lean || 0;
    else lt = (k.KeyE ? 1 : 0) - (k.KeyQ ? 1 : 0);
    this.leanTarget = lt;

    this.firing = mobile ? GF.touch.fire : GF.mouse.left;
    this.aiming = mobile ? GF.touch.aim : GF.mouse.right;
    if (GF.pressed.KeyR || (mobile && GF.touch.reload)) this.startReload();
    if (GF.pressed.Space || (mobile && GF.touch.jump)) this.tryJump();
    if (GF.pressed.KeyG) this.throwGrenade();
    if (GF.pressed.KeyF) this.interact();
    if (GF.pressed.KeyV) this.shout();
    if (GF.pressed.KeyB && GF.toggleSlowMo) GF.toggleSlowMo();
    if (GF.mouse.wheel) this.cycleWeapon(GF.mouse.wheel);
    for (let i = 1; i <= 5; i++) if (GF.pressed['Digit' + i]) this.quickSelect(i - 1);
  },

  /* ---------------------------- movement ----------------------------- */
  moveInput: new Vector2(),

  update(dt) {
    if (!this.alive) {
      this.deadT += dt;
      return;
    }
    this.readInput();

    if (GF.device === 'mobile') this.aimAssist(dt);

    /* horizontal movement */
    const fwd = GFP_FWD.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = GFP_RIGHT.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = GFP_WISH.copy(fwd).multiplyScalar(this.moveInput.y).addScaledVector(right, this.moveInput.x);
    if (wish.lengthSq() > 1) wish.normalize();
    let speed = 4.5;
    if (this.sprint && this.moveInput.y > 0.3 && this.adsT < 0.3) speed = 6.9;
    if (this.crouchTarget) speed = 2.3;
    if (this.adsT > 0.4) speed *= 0.62;
    if (this.reloadT > 0) speed *= 0.9;

    const accel = this.onGround ? 14 : 4;
    this.vel.x = GF.damp(this.vel.x, wish.x * speed, accel, dt);
    this.vel.z = GF.damp(this.vel.z, wish.z * speed, accel, dt);

    /* gravity + ground */
    this.vel.y -= 23 * dt;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.y += this.vel.y * dt;

    /* collide capsule */
    for (const off of [0.35, 1.1, 1.6]) {
      GFR_V1.set(this.pos.x, this.pos.y + off, this.pos.z);
      if (GF.World.spherePush(GFR_V1, off > 1 ? 0.32 : 0.36)) {
        this.pos.x = GFR_V1.x;
        this.pos.z = GFR_V1.z;
        if (off > 1 && GFR_V1.y > this.pos.y + off) this.vel.y = Math.max(0, this.vel.y);
      }
    }
    const ground = GF.World.groundAt(this.pos.x, this.pos.z, this.pos.y + 1.0);
    if (ground > -1e8 && this.pos.y <= ground + 0.02) {
      if (!this.onGround && this.vel.y < -6) { GFAudio.step('concrete', this.pos); this.landT = 0.18; }
      this.pos.y = ground;
      this.vel.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
    if (this.pos.y < -25) { this.pos.set(0, 20, 0); this.vel.set(0, 0, 0); }

    /* crouch / lean / ads */
    this.crouch = GF.damp(this.crouch, this.crouchTarget, 11, dt);
    this.lean = GF.damp(this.lean, this.leanTarget, 9, dt);
    const adsTarget = (this.aiming && this.reloadT <= 0) ? 1 : 0;
    this.adsT = GF.damp(this.adsT, adsTarget, 12, dt);
    this.roll = -this.lean * 0.16;

    /* footsteps + bob */
    const moving = Math.hypot(this.vel.x, this.vel.z);
    this.bobT += dt * (2.4 + moving * 1.5);
    if (moving > 1.5 && this.onGround) {
      this.stepAcc = (this.stepAcc || 0) + dt * moving;
      if (this.stepAcc > 2.4) {
        this.stepAcc = 0;
        const mat = this.groundMat();
        GFAudio.step(mat, this.pos);
      }
    }
    this.updateCamera(dt);

    /* weapon */
    this.fireCd -= dt;
    this.throwCd -= dt;
    this.equipT = Math.max(0, (this.equipT || 0) - dt);
    this.recoil = GF.damp(this.recoil, 0, 9, dt);
    this.recoilPitch = GF.damp(this.recoilPitch, 0, 12, dt);
    if (this.reloadT > 0) {
      const before = this.reloadT;
      this.reloadT -= dt;
      const p = 1 - Math.max(0, this.reloadT) / this.reloadTotal;
      if (before > this.reloadTotal * 0.5 && this.reloadT <= this.reloadTotal * 0.5) {
        GFAudio.reload('in');
        this.ammo = this.weapon.mag;
      }
      this.animateReload(p);
      if (this.reloadT <= 0) {
        this.reloadT = 0;
        if (this.held && this.held.userData.model) {
          const m = this.held.userData.model;
          m.rotation.set(0, 0, 0);
          m.position.set(0, 0, 0);
          const parts = this.held.userData.parts || {};
          if (parts.mag) parts.mag.visible = true;
        }
        if (GF.UI) GF.UI.setWeapon(this.weapon, this.ammo, this.reserve);
      }
    } else if (this.firing && this.weapon) {
      if (this.weapon.melee) this.meleeSwing();
      else if (this.weapon.auto || !this.wasFiring) this.tryFire();
    }
    this.wasFiring = this.firing;
    this.updateCarry(dt);
    this.animateView(dt);

    if (GF.UI && GF.UI.updateHUD) GF.UI.updateHUD(dt);
    if (GF.Stats) GF.Stats.tick(dt);

    /* regen */
    this.damageT += dt;
    if (this.damageT > 6 && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + 9 * dt);
      if (GF.UI) GF.UI.updateHealth(this.health);
    }
    if (this.health <= 0 && this.alive) this.die();
  },

  /* gentle magnetism while aiming on a touchscreen so thumb-look stays usable */
  aimAssist(dt) {
    if (!this.aiming || !this.weapon || this.weapon.melee) return;
    const cam = this.camera;
    const dir = cam.getWorldDirection(GFP_DIR);
    let best = null, bestDot = Math.cos(GF.deg(5.5));
    const list = (GF.Actors && GF.Actors.list) || [];
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.dead || !a.rag) continue;
      const c = a.rag.byKey.chest;
      GFP_TO.set(c.x - cam.position.x, c.y - cam.position.y, c.z - cam.position.z);
      const d = GFP_TO.length();
      if (d > 46 || d < 1) continue;
      GFP_TO.multiplyScalar(1 / d);
      const dot = GFP_TO.dot(dir);
      if (dot > bestDot) { bestDot = dot; best = a; }
    }
    if (!best) return;
    const c = best.rag.byKey.chest;
    const dx = c.x - cam.position.x, dy = c.y - cam.position.y, dz = c.z - cam.position.z;
    const wantYaw = Math.atan2(-dx, -dz);
    const wantPitch = Math.atan2(dy, Math.hypot(dx, dz));
    const k = 1 - Math.exp(-2.6 * dt);
    this.yaw += GF.wrapAngle(wantYaw - this.yaw) * k;
    this.pitch += (wantPitch - this.pitch) * k;
  },

  swapWeapon() {
    if (this.prevWeapon && this.prevWeapon !== this.weapon) {
      const next = this.prevWeapon;
      this.prevWeapon = this.weapon;
      this.equip(next, true);
      GFAudio.pickup();
      return;
    }
    this.cycleWeapon(1);
  },

  tryJump() {
    if (!this.alive || !this.onGround || this.crouch > 0.5) return;
    this.vel.y = 7.2;
    this.onGround = false;
    GFAudio.step(this.groundMat(), this.pos);
  },

  groundMat() {
    const near = GF.World.queryNear(this.pos.x, this.pos.z, 1.0);
    let best = null, by = -1e9;
    for (const c of near) {
      if (this.pos.x > c.x0 && this.pos.x < c.x1 && this.pos.z > c.z0 && this.pos.z < c.z1 && c.y1 <= this.pos.y + 0.3 && c.y1 > by) {
        by = c.y1; best = c;
      }
    }
    return best ? best.mat : 'concrete';
  },

  updateCamera(dt) {
    const cam = this.camera;
    const eye = 1.66 - this.crouch * 0.62;
    const bob = Math.sin(this.bobT * 2) * 0.022 * (GF.settings.headbob ? 1 : 0) * (1 - this.adsT * 0.7);
    const bobSide = Math.cos(this.bobT) * 0.018 * (GF.settings.headbob ? 1 : 0) * (1 - this.adsT * 0.7);
    const shake = GF.CameraShake.update(dt);
    const sx = (Math.random() - 0.5) * shake * 0.06;
    const sy = (Math.random() - 0.5) * shake * 0.06;

    cam.position.set(
      this.pos.x + Math.cos(this.yaw) * this.lean * 0.42 + Math.cos(this.yaw) * bobSide,
      this.pos.y + eye + bob + (this.landT > 0 ? -0.08 * this.landT : 0),
      this.pos.z - Math.sin(this.yaw) * this.lean * 0.42 - Math.sin(this.yaw) * bobSide
    );
    cam.rotation.set(
      this.pitch + this.recoilPitch + sy,
      this.yaw,
      this.roll + sx,
      'YXZ'
    );
    const zoomFov = this.fov * (1 - this.adsT * (this.weapon && this.weapon.model === 'sniper' ? 0.62 : 0.22));
    if (Math.abs(cam.fov - zoomFov) > 0.05) {
      cam.fov = GF.damp(cam.fov, zoomFov, 14, dt || 0.016);
      cam.updateProjectionMatrix();
    }
    this.landT = Math.max(0, this.landT - (dt || 0.016) * 3);
    GFAudio.updateListener(cam);
  },

  /* ----------------------------- weapons ----------------------------- */
  updateAimSpread() {
    const w = this.weapon;
    let spread = w.spread * (1 - this.adsT * 0.55);
    spread *= 1 + Math.hypot(this.vel.x, this.vel.z) * 0.18;
    spread *= this.crouch ? 0.7 : 1;
    spread *= this.onGround ? 1 : 1.6;
    return GF.deg(spread);
  },

  tryFire() {
    const w = this.weapon;
    if (!w || this.reloadT > 0 || this.fireCd > 0 || this.equipT > 0) return;
    if (!w.melee && this.ammo <= 0) {
      if (GF.settings.autoReload) this.startReload();
      else GFAudio.click();
      return;
    }
    if (!w.auto) this.fireCd = Math.max(this.fireCd, 60 / w.rpm);
    else this.fireCd = 60 / w.rpm;

    if (!w.melee) this.ammo--;
    const cam = this.camera;
    const dir = new Vector3();
    cam.getWorldDirection(dir);
    const spread = this.updateAimSpread();
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread;
    dir.x += (Math.cos(a) * r) * 0.6;
    dir.y += Math.sin(a) * r * 0.6;
    dir.z += (Math.sin(a) * r) * 0.6;
    dir.normalize();
    const origin = cam.position.clone();

    if (w.explosive) {
      GF.Projectiles.spawn({ type: w.model === 'launcher' ? 'rocket' : 'shell', pos: origin.clone().addScaledVector(dir, 0.6), vel: dir.clone().multiplyScalar(42), radius: 6.5, damage: 120, owner: 'player', life: 4 });
    } else if (w.ammoType === 'flame') {
      for (let i = 0; i < 2; i++) {
        const d = dir.clone();
        d.x += (Math.random() - 0.5) * 0.12; d.y += (Math.random() - 0.5) * 0.08; d.z += (Math.random() - 0.5) * 0.12;
        GF.Projectiles.spawn({ type: 'flame', pos: origin.clone().addScaledVector(dir, 0.7), vel: d.multiplyScalar(22), radius: 0, damage: 0, owner: 'player', gravity: 2, life: 0.7 });
      }
      GF.Damage.addFire(origin.clone().addScaledVector(dir, 5), 1.8, 2.4, 26, 'player');
      GFAudio.ignite(origin);
    } else {
      const hit = GF.hitscan(origin, dir, w.effectiveRange, {});
      const end = hit ? hit.point : origin.clone().addScaledVector(dir, w.effectiveRange);
      if (hit) GF.applyHit(hit, w.dmg, dir, { weapon: w, source: 'player' });
      if (w.model !== 'shotgun' || Math.random() < 0.4) GF.Gore.tracer(this.muzzleWorld(), end);
      GFAudio.shot(w.sound, this.pos, { model: w.model });
      GF.Actors.alert(this.pos, 50);
    }

    /* recoil */
    const rg = w.recoil * (1 - this.adsT * 0.35) * (this.crouch ? 0.75 : 1);
    this.recoilPitch += GF.deg(rg * 0.42);
    this.yaw += GF.deg((Math.random() - 0.5) * rg * 0.18);
    this.recoil = Math.min(0.22, this.recoil + rg * 0.035);
    this.pitch = GF.clamp(this.pitch + GF.deg(rg * 0.16), -1.4, 1.4);
    this.muzzleT = 0.05;
    GF.CameraShake.add(rg * 0.06);

    if (this.weapon.model !== 'launcher') this.ejectShell();
    const mz = this.muzzleWorld();
    GF.Gore.muzzleFlash(mz, w.power * 0.9);
    /* propellant smoke drifts off the muzzle after every few rounds */
    if (Math.random() < 0.45) GF.Gore.smoke(mz, 1, 0x8a8580, 0.28);
    if (GF.UI) GF.UI.setWeapon(this.weapon, this.ammo, this.reserve);
    if (GF.UI && GF.UI.crossKick) GF.UI.crossKick(rg);
    if (this.ammo <= 0 && GF.settings.autoReload) this.startReload();
  },

  muzzleWorld() {
    const cam = this.camera;
    const dir = new Vector3();
    cam.getWorldDirection(dir);
    const right = new Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const up = new Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    return cam.position.clone().addScaledVector(dir, 0.75).addScaledVector(right, 0.14 * (1 - this.adsT)).addScaledVector(up, -0.1 - 0.02 * (1 - this.adsT));
  },

  startReload() {
    const w = this.weapon;
    if (!w || w.melee || this.reloadT > 0) return;
    if (this.ammo >= w.mag) return;
    this.reloadT = w.reload;
    this.reloadTotal = w.reload;
    this.adsT = 0;
    GFAudio.reload('out');
    if (this.held) this.held.userData.reloadPart = this.held.userData.parts.mag || null;
  },

  animateReload(p) {
    const held = this.held;
    if (!held) return;
    const parts = held.userData.parts || {};
    const root = held.userData.model;
    if (!root) return;
    const bob = Math.sin(p * Math.PI);
    root.rotation.z = bob * 0.5;
    root.rotation.x = -bob * 0.35;
    root.position.y = -bob * 0.05;
    if (parts.mag) {
      parts.mag.position.y = parts.mag.userData.baseY === undefined
        ? (parts.mag.userData.baseY = parts.mag.position.y)
        : parts.mag.userData.baseY - (p > 0.15 && p < 0.7 ? 0.12 : 0);
      parts.mag.visible = !(p > 0.25 && p < 0.55);
    }
    if (parts.slide) {
      if (parts.slide.userData.baseZ === undefined) parts.slide.userData.baseZ = parts.slide.position.z;
      parts.slide.position.z = parts.slide.userData.baseZ + (p > 0.75 ? -0.02 : 0);
    }
  },

  meleeSwing() {
    const w = this.weapon;
    if (this.fireCd > 0) return;
    this.fireCd = 60 / w.rpm;
    const cam = this.camera;
    const dir = new Vector3();
    cam.getWorldDirection(dir);
    const origin = cam.position.clone();
    const hit = GF.hitscan(origin, dir, w.reach + 0.4, {});
    GFAudio.whoosh(origin);
    GF.CameraShake.add(0.12);
    if (hit) {
      GF.applyHit(hit, w.dmg, dir, { weapon: w, source: 'player' });
      if (GF.UI && hit.type === 'actor') GF.UI.hitMark(true);
    }
    this.swingT = 0.3;
  },

  ejectShell() {
    if (GF.device === 'mobile' && GF.quality === 'low') return;
    const cam = this.camera;
    const right = new Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const up = new Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const m = new Mesh(GFP_SHELL_GEO, GFP_SHELL_MAT);
    m.position.copy(cam.position).addScaledVector(right, 0.22).addScaledVector(up, -0.14);
    m.userData.dynamic = true;
    this.scene.add(m);
    this.shellPool.push({
      mesh: m,
      v: new Vector3((Math.random() - 0.3) * 2, 1.5 + Math.random(), (Math.random() - 0.5) * 2).add(new Vector3(this.vel.x, 0, this.vel.z)),
      life: 2.4, spin: new Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12)
    });
    if (this.shellPool.length > 26) {
      const s = this.shellPool.shift();
      this.scene.remove(s.mesh);
    }
  },

  cycleWeapon(dir) {
    const owned = GF.Items.pickups;
    if (!owned.length) return;
    const i = owned.findIndex(p => p.def === this.weapon);
    const next = owned[(i + (dir > 0 ? 1 : -1) + owned.length) % owned.length];
    if (next) this.pickup(next);
  },

  quickSelect(i) {
    const p = GF.Items.pickups[i];
    if (p) this.pickup(p);
  },

  interact() {
    if (this.carried) { this.dropCarried(true); return; }
    const p = GF.Items.nearest(this.pos, 3.2);
    if (p) { this.pickup(p); return; }
    const body = this.nearestBody(2.7);
    if (body) { this.grabBody(body); return; }
    const prop = GF.World.propAt(this.pos, 1.6);
    if (prop && prop.def.explosive && !prop.armed) {
      prop.armed = true; prop.moving = true;
      GFAudio.beep(prop.pos, 900);
      GF.UI.toast('Charge armed');
    }
  },

  nearestBody(radius) {
    let best = null, bestD = radius || 2.7;
    for (const a of GF.Actors.list) {
      if (a.grabbed || !a.rag) continue;
      const c = a.rag.byKey.chest;
      const d = Math.hypot(c.x - this.pos.x, c.z - this.pos.z);
      if (d < bestD && Math.abs(c.y - (this.pos.y + 1.1)) < 1.6) { bestD = d; best = a; }
    }
    return best;
  },

  grabBody(a) {
    if (!a || a.grabbed || a === this.carried) return;
    a.grabbed = true;
    a.passive = true;
    a.target = null;
    a.targetPlayer = false;
    a.state = 'idle';
    this.carried = a;
    GFAudio.pickup();
    if (a.dead && a.rag) GFAudio.dragBody(a.rag.byKey.chest);
    if (GF.UI) GF.UI.toast((a.dead ? 'Corpse' : 'Hostage') + ' lifted \u00b7 F to throw');
  },

  dropCarried(thrown) {
    const a = this.carried;
    this.carried = null;
    if (!a) return;
    a.grabbed = false;
    a.passive = GF.sandbox && !GF.sandboxHostile;
    if (a.dead && a.rag) {
      a.rag.sleeping = false;
      a.rag.sleepTimer = 0;
      if (thrown) {
        const dir = new Vector3();
        this.camera.getWorldDirection(dir);
        dir.y = 0.18;
        dir.normalize();
        for (const n of a.rag.nodes) {
          if (n.detached) continue;
          n.px = n.x - dir.x * 0.065;
          n.py = n.y - dir.y * 0.065;
          n.pz = n.z - dir.z * 0.065;
        }
        GFAudio.whoosh(a.pos);
      }
    } else if (a.rag) {
      a.state = 'idle';
      a.passive = GF.sandbox && !GF.sandboxHostile;
    }
    if (a.dead && a.rag) GFAudio.playSample('ragdoll_thud', 0.45, a.rag.byKey.chest,
      { delay: thrown ? 0.45 : 0.12, rate: 0.9 + Math.random() * 0.16, maxDist: 40 });
    if (GF.UI) GF.UI.toast(thrown ? 'Body thrown' : 'Body dropped');
  },

  updateCarry(dt) {
    const a = this.carried;
    if (!a) return;
    if (!a.rag || a.rag.byKey.chest.detached) {
      a.grabbed = false;
      this.carried = null;
      return;
    }
    const dir = new Vector3();
    this.camera.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() < 1e-5) dir.set(0, 0, 1);
    dir.normalize();
    const yaw = Math.atan2(-dir.x, -dir.z);
    const fx = this.pos.x + dir.x * 0.95;
    const fz = this.pos.z + dir.z * 0.95;
    const fy = this.pos.y - 0.5;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    for (const n of a.rag.nodes) {
      if (n.detached) continue;
      n.x = fx + (n.rx * cy + n.rz * sy);
      n.y = fy + n.ry;
      n.z = fz + (-n.rx * sy + n.rz * cy);
      n.px = n.x; n.py = n.y; n.pz = n.z;
    }
    a.pos.set(fx, fy + 1.0, fz);
    a.rag.pinnedRoot.set(fx, fy, fz);
    a.rag.yaw = yaw;
    a.speedNow = 0;
    a.rag.updateBones();
  },

  pickup(p) {
    if (!p) return;
    this.equip(p.def, false);
    this.ammo = p.ammo || p.def.mag;
    this.reserve = p.def.reserve || 0;
    GF.Items.remove(p);
    GFAudio.pickup();
    if (GF.UI) GF.UI.setWeapon(this.weapon, this.ammo, this.reserve);
  },

  throwGrenade() {
    if (this.throwCd > 0) return;
    this.throwCd = 0.85;
    const cam = this.camera;
    const dir = new Vector3();
    cam.getWorldDirection(dir);
    const pos = cam.position.clone().addScaledVector(dir, 0.5);
    GF.Projectiles.spawn({
      type: 'grenade', pos,
      vel: dir.clone().multiplyScalar(16).add(new Vector3(0, 4.5, 0)).add(new Vector3(this.vel.x * 0.4, 0, this.vel.z * 0.4)),
      radius: 8, damage: 160, owner: 'player', fuse: 2.6, gravity: 24, life: 4
    });
    GFAudio.whoosh(pos);
    if (GF.UI) GF.UI.toast('Frag out');
  },

  shout() {
    if (GF.time - (this.shoutCd || 0) < 2) return;
    this.shoutCd = GF.time;
    const lines = ['Get down!', 'Contact!', 'Over here!', 'Reloading!', 'Cover me!', 'Moving!'];
    const text = GF.pick(lines);
    GFAudio.ui(180);
    if (GF.UI) GF.UI.toast('You: ' + text);
  },

  damage(amount, opts) {
    if (!this.alive) return;
    if (GF.time - (this.spawnTime || 0) < 2.5) return;
    this.health -= amount;
    this.damageT = 0;
    this.regenT = 0;
    GFAudio.hurt();
    GF.CameraShake.add(Math.min(0.6, amount * 0.012));
    if (GF.UI) {
      GF.UI.updateHealth(this.health);
      GF.UI.damageFlash(Math.min(1, amount / 40), opts && opts.dir);
    }
    if (this.health <= 0) this.die();
  },

  push(v) { this.vel.add(v); },

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.deadT = 0;
    this.health = 0;
    GFAudio.death();
    if (GF.UI) GF.UI.showDeath();
    GF.Actors.alert(this.pos, 30);
  },

  respawn() {
    const map = GF.World.map;
    const sp = map && map.spawn ? map.spawn.clone() : new Vector3(0, 0, 10);
    this.reset(sp, map ? map.spawnYaw || 0 : 0);
    if (GF.UI) { GF.UI.hideDeath(); GF.UI.updateHealth(this.health); }
    GF.Input.lock();
  },

  onKill(actor) {
    actor.feedShown = true;
    this.kills++;
    this.score += 100;
    if (GF.UI) GF.UI.killfeed(actor, true);
  },

  /* -------------------------- view model ----------------------------- */
  animateView(dt) {
    const held = this.held;
    if (!held) return;
    const root = held.userData.model;
    if (!root) return;
    const ads = this.adsT;
    const w = this.weapon;
    /* portrait screens have a very narrow horizontal FOV: pull the gun inboard
       and slightly further away so it stays on screen on phones */
    const aspK = GF.clamp((this.viewCamera.aspect || 1.75) / 1.75, 0.42, 1.05);
    const target = GFP_POS.set(GFP_HIP.x * aspK, GFP_HIP.y, GFP_HIP.z - (1 - aspK) * 0.12).lerp(GFP_ADS, ads);
    const bob = Math.sin(this.bobT * 2) * 0.006 * (GF.settings.headbob ? 1 : 0) * (1 - ads * 0.8);
    const bob2 = Math.cos(this.bobT) * 0.005 * (GF.settings.headbob ? 1 : 0) * (1 - ads * 0.8);
    const swayX = GF.damp(this.lastSwayX || 0, this.sway.x * 0.02, 8, dt);
    const swayY = GF.damp(this.lastSwayY || 0, this.sway.y * 0.02, 8, dt);
    this.lastSwayX = swayX; this.lastSwayY = swayY;
    held.position.set(
      target.x + bob2 + swayX * (1 - ads * 0.7),
      target.y + bob + swayY * (1 - ads * 0.7),
      target.z + this.recoil * 0.6
    );
    held.rotation.set(
      this.recoil * 0.5 + swayY * 2 + (this.equipT || 0) * 0.7,
      (1 - ads) * 0.19 + swayX * 2.4,
      (1 - ads) * 0.05 + this.lean * -0.05
    );
    /* reload transform overrides */
    if (this.reloadT > 0) {
      const p = 1 - this.reloadT / this.reloadTotal;
      const t = Math.sin(p * Math.PI);
      held.position.y -= t * 0.12;
      held.rotation.z += t * 0.55;
      held.rotation.x -= t * 0.4;
    }
    held.position.y += (this.swingT || 0) * 0.12;
    this.swingT = Math.max(0, (this.swingT || 0) - dt * 4);

    /* muzzle flash light inside view scene */
    this.muzzleT = Math.max(0, this.muzzleT - dt);
    if (this.muzzleT > 0) root.position.z += 0.012;

    for (let i = this.shellPool.length - 1; i >= 0; i--) {
      const s = this.shellPool[i];
      s.life -= dt;
      s.v.y -= 18 * dt;
      s.mesh.position.addScaledVector(s.v, dt);
      s.mesh.rotation.x += s.spin.x * dt;
      s.mesh.rotation.y += s.spin.y * dt;
      if (s.mesh.position.y < 0.02) { s.v.y *= -0.35; s.v.x *= 0.6; s.v.z *= 0.6; }
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.shellPool.splice(i, 1);
      }
    }
  },

  clearShells() {
    for (const s of this.shellPool) this.scene.remove(s.mesh);
    this.shellPool.length = 0;
  }
};
