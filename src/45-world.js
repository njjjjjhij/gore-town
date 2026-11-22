/* =====================================================================
   GORE TOWN — collision world, static map batching, dynamic props
   Axis-aligned colliders + spatial hash. Ragdolls, bullets, AI and the
   player all share this one broadphase.
   ===================================================================== */

GF.World = {
  scene: null,
  colliders: [],
  dyn: [],
  grid: new Map(),
  CELL: 6,
  map: null,
  skyMesh: null,
  sun: null,
  hemi: null,
  ambient: null,
  bounds: { x0: -60, x1: 60, z0: -60, z1: 60 },
  _near: [],
  _seen: new Set(),

  init(scene) {
    this.scene = scene;
    this.sun = new DirectionalLight(0xfff0d8, 2.2);
    this.sun.position.set(40, 60, 20);
    this.sun.castShadow = true;
    const q = GF.qset();
    this.sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 180;
    this.sun.shadow.camera.left = -55;
    this.sun.shadow.camera.right = 55;
    this.sun.shadow.camera.top = 55;
    this.sun.shadow.camera.bottom = -55;
    this.sun.shadow.bias = -0.0009;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 2.2;
    scene.add(this.sun);

    this.hemi = new HemisphereLight(0x9fb4c8, 0x4a4238, 1.15);
    scene.add(this.hemi);
    this.ambient = new AmbientLight(0xffffff, 0.22);
    scene.add(this.ambient);
    this.initDust();
  },

  /* floating motes that give interiors and night streets depth */
  initDust() {
    const n = GF.quality === 'low' ? 0 : GF.quality === 'medium' ? 90 : 170;
    if (!n) return;
    const c = GF.mkCanvas(32, 32), g = c.getContext('2d');
    const rg = g.createRadialGradient(16, 16, 0, 16, 16, 15);
    rg.addColorStop(0, 'rgba(255,255,255,0.9)');
    rg.addColorStop(0.45, 'rgba(255,255,255,0.25)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(16, 16, 16, 0, 7); g.fill();
    const tex = new CanvasTexture(c);
    const geo = new BufferGeometry();
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 26;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 26;
    }
    geo.setAttribute('position', new BufferAttribute(arr, 3));
    const mat = new PointsMaterial({
      size: 0.032, map: tex, transparent: true, opacity: 0.4, depthWrite: false,
      blending: AdditiveBlending, sizeAttenuation: true, color: 0xd8ccb8
    });
    this.dust = new Points(geo, mat);
    this.dust.frustumCulled = false;
    this.dustN = n;
    this.scene.add(this.dust);
  },

  updateDust(dt, cam) {
    if (!this.dust) return;
    const attr = this.dust.geometry.attributes.position;
    const a = attr.array;
    const t = GF.time;
    for (let i = 0; i < this.dustN; i++) {
      const j = i * 3;
      a[j] += Math.sin(t * 0.35 + i * 1.7) * 0.02 * dt * 60 * 0.05;
      a[j + 1] += (0.012 + Math.sin(t * 0.7 + i) * 0.01) * dt * 3;
      a[j + 2] += Math.cos(t * 0.3 + i * 2.3) * 0.02 * dt * 60 * 0.05;
      const dx = a[j] - cam.position.x, dy = a[j + 1] - cam.position.y, dz = a[j + 2] - cam.position.z;
      if (dx > 13) a[j] -= 26; else if (dx < -13) a[j] += 26;
      if (dy > 7) a[j + 1] -= 14; else if (dy < -7) a[j + 1] += 14;
      if (dz > 13) a[j + 2] -= 26; else if (dz < -13) a[j + 2] += 26;
    }
    attr.needsUpdate = true;
  },

  clear() {
    if (!this.scene) return;
    this.colliders.length = 0;
    this.grid.clear();
    for (const p of this.dyn) if (p.mesh) this.scene.remove(p.mesh);
    this.dyn.length = 0;
    const kill = [];
    for (const o of this.scene.children) {
      if (o.userData.mapObject || o.userData.dynamic) kill.push(o);
    }
    for (const o of kill) {
      this.scene.remove(o);
      if (o.geometry) o.geometry.dispose();
    }
    if (this.skyMesh) { this.scene.remove(this.skyMesh); this.skyMesh.geometry.dispose(); this.skyMesh.material.dispose(); this.skyMesh = null; }
  },

  addCollider(x0, y0, z0, x1, y1, z1, mat) {
    const c = {
      x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1),
      x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1),
      mat: mat || 'concrete', dyn: false
    };
    this.colliders.push(c);
    return c;
  },

  indexColliders() {
    this.grid.clear();
    const S = this.CELL;
    for (const c of this.colliders) {
      const gx0 = Math.floor(c.x0 / S), gx1 = Math.floor(c.x1 / S);
      const gz0 = Math.floor(c.z0 / S), gz1 = Math.floor(c.z1 / S);
      for (let gx = gx0; gx <= gx1; gx++) {
        for (let gz = gz0; gz <= gz1; gz++) {
          const k = gx + ',' + gz;
          let arr = this.grid.get(k);
          if (!arr) { arr = []; this.grid.set(k, arr); }
          arr.push(c);
        }
      }
    }
  },

  queryNear(x, z, r, out) {
    out = out || this._near;
    out.length = 0;
    this._seen.clear();
    const S = this.CELL;
    const gx0 = Math.floor((x - r) / S), gx1 = Math.floor((x + r) / S);
    const gz0 = Math.floor((z - r) / S), gz1 = Math.floor((z + r) / S);
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gz = gz0; gz <= gz1; gz++) {
        const arr = this.grid.get(gx + ',' + gz);
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) {
          const c = arr[i];
          if (!this._seen.has(c)) { this._seen.add(c); out.push(c); }
        }
      }
    }
    for (let i = 0; i < this.dyn.length; i++) {
      const d = this.dyn[i];
      if (!d.alive || !d.collider) continue;
      if (d.collider.x1 < x - r || d.collider.x0 > x + r || d.collider.z1 < z - r || d.collider.z0 > z + r) continue;
      out.push(d.collider);
    }
    return out;
  },

  /* Ray vs all nearby AABBs. Returns {t, point, normal, collider} or null. */
  raycast(origin, dir, maxDist, ignoreDyn) {
    let best = null, bestT = maxDist;
    const S = this.CELL;
    const steps = Math.max(1, Math.ceil(maxDist / S) + 1);
    this._seen.clear();
    for (let s = 0; s <= steps; s++) {
      const d = Math.min(maxDist, s * S);
      const gx = Math.floor((origin.x + dir.x * d) / S);
      const gz = Math.floor((origin.z + dir.z * d) / S);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          const arr = this.grid.get((gx + ox) + ',' + (gz + oz));
          if (!arr) continue;
          for (let i = 0; i < arr.length; i++) {
            const c = arr[i];
            if (this._seen.has(c)) continue;
            this._seen.add(c);
            const h = rayAABB(origin, dir, bestT, c);
            if (h && h.t < bestT) { bestT = h.t; best = { t: h.t, normal: h.normal, collider: c }; }
          }
        }
      }
    }
    if (!ignoreDyn) {
      for (let i = 0; i < this.dyn.length; i++) {
        const d = this.dyn[i];
        if (!d.alive || !d.collider) continue;
        const h = rayAABB(origin, dir, bestT, d.collider);
        if (h && h.t < bestT) { bestT = h.t; best = { t: h.t, normal: h.normal, collider: d.collider, prop: d }; }
      }
    }
    if (best) {
      best.point = new Vector3(origin.x + dir.x * best.t, origin.y + dir.y * best.t, origin.z + dir.z * best.t);
      best.mat = best.collider.mat;
    }
    return best;
  },

  /* Allocation-free line of sight test used by the AI every think tick. */
  blockedRay(ox, oy, oz, dx, dy, dz, maxDist) {
    const S = this.CELL;
    const steps = Math.max(1, Math.ceil(maxDist / (S * 0.8)) + 1);
    this._seen.clear();
    for (let s = 0; s <= steps; s++) {
      const t = Math.min(maxDist, s * S * 0.8);
      const gx = Math.floor((ox + dx * t) / S);
      const gz = Math.floor((oz + dz * t) / S);
      for (let ax = -1; ax <= 1; ax++) {
        for (let az = -1; az <= 1; az++) {
          const arr = this.grid.get((gx + ax) + ',' + (gz + az));
          if (!arr) continue;
          for (let i = 0; i < arr.length; i++) {
            const c = arr[i];
            if (this._seen.has(c)) continue;
            this._seen.add(c);
            if (slabOccluded(ox, oy, oz, dx, dy, dz, maxDist, c)) return true;
          }
        }
      }
    }
    return false;
  },

  /* Push a sphere out of static and dynamic geometry. Returns contact info. */
  spherePush(pos, radius) {
    const near = this.queryNear(pos.x, pos.z, radius + 1.5);
    let hit = false, normal = null;
    for (let i = 0; i < near.length; i++) {
      const c = near[i];
      const cx = GF.clamp(pos.x, c.x0, c.x1);
      const cy = GF.clamp(pos.y, c.y0, c.y1);
      const cz = GF.clamp(pos.z, c.z0, c.z1);
      let dx = pos.x - cx, dy = pos.y - cy, dz = pos.z - cz;
      let d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > radius * radius) continue;
      if (d2 < 1e-8) {
        // centre inside box: push out along the shallowest axis
        const px = Math.min(pos.x - c.x0, c.x1 - pos.x);
        const py = Math.min(pos.y - c.y0, c.y1 - pos.y);
        const pz = Math.min(pos.z - c.z0, c.z1 - pos.z);
        let nx = 0, ny = 0, nz = 0;
        if (px <= py && px <= pz) nx = (pos.x - c.x0 < c.x1 - pos.x) ? -1 : 1;
        else if (py <= pz) ny = (pos.y - c.y0 < c.y1 - pos.y) ? -1 : 1;
        else nz = (pos.z - c.z0 < c.z1 - pos.z) ? -1 : 1;
        pos.x += nx * (px + 0.001); pos.y += ny * (py + 0.001); pos.z += nz * (pz + 0.001);
        normal = new Vector3(nx, ny, nz);
        hit = true;
        continue;
      }
      const d = Math.sqrt(d2);
      const push = radius - d;
      dx /= d; dy /= d; dz /= d;
      pos.x += dx * push; pos.y += dy * push; pos.z += dz * push;
      normal = new Vector3(dx, dy, dz);
      hit = true;
    }
    return hit ? { normal } : null;
  },

  /* Highest solid surface below fromY, or -Infinity. */
  groundAt(x, z, fromY) {
    const near = this.queryNear(x, z, 1.2);
    let best = -Infinity;
    for (let i = 0; i < near.length; i++) {
      const c = near[i];
      if (x < c.x0 - 0.15 || x > c.x1 + 0.15 || z < c.z0 - 0.15 || z > c.z1 + 0.15) continue;
      if (c.y1 <= fromY + 0.35 && c.y1 > best) best = c.y1;
    }
    return best;
  },

  ceilingAt(x, z, fromY) {
    const near = this.queryNear(x, z, 1.2);
    let best = Infinity;
    for (let i = 0; i < near.length; i++) {
      const c = near[i];
      if (x < c.x0 || x > c.x1 || z < c.z0 || z > c.z1) continue;
      if (c.y0 >= fromY && c.y0 < best) best = c.y0;
    }
    return best;
  },

  pointSolid(p, margin) {
    margin = margin || 0;
    const near = this.queryNear(p.x, p.z, 1.0);
    for (let i = 0; i < near.length; i++) {
      const c = near[i];
      if (p.x > c.x0 - margin && p.x < c.x1 + margin &&
        p.y > c.y0 - margin && p.y < c.y1 + margin &&
        p.z > c.z0 - margin && p.z < c.z1 + margin) return c;
    }
    return null;
  },

  /* ---------------------------- sky ---------------------------- */
  setSky(opts) {
    this.scene.fog = new Fog(opts.fog, opts.fogNear, opts.fogFar);
    this.scene.background = new Color(opts.top);
    if (this.skyMesh) { this.scene.remove(this.skyMesh); this.skyMesh.geometry.dispose(); this.skyMesh.material.dispose(); }
    /* unit sphere, scaled just inside the camera far plane so it is never clipped
       and re-centred on the camera every frame */
    const geo = new SphereGeometry(1, 32, 20);
    const mat = new ShaderMaterial({
      uniforms: {
        top: { value: new Color(opts.top) },
        bottom: { value: new Color(opts.bottom) },
        horizon: { value: new Color(opts.horizon || opts.bottom) }
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: [
        'varying vec3 vP;',
        'uniform vec3 top; uniform vec3 bottom; uniform vec3 horizon;',
        'void main(){',
        ' float h = normalize(vP).y;',
        ' float t = smoothstep(-0.05, 0.65, h);',
        ' vec3 c = mix(horizon, top, t);',
        ' c = mix(bottom, c, smoothstep(-0.35, 0.02, h));',
        ' gl_FragColor = vec4(c, 1.0);',
        '}'
      ].join('\n'),
      side: BackSide, depthWrite: false, fog: false
    });
    this.skyMesh = new Mesh(geo, mat);
    this.skyMesh.userData.mapObject = true;
    this.skyMesh.frustumCulled = false;
    this.skyMesh.scale.setScalar(360);
    this.skyMesh.renderOrder = -1;
    this.scene.add(this.skyMesh);

    this.sun.color.set(opts.sunColor || 0xfff0d8);
    this.sun.intensity = opts.sunIntensity === undefined ? 2.2 : opts.sunIntensity;
    this.sun.position.set(opts.sunPos ? opts.sunPos.x : 40, opts.sunPos ? opts.sunPos.y : 60, opts.sunPos ? opts.sunPos.z : 20);
    this.hemi.color.set(opts.hemiSky || 0x9fb4c8);
    this.hemi.groundColor.set(opts.hemiGround || 0x4a4238);
    this.hemi.intensity = opts.hemiIntensity === undefined ? 0.95 : opts.hemiIntensity;
    this.ambient.color.set(opts.ambient || 0xffffff);
    this.ambient.intensity = opts.ambientIntensity === undefined ? 0.22 : opts.ambientIntensity;
    this.sun.castShadow = !!opts.shadows && GF.qset().shadows && GF.settings.shadows;
  },

  /* -------------------------- map builder -------------------------- */
  begin() {
    const batches = {};
    this._lightCount = 0;
    const self = this;
    const api = {
      box(cx, cy, cz, w, h, d, mat, collide, uv) {
        mat = mat || 'concrete';
        (batches[mat] || (batches[mat] = new GFBatch())).box(cx, cy, cz, w, h, d, uv === undefined ? 0.45 : uv);
        if (collide !== false) self.addCollider(cx - w / 2, cy - h / 2, cz - d / 2, cx + w / 2, cy + h / 2, cz + d / 2, mat);
        return api;
      },
      /* axis-aligned wall from point a to b with holes handled by caller */
      wall(x, y, z, w, h, d, mat, uv) { return api.box(x, y + h / 2, z, w, h, d, mat, true, uv); },
      cyl(cx, cy, cz, r, h, mat, collide, seg) {
        mat = mat || 'metal';
        (batches[mat] || (batches[mat] = new GFBatch())).cyl(cx, cy, cz, r, h, seg || 10);
        if (collide !== false) self.addCollider(cx - r, cy - h / 2, cz - r, cx + r, cy + h / 2, cz + r, mat);
        return api;
      },
      platform(cx, cy, cz, w, d, mat, uv) { return api.box(cx, cy, cz, w, 0.3, d, mat, true, uv); },
      stairs(x, y, z, steps, rise, run, width, dirZ, mat) {
        for (let i = 0; i < steps; i++) {
          api.box(x, y + rise * (i + 0.5), z + dirZ * run * (i + 0.5), width, rise, run, mat, true);
        }
        return api;
      },
      finish() {
        for (const mat in batches) {
          const mesh = batches[mat].build(GF.mat(mat));
          mesh.userData.mapObject = true;
          mesh.frustumCulled = true;
          self.scene.add(mesh);
        }
        self.indexColliders();
      }
    };
    return api;
  },

  /* --------------------------- props ---------------------------- */
  spawnProp(def, pos, opts) {
    if (!def) return null;
    opts = opts || {};
    const mesh = GF.buildProp(def);
    mesh.position.copy(pos);
    if (opts.yaw) mesh.rotation.y = opts.yaw;
    mesh.userData.dynamic = true;
    this.scene.add(mesh);
    const half = { x: def.w / 2, y: def.h / 2, z: def.d / 2 };
    const prop = {
      id: GF.uid('prop'), def, mesh,
      pos: pos.clone(), vel: new Vector3(),
      yaw: opts.yaw || 0, spin: opts.spin || 0,
      collider: {
        x0: pos.x - half.x, x1: pos.x + half.x,
        y0: pos.y, y1: pos.y + def.h,
        z0: pos.z - half.z, z1: pos.z + half.z,
        mat: def.mat, dyn: true
      },
      hp: opts.hp || (def.mat === 'glass' ? 12 : def.mass > 300 ? 400 : 120),
      alive: true, burning: 0, fuse: opts.fuse || 0, armed: !!opts.armed,
      owner: opts.owner || null, kind: opts.kind || 'prop'
    };
    this.dyn.push(prop);
    return prop;
  },

  syncPropCollider(p) {
    const d = p.def, hw = d.w / 2, hd = d.d / 2;
    p.collider.x0 = p.pos.x - hw; p.collider.x1 = p.pos.x + hw;
    p.collider.y0 = p.pos.y; p.collider.y1 = p.pos.y + d.h;
    p.collider.z0 = p.pos.z - hd; p.collider.z1 = p.pos.z + hd;
  },

  removeProp(p) {
    p.alive = false;
    if (p.mesh) this.scene.remove(p.mesh);
  },

  updateProps(dt) {
    for (let i = this.dyn.length - 1; i >= 0; i--) {
      const p = this.dyn[i];
      if (!p.alive) { this.dyn.splice(i, 1); continue; }
      if (p.burning > 0) p.burning -= dt;
      if (!p.moving) continue;
      p.vel.y -= 22 * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.copy(p.pos);
      p.yaw += p.spin * dt;
      p.mesh.rotation.y = p.yaw;
      const g = this.groundAt(p.pos.x, p.pos.z, p.pos.y + 0.5);
      if (p.pos.y <= g && p.vel.y <= 0) {
        p.pos.y = g;
        p.vel.y *= -0.24;
        p.vel.x *= 0.7; p.vel.z *= 0.7; p.spin *= 0.6;
        if (Math.abs(p.vel.y) < 1.2 && Math.abs(p.vel.x) < 0.4 && Math.abs(p.vel.z) < 0.4) {
          p.vel.set(0, 0, 0); p.spin = 0; p.moving = false;
        }
      }
      if (p.pos.y < -30) this.removeProp(p);
      this.syncPropCollider(p);
    }
  },

  propAt(pos, radius) {
    for (const p of this.dyn) {
      if (!p.alive) continue;
      const dx = p.pos.x - pos.x, dz = p.pos.z - pos.z;
      const reach = radius + p.def.w;
      if (dx * dx + dz * dz > reach * reach) continue;
      if (pos.y > p.pos.y - 0.5 && pos.y < p.pos.y + p.def.h + 0.5) return p;
    }
    return null;
  }
};

/* boolean ray/AABB test with no allocations */
function slabOccluded(ox, oy, oz, dx, dy, dz, maxT, c) {
  let tmin = 0, tmax = maxT;
  if (Math.abs(dx) < 1e-8) {
    if (ox < c.x0 || ox > c.x1) return false;
  } else {
    let t1 = (c.x0 - ox) / dx, t2 = (c.x1 - ox) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-8) {
    if (oy < c.y0 || oy > c.y1) return false;
  } else {
    let t1 = (c.y0 - oy) / dy, t2 = (c.y1 - oy) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return false;
  }
  if (Math.abs(dz) < 1e-8) {
    if (oz < c.z0 || oz > c.z1) return false;
  } else {
    let t1 = (c.z0 - oz) / dz, t2 = (c.z1 - oz) / dz;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return false;
  }
  return tmin <= maxT;
}

/* ray/AABB slab test shared by the world */
function rayAABB(o, d, maxT, c) {
  let tmin = 0, tmax = maxT, nAxis = -1, nSign = 0;
  for (let a = 0; a < 3; a++) {
    const min = a === 0 ? c.x0 : a === 1 ? c.y0 : c.z0;
    const max = a === 0 ? c.x1 : a === 1 ? c.y1 : c.z1;
    const org = a === 0 ? o.x : a === 1 ? o.y : o.z;
    const dir = a === 0 ? d.x : a === 1 ? d.y : d.z;
    if (Math.abs(dir) < 1e-8) {
      if (org < min || org > max) return null;
      continue;
    }
    let t1 = (min - org) / dir, t2 = (max - org) / dir, sign = -1;
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; sign = 1; }
    if (t1 > tmin) { tmin = t1; nAxis = a; nSign = sign; }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  if (nAxis < 0) return null;
  const normal = new Vector3(nAxis === 0 ? nSign : 0, nAxis === 1 ? nSign : 0, nAxis === 2 ? nSign : 0);
  return { t: tmin, normal };
}
