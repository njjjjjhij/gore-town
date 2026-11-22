/* =====================================================================
   GORE TOWN — actors and AI
   Perception uses a vision cone with line-of-sight, memory of last known
   positions and hearing. Combat AI takes cover, peeks, flanks, suppresses,
   throws grenades, calls out contacts to nearby squadmates and recovers
   when its path is blocked. All hot paths reuse scratch vectors.
   ===================================================================== */

GF.BARKS = {
  soldier: ['Contact front!', 'Hostile! Take him down!', 'Moving up!', 'Cover me, reloading!', 'He is behind the wall!', 'Suppressing fire!', 'Man down, man down!', 'Flanking left!'],
  elite: ['Target acquired.', 'Flanking.', 'Sector clear. Moving.', 'Neutralising.', 'Watch your fire.', 'Pushing up.'],
  sniper: ['One shot, one kill.', 'Wind is calm.', 'Clear line of sight.', 'You are in my scope.'],
  guard: ['Stop right there!', 'You are trespassing.', 'Security, we have a problem!', 'Back away!'],
  aggressive: ['Come here!', 'You are dead!', 'I will tear you apart!', 'No running!'],
  berserk: ['RAAAGH!', 'Blood! Blood! Blood!', 'I will break every bone!', 'Kill!'],
  maniac: ['Fresh meat!', 'I can smell your fear!', 'Run, little rabbit!', 'More blood for the floor!'],
  civilian: ['Please, no!', 'Help me!', 'Oh god, oh god!', 'Somebody call the police!', 'I have a family!', 'Do not hurt me!'],
  zombie: ['Uuuhhhh...', 'Braaains...', 'Hrrrgh...', 'Fleeesh...'],
  cult: ['The blood is the gift!', 'He will rise again!', 'Your soul is ours!', 'Blessed is the wound!'],
  robot: ['Target acquired.', 'Lethal force authorised.', 'Unit compromised.', 'Recalibrating.', 'Hostile neutralised.'],
  passive: ['...', 'Hit me again.', 'That tickles.'],
  medic: ['Hold still, I have you.', 'Applying pressure.', 'Stay with me!'],
  bomber: ['For the cause!', 'We go together!', 'No fear!'],
  hunter: ['Quiet now...', 'I see you.', 'Easy shot.']
};

GF.Voice = {
  last: 0,
  say(actor, text, opts) {
    opts = opts || {};
    if (!text) return;
    if (GF.time - this.last < 0.7 && !opts.force) return;
    this.last = GF.time;
    if (GF.UI && GF.UI.bubble) GF.UI.bubble(actor, text, opts.dur || 3.4);
    if (!GF.settings.voice) return;
    if (!window.speechSynthesis) return;
    const chest = actor.rag && actor.rag.byKey ? actor.rag.byKey.chest : actor.pos;
    if (GF.World && GF.Player) {
      const p = GF.Player.pos;
      if (Math.hypot(chest.x - p.x, chest.z - p.z) > 34) return;
    }
    const kind = actor.type.behavior;
    let clip = null;
    if (kind === 'zombie') clip = Math.random() < 0.5 ? 'zombie_growl' : 'zombie_attack';
    else if (kind === 'civilian') {
      clip = /help|police|family/i.test(text) ? 'civilian_help'
        : /no|hurt|touch/i.test(text) ? 'civilian_no' : 'civilian_scream';
    } else if (/frag|grenade|heads down/i.test(text)) clip = 'soldier_frag';
    else if (/reload|weapon up|upgraded/i.test(text)) clip = 'soldier_reload';
    else if (/man down|medic|pressure|stay with/i.test(text)) clip = 'soldier_man_down';
    else if (/push|move|flank|advance/i.test(text)) clip = 'soldier_push';
    else if (/clear|neutral|sector/i.test(text)) clip = 'soldier_clear';
    else if (/contact|hostile|target|shot|engaging/i.test(text)) clip = 'soldier_contact';
    else if (/raagh|blood|kill|fear|meat/i.test(text)) clip = 'scream_male';
    else if (kind === 'soldier' || kind === 'hunter' || kind === 'medic' || kind === 'bomber') clip = 'soldier_contact';
    const pitch = GF.clamp((actor.type.voicePitch || 1) * (0.94 + Math.random() * 0.12), 0.82, 1.18);
    if (clip) {
      if (GFAudio.playSample(clip, 0.7, chest, { rate: pitch, maxDist: 42 })) return;
      /* while the embedded bank decodes, stay silent instead of dropping back
         to a flat browser voice */
      if (GFAudio.sampleLoading) return;
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = GF.clamp(pitch * (0.9 + Math.random() * 0.12), 0.4, 1.8);
      u.rate = 0.95 + Math.random() * 0.2;
      u.volume = GF.clamp(GF.settings.volume * 0.55, 0, 1);
      speechSynthesis.speak(u);
    } catch (e) { }
  },
  bark(actor, kind) {
    const lines = GF.BARKS[kind] || GF.BARKS.soldier;
    this.say(actor, GF.pick(lines));
  }
};

const GFA_EYE = new Vector3();
const GFA_TP = new Vector3();
const GFA_DIR = new Vector3();
const GFA_TMP = new Vector3();
const GFA_MOVE = new Vector3();
const GFA_CHEST = { x: 0, y: 0, z: 0 };

class GFActor {
  constructor(type, pos, opts) {
    opts = opts || {};
    this.type = type;
    this.hp = type.hp;
    this.maxHp = type.hp;
    this.pos = pos.clone();
    this.home = pos.clone();
    this.yaw = opts.yaw === undefined ? Math.random() * Math.PI * 2 : opts.yaw;
    this.weapon = GF.weaponById(type.weapon) || null;
    this.ammo = this.weapon && this.weapon.mag ? this.weapon.mag : 0;
    this.reloadT = 0;
    this.fireCd = GF.rand(0.4, 1.6);
    this.burst = 3 + GF.randInt(3);
    this.thinkT = Math.random() * 0.3;
    this.target = null;
    this.targetPlayer = false;
    this.targetDist = 999;
    this.state = 'idle';
    this.dead = false;
    this.deadTime = 0;
    this.age = 0;
    this.swing = 0;
    this.swingCd = 0;
    this.aimPitch = 0;
    this.speedNow = 0;
    this.poseMode = 'idle';
    this.alerted = 0;
    this.memory = 12;
    this.lastKnown = null;
    this.wander = this.home.clone();
    this.wanderT = GF.rand(2, 8);
    this.chatCd = GF.rand(9, 26);
    this.flinch = 0;
    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
    this.strafeT = GF.rand(1, 3);
    this.healT = GF.rand(2, 5);
    this.bomberFuse = -1;
    this.cover = null;
    this.coverT = 0;
    this.coverCd = GF.rand(0.6, 2.4);
    this.peeking = 0;
    this.suppress = 0;
    this.stuckScore = 0;
    this.detour = null;
    this.reaction = GF.rand(0.15, 0.5);
    this.passive = false;
    this.provoked = 0;
    this.grabbed = false;
    this.lootCd = 0;
    this.grenades = (type.behavior === 'soldier' || type.behavior === 'elite') ? 2 : 0;
    this.grenadeCd = GF.rand(5, 12);
    this.role = 'advance';
    this.flankSide = Math.random() < 0.5 ? -1 : 1;
    this.burning = 0;
    this.burnTick = 0;
    this.skill = type.behavior === 'elite' ? 1.35 : type.behavior === 'sniper' ? 1.5 :
      type.behavior === 'soldier' ? 1.0 : type.behavior === 'zombie' ? 0.7 :
        type.behavior === 'maniac' || type.behavior === 'berserk' ? 0.85 :
          type.behavior === 'guard' ? 0.95 : 0.55;
    this.spawnTime = GF.time;
    this.rag = new GFRagdoll(type, pos, this.yaw, { weapon: type.weapon });
    this.rag.group.userData.actor = this;
    if (GF.Actors.scene) GF.Actors.scene.add(this.rag.group);
    this.updateGround();
    this.rag.pinnedRoot.copy(this.pos);
    this.rag.setPose(0, 0, 'idle', 0);
  }

  updateGround() {
    const g = GF.World.groundAt(this.pos.x, this.pos.z, this.pos.y + 2.2);
    if (g > -1e8) this.pos.y = g;
  }

  chest(out) {
    const c = this.rag.byKey.chest;
    out = out || GFA_CHEST;
    out.x = c.x; out.y = c.y; out.z = c.z;
    return out;
  }

  /* --------------------------- perception --------------------------- */
  alertTo(pos, silent) {
    const fresh = this.alerted < 1.2;
    this.lastKnown = pos.clone();
    this.memory = 0;
    this.alerted = 11;
    this.wander.copy(pos);
    if (!silent && fresh && Math.random() < 0.4) GF.Voice.bark(this, this.type.behavior);
    if (!this.target && this.type.aggressive) this.state = 'investigate';
    if (this.state === 'idle' || this.state === 'wander') this.state = 'investigate';
    /* pass it on to nearby allies */
    if (GF.time - (this._shoutT || 0) > 4) {
      this._shoutT = GF.time;
      GF.Actors.alert(pos, 9, this);
    }
  }

  detectRange() {
    if (this.type.behavior === 'sniper') return 78;
    if (this.type.behavior === 'civilian') return 22;
    if (this.type.behavior === 'zombie') return 26;
    if (this.type.behavior === 'hunter') return 55;
    return this.alerted > 0 ? 56 : 44;
  }

  canSee(tx, ty, tz, dist) {
    const eye = this.rag.byKey.chest;
    const ex = eye.x, ey = eye.y + 0.26, ez = eye.z;
    const dx = tx - ex, dy = ty - ey, dz = tz - ez;
    const horiz = Math.hypot(dx, dz);
    if (horiz > 0.001) {
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      const dot = (dx * fx + dz * fz) / horiz;
      /* wide cone when hunting, narrow when idle and unaware */
      const cone = (this.target || this.alerted > 0) ? 0.05 : (horiz < 4.5 ? -0.3 : 0.32);
      if (dot < cone) return false;
    }
    const len = Math.hypot(dx, dy, dz) || 0.001;
    return !GF.World.blockedRay(ex, ey, ez, dx / len, dy / len, dz / len, dist - 0.35);
  }

  perceive(dt) {
    this.memory += dt;
    const eye = this.rag.byKey.chest;
    const ex = eye.x, ez = eye.z;
    const range = this.detectRange();
    let best = null, bestScore = -1e9, bestDist = 999;

    const consider = (entity, isPlayer) => {
      /* freshly respawned players get a short grace window, not the AI */
      if (isPlayer && (!GF.Player.alive || GF.time - (GF.Player.spawnTime || 0) < 2.5)) return;
      let tx, ty, tz;
      if (isPlayer) { tx = GF.Player.pos.x; ty = GF.Player.pos.y + 1.2; tz = GF.Player.pos.z; }
      else {
        const c = entity.rag.byKey.chest;
        tx = c.x; ty = c.y; tz = c.z;
      }
      const dx = tx - ex, dz = tz - ez;
      const flat = Math.hypot(dx, dz);
      if (flat > range) return;
      const dist = Math.hypot(dx, ty - eye.y, dz);
      /* a wounded, enraged or alerted actor reacts to anything nearby */
      if (!this.canSee(tx, ty, tz, dist)) {
        if (!(dist < 2.2 && flat < 2.2)) return;
      }
      let score = (1 - flat / range) * 22;
      if (isPlayer) score += 30;
      if (this.target === entity) score += 14;
      if (entity && !isPlayer && entity.hp < entity.maxHp * 0.35) score += 8;
      if (score > bestScore) { bestScore = score; best = entity; bestDist = dist; }
    };

    consider(GF.Player, true);
    for (const a of GF.Actors.list) {
      if (a === this || a.dead) continue;
      if (this.type.faction === a.type.faction) continue;
      if (!GF.factionsHostile(this.type.faction, a.type.faction) && this.type.faction !== 'zombie') continue;
      consider(a, false);
    }

    if (best) {
      if (!this.target) {
        this.reaction = GF.rand(0.18, 0.55) / Math.max(0.6, this.skill);
        if (Math.random() < 0.55) GF.Voice.bark(this, this.type.behavior);
      }
      this.target = best;
      this.targetPlayer = !!(best === GF.Player);
      this.targetDist = bestDist;
      this.memory = 0;
      this.alerted = Math.max(this.alerted, 9);
      const c = this.chest();
      this.lastKnown = new Vector3(c.x, c.y, c.z);
      /* squad radio: pass the contact to allies who have not spotted it */
      if (!this.calledOut || GF.time - this.calledOut > 6) {
        this.calledOut = GF.time;
        for (const ally of GF.Actors.list) {
          if (ally === this || ally.dead || ally.passive || ally.target) continue;
          if (ally.type.faction !== this.type.faction) continue;
          if (Math.hypot(ally.pos.x - this.pos.x, ally.pos.z - this.pos.z) > 22) continue;
          ally.alertTo(this.lastKnown, true);
        }
      }
      if (this.state === 'idle' || this.state === 'wander' || this.state === 'investigate') {
        this.state = this.chooseCombatState(bestDist);
        if (this.type.behavior === 'soldier' || this.type.behavior === 'elite') GF.Actors.assignRoles(this);
      }
    } else if (this.target) {
      /* lost visual: go to the last known position and sweep */
      this.target = null;
      this.targetPlayer = false;
      this.state = (this.type.aggressive || this.alerted > 0) ? 'investigate' : 'wander';
    }
  }

  chooseCombatState(dist) {
    const b = this.type.behavior;
    if (b === 'civilian') return 'flee';
    if (b === 'medic' && dist > 10) return 'support';
    if (b === 'bomber') return 'chase';
    if (this.weapon && !this.weapon.melee) {
      if (this.hp < this.maxHp * 0.4 && this.coverCd <= 0) return 'cover';
      if (dist > 26 && this.role === 'suppress') return 'attack';
      if (dist > 20) return 'chase';
      return 'attack';
    }
    return dist > 2.2 ? 'chase' : 'attack';
  }

  /* ----------------------------- movement ---------------------------- */
  blocked(x, z) {
    const near = GF.World.queryNear(x, z, 0.55);
    for (let i = 0; i < near.length; i++) {
      const c = near[i];
      if (x > c.x0 - 0.3 && x < c.x1 + 0.3 && z > c.z0 - 0.3 && z < c.z1 + 0.3) {
        if (c.y1 > this.pos.y + 0.5 && c.y0 < this.pos.y + 1.65) return true;
      }
    }
    return false;
  }

  tryStep(dx, dz, step) {
    const nx = this.pos.x + dx * step, nz = this.pos.z + dz * step;
    if (this.blocked(nx, nz)) return false;
    this.pos.x = nx; this.pos.z = nz;
    const g = GF.World.groundAt(nx, nz, this.pos.y + 1.9);
    if (g > -1e8 && Math.abs(g - this.pos.y) < 1.4) this.pos.y = g;
    return true;
  }

  moveTowards(dest, speed, dt) {
    let dx = dest.x - this.pos.x, dz = dest.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.3) { this.speedNow *= 0.4; return; }
    dx /= d; dz /= d;
    const step = Math.max(0.001, speed * dt);
    let moved = false;

    if (this.detour) {
      const t = this.detour;
      if (Math.hypot(t.x - this.pos.x, t.z - this.pos.z) < 0.5 || this.detourT <= 0) this.detour = null;
      else {
        dx = t.x - this.pos.x; dz = t.z - this.pos.z;
        const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      }
    }
    if (this.tryStep(dx, dz, step)) moved = true;
    else {
      /* sweep the smallest useful angle away from the obstacle */
      const angles = [0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.6, -1.6, 2.1, -2.1, 2.6, -2.6];
      for (let i = 0; i < angles.length; i++) {
        const a = angles[i] * this.strafeDir;
        const ca = Math.cos(a), sa = Math.sin(a);
        const rx = dx * ca - dz * sa, rz = dx * sa + dz * ca;
        if (this.tryStep(rx, rz, step)) { moved = true; break; }
      }
    }
    if (moved) {
      this.speedNow = speed;
      this.stuckScore = Math.max(0, this.stuckScore - dt * 2.2);
      this.yaw = GF.angleDamp(this.yaw, Math.atan2(dx, dz), 8, dt);
    } else {
      this.speedNow = 0;
      this.stuckScore += dt;
      if (this.stuckScore > 1.1) this.unstick();
    }
    if (this.pos.y < -25) { this.pos.set(this.home.x, this.home.y + 0.5, this.home.z); }
  }

  unstick() {
    this.stuckScore = 0;
    const angles = [0.9, -0.9, 1.8, -1.8, 2.7, -2.7];
    for (let i = 0; i < angles.length; i++) {
      const a = Math.atan2(this.pos.z - this.home.z, this.pos.x - this.home.x) + angles[i];
      const x = this.pos.x + Math.cos(a) * 2.6, z = this.pos.z + Math.sin(a) * 2.6;
      if (!this.blocked(x, z)) {
        this.detour = new Vector3(x, this.pos.y, z);
        this.detourT = 1.6;
        this.strafeDir *= -1;
        return;
      }
    }
    this.wanderT = 0;
  }

  faceTarget(dt) {
    if (!this.target) return;
    const tp = this.targetPoint(GFA_TP);
    const dx = tp.x - this.pos.x, dz = tp.z - this.pos.z;
    this.yaw = GF.angleDamp(this.yaw, Math.atan2(dx, dz), 9, dt);
    const dist = Math.hypot(dx, dz);
    this.aimPitch = Math.atan2((tp.y - 0.15) - (this.pos.y + 1.34), Math.max(0.5, dist));
  }

  targetPoint(out) {
    out = out || GFA_TP;
    if (this.targetPlayer) { out.set(GF.Player.pos.x, GF.Player.pos.y + 1.15, GF.Player.pos.z); return out; }
    if (this.target && !this.target.dead) {
      const c = this.target.rag.byKey.chest;
      out.set(c.x, c.y, c.z);
      return out;
    }
    if (this.lastKnown) { out.copy(this.lastKnown); return out; }
    out.copy(this.home);
    return out;
  }

  /* movement destination with flanking offset */
  combatDestination(out) {
    this.targetPoint(out);
    const b = this.type.behavior;
    const dist = Math.hypot(out.x - this.pos.x, out.z - this.pos.z);
    if (dist > 7 && this.weapon && !this.weapon.melee && (b === 'soldier' || b === 'elite' || b === 'hunter')) {
      const ang = Math.atan2(out.z - this.pos.z, out.x - this.pos.x);
      const off = this.role === 'flank' ? 0.75 : 0.28;
      const side = this.role === 'flank' ? this.flankSide : (this.strafeDir);
      const nx = out.x + Math.cos(ang + Math.PI / 2 * side) * (5.5 * off + dist * 0.06);
      const nz = out.z + Math.sin(ang + Math.PI / 2 * side) * (5.5 * off + dist * 0.06);
      if (!this.blocked(nx, nz)) { out.x = nx; out.z = nz; }
    }
    return out;
  }

  /* ------------------------------ tactics ---------------------------- */
  hasLOS() {
    if (!this.target) return false;
    const chest = this.rag.byKey.chest;
    const tp = this.targetPoint(GFA_TP);
    GFA_EYE.set(chest.x, chest.y + 0.2, chest.z);
    GFA_DIR.set(tp.x - GFA_EYE.x, tp.y - GFA_EYE.y, tp.z - GFA_EYE.z);
    const len = GFA_DIR.length();
    if (len < 0.2) return true;
    GFA_DIR.multiplyScalar(1 / len);
    return !GF.World.blockedRay(GFA_EYE.x, GFA_EYE.y, GFA_EYE.z, GFA_DIR.x, GFA_DIR.y, GFA_DIR.z, len - 0.45);
  }

  /* sample a ring of nearby spots and keep the one that breaks line of sight */
  findCover() {
    if (GF.Actors.coverBudget <= 0) return null;
    GF.Actors.coverBudget--;
    const tp = this.targetPoint(GFA_TP);
    let best = null, bestScore = -1e9;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + this.flankSide * 0.3;
      for (let r = 0; r < 2; r++) {
        const rad = r ? 3.4 : 1.9;
        const x = this.pos.x + Math.cos(a) * rad, z = this.pos.z + Math.sin(a) * rad;
        if (this.blocked(x, z)) continue;
        const g = GF.World.groundAt(x, z, this.pos.y + 2.2);
        if (g < this.pos.y - 2.2 || g > this.pos.y + 1.8) continue;
        GFA_EYE.set(x, g + 1.15, z);
        GFA_DIR.set(tp.x - x, tp.y - GFA_EYE.y, tp.z - z);
        const d = GFA_DIR.length();
        if (d < 3.2) continue;
        GFA_DIR.multiplyScalar(1 / d);
        if (!GF.World.blockedRay(GFA_EYE.x, GFA_EYE.y, GFA_EYE.z, GFA_DIR.x, GFA_DIR.y, GFA_DIR.z, d - 0.5)) continue;
        const score = 26 - Math.abs(d - 15) * 1.3 - rad * 0.8 - Math.abs(g - this.pos.y) * 3;
        if (score > bestScore) { bestScore = score; best = new Vector3(x, g, z); }
      }
    }
    return best;
  }

  throwGrenade() {
    if (this.grenades <= 0 || this.grenadeCd > 0 || !this.target) return false;
    const tp = this.targetPoint(GFA_TP);
    const chest = this.rag.byKey.chest;
    const dx = tp.x - chest.x, dz = tp.z - chest.z;
    const d = Math.max(2, Math.hypot(dx, dz));
    if (d > 26 || d < 5) return false;
    const t = GF.clamp(d / 15, 0.55, 2.0);
    const vy = GF.clamp((tp.y - chest.y + 0.5 * 24 * t * t) / t, 2, 16);
    GF.Projectiles.spawn({
      type: 'grenade',
      pos: new Vector3(chest.x, chest.y + 0.35, chest.z),
      vel: new Vector3(dx / t, vy, dz / t),
      radius: 7.5, damage: 140, owner: 'actor', fuse: 2.5, gravity: 24, life: 4.5
    });
    this.grenades--;
    this.grenadeCd = GF.rand(14, 26);
    this.fireCd = Math.max(this.fireCd, 0.6);
    GFAudio.whoosh(new Vector3(chest.x, chest.y, chest.z));
    GF.Voice.say(this, GF.pick(['Frag out!', 'Grenade!', 'Heads down!']));
    return true;
  }

  /* ------------------------------ combat ----------------------------- */
  shoot() {
    if (!this.weapon || this.weapon.melee || this.reloadT > 0 || this.fireCd > 0) return;
    if (!this.target) return;
    if (this.reaction > 0) return;
    const def = this.weapon;
    if (this.ammo <= 0) {
      this.reloadT = def.reload || 2.2;
      this.ammo = def.mag;
      GFAudio.reload('out');
      return;
    }
    if (this.targetDist > (def.effectiveRange || 45) * 0.92) return;
    const muzzle = this.rag.muzzlePos();
    const tp = this.targetPoint(GFA_TP);
    const origin = new Vector3(muzzle.x, muzzle.y + 0.05, muzzle.z);
    const baseDir = new Vector3(tp.x - origin.x, tp.y - origin.y + 0.03, tp.z - origin.z).normalize();

    /* lead a moving player a little */
    if (this.targetPlayer && GF.Player.alive) {
      const lead = 0.055 * Math.min(7, this.targetDist / 8);
      baseDir.x += (GF.Player.vel.x || 0) * lead * 0.06;
      baseDir.z += (GF.Player.vel.z || 0) * lead * 0.06;
      baseDir.normalize();
    }
    let spreadDeg = (3.2 / this.skill) * (this.flinch > 0 ? 2.1 : 1) * (def.spread * 0.4 + 0.6);
    if (this.suppress > 0) spreadDeg *= 1.6;
    if (this.speedNow > 1.6) spreadDeg *= 1.25;
    const spread = GF.deg(spreadDeg);
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread;
    baseDir.x += Math.cos(a) * r;
    baseDir.y += Math.sin(a) * r * 0.7;
    baseDir.z += Math.sin(a) * r;
    baseDir.normalize();

    this.ammo--;
    this.fireCd = (60 / Math.max(60, def.rpm)) * (def.auto ? 1 : 1.35) * (1.1 + Math.random() * 0.5);
    this.burst--;
    if (this.burst <= 0) {
      this.burst = 3 + GF.randInt(4);
      /* disciplined short bursts with a breath between them */
      this.fireCd += 0.35 + Math.random() * (this.role === 'suppress' ? 0.35 : 0.85);
    }

    if (def.explosive) {
      GF.Projectiles.spawn({ type: 'rocket', pos: origin, vel: baseDir.clone().multiplyScalar(38), radius: 5.5, damage: 90, owner: 'actor', life: 4 });
    } else {
      const hit = GF.hitscan(origin, baseDir, def.effectiveRange, { ignoreActor: this });
      GF.Gore.tracer(origin, hit ? hit.point : GFA_TMP.copy(origin).addScaledVector(baseDir, def.effectiveRange).clone());
      GF.applyHit(hit, def.dmg * (0.45 + GF.settings.difficulty * 0.14), baseDir, {
        weapon: def, source: this, range: def.effectiveRange, penetration: 1
      });
      if (Math.random() < 0.55) GF.Gore.muzzleFlash(origin, def.power * 0.8);
      GFAudio.shot(def.sound, origin, { model: def.model });
    }
    this.flinch = Math.max(0, this.flinch - 0.4);
    if (Math.random() < 0.02) GF.Voice.bark(this, this.type.behavior);
  }

  meleeAttack() {
    if (this.swingCd > 0) return;
    const def = this.weapon;
    const reach = def && def.melee ? def.reach || 1.6 : 1.7;
    const tp = this.targetPoint(GFA_TP);
    const d = Math.hypot(tp.x - this.pos.x, tp.z - this.pos.z);
    if (d > reach + 0.7) return;
    this.swingCd = def && def.melee ? 60 / def.rpm + 0.25 : 0.9;
    this.swing = 1;
    GFAudio.whoosh(new Vector3(this.pos.x, this.pos.y + 1.2, this.pos.z));
    const dmg = def ? def.dmg : 14;
    setTimeout(() => {
      if (this.dead) return;
      if (this.targetPlayer) {
        if (GF.Player.alive && Math.hypot(GF.Player.pos.x - this.pos.x, GF.Player.pos.z - this.pos.z) < reach + 1.2) {
          GF.Player.damage(dmg * 0.9, { from: this, source: 'melee' });
          GFAudio.flesh(new Vector3(GF.Player.pos.x, GF.Player.pos.y + 1.2, GF.Player.pos.z), true);
          if (GF.UI && GF.UI.hitMark) GF.UI.hitMark();
        }
      } else if (this.target && !this.target.dead) {
        const c = this.target.rag.byKey.chest;
        if (Math.hypot(c.x - this.pos.x, c.z - this.pos.z) < reach + 1.2) {
          this.target.damage(dmg, 'chest', { dir: new Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)), point: new Vector3(c.x, c.y, c.z) });
        }
      }
    }, 140);
  }

  detonate() {
    if (this.dead) return;
    this.dead = true;
    GF.Gore.explosion(new Vector3(this.pos.x, this.pos.y + 1.0, this.pos.z), 6.5, 140, {});
    this.rag.detach('torso');
    this.rag.kill(new Vector3(0, 6, 0));
    this.rag.group.visible = false;
    GF.Actors.onDeath(this);
  }

  /* ------------------------------ damage ----------------------------- */
  damage(amount, nodeKey, opts) {
    opts = opts || {};
    /* corpses are still meat: shooting one can tear it open and eject the
       remaining organs instead of doing nothing */
    if (this.dead) {
      if (!opts.point) return;
      const res = this.rag.damage(amount * 0.7, nodeKey || 'chest', opts.dir, opts);
      GF.Gore.spray(opts.point, opts.dir || GFG_UP, 0.5, this.rag.colors);
      if (res.part === 'torso') {
        this.rag.openCavity(opts.dir || GFG_UP);
        if (Math.random() < 0.55) this.rag.spillCavity(opts.dir || GFG_UP);
      }
      GFAudio.flesh(opts.point, true);
      return;
    }
    const res = this.rag.damage(amount, nodeKey || 'chest', opts.dir, opts);
    if (opts.source === 'player' || opts.from === 'player') this._playerKill = true;
    this.hp -= (res.dealt === undefined ? 0 : res.dealt);
    if (!this.rag.parts.head) this.hp = 0;
    this.flinch = 1;
    this.alerted = 12;
    this.passive = false;
    this.provoked = 20;
    this.memory = 0;
    this.suppress = Math.max(this.suppress, 0.7);
    /* snap around to face whoever is shooting (dir runs shooter -> victim) */
    if (opts.dir) {
      this.yaw = Math.atan2(-opts.dir.x, -opts.dir.z);
      this.aimPitch = 0;
      this.scanYaw = this.yaw;
    }
    if (opts.fire) this.burning = Math.max(this.burning, 4.5);
    /* torso hits tear the abdomen open and expose the organs inside */
    if (res.part === 'torso' && res.dealt > 16) {
      this.rag.openCavity(opts.dir || GFG_UP);
      if (res.dealt > 62 && Math.random() < 0.22) this.rag.spillCavity(opts.dir || GFG_UP);
      if (Math.random() < 0.4) GF.Gore.arterial(new Vector3(this.pos.x, this.pos.y + 1.15, this.pos.z), opts.dir || GFG_UP, this.rag.colors);
    }
    if (opts.point) {
      const pt = opts.point;
      const dir = opts.dir || GFG_UP;
      GF.Gore.spray(pt, dir, opts.explosive ? 1.7 : 0.8, this.rag.colors, { power: opts.explosive ? 1.7 : 1 });
      GF.Gore.mist(pt, dir, 0.55);
      if (res.part === 'head' && res.dealt > 18) {
        if (Math.random() < 0.22) GF.Gore.arterial(pt, dir, this.rag.colors);
      } else if (res.part !== 'torso' && res.dealt > 24) {
        GF.Gore.arterial(pt, dir, this.rag.colors);
        /* blood on whatever is behind the victim */
        GFA_DIR.copy(dir).multiplyScalar(1.6);
        const back = new Vector3(pt.x + GFA_DIR.x, pt.y + GFA_DIR.y, pt.z + GFA_DIR.z);
        const g = GF.World.groundAt(back.x, back.z, back.y + 1);
        if (g > -1e8 && Math.abs(back.y - g) < 0.9) GF.Gore.bloodOnSurface(new Vector3(back.x, g, back.z), GFG_UP, 0.9, 'concrete');
      }
      GFAudio.flesh(pt, amount > 35);
      /* a torso hit can open the abdomen while the body is still standing */
      if (res.part === 'torso' && res.dealt > 34 && Math.random() < 0.45) {
        GF.Gore.organs(pt, dir, this.rag.colors, { count: 1 });
      }
    }
    if (!this.target && GF.Player.alive) {
      this.target = GF.Player; this.targetPlayer = true;
      this.targetDist = GF.Player.pos.distanceTo(this.pos);
      this.state = 'attack';
    }
    if (Math.random() < 0.3) GF.Voice.bark(this, this.type.behavior === 'civilian' ? 'civilian' : this.type.behavior);
    if (this.hp <= 0) this.die(opts.dir, opts.point, Math.max(res.dealt || 0, amount));
  }

  die(dir, point, severity) {
    if (this.dead) return;
    if (this.type.behavior === 'bomber') return this.detonate();
    this.dead = true;
    this.deadTime = 0;
    this.state = 'dead';
    this.rag.kill(new Vector3(dir ? dir.x * 1.6 : 0, 0.9, dir ? dir.z * 1.6 : 0), dir);
    this.rag.openCavity(dir || GFG_UP);
    if ((severity || 45) > 90 || Math.random() < 0.35) this.rag.spillCavity(dir || GFG_UP);
    const chest = this.rag.byKey.chest;
    GF.Gore.spray(point || chest, dir || GFG_UP, 1.4, this.rag.colors);
    GF.Gore.mist(point || chest, dir || GFG_UP, 0.8);
    /* fatal damage spills the organs: more damage, more viscera */
    const fatal = severity === undefined ? 45 : severity;
    const spill = fatal > 130 ? 4 : fatal > 75 ? 3 : 2;
    GF.Gore.organs(point || chest, dir || GFG_UP, this.rag.colors, { count: spill });
    if (Math.random() < 0.7) GF.Gore.organ(point || chest, dir, 'intestine', 1.1, this.rag.colors);
    if (Math.random() < 0.45) GF.Gore.organ(point || chest, dir, 'eye', 1, this.rag.colors);
    /* meat, bone and a wash of blood under the body */
    const chunks = 2 + Math.round(Math.min(5, fatal / 60));
    for (let i = 0; i < chunks; i++) GF.Gore.gibChunk(chest, dir || GFG_UP, i % 3 === 0 ? 'bone' : 'meat', this.rag.colors, 0.7 + Math.random() * 0.8);
    const chestFloor = GF.World.groundAt(chest.x, chest.z, chest.y + 1.5);
    if (chestFloor > -1e8) {
      GF.Gore.bloodOnSurface(new Vector3(chest.x, chestFloor + 0.012, chest.z), GFG_UP, 1.7, 'concrete');
      GF.Gore.growDecal(new Vector3(chest.x, chestFloor + 0.013, chest.z), GFG_UP, 1.2, 0x470a08, 'pool', { s0: 0.3, s1: 1.5, dur: 3.2 });
    }
    GFAudio.flesh(point || new Vector3(this.pos.x, this.pos.y + 1, this.pos.z), true);
    if (point) {
      const g = GF.World.groundAt(point.x, point.z, point.y + 1.5);
      if (g > -1e8) GF.Gore.bloodOnSurface(new Vector3(point.x, g, point.z), GFG_UP, 1.5, 'concrete');
    }
    if (this.weapon && this.weapon.id !== 'fists' && GF.Items) GF.Items.dropWeapon(this.weapon, new Vector3(this.pos.x, this.pos.y + 0.12, this.pos.z));
    const voicePos = new Vector3(this.pos.x, this.pos.y + 1.15, this.pos.z);
    GFAudio.deathVoice(voicePos, this.type.behavior);
    GFAudio.ragdollLand(voicePos);
    GF.Actors.onDeath(this);
    if (this._playerKill && GF.Player && GF.Player.onKill) GF.Player.onKill(this);
  }

  /* ------------------------------ update ----------------------------- */
  update(dt) {
    if (this.grabbed) { this.rag.updateBones(); return; }
    this.rag.pinnedRoot.copy(this.pos);
    this.rag.yaw = this.yaw;
    if (this.dead) {
      this.deadTime += dt;
      this.burn(dt);
      this.rag.update(dt);
      /* slow bleed-out: a puddle grows under fresh corpses */
      if (this.deadTime < 26 && this.rag.blood > -0.4) {
        this.bleedT = (this.bleedT || 0) - dt;
        if (this.bleedT <= 0) {
          this.bleedT = GF.rand(0.8, 1.8);
          const c = this.rag.byKey.chest;
          const g = GF.World.groundAt(c.x, c.z, c.y + 1.2);
          if (g > -1e8) GF.Gore.growDecal(new Vector3(c.x + (Math.random() - 0.5) * 0.5, g + 0.012, c.z + (Math.random() - 0.5) * 0.5),
            GFG_UP, 0.35 + Math.random() * 0.4, 0x470a08, 'pool', { s0: 0.2, s1: 0.6 + Math.random() * 0.7, dur: 2.4 });
        }
      }
      return;
    }
    this.age += dt;
    this.fireCd -= dt;
    this.swingCd -= dt;
    this.chatCd -= dt;
    this.healT -= dt;
    this.coverCd -= dt;
    this.grenadeCd -= dt;
    this.reaction -= dt;
    this.flinch = Math.max(0, this.flinch - dt * 2.4);
    this.alerted = Math.max(0, this.alerted - dt);
    this.suppress = Math.max(0, this.suppress - dt);
    this.memory += dt;
    this.burn(dt);
    if (this.detour) this.detourT -= dt;

    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        this.ammo = this.weapon ? this.weapon.mag : 0;
        GFAudio.reload('in');
      }
    }

    this.thinkT -= dt;
    if (this.thinkT <= 0) {
      this.thinkT = 0.18 + Math.random() * 0.2;
      this.perceive(dt);
    }
    this.provoked = Math.max(0, this.provoked - dt);
    /* sandbox extras stand down until they are actually hurt */
    if (this.passive && this.provoked <= 0) {
      this.target = null;
      this.targetPlayer = false;
      this.alerted = 0;
      this.lastKnown = null;
      if (this.state === 'attack' || this.state === 'chase' || this.state === 'cover' || this.state === 'peek') this.state = 'idle';
    }

    /* armed actors do not loot, but fists-only archetypes will sprint for a
       dropped rifle and pick it up — a small thing that makes fights read
       as intelligent rather than scripted */
    this.lootCd -= dt;
    if (this.lootCd <= 0) {
      this.lootCd = 1.6;
      this.tryLoot();
    }

    const b = this.type.behavior;
    const wounded = this.hp < this.maxHp * 0.3;
    let speed = (2.1 + this.type.speed * 1.9) * (wounded ? 0.82 : 1);
    if (this.reloadT > 0) speed *= 0.82;
    if (this.suppress > 0) speed *= 0.9;

    switch (this.state) {
      case 'idle': {
        this.speedNow = 0;
        this.poseMode = b === 'zombie' ? 'aim' : 'idle';
        this.wanderT -= dt;
        /* sweep the head and shoulders so nobody sneaks up from behind */
        this.scanT = (this.scanT || 0) - dt;
        if (this.scanT <= 0) {
          this.scanT = GF.rand(1.4, 3.6);
          this.scanYaw = this.yaw + GF.rand(-1.1, 1.1);
        }
        if (this.scanYaw !== undefined && !this.weapon) this.yaw = GF.angleDamp(this.yaw, this.scanYaw, 1.6, dt);
        else if (this.scanYaw !== undefined) this.yaw = GF.angleDamp(this.yaw, this.scanYaw, 2.4, dt);
        if (b === 'civilian') this.poseMode = 'cower';
        if (!this.target && this.wanderT <= 0) {
          this.wanderT = GF.rand(4, 10);
          const a = Math.random() * Math.PI * 2, r = GF.rand(2, 14);
          const wx = this.home.x + Math.cos(a) * r, wz = this.home.z + Math.sin(a) * r;
          if (!this.blocked(wx, wz)) {
            this.wander.set(wx, this.home.y, wz);
            this.state = 'wander';
          }
        }
        if (this.alerted > 0) this.state = 'investigate';
        break;
      }
      case 'wander': {
        this.moveTowards(this.wander, speed * 0.45, dt);
        this.poseMode = 'idle';
        if (this.target) this.state = this.chooseCombatState(this.targetDist);
        else if (Math.hypot(this.wander.x - this.pos.x, this.wander.z - this.pos.z) < 0.9) { this.state = 'idle'; this.wanderT = GF.rand(3, 9); }
        break;
      }
      case 'investigate': {
        const dest = this.lastKnown || this.wander;
        this.moveTowards(dest, speed * 0.95, dt);
        this.poseMode = 'aim';
        const reached = Math.hypot(dest.x - this.pos.x, dest.z - this.pos.z) < 1.4;
        if (reached || this.memory > 14 || this.alerted <= 0) {
          this.state = 'idle';
          this.alerted = Math.max(0, this.alerted - 3);
          this.wanderT = GF.rand(2, 5);
          this.lastKnown = null;
        }
        if (this.target) this.state = this.chooseCombatState(this.targetDist);
        break;
      }
      case 'flee': {
        const threat = this.targetPoint(GFA_TP);
        const away = new Vector3(this.pos.x - threat.x, 0, this.pos.z - threat.z);
        if (away.lengthSq() < 0.01) away.set(Math.random() - 0.5, 0, Math.random() - 0.5);
        away.normalize().multiplyScalar(14).add(this.pos);
        this.moveTowards(away, speed * 1.4, dt);
        this.poseMode = 'cower';
        if (Math.random() < dt * 0.5) GF.Voice.bark(this, 'civilian');
        if (this.targetDist > 40) this.state = 'idle';
        break;
      }
      case 'support': {
        const ally = this.findWoundedAlly();
        if (ally) {
          this.moveTowards(ally.pos, speed, dt);
          this.faceTarget(dt);
          if (this.healT <= 0 && Math.hypot(ally.pos.x - this.pos.x, ally.pos.z - this.pos.z) < 2.5) {
            this.healT = 4;
            ally.hp = Math.min(ally.maxHp, ally.hp + 25);
            GF.Voice.say(this, GF.pick(GF.BARKS.medic));
            GF.Gore.spray(new Vector3(ally.pos.x, ally.pos.y + 1.2, ally.pos.z), GFG_UP, 0.2, 0x7a8a6a);
          }
        } else this.state = 'attack';
        if (this.target && this.targetDist < 6) this.state = 'attack';
        this.poseMode = 'aim';
        break;
      }
      case 'cover': {
        if (!this.cover || this.coverCd > 0 || !this.target) {
          if (this.target && this.coverCd <= 0) this.cover = this.findCover();
          if (!this.cover) { this.state = this.target ? this.chooseCombatState(this.targetDist) : 'idle'; break; }
          this.coverT = 0;
        }
        const d = Math.hypot(this.cover.x - this.pos.x, this.cover.z - this.pos.z);
        this.poseMode = 'aim';
        if (d > 0.6) this.moveTowards(this.cover, speed * 1.15, dt);
        else {
          this.coverT += dt;
          this.faceTarget(dt);
          if (this.reloadT > 0 || this.hp < this.maxHp) {
            if (this.reloadT <= 0 && this.ammo < (this.weapon ? this.weapon.mag : 0)) this.startActorReload();
          }
          if (this.hasLOS() && this.fireCd <= 0) {
            this.state = 'peek';
            this.peeking = GF.rand(1.1, 2.3);
          }
          if (this.coverT > 5.5) { this.coverCd = GF.rand(2.5, 5); this.cover = null; this.state = 'attack'; }
        }
        if (this.suppress > 0.8 && Math.random() < dt * 0.5) this.cover = this.findCover();
        break;
      }
      case 'peek': {
        this.peeking -= dt;
        this.poseMode = 'aim';
        this.faceTarget(dt);
        if (this.hasLOS()) {
          if (this.weapon && !this.weapon.melee) this.shoot();
          else if (this.targetDist < 2.6) this.meleeAttack();
        }
        if (this.peeking <= 0 || !this.target || this.suppress > 1) {
          this.state = 'cover';
          this.coverT = 0;
        }
        break;
      }
      case 'chase': {
        const dest = this.combatDestination(GFA_MOVE);
        this.moveTowards(dest, speed * (b === 'berserk' || b === 'maniac' ? 1.35 : 1), dt);
        this.faceTarget(dt);
        this.poseMode = this.weapon && this.weapon.melee ? 'melee' : 'aim';
        if (b === 'bomber' && this.targetDist < 2.6) this.detonate();
        if (this.targetDist < (this.weapon && this.weapon.melee ? 1.9 : 2.4) && this.hasLOS()) this.meleeAttack();
        if (this.weapon && !this.weapon.melee && this.targetDist < 30 && this.hasLOS()) this.shoot();
        if (this.targetDist < 3 && b === 'zombie') this.meleeAttack();
        if (!this.target) this.state = 'idle';
        break;
      }
      case 'attack': {
        this.faceTarget(dt);
        this.poseMode = this.weapon && this.weapon.melee ? 'melee' : 'aim';
        const tp = this.targetPoint(GFA_TP);
        const d = this.targetDist;
        const ideal = this.weapon ? GF.clamp(this.weapon.effectiveRange * 0.3, 5, 24) : 4;
        const los = this.hasLOS();

        this.strafeT -= dt;
        if (this.strafeT <= 0) { this.strafeT = GF.rand(1.2, 3.4); this.strafeDir *= -1; }

        if (this.suppress > 0.6 && this.coverCd <= 0 && this.hp < this.maxHp) {
          this.cover = this.findCover();
          this.state = 'cover';
          this.coverT = 0;
          break;
        }
        if (wounded && b !== 'berserk' && b !== 'maniac' && b !== 'zombie') {
          const away = new Vector3(this.pos.x - tp.x, 0, this.pos.z - tp.z).normalize().multiplyScalar(6).add(this.pos);
          this.moveTowards(away, speed, dt);
        } else if (this.role === 'suppress' && this.weapon && !this.weapon.melee) {
          this.moveTowards(tp, speed * 0.25, dt);
        } else if (d > ideal + 3) {
          this.moveTowards(tp, speed, dt);
        } else if (d < ideal - 4 && this.weapon && this.weapon.model !== 'shotgun') {
          const away = new Vector3(this.pos.x - tp.x, 0, this.pos.z - tp.z).normalize().multiplyScalar(5).add(this.pos);
          this.moveTowards(away, speed * 0.8, dt);
        } else {
          const perp = new Vector3(-(tp.z - this.pos.z), 0, tp.x - this.pos.x).normalize().multiplyScalar(this.strafeDir * 2.5).add(this.pos);
          this.moveTowards(perp, speed * 0.7, dt);
        }

        if (los) {
          if (this.weapon && !this.weapon.melee) this.shoot();
          else if (d < 2.4) this.meleeAttack();
        } else if (this.grenadeCd <= 0 && d > 6 && d < 24 && Math.random() < 0.6) {
          this.throwGrenade();
        }
        if (b === 'bomber' && d < 3.2) this.detonate();
        if (!this.target) this.state = 'idle';
        /* reposition to better cover sometimes */
        if (this.coverCd <= 0 && this.hp < this.maxHp * 0.6 && this.weapon && !this.weapon.melee && Math.random() < dt * 0.35) {
          this.cover = this.findCover();
          if (this.cover) { this.state = 'cover'; this.coverT = 0; }
        }
        break;
      }
      default: this.state = 'idle';
    }

    /* idle chatter */
    if (this.chatCd <= 0) {
      this.chatCd = GF.rand(12, 30);
      if (!this.target && GF.chance(0.55)) GF.Voice.bark(this, this.type.behavior);
    }
    this.rag.setPose(dt, this.speedNow, this.poseMode, this.aimPitch);
    if (this.swing > 0) this.swing = Math.max(0, this.swing - dt * 4);
    this.rag.update(dt);
    GF.stats.ragdolls = GF.Actors.list.length;
  }

  tryLoot() {
    if (!GF.Items || !GF.Items.pickups || !GF.Items.pickups.length) return false;
    const unarmed = !this.weapon || this.weapon.melee || this.weapon.id === 'fists';
    if (!unarmed) return false;
    let best = null, bd = 11;
    for (const p of GF.Items.pickups) {
      if (!p.def || p.def.melee) continue;
      const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (d < bd) { bd = d; best = p; }
    }
    if (!best) return false;
    if (bd < 1.6) {
      this.weapon = best.def;
      this.ammo = best.def.mag;
      this.fireCd = 0.6;
      GF.Items.remove(best);
      GF.Voice.say(this, GF.pick(['Weapon up!', 'Mine now.', 'Upgraded.']));
      return true;
    }
    if (this.state === 'idle' || this.state === 'wander') {
      this.wander.set(best.pos.x, best.pos.y, best.pos.z);
      this.state = 'wander';
      this.wanderT = 5;
    }
    return false;
  }

  startActorReload() {
    if (!this.weapon || this.weapon.melee) return;
    this.reloadT = this.weapon.reload || 2.2;
    GFAudio.reload('out');
  }

  burn(dt) {
    if (this.burning <= 0) return;
    this.burning -= dt;
    this.burnTick -= dt;
    if (this.burnTick <= 0) {
      this.burnTick = 0.09;
      const c = this.rag.byKey.chest;
      GF.Gore.spawnParticle(c.x + (Math.random() - 0.5) * 0.3, c.y + (Math.random() - 0.2) * 0.5, c.z + (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3, 0.9 + Math.random() * 0.9, (Math.random() - 0.5) * 0.3,
        1, 0.48 + Math.random() * 0.25, 0.12, 0.08 + Math.random() * 0.1, 0.35 + Math.random() * 0.25);
      if (Math.random() < 0.35) GF.Gore.smoke(new Vector3(c.x, c.y + 0.4, c.z), 1, 0x2a2826, 0.7);
    }
    if (!this.dead) {
      this.hp -= 9 * dt;
      if (this.hp <= 0) this.die(new Vector3(0, 0.4, 0), null);
    }
  }

  findWoundedAlly() {
    let best = null, bestD = 1e9;
    for (const a of GF.Actors.list) {
      if (a === this || a.dead) continue;
      if (a.type.faction !== this.type.faction) continue;
      if (a.hp > a.maxHp * 0.7) continue;
      const d = Math.hypot(a.pos.x - this.pos.x, a.pos.z - this.pos.z);
      if (d < 20 && d < bestD) { bestD = d; best = a; }
    }
    return best;
  }
}

GF.Actors = {
  list: [],
  scene: null,
  coverBudget: 0,
  init(scene) { this.scene = scene; },
  spawn(typeId, pos, opts) {
    const type = typeof typeId === 'string' ? GF.ragById(typeId) : typeId;
    const a = new GFActor(type, pos, opts);
    if (GF.sandbox && !GF.sandboxHostile) a.passive = true;
    this.list.push(a);
    return a;
  },
  spawnRandom(pos, faction) {
    let pool = GF.RAGS;
    if (faction) pool = GF.RAGS.filter(r => r.faction === faction);
    if (!pool.length) pool = GF.RAGS;
    return this.spawn(GF.pick(pool), pos);
  },
  update(dt) {
    this.coverBudget = 2;
    const maxR = GF.qset().maxRagdolls;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const a = this.list[i];
      a.update(dt);
      if (a.dead && a.deadTime > 100) {
        this.list.splice(i, 1);
        this.scene.remove(a.rag.group);
      }
    }
    let dead = null;
    if (this.list.length > maxR + 8) {
      dead = this.list.filter(a => a.dead).sort((x, y) => y.deadTime - x.deadTime);
      while (this.list.length > maxR + 8 && dead.length) {
        const d = dead.pop();
        const idx = this.list.indexOf(d);
        if (idx >= 0) this.list.splice(idx, 1);
        this.scene.remove(d.rag.group);
      }
    }
    GF.stats.ragdolls = this.list.length;
  },
  alert(pos, radius, source) {
    for (const a of this.list) {
      if (a.dead || a === source) continue;
      if (Math.hypot(a.pos.x - pos.x, a.pos.z - pos.z) < radius) a.alertTo(pos, true);
    }
  },
  /* near misses make actors duck, break bursts and dive for cover */
  suppress(point, radius) {
    for (const a of this.list) {
      if (a.dead || a.passive || !a.type.aggressive) continue;
      const d = Math.hypot(a.pos.x - point.x, a.pos.z - point.z);
      if (d > radius) continue;
      const f = 1 - d / radius;
      a.suppress = Math.max(a.suppress, 0.5 + f * 0.9);
      a.flinch = Math.max(a.flinch, 0.7);
      a.memory = Math.min(a.memory, 2);
      if (!a.lastKnown) a.lastKnown = new Vector3(point.x, point.y, point.z);
      if (a.coverCd <= 0 && a.state !== 'cover' && a.state !== 'peek' && Math.random() < 0.5) {
        a.cover = a.findCover();
        if (a.cover) { a.coverT = 0; a.state = 'cover'; }
      }
    }
  },
  /* squad roles: one base of fire, one flanker, the rest push */
  assignRoles(source) {
    if (!source || !source.target) return;
    const squad = this.list.filter(a => !a.dead && a.type.aggressive && a.type.faction === source.type.faction);
    if (!squad.length) return;
    squad.sort((a, b) => a.targetDist - b.targetDist);
    for (let i = 0; i < squad.length; i++) {
      const a = squad[i];
      a.role = i === 0 ? 'suppress' : i === 1 ? 'flank' : (i % 3 === 2 ? 'flank' : 'advance');
      if (i > 0 && Math.random() < 0.25 && a.coverCd <= 0) a.coverCd = GF.rand(1, 3);
    }
  },
  onDeath(actor) {
    if (!actor.feedShown && GF.UI && GF.UI.killfeed) GF.UI.killfeed(actor, false);
    /* the scream is contagious: nearby civilians bolt, nearby fighters
       turn toward the killing ground */
    for (const a of this.list) {
      if (a.dead || a === actor) continue;
      const d = Math.hypot(a.pos.x - actor.pos.x, a.pos.z - actor.pos.z);
      if (d > 16) continue;
      if (a.type.behavior === 'civilian') {
        a.target = null; a.targetPlayer = false;
        a.state = 'flee'; a.alerted = 10;
      } else if (a.type.aggressive && !a.target) {
        a.alertTo(actor.pos, true);
      }
    }
  },
  clear() {
    for (const a of this.list) this.scene.remove(a.rag.group);
    this.list.length = 0;
  },
  alive() { return this.list.filter(a => !a.dead).length; }
};
