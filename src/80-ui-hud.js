/* =====================================================================
   GORE TOWN — HUD, killfeed, speech subtitles, damage feedback, touch UI
   ===================================================================== */

GF.UI = {
  el: {},
  bubbles: [],
  kills: [],
  toastT: 0,
  hitT: 0,
  flash: 0,
  dead: false,

  init() {
    this.el = {
      hud: GF.$('#hud'),
      healthFill: GF.$('#health-fill'),
      healthNum: GF.$('#health-num'),
      ammoMag: GF.$('#ammo-mag'),
      ammoReserve: GF.$('#ammo-reserve'),
      weaponName: GF.$('#weapon-name'),
      weaponCal: GF.$('#weapon-cal'),
      kills: GF.$('#kills'),
      score: GF.$('#score'),
      crosshair: GF.$('#crosshair'),
      hitmarker: GF.$('#hitmarker'),
      vignette: GF.$('#vignette'),
      lowhp: GF.$('#lowhp'),
      toast: GF.$('#toast'),
      prompt: GF.$('#prompt'),
      feed: GF.$('#killfeed'),
      bubbles: GF.$('#bubbles'),
      fps: GF.$('#fps'),
      touch: GF.$('#touch'),
      spreadHint: GF.$('#spread-hint')
    };
    this.initTouch();
    this.initBloodFx();
    window.addEventListener('resize', () => { this.layout(); this.resizeFx(); });
    window.addEventListener('orientationchange', () => setTimeout(() => { this.layout(); this.resizeFx(); }, 120));
    document.addEventListener('visibilitychange', () => { if (document.hidden && GF.TouchReset) GF.TouchReset(); });
    this.layout();
  },

  layout() {
    const mobile = GF.device === 'mobile';
    GF.touch.enabled = mobile;
    document.body.classList.toggle('mobile', mobile);
    if (this.el.touch) this.el.touch.classList.toggle('on', mobile);
    const st = GF.$('#spawn-menu');
    if (st) st.classList.toggle('touch-mode', mobile);
    if (mobile) GF.TouchReset && GF.TouchReset();
  },

  /* ---------------------------- HUD state ---------------------------- */
  setWeapon(def, ammo, reserve) {
    if (!def) return;
    if (this.el.weaponName) this.el.weaponName.textContent = def.name;
    if (this.el.weaponCal) this.el.weaponCal.textContent = def.melee ? 'MELEE' : def.caliber;
    if (this.el.ammoMag) this.el.ammoMag.textContent = def.melee ? '—' : ammo;
    if (this.el.ammoReserve) this.el.ammoReserve.textContent = def.melee ? '' : '/ ' + reserve;
    this.lastWeapon = def;
  },

  updateHealth(h) {
    h = Math.max(0, Math.round(h));
    if (this.el.healthFill) this.el.healthFill.style.width = GF.clamp(h, 0, 100) + '%';
    if (this.el.healthNum) this.el.healthNum.textContent = h;
    if (this.el.lowhp) this.el.lowhp.classList.toggle('on', h < 35 && h > 0);
  },

  updateHUD(dt) {
    const p = GF.Player;
    if (!p) return;
    const dmgEl = this.el.dmgdir || (this.el.dmgdir = GF.$('#dmgdir'));
    if (dmgEl && this.dmgT > 0) {
      this.dmgT -= dt;
      dmgEl.style.opacity = Math.max(0, Math.min(1, this.dmgT)).toFixed(2);
    }
    this.updateBloodFx(dt);
    if (this.el.kills) this.el.kills.textContent = p.kills;
    if (this.el.score) this.el.score.textContent = GF.fmt(p.score);
    if (this.el.fps) this.el.fps.textContent = GF.settings.showFps ? Math.round(GF.stats.fps) + ' FPS' : '';
    if (this.el.crosshair && this.lastWeapon) {
      const spread = p.updateAimSpread ? p.updateAimSpread() : 0.02;
      const px = Math.max(3, Math.tan(spread) * (window.innerHeight * 0.5) / Math.tan(GF.deg(p.camera.fov) * 0.5) * 0.5);
      this.el.crosshair.style.setProperty('--gap', Math.min(46, px + 5) + 'px');
      this.el.crosshair.classList.toggle('ads', p.adsT > 0.6);
      this.el.crosshair.style.opacity = p.adsT > 0.85 && this.lastWeapon.model === 'sniper' ? '0' : '1';
    }
    /* interaction prompt */
    const near = GF.Items.nearest(p.pos, 3.2);
    if (this.el.prompt) {
      if (p.carried) {
        this.el.prompt.textContent = (GF.device === 'mobile' ? 'THROW  ' : '[F]  THROW  ') + (p.carried.dead ? 'CORPSE' : 'HOSTAGE');
        this.el.prompt.classList.add('on');
      } else if (near) {
        this.el.prompt.textContent = (GF.device === 'mobile' ? 'PICK UP  ' : '[F]  PICK UP  ') + near.def.name;
        this.el.prompt.classList.add('on');
      } else {
        const body = p.nearestBody ? p.nearestBody(2.7) : null;
        if (body) {
          this.el.prompt.textContent = (GF.device === 'mobile' ? 'LIFT BODY' : '[F]  LIFT BODY');
          this.el.prompt.classList.add('on');
        } else this.el.prompt.classList.remove('on');
      }
    }
    /* feedback decays */
    this.flash = Math.max(0, this.flash - dt * 1.6);
    if (this.el.vignette) this.el.vignette.style.opacity = (this.flash * 0.85).toFixed(3);
    this.hitT = Math.max(0, this.hitT - dt * 3.2);
    if (this.el.hitmarker) this.el.hitmarker.style.opacity = this.hitT.toFixed(2);
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0 && this.el.toast) this.el.toast.classList.remove('on');
    }
    this.updateBubbles(dt);
    this.updateFeed(dt);
  },

  damageFlash(amount, dir) {
    this.flash = Math.min(1, this.flash + amount);
    if (GF.device === 'mobile' && navigator.vibrate) navigator.vibrate(30);
    const el = this.el.dmgdir || (this.el.dmgdir = GF.$('#dmgdir'));
    if (el && dir && GF.Player) {
      const yaw = GF.Player.yaw;
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      const rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const ix = -dir.x, iz = -dir.z;
      const f = ix * fx + iz * fz, r = ix * rx + iz * rz;
      el.style.transform = 'rotate(' + Math.atan2(r, f).toFixed(3) + 'rad)';
      el.style.opacity = '1';
      this.dmgT = 1.1;
    }
  },
  hitMark(kill) {
    this.hitT = 1;
    if (this.el.hitmarker) this.el.hitmarker.classList.toggle('kill', !!kill);
  },
  crossKick(v) {
    if (this.el.crosshair) this.el.crosshair.classList.add('kick');
    clearTimeout(this._kickT);
    this._kickT = setTimeout(() => { if (this.el.crosshair) this.el.crosshair.classList.remove('kick'); }, 70);
  },

  toast(text, dur) {
    if (!this.el.toast) return;
    this.el.toast.textContent = text;
    this.el.toast.classList.add('on');
    this.toastT = dur || 2.2;
  },

  /* ---------------------------- killfeed ---------------------------- */
  killfeed(actor, byPlayer) {
    if (!this.el.feed || !actor) return;
    const row = GF.el('div', 'feed-row');
    const name = actor.type.name;
    row.innerHTML = '<span class="feed-k">' + (byPlayer ? 'YOU' : 'KIA') + '</span><span class="feed-n">' + name + '</span>';
    this.el.feed.appendChild(row);
    this.kills.push({ el: row, life: 6 });
    while (this.kills.length > 6) {
      const k = this.kills.shift();
      k.el.remove();
    }
  },
  updateFeed(dt) {
    for (let i = this.kills.length - 1; i >= 0; i--) {
      const k = this.kills[i];
      k.life -= dt;
      k.el.style.opacity = Math.min(1, k.life / 1.2).toFixed(2);
      if (k.life <= 0) { k.el.remove(); this.kills.splice(i, 1); }
    }
  },

  /* --------------------------- subtitles ---------------------------- */
  bubble(actor, text, dur) {
    if (!this.el.bubbles || !actor || !actor.rag) return;
    if (this.bubbles.length > 8) {
      const old = this.bubbles.shift();
      old.el.remove();
    }
    const el = GF.el('div', 'bubble', '<b>' + actor.type.name.split(' ')[0] + '</b> ' + text);
    this.el.bubbles.appendChild(el);
    this.bubbles.push({ el, actor, life: dur || 3.2 });
  },
  updateBubbles(dt) {
    const cam = GF.Player.camera;
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.life -= dt;
      if (b.life <= 0) { b.el.remove(); this.bubbles.splice(i, 1); continue; }
      const a = b.actor;
      if (!a || !a.rag || a.rag.dead) { b.el.remove(); this.bubbles.splice(i, 1); continue; }
      const c = a.rag.byKey.head;
      GFR_V1.set(c.x, c.y + 0.38, c.z);
      GFR_V1.project(cam);
      const dist = cam.position.distanceTo(new Vector3(c.x, c.y, c.z));
      if (GFR_V1.z > 1 || dist > 45) { b.el.style.display = 'none'; continue; }
      b.el.style.display = 'block';
      b.el.style.left = ((GFR_V1.x * 0.5 + 0.5) * w) + 'px';
      b.el.style.top = ((-GFR_V1.y * 0.5 + 0.5) * h) + 'px';
      b.el.style.opacity = Math.min(1, b.life).toFixed(2);
      b.el.style.transform = 'translate(-50%,-100%) scale(' + GF.clamp(1.15 - dist / 60, 0.7, 1.05) + ')';
    }
  },

  /* -------------------------- touch controls ------------------------ */
  initTouch() {
    const root = this.el.touch;
    if (!root) return;
    const stick = GF.$('#stick-move');
    const knob = GF.$('#stick-move-knob');
    const look = GF.$('#look-zone');
    const moveZone = GF.$('#move-zone');
    if (!look) return;

    const R = 58;
    const center = { x: 0, y: 0 };
    let moveId = null, lookId = null;
    let lastLX = 0, lastLY = 0;

    /* the stick is a floating pad: it jumps to wherever the left thumb lands
       so the player never has to find a fixed circle in the middle of a fight */
    const stickHome = () => {
      if (stick) {
        stick.style.left = ''; stick.style.top = ''; stick.style.bottom = '';
        stick.classList.remove('active');
      }
      if (knob) knob.style.transform = 'translate(0,0)';
    };
    const stickPlace = (x, y) => {
      if (!stick) return;
      const half = (stick.offsetWidth || 150) / 2;
      const px = GF.clamp(x, half + 4, window.innerWidth - half - 4);
      const py = GF.clamp(y, half + 4, window.innerHeight - half - 4);
      stick.style.left = (px - half) + 'px';
      stick.style.top = (py - half) + 'px';
      stick.style.bottom = 'auto';
      stick.classList.add('active');
      center.x = px;
      center.y = py;
    };
    const updateMove = (t) => {
      let dx = t.clientX - center.x, dy = t.clientY - center.y;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      if (knob) knob.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      GF.touch.moveX = GF.clamp(dx / R, -1, 1);
      GF.touch.moveY = GF.clamp(-dy / R, -1, 1);
      GF.touch.sprint = (dy < -R * 0.8);
    };
    const resetMove = () => {
      moveId = null;
      GF.touch.moveX = 0; GF.touch.moveY = 0; GF.touch.sprint = false;
      if (knob) knob.style.transform = 'translate(0,0)';
      stickHome();
    };
    const startMove = (e) => {
      if (moveId !== null) return;
      if (!e.changedTouches || !e.changedTouches.length) return;
      const t = e.changedTouches[0];
      moveId = t.identifier;
      stickPlace(t.clientX, t.clientY);
      updateMove(t);
      e.preventDefault();
    };
    const endMove = (e) => {
      for (const t of e.changedTouches) if (t.identifier === moveId) { resetMove(); return; }
    };
    const movePad = moveZone || stick;
    if (movePad) {
      movePad.addEventListener('touchstart', startMove, { passive: false });
      movePad.addEventListener('touchmove', (e) => {
        let handled = false;
        for (const t of e.changedTouches) if (t.identifier === moveId) { updateMove(t); handled = true; }
        if (handled) e.preventDefault();
      }, { passive: false });
      movePad.addEventListener('touchend', endMove);
      movePad.addEventListener('touchcancel', endMove);
    }

    /* Look is tracked over the whole touch layer, not just the pad. The fire
       button keeps its press state, and the same thumb can slide away from it
       to turn the camera while the trigger is still down, so you can strafe
       with the left pad, hold fire and track a target at the same time.
       Window capture is used because the buttons stop propagation. */
    const looks = new Map();
    let activeLook = null;
    const dropLook = (e) => {
      for (const t of e.changedTouches) {
        looks.delete(t.identifier);
        if (activeLook === t.identifier) activeLook = null;
      }
    };
    const lookStart = (e) => {
      if (!e.changedTouches) return;
      for (const t of e.changedTouches) {
        if (!e.target || !root || !root.contains(e.target)) continue;
        if (movePad && movePad.contains(e.target)) continue;
        if (looks.has(t.identifier)) continue;
        looks.set(t.identifier, { x: t.clientX, y: t.clientY, ox: t.clientX, oy: t.clientY, on: false });
      }
    };
    const lookMove = (e) => {
      if (!e.changedTouches) return;
      for (const t of e.changedTouches) {
        const L = looks.get(t.identifier);
        if (!L) continue;
        const dx = t.clientX - L.x, dy = t.clientY - L.y;
        L.x = t.clientX; L.y = t.clientY;
        if (!L.on) {
          /* ignore the first few pixels so a tap stays a tap */
          if (Math.hypot(t.clientX - L.ox, t.clientY - L.oy) < 8) continue;
          if (activeLook !== null) { looks.delete(t.identifier); continue; }
          L.on = true;
          activeLook = t.identifier;
          continue;
        }
        /* drop warped deltas from a jammed touch stream */
        if (Math.abs(dx) > 260 || Math.abs(dy) > 260) continue;
        GF.touch.lookDX += dx;
        GF.touch.lookDY += dy;
      }
    };
    window.addEventListener('touchstart', lookStart, { capture: true, passive: true });
    window.addEventListener('touchmove', lookMove, { capture: true, passive: true });
    window.addEventListener('touchend', dropLook, true);
    window.addEventListener('touchcancel', dropLook, true);
    look.addEventListener('contextmenu', (e) => e.preventDefault());
    /* drag-look with a mouse as well, so touch mode is testable on desktop */
    look.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      lookId = -1; lastLX = e.clientX; lastLY = e.clientY;
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (lookId !== -1) return;
      GF.touch.lookDX += e.clientX - lastLX;
      GF.touch.lookDY += e.clientY - lastLY;
      lastLX = e.clientX; lastLY = e.clientY;
    });
    window.addEventListener('mouseup', () => { if (lookId === -1) lookId = null; });

    const bindHold = (id, on) => {
      const el = GF.$(id);
      if (!el) return;
      const press = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        el.classList.add('down');
        on(true);
      };
      const release = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        el.classList.remove('down');
        on(false);
      };
      el.addEventListener('touchstart', press, { passive: false });
      el.addEventListener('touchend', release, { passive: false });
      el.addEventListener('touchcancel', release);
      el.addEventListener('mousedown', press);
      el.addEventListener('mouseup', release);
      el.addEventListener('mouseleave', () => release());
    };
    bindHold('#btn-fire', (v) => {
      GF.touch.fire = v;
      if (v && navigator.vibrate) navigator.vibrate(6);
    });
    /* aim latches: tap once to raise the sights, tap again to drop them */
    const aimBtn = GF.$('#btn-aim');
    const setAim = (v) => {
      GF.touch.aim = v;
      if (aimBtn) {
        aimBtn.classList.toggle('latched', v);
        aimBtn.classList.toggle('down', v);
      }
    };
    if (aimBtn) {
      const flipAim = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        setAim(!GF.touch.aim);
        if (navigator.vibrate) navigator.vibrate(8);
      };
      aimBtn.addEventListener('touchstart', flipAim, { passive: false });
      aimBtn.addEventListener('mousedown', flipAim);
    }
    bindHold('#btn-lean-l', (v) => { GF.touch.lean = v ? -1 : 0; });
    bindHold('#btn-lean-r', (v) => { GF.touch.lean = v ? 1 : 0; });

    const bindTap = (id, fn) => {
      const el = GF.$(id);
      if (!el) return;
      let fired = false;
      const go = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (fired) return;
        fired = true;
        setTimeout(() => { fired = false; }, 100);
        el.classList.add('down');
        setTimeout(() => el.classList.remove('down'), 110);
        fn();
      };
      el.addEventListener('touchstart', go, { passive: false });
      el.addEventListener('click', (e) => { if (e.detail) go(e); });
    };
    bindTap('#btn-reload', () => GF.Player.startReload());
    bindTap('#btn-jump', () => GF.Player.tryJump());
    bindTap('#btn-crouch', () => {
      GF.touch.crouch = !GF.touch.crouch;
      const b = GF.$('#btn-crouch');
      if (b) b.classList.toggle('latched', GF.touch.crouch);
    });
    bindTap('#btn-grenade', () => GF.Player.throwGrenade());
    bindTap('#btn-interact', () => GF.Player.interact());
    bindTap('#btn-swap', () => GF.Player.swapWeapon());
    bindTap('#btn-menu', () => GF.UI.openSpawnMenu());
    bindTap('#btn-pause', () => GF.UI.togglePause());
  },

  /* ------------------------ blood on the lens ----------------------- */
  initBloodFx() {
    this.fx = GF.$('#bloodfx');
    if (!this.fx) return;
    this.fxctx = this.fx.getContext('2d');
    this.resizeFx();
    this.bloodFade = 0;
    this.fxAcc = 0;
  },

  resizeFx() {
    if (!this.fx) return;
    this.fx.width = Math.max(2, Math.round(window.innerWidth * 0.55));
    this.fx.height = Math.max(2, Math.round(window.innerHeight * 0.55));
  },

  splatter(amount) {
    if (!this.fxctx) return;
    if (GF.quality === 'low' && GF.device === 'mobile') return;
    const g = this.fxctx, W = this.fx.width, H = this.fx.height;
    const a = GF.clamp(amount || 0.4, 0.05, 1);
    const blobs = 2 + Math.round(a * 4);
    for (let i = 0; i < blobs; i++) {
      /* hits land on the rim of vision, never in the middle of the sight picture */
      const edge = Math.random();
      let x, y;
      if (edge < 0.55) { x = Math.random() * W; y = Math.random() < 0.5 ? Math.random() * H * 0.16 : H - Math.random() * H * 0.16; }
      else { x = Math.random() < 0.5 ? Math.random() * W * 0.14 : W - Math.random() * W * 0.14; y = Math.random() * H; }
      const r = (4 + Math.random() * 20) * (0.7 + a);
      const rg = g.createRadialGradient(x, y, r * 0.12, x, y, r);
      rg.addColorStop(0, 'rgba(88,8,6,' + (0.32 + Math.random() * 0.25).toFixed(2) + ')');
      rg.addColorStop(0.5, 'rgba(64,6,5,' + (0.22 + Math.random() * 0.2).toFixed(2) + ')');
      rg.addColorStop(1, 'rgba(40,3,2,0)');
      g.fillStyle = rg;
      g.beginPath();
      g.ellipse(x, y, r, r * (0.5 + Math.random() * 0.8), Math.random() * 3.14, 0, 7);
      g.fill();
      g.fillStyle = 'rgba(74,7,5,0.3)';
      for (let k = 0; k < 3; k++) {
        const aa = Math.random() * 6.28, dd = r * (0.8 + Math.random() * 1.1);
        g.beginPath();
        g.ellipse(x + Math.cos(aa) * dd, y + Math.sin(aa) * dd, 0.6 + Math.random() * 2.6, 0.6 + Math.random() * 2.4, aa, 0, 7);
        g.fill();
      }
    }
    this.bloodFade = 1;
  },

  updateBloodFx(dt) {
    if (!this.fxctx || this.bloodFade <= 0) return;
    this.fxAcc += dt;
    if (this.fxAcc < 0.12) return;
    this.fxAcc = 0;
    const g = this.fxctx;
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = 'rgba(0,0,0,0.11)';
    g.fillRect(0, 0, this.fx.width, this.fx.height);
    g.restore();
    this.bloodFade -= 0.03;
  },

  /* --------------------------- menus / state ------------------------ */
  showDeath() {
    this.dead = true;
    this.closeAllOverlays();
    const el = GF.$('#death');
    if (el) el.classList.add('on');
    const k = GF.$('#death-kills'), s = GF.$('#death-score');
    if (k) k.textContent = GF.Player.kills;
    if (s) s.textContent = GF.Player.score;
    GF.Input.unlock();
  },
  hideDeath() {
    this.dead = false;
    const el = GF.$('#death');
    if (el) el.classList.remove('on');
  },

  togglePause() {
    if (GF.state === 'play') {
      GF.state = 'pause';
      const el = GF.$('#pause');
      if (el) el.classList.add('on');
      GF.Input.unlock();
      if (window.speechSynthesis) speechSynthesis.cancel();
    } else if (GF.state === 'pause') {
      GF.state = 'play';
      const el = GF.$('#pause');
      if (el) el.classList.remove('on');
      GF.Input.lock();
    }
  },

  showHUD(on) {
    if (this.el.hud) this.el.hud.classList.toggle('hidden', !on);
  },

  closeAllOverlays() {
    for (const id of ['#pause', '#death', '#panel', '#spawn-menu']) {
      const el = GF.$(id);
      if (el) el.classList.remove('on');
    }
    this.dead = false;
  }
};

/* release every held touch control (pause, death, map change) */
GF.TouchReset = function () {
  GF.touch.moveX = 0; GF.touch.moveY = 0;
  GF.touch.lookDX = 0; GF.touch.lookDY = 0;
  GF.touch.fire = false; GF.touch.aim = false; GF.touch.lean = 0; GF.touch.sprint = false;
  const k = GF.$('#stick-move-knob');
  if (k) k.style.transform = 'translate(0,0)';
  const s = GF.$('#stick-move');
  if (s) { s.style.left = ''; s.style.top = ''; s.style.bottom = ''; s.classList.remove('active'); }
  for (const id of ['#btn-fire', '#btn-aim', '#btn-lean-l', '#btn-lean-r']) {
    const b = GF.$(id);
    if (b) b.classList.remove('down', 'latched');
  }
};
