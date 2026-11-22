/* =====================================================================
   GORE TOWN — hybrid audio engine
   ElevenLabs one-shots are embedded as base64 data URIs and decoded into
   AudioBuffers; the procedural synth remains as a fallback for anything that
   has not decoded yet. Both share distance attenuation and stereo panning.
   ===================================================================== */

const GFAudio = {
  ctx: null,
  master: null,
  sfx: null,
  ready: false,
  volume: 0.85,
  noiseCache: new Map(),
  listener: { pos: new Vector3(), quat: new Quaternion(), right: new Vector3(1, 0, 0) },
  voices: 0,
  maxVoices: 26,
  samples: new Map(),
  sampleLoading: false,

  init() {
    if (this.ctx) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = GF.settings.volume;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 20;
      comp.ratio.value = 8;
      comp.attack.value = 0.003;
      comp.release.value = 0.22;
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.9;
      this.sfx.connect(comp);
      comp.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.ready = true;
      this.loadSamples();
    } catch (e) { this.ctx = null; }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => { }); },
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; GF.settings.volume = v; },

  /* ElevenLabs clips are embedded as base64 data URIs. Decode them once into
     AudioBuffers so overlapping gunfire and voices cost no extra requests. */
  loadSamples() {
    if (this.sampleLoading || !this.ready || typeof GT_SFX === 'undefined') return;
    this.sampleLoading = true;
    const names = Object.keys(GT_SFX);
    setTimeout(() => {
      for (const name of names) {
        try {
          const uri = GT_SFX[name];
          const bin = atob(uri.slice(uri.indexOf(',') + 1));
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          this.ctx.decodeAudioData(bytes.buffer).then((buf) => {
            this.samples.set(name, buf);
          }).catch(() => { });
        } catch (e) { }
      }
    }, 30);
  },

  playSample(name, vol, pos, opts) {
    if (!this.ready || !this.samples.size) return false;
    const buf = this.samples.get(name);
    if (!buf) return false;
    opts = opts || {};
    try {
      if (this.ctx.state === 'suspended') this.resume();
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = opts.rate || 1;
      const out = this.bus(vol === undefined ? 0.55 : vol, pos, opts.maxDist || 90);
      src.connect(out);
      src.start(this.ctx.currentTime + (opts.delay || 0));
      src.onended = () => { try { src.disconnect(); out.disconnect(); } catch (e) { } };
      return true;
    } catch (e) { return false; }
  },

  noise(dur) {
    const key = Math.round(dur * 1000);
    let b = this.noiseCache.get(key);
    if (b) return b;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (this.noiseCache.size > 24) this.noiseCache.clear();
    this.noiseCache.set(key, b);
    return b;
  },

  /* Build a positional chain. `pos` optional; always uses listener transform. */
  bus(vol, pos, maxDist) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    let gain = vol;
    let pan = 0;
    if (pos) {
      const dx = pos.x - this.listener.pos.x;
      const dy = pos.y - this.listener.pos.y;
      const dz = pos.z - this.listener.pos.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      maxDist = maxDist || 90;
      gain *= Math.max(0, 1 - d / maxDist) / (1 + d * 0.055);
      const inv = 1 / Math.max(d, 0.001);
      pan = GF.clamp((dx * this.listener.right.x + dz * this.listener.right.z) * inv, -1, 1) * 0.85;
    }
    g.gain.value = gain;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p); p.connect(this.sfx);
    } else g.connect(this.sfx);
    return g;
  },

  noiseBurst(dest, t0, dur, freq, q, gain, type) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise(dur);
    const f = ctx.createBiquadFilter();
    f.type = type || 'lowpass';
    f.frequency.value = freq;
    f.Q.value = q || 1;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(gain, t0 + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    src.connect(f); f.connect(env); env.connect(dest);
    src.start(t0); src.stop(t0 + dur + 0.02);
  },
  tone(dest, t0, dur, f0, f1, type, gain) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(gain, t0 + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(env); env.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },

  /* ------------------------------ combat ------------------------------ */
  shot(power, pos, opts) {
    if (!this.ready) return;
    if (this.voices > this.maxVoices) return;
    this.voices++;
    const p = GF.clamp(power, 0.15, 3);
    const model = String((opts && opts.model) || '');
    let kind = /shotgun/.test(model) ? 'shotgun'
      : /(lmg|minigun|launcher|heavy)/.test(model) ? 'heavy'
        : /(rifle|sniper|smg|carbine|dmr)/.test(model) ? 'rifle' : 'pistol';
    if (!model) kind = p < 0.85 ? 'pistol' : p < 1.45 ? 'rifle' : p < 2.2 ? 'shotgun' : 'heavy';
    if (this.playSample('shot_' + kind, 0.78 + p * 0.06, pos,
      { rate: 0.95 + Math.random() * 0.08, maxDist: 180 })) {
      setTimeout(() => { this.voices = Math.max(0, this.voices - 1); }, 140);
      return;
    }
    const t = this.ctx.currentTime;
    const out = this.bus(0.55 + p * 0.15, pos, 140);
    this.noiseBurst(out, t, 0.06 + p * 0.09, 2600 + p * 1600, 0.8, 0.85);
    this.noiseBurst(out, t, 0.22 + p * 0.4, 420 + p * 160, 0.6, 0.5);
    this.tone(out, t, 0.11 + p * 0.12, 180 + p * 60, 42, 'sine', 0.5);
    this.tone(out, t, 0.03, 3800, 1200, 'square', 0.14);
    if (p > 1.5) this.noiseBurst(out, t + 0.02, 0.7, 240, 0.4, 0.16);
    setTimeout(() => { this.voices = Math.max(0, this.voices - 1); }, 140);
  },
  explosion(pos, size) {
    if (!this.ready) return;
    if (this.playSample('explosion', 1.0, pos, { rate: 0.92 + Math.random() * 0.12, maxDist: 280 })) return;
    const t = this.ctx.currentTime;
    const s = GF.clamp(size || 1, 0.4, 3);
    const out = this.bus(1.0, pos, 260);
    this.noiseBurst(out, t, 0.9 * s, 900, 0.4, 1.0);
    this.noiseBurst(out, t, 0.35, 2400, 0.7, 0.6);
    this.tone(out, t, 1.2 * s, 110, 24, 'sine', 0.9);
    this.tone(out, t, 0.5, 70, 30, 'triangle', 0.5);
  },
  flesh(pos, heavy) {
    if (!this.ready) return;
    const clip = heavy && Math.random() < 0.55 ? 'organ_spill' : 'flesh_hit';
    if (this.playSample(clip, heavy ? 0.72 : 0.5, pos,
      { rate: 0.9 + Math.random() * 0.18, maxDist: 55 })) return;
    const t = this.ctx.currentTime;
    const out = this.bus(0.5, pos, 45);
    this.noiseBurst(out, t, heavy ? 0.24 : 0.1, heavy ? 380 : 900, 1.2, 0.8);
    this.tone(out, t, heavy ? 0.18 : 0.07, 150, 60, 'sine', 0.25);
  },
  splat(pos, size) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const out = this.bus(0.4, pos, 40);
    this.noiseBurst(out, t, 0.16 * (size || 1), 520, 1.4, 0.7);
  },
  bone(pos) {
    if (!this.ready) return;
    if (this.playSample('ragdoll_crack', 0.5, pos, { rate: 0.9 + Math.random() * 0.2, maxDist: 42 })) return;
    const t = this.ctx.currentTime;
    const out = this.bus(0.4, pos, 40);
    this.noiseBurst(out, t, 0.05, 1800, 3, 0.5, 'bandpass');
    this.tone(out, t, 0.05, 340, 200, 'square', 0.12);
  },
  impact(mat, pos) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const out = this.bus(0.3, pos, 50);
    if (mat === 'metal') {
      this.noiseBurst(out, t, 0.09, 3000, 8, 0.5, 'bandpass');
      this.tone(out, t, 0.16, 1200, 700, 'triangle', 0.1);
    } else if (mat === 'wood') {
      this.noiseBurst(out, t, 0.09, 700, 2, 0.55);
    } else if (mat === 'glass') {
      this.noiseBurst(out, t, 0.25, 5000, 2, 0.45, 'highpass');
      this.noiseBurst(out, t + 0.01, 0.14, 2500, 2, 0.3, 'bandpass');
    } else if (mat === 'dirt') {
      this.noiseBurst(out, t, 0.11, 320, 0.8, 0.5);
    } else {
      this.noiseBurst(out, t, 0.08, 1400, 1.4, 0.4);
    }
  },
  step(mat, pos) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const out = this.bus(0.16, pos, 20);
    if (mat === 'metal') this.noiseBurst(out, t, 0.07, 1600, 3, 0.5, 'bandpass');
    else if (mat === 'wood') this.noiseBurst(out, t, 0.07, 520, 1.6, 0.55);
    else this.noiseBurst(out, t, 0.08, 380, 0.9, 0.5);
  },
  shell(pos) {
    if (!this.ready) return;
    if (Math.random() < 0.32 && this.playSample('shell_drop', 0.26, pos,
      { rate: 0.92 + Math.random() * 0.2, maxDist: 16 })) return;
    const t = this.ctx.currentTime;
    const out = this.bus(0.18, pos, 12);
    this.tone(out, t, 0.12, 2600 + Math.random() * 900, 1800, 'triangle', 0.16);
    this.noiseBurst(out, t, 0.04, 5000, 6, 0.2, 'bandpass');
  },
  reload(stage) {
    if (!this.ready) return;
    if (stage === 'out' && this.playSample('reload_click', 0.42, null, { rate: 0.96 + Math.random() * 0.08, maxDist: 12 })) return;
    const t = this.ctx.currentTime;
    const out = this.bus(0.3, null, 10);
    if (stage === 'out') { this.noiseBurst(out, t, 0.07, 2800, 3, 0.4); this.tone(out, t, 0.05, 700, 500, 'square', 0.08); }
    else if (stage === 'in') { this.noiseBurst(out, t, 0.08, 1700, 4, 0.5); this.tone(out, t, 0.06, 420, 260, 'square', 0.1); }
    else { this.noiseBurst(out, t, 0.05, 3400, 5, 0.45); this.tone(out, t, 0.05, 900, 600, 'square', 0.09); }
  },
  click() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.noiseBurst(this.bus(0.12, null, 8), t, 0.03, 4200, 4, 0.5, 'bandpass');
  },
  ui(freq) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const out = this.bus(0.1, null, 8);
    this.tone(out, t, 0.06, freq || 620, (freq || 620) * 0.7, 'triangle', 0.2);
  },
  pickup() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const out = this.bus(0.22, null, 8);
    this.tone(out, t, 0.09, 520, 780, 'triangle', 0.22);
    this.tone(out, t + 0.07, 0.1, 780, 1040, 'triangle', 0.16);
  },
  hurt() {
    if (!this.ready) return;
    if (Math.random() < 0.6 && this.playSample('pain_grunt', 0.45, null, { rate: 0.92 + Math.random() * 0.12, maxDist: 12 })) return;
    const t = this.ctx.currentTime;
    const out = this.bus(0.5, null, 10);
    this.noiseBurst(out, t, 0.2, 600, 1.2, 0.5);
    this.tone(out, t, 0.35, 220, 90, 'sawtooth', 0.14);
  },
  death() {
    if (!this.ready) return;
    if (this.playSample('death_rattle', 0.6, null, { rate: 0.96, maxDist: 16 })) return;
    const t = this.ctx.currentTime;
    const out = this.bus(0.6, null, 12);
    this.tone(out, t, 1.4, 180, 40, 'sawtooth', 0.16);
    this.noiseBurst(out, t, 1.0, 400, 0.8, 0.25);
  },
  heart() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const out = this.bus(0.3, null, 8);
    this.tone(out, t, 0.12, 62, 40, 'sine', 0.4);
    this.tone(out, t + 0.2, 0.1, 56, 38, 'sine', 0.28);
  },
  whoosh(pos) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const out = this.bus(0.25, pos, 30);
    this.noiseBurst(out, t, 0.28, 900, 0.7, 0.4);
  },

  deathVoice(pos, kind) {
    if (!this.ready) return;
    if (kind === 'zombie') {
      this.playSample(Math.random() < 0.5 ? 'zombie_growl' : 'zombie_attack', 0.5, pos,
        { rate: 0.88 + Math.random() * 0.14, maxDist: 60 });
      return;
    }
    if (kind === 'civilian' && Math.random() < 0.85) {
      this.playSample(Math.random() < 0.55 ? 'scream_female' : 'civilian_scream', 0.46, pos,
        { rate: 0.94 + Math.random() * 0.12, maxDist: 55 });
      return;
    }
    if (Math.random() < 0.45) this.playSample('pain_grunt', 0.4, pos, { rate: 0.9 + Math.random() * 0.16, maxDist: 45 });
    else if (Math.random() < 0.35) this.playSample('scream_male', 0.34, pos, { rate: 0.92 + Math.random() * 0.1, maxDist: 45 });
  },

  ragdollLand(pos) {
    if (!this.ready) return;
    this.playSample('ragdoll_thud', 0.5, pos, { delay: 0.55, rate: 0.9 + Math.random() * 0.16, maxDist: 60 });
    if (Math.random() < 0.5) this.playSample('ragdoll_crack', 0.28, pos, { delay: 0.6, rate: 0.88 + Math.random() * 0.16, maxDist: 45 });
  },

  dragBody(pos) {
    if (!this.ready) return;
    this.playSample('body_drag', 0.5, pos, { rate: 0.94 + Math.random() * 0.1, maxDist: 30 });
  },

  organSpill(pos) {
    if (!this.ready) return;
    this.playSample('organ_spill', 0.55, pos, { rate: 0.92 + Math.random() * 0.14, maxDist: 40 });
  },
  ignite(pos) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const out = this.bus(0.5, pos, 40);
    this.noiseBurst(out, t, 0.6, 1200, 0.5, 0.5);
    this.noiseBurst(out, t + 0.1, 1.4, 500, 0.4, 0.35);
  },
  beep(pos, freq) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.tone(this.bus(0.18, pos, 30), t, 0.09, freq || 880, freq || 880, 'square', 0.25);
  },
  flight(pos) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const out = this.bus(0.4, pos, 80);
    this.noiseBurst(out, t, 0.55, 1800, 0.6, 0.5);
    this.tone(out, t, 0.5, 300, 900, 'sawtooth', 0.08);
  },

  update(dt) {
    if (!this.ready) return;
    this.voices = Math.max(0, this.voices - dt * 4);
  },
  updateListener(camera) {
    this.listener.pos.setFromMatrixPosition(camera.matrixWorld);
    camera.getWorldQuaternion(this.listener.quat);
    this.listener.right.set(1, 0, 0).applyQuaternion(this.listener.quat);
  }
};
/* exposed for the console and automated smoke tests */
if (typeof window !== 'undefined') window.GTAudio = GFAudio;
