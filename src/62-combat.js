/* =====================================================================
   GORE TOWN — projectiles, hitscan resolution, fire, damage helpers
   ===================================================================== */

/* Ragdoll ray test: 16 spheres, returns nearest hit node. */
GFRagdoll.prototype.raycast = function (origin, dir, maxDist) {
  let best = null, bestT = maxDist;
  for (const n of this.nodes) {
    if (n.detached) continue;
    const ox = origin.x - n.x, oy = origin.y - n.y, oz = origin.z - n.z;
    const b = ox * dir.x + oy * dir.y + oz * dir.z;
    const c = ox * ox + oy * oy + oz * oz - n.r * n.r;
    const disc = b * b - c;
    if (disc < 0) continue;
    const t = -b - Math.sqrt(disc);
    if (t > 0 && t < bestT) { bestT = t; best = { t, node: n, key: n.key, part: n.part }; }
  }
  if (best) best.point = new Vector3(origin.x + dir.x * best.t, origin.y + dir.y * best.t, origin.z + dir.z * best.t);
  return best;
};

/* Combined hitscan: world first, then actors, then player. */
GF.hitscan = function (origin, dir, maxDist, opts) {
  opts = opts || {};
  const w = GF.World.raycast(origin, dir, maxDist);
  let best = w ? { type: 'world', t: w.t, point: w.point, normal: w.normal, mat: w.mat, prop: w.prop, collider: w.collider } : null;
  let bestT = best ? best.t : maxDist;

  if (!opts.worldOnly && GF.game) {
    if (GF.game.actors) {
      for (const a of GF.game.actors) {
        if (!a.rag || a === opts.ignoreActor) continue;
        const h = a.rag.raycast(origin, dir, bestT);
        if (h && h.t < bestT) {
          bestT = h.t;
          best = { type: 'actor', t: h.t, point: h.point, actor: a, node: h.key, part: h.part, normal: dir.clone().multiplyScalar(-1) };
        }
      }
    }
    if (GF.Player && GF.Player.alive && !opts.ignorePlayer) {
      const p = GF.Player;
      const head = new Vector3(p.pos.x, p.pos.y + 1.62, p.pos.z);
      const chest = new Vector3(p.pos.x, p.pos.y + 1.15, p.pos.z);
      const hitS = (c, r, part) => {
        const ox = origin.x - c.x, oy = origin.y - c.y, oz = origin.z - c.z;
        const b = ox * dir.x + oy * dir.y + oz * dir.z;
        const cc = ox * ox + oy * oy + oz * oz - r * r;
        const disc = b * b - cc;
        if (disc < 0) return null;
        const t = -b - Math.sqrt(disc);
        return t > 0 ? { t, part } : null;
      };
      const hs = hitS(head, 0.19, 'head');
      const cs = hitS(chest, 0.34, 'chest');
      const hit = hs && cs ? (hs.t < cs.t ? hs : cs) : (hs || cs);
      if (hit && hit.t < bestT) {
        bestT = hit.t;
        best = { type: 'player', t: hit.t, point: new Vector3(origin.x + dir.x * hit.t, origin.y + dir.y * hit.t, origin.z + dir.z * hit.t), part: hit.part, normal: dir.clone().multiplyScalar(-1) };
      }
    }
  }
  return best;
};

/* Apply a bullet-style hit. Thin cover (glass, plaster, planks) can be shot
   through with reduced energy; rounds that strike steel spray sparks and
   sometimes ricochet. */
const GFC_THIN = { glass: 1, wood: 1, plastic: 1, fabric: 1 };
GF.applyHit = function (hit, damage, dir, opts) {
  opts = opts || {};
  if (!hit) return;
  if (hit.type === 'world') {
    GF.Gore.impact(hit.point, hit.normal, hit.mat, dir);
    GFAudio.impact(hit.mat, hit.point);
    if (GF.Actors && GF.Actors.suppress) GF.Actors.suppress(hit.point, 3.2);
    if (hit.prop && hit.prop.def) {
      const p = hit.prop;
      p.hp -= damage * 0.6;
      p.moving = true;
      p.vel.addScaledVector(dir, damage * 0.02);
      p.spin += (Math.random() - 0.5) * 2;
      if (p.hp <= 0 && p.def.explosive) {
        GF.World.removeProp(p);
        GF.Gore.explosion(new Vector3(p.pos.x, p.pos.y + 0.4, p.pos.z), p.def.blast, p.def.dmg);
      } else if (p.hp <= 0 && p.def.fragile) {
        GF.World.removeProp(p);
        GFAudio.impact('glass', p.pos);
        GF.Gore.burst(p.pos, new Vector3(0, 1, 0), 14, 3, 0xcfe8f0, 0.06);
      }
    }
    /* penetration through thin cover */
    if (GFC_THIN[hit.mat] && opts.penetration && !opts.penetrated) {
      const range = Math.max(4, opts.range || 40);
      const px = hit.point.x + dir.x * 0.42, py = hit.point.y + dir.y * 0.42, pz = hit.point.z + dir.z * 0.42;
      const rest = Math.max(0.4, range - hit.t - 0.42);
      const through = GF.hitscan(new Vector3(px, py, pz), dir, rest, { ignoreActor: opts.ignoreActor });
      if (through && through.type !== 'world') {
        GF.applyHit(through, damage * 0.55, dir, {
          weapon: opts.weapon, source: opts.source, range: rest, penetrated: true
        });
      }
    }
  } else if (hit.type === 'actor') {
    const a = hit.actor;
    a.damage(damage, hit.node, { point: hit.point, dir, weapon: opts.weapon, source: opts.source });
    if (GF.Actors && GF.Actors.suppress) GF.Actors.suppress(hit.point, 2.6);
  } else if (hit.type === 'player') {
    GF.Player.damage(damage * (hit.part === 'head' ? 2.4 : 1), { from: opts.source, dir, point: hit.point });
    if (GF.UI && GF.UI.splatter) GF.UI.splatter(hit.part === 'head' ? 0.65 : 0.28);
  }
};

/* ------------------------- projectiles ------------------------- */
GF.Projectiles = {
  list: [],
  scene: null,
  init(scene) { this.scene = scene; },
  clear() {
    for (const p of this.list) if (p.mesh) this.scene.remove(p.mesh);
    this.list.length = 0;
  },
  spawn(opts) {
    const type = opts.type || 'rocket';
    let mesh;
    if (type === 'grenade' || type === 'bomb') {
      mesh = new Mesh(new SphereGeometry(0.09, 8, 6), GF.propMat('metal', '#3a4a2a'));
    } else if (type === 'molotov') {
      mesh = new Mesh(new CylinderGeometry(0.05, 0.05, 0.26, 8), GF.propMat('glass', '#c8a020'));
    } else if (type === 'flame') {
      mesh = new Mesh(new SphereGeometry(0.16, 6, 5), new MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false }));
    } else {
      mesh = new Mesh(new CylinderGeometry(0.045, 0.06, 0.3, 8), GF.propMat('metal', '#4a5040'));
    }
    mesh.position.copy(opts.pos);
    mesh.castShadow = true;
    mesh.userData.dynamic = true;
    this.scene.add(mesh);
    if (type === 'rocket') {
      const glow = new Mesh(new SphereGeometry(0.14, 6, 5), new MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.7, blending: AdditiveBlending, depthWrite: false }));
      mesh.add(glow);
    }
    const p = {
      mesh, type,
      pos: opts.pos.clone(),
      vel: opts.vel.clone(),
      gravity: opts.gravity === undefined ? (type === 'grenade' ? 20 : 0) : opts.gravity,
      life: opts.life || (type === 'grenade' ? 3.2 : 6),
      fuse: opts.fuse || (type === 'grenade' ? 3.0 : -1),
      radius: opts.radius || 0,
      damage: opts.damage || 0,
      owner: opts.owner || 'player',
      trail: 0,
      bounce: type === 'grenade' || type === 'molotov',
      fire: type === 'flame',
      area: opts.area || 0
    };
    this.list.push(p);
    if (type === 'rocket') GFAudio.flight(p.pos);
    return p;
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.fuse > 0) {
        p.fuse -= dt;
        if (p.fuse <= 0) {
          this.detonate(p);
          this.list.splice(i, 1);
          continue;
        }
      }
      if (p.life <= 0) {
        if (p.damage) this.detonate(p);
        this.scene.remove(p.mesh);
        this.list.splice(i, 1);
        continue;
      }
      p.vel.y -= p.gravity * dt;
      const step = GFR_V1.copy(p.vel).multiplyScalar(dt);
      const dist = step.length();
      const dir = GFR_V2.copy(step).normalize();
      const hit = GF.hitscan(p.pos, dir, dist + 0.1, { ignorePlayer: p.owner === 'player' });
      if (hit) {
        if (p.type === 'flame') {
          if (hit.type !== 'world') { /* flame passes through actors, igniting */ }
          p.pos.copy(hit.point); p.mesh.position.copy(p.pos);
          this.list.splice(i, 1); this.scene.remove(p.mesh);
          if (hit.type === 'actor') hit.actor.damage(6, hit.node, { dir, fire: true });
          continue;
        }
        p.pos.copy(hit.point);
        this.detonate(p, hit);
        this.list.splice(i, 1);
        this.scene.remove(p.mesh);
        continue;
      }
      p.pos.add(step);
      p.mesh.position.copy(p.pos);
      if (p.type === 'rocket' || p.type === 'missile') {
        p.mesh.lookAt(GFR_V1.copy(p.pos).add(p.vel));
        p.trail -= dt;
        if (p.trail <= 0) {
          p.trail = 0.02;
          GF.Gore.smoke(p.pos, 1, 0x8a8a8a, 0.5);
        }
      }
      if (p.type === 'flame') {
        p.trail -= dt;
        if (p.trail <= 0) {
          p.trail = 0.02;
          GF.Gore.spawnParticle(p.pos.x, p.pos.y, p.pos.z, (Math.random() - 0.5) * 0.6, 0.6, (Math.random() - 0.5) * 0.6, 1, 0.55, 0.15, 0.35, 0.3);
          if (Math.random() < 0.18) GF.Gore.spawnParticle(p.pos.x, p.pos.y + 0.1, p.pos.z, (Math.random() - 0.5) * 0.3, 0.4, (Math.random() - 0.5) * 0.3, 0.16, 0.15, 0.14, 0.28, 0.9);
        }
        p.mesh.material.opacity = 0.55 + Math.random() * 0.4;
      }
      /* ground bounce for grenades */
      if (p.bounce) {
        const g = GF.World.groundAt(p.pos.x, p.pos.z, p.pos.y + 0.5);
        if (p.pos.y <= g + 0.09) {
          p.pos.y = g + 0.09;
          p.vel.y *= -0.4; p.vel.x *= 0.7; p.vel.z *= 0.7;
          if (Math.abs(p.vel.y) < 0.6) p.vel.y = 0;
        }
      }
      if (p.pos.y < -40) { this.list.splice(i, 1); this.scene.remove(p.mesh); }
    }
  },
  detonate(p, hit) {
    if (p.type === 'flame') { GF.Gore.smoke(p.pos, 3, 0xff8030, 0.6); return; }
    if (p.radius > 0) {
      GF.Gore.explosion(p.pos, p.radius, p.damage, { owner: p.owner });
      if (p.type === 'molotov') {
        GF.Gore.smoke(p.pos, 8, 0x2a2a2a, 1.2);
        const g = GF.World.groundAt(p.pos.x, p.pos.z, p.pos.y + 1);
        if (g > -1e8) GF.Gore.decal(new Vector3(p.pos.x, g + 0.02, p.pos.z), new Vector3(0, 1, 0), 2.2, 0x1a1208, 'scorch');
      }
    } else if (hit) {
      GF.applyHit(hit, p.damage, GFR_V2.copy(p.vel).normalize(), {});
    }
  }
};

/* ------------------------- damage over time -------------------- */
GF.Damage = {
  fires: [],
  addFire(pos, radius, life, dps, owner) {
    this.fires.push({ pos: pos.clone(), radius, life, dps, owner, tick: 0 });
    if (this.fires.length > 18) this.fires.shift();
  },
  update(dt) {
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i];
      f.life -= dt; f.tick -= dt;
      if (GF.CameraShake && GF.Player && Math.hypot(GF.Player.pos.x - f.pos.x, GF.Player.pos.z - f.pos.z) < 3) GF.CameraShake.add(dt * 0.02);
      if (Math.random() < dt * 8) GF.Gore.smoke(f.pos, 1, 0x3a3a3a, 0.8);
      if (Math.random() < dt * 10) {
        GF.Gore.spawnParticle(f.pos.x + (Math.random() - 0.5) * f.radius, f.pos.y + Math.random() * 0.3, f.pos.z + (Math.random() - 0.5) * f.radius,
          0, 1.4 + Math.random(), 0, 1, 0.45, 0.1, 0.14 + Math.random() * 0.12, 0.4);
      }
      if (f.tick <= 0) {
        f.tick = 0.35;
        if (GF.game && GF.game.actors) {
          for (const a of GF.game.actors) {
            if (!a.rag || a.rag.dead) continue;
            const c = a.rag.byKey.chest;
            if (Math.hypot(c.x - f.pos.x, c.y - f.pos.y, c.z - f.pos.z) < f.radius) {
              a.damage(f.dps * 0.35, 'chest', { dir: new Vector3(0, 1, 0), fire: true });
            }
          }
        }
        if (GF.Player && GF.Player.alive) {
          const pp = GF.Player.pos;
          if (Math.hypot(pp.x - f.pos.x, pp.z - f.pos.z) < f.radius) GF.Player.damage(f.dps * 0.2, { source: 'fire' });
        }
      }
      if (f.life <= 0) this.fires.splice(i, 1);
    }
  }
};
