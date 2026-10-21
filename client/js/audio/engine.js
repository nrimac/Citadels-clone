// Audio engine: one AudioContext with separate music and effects buses, a
// gentle master compressor, and a synthetic "stone hall" reverb. Every sound
// in the game is synthesized at runtime — there are no audio files.

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));

export class AudioEngine {
  constructor(settings = {}) {
    this.ctx = null;
    this.levels = { master: 0.8, music: 0.45, sfx: 0.8, muted: false, ...settings };
    this.listeners = new Set();
    this.noiseBuffer = null;
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /** Must be called from a user gesture; browsers block audio until then. */
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx({ latencyHint: 'interactive' });
      this._build();
      this.listeners.forEach((fn) => fn(this));
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return true;
  }

  onReady(fn) {
    if (this.ctx) fn(this);
    else this.listeners.add(fn);
  }

  _build() {
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 3.5;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.25;
    this.master.connect(this.compressor).connect(ctx.destination);

    this.music = ctx.createGain();
    this.sfx = ctx.createGain();
    this.music.connect(this.master);
    this.sfx.connect(this.master);

    // Synthetic reverb shared by both buses (sent via aux gains).
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(2.8, 2.6);
    this.reverbReturn = ctx.createGain();
    this.reverbReturn.gain.value = 0.55;
    this.reverb.connect(this.reverbReturn).connect(this.master);
    this.musicSend = ctx.createGain();
    this.musicSend.gain.value = 0.5;
    this.music.connect(this.musicSend).connect(this.reverb);
    this.sfxSend = ctx.createGain();
    this.sfxSend.gain.value = 0.25;
    this.sfx.connect(this.sfxSend).connect(this.reverb);

    this.applyLevels();
  }

  _impulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // Early reflections cluster plus a smooth exponential tail.
        const early = i < ctx.sampleRate * 0.08 && Math.random() < 0.02 ? 0.6 : 0;
        data[i] = ((Math.random() * 2 - 1) * 0.6 + early * (Math.random() - 0.5)) * Math.pow(1 - t, decay);
      }
    }
    return buf;
  }

  noise() {
    if (!this.noiseBuffer) {
      const len = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuffer;
  }

  setLevels(levels) {
    Object.assign(this.levels, levels);
    this.applyLevels();
  }

  applyLevels() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const { master, music, sfx, muted } = this.levels;
    this.master.gain.setTargetAtTime(muted ? 0 : clamp01(master), t, 0.05);
    this.music.gain.setTargetAtTime(clamp01(music) * 0.6, t, 0.2);
    this.sfx.gain.setTargetAtTime(clamp01(sfx), t, 0.05);
  }

  // ------------------------------------------------------------ building blocks

  /** An oscillator with an attack/decay envelope routed to `dest`. */
  tone({ type = 'sine', freq = 440, to = null, start = 0, attack = 0.005, hold = 0, decay = 0.3, gain = 0.3, dest, detune = 0, pan = 0 }) {
    const ctx = this.ctx;
    // Partials above the Nyquist frequency are inaudible (and warn); skip them.
    if (freq >= ctx.sampleRate * 0.48) return null;
    const t0 = this.now + start;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + attack + hold + decay);
    osc.detune.value = detune;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    env.gain.setValueAtTime(gain, t0 + attack + hold);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + decay);
    let node = osc.connect(env);
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      node = node.connect(p);
    }
    node.connect(dest ?? this.sfx);
    osc.start(t0);
    osc.stop(t0 + attack + hold + decay + 0.05);
    return osc;
  }

  /** Filtered noise burst. */
  noiseBurst({ start = 0, duration = 0.2, attack = 0.005, gain = 0.3, type = 'bandpass', freq = 1500, to = null, q = 1, dest, pan = 0 }) {
    const ctx = this.ctx;
    const t0 = this.now + start;
    const src = ctx.createBufferSource();
    src.buffer = this.noise();
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t0);
    if (to) filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + duration);
    filter.Q.value = q;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    let node = src.connect(filter).connect(env);
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      node = node.connect(p);
    }
    node.connect(dest ?? this.sfx);
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + duration + 0.05);
  }
}
