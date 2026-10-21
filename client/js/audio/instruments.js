// Synthesized instruments shared by sound effects and music.

export const NOTE = (name) => {
  // e.g. 'D4', 'F#3', 'Bb2'
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return 440;
  const base = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]];
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const semis = base + acc + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
};

const pluckCache = new Map();

/** Karplus–Strong plucked string, rendered once per pitch and cached. */
function pluckBuffer(ctx, freq, { seconds = 2.2, brightness = 0.5, decay = 0.996 } = {}) {
  const key = `${Math.round(freq * 10)}:${brightness}:${decay}`;
  if (pluckCache.has(key)) return pluckCache.get(key);
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);
  const period = Math.max(2, Math.round(sr / freq));
  const ring = new Float32Array(period);
  // Excitation: noise softened by a one-pole filter (lower brightness = warmer).
  let prev = 0;
  for (let i = 0; i < period; i++) {
    const n = Math.random() * 2 - 1;
    prev = prev + (n - prev) * (0.25 + brightness * 0.75);
    ring[i] = prev;
  }
  let idx = 0;
  for (let i = 0; i < len; i++) {
    const next = (idx + 1) % period;
    const v = ring[idx];
    out[i] = v;
    ring[idx] = decay * 0.5 * (v + ring[next]);
    idx = next;
  }
  // Short fade-in to avoid a click, and normalize.
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
  const norm = peak ? 0.9 / peak : 1;
  for (let i = 0; i < len; i++) out[i] *= norm * (i < 64 ? i / 64 : 1);
  pluckCache.set(key, buf);
  return buf;
}

export function pluck(engine, { freq, start = 0, gain = 0.3, dest, pan = 0, brightness = 0.5, decay = 0.996, seconds = 2.2 }) {
  const ctx = engine.ctx;
  const t0 = engine.now + start;
  const src = ctx.createBufferSource();
  src.buffer = pluckBuffer(ctx, freq, { brightness, decay, seconds });
  const body = ctx.createBiquadFilter();
  body.type = 'peaking';
  body.frequency.value = 420;
  body.Q.value = 1.2;
  body.gain.value = 5;
  const env = ctx.createGain();
  env.gain.value = gain;
  let node = src.connect(body).connect(env);
  if (pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    node = node.connect(p);
  }
  node.connect(dest ?? engine.sfx);
  src.start(t0);
  return src;
}

/** Church-bell style tone built from inharmonic partials. */
export function bell(engine, { freq = 660, start = 0, gain = 0.25, decay = 2.5, dest, pan = 0 }) {
  const partials = [
    [0.5, 0.35, 1.4],
    [1, 1, 1],
    [1.19, 0.45, 0.8],
    [1.56, 0.3, 0.7],
    [2, 0.4, 0.6],
    [2.74, 0.22, 0.45],
    [3.76, 0.14, 0.35],
    [5.4, 0.08, 0.25],
  ];
  for (const [ratio, amp, dec] of partials) {
    engine.tone({ type: 'sine', freq: freq * ratio, start, attack: 0.002, decay: decay * dec, gain: gain * amp * 0.5, dest, pan });
  }
}

/** Soft brass-like note: detuned saws through an enveloped low-pass filter. */
export function brass(engine, { freq, start = 0, duration = 0.5, gain = 0.18, dest, pan = 0 }) {
  const ctx = engine.ctx;
  const t0 = engine.now + start;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(300, t0);
  filter.frequency.exponentialRampToValueAtTime(freq * 6, t0 + 0.06);
  filter.frequency.exponentialRampToValueAtTime(freq * 2.5, t0 + duration);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.04);
  env.gain.setValueAtTime(gain * 0.8, t0 + duration * 0.7);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration + 0.25);
  let node = filter.connect(env);
  if (pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    node = node.connect(p);
  }
  node.connect(dest ?? engine.sfx);
  for (const detune of [-7, 0, 6]) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 0.985, t0);
    osc.frequency.exponentialRampToValueAtTime(freq, t0 + 0.05);
    osc.detune.value = detune;
    osc.connect(filter);
    osc.start(t0);
    osc.stop(t0 + duration + 0.3);
  }
}

/** Breathy recorder / flute voice with gentle vibrato. */
export function flute(engine, { freq, start = 0, duration = 0.6, gain = 0.08, dest, pan = 0 }) {
  const ctx = engine.ctx;
  const t0 = engine.now + start;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  const vib = ctx.createOscillator();
  vib.frequency.value = 5.2;
  const vibGain = ctx.createGain();
  vibGain.gain.setValueAtTime(0, t0);
  vibGain.gain.linearRampToValueAtTime(freq * 0.006, t0 + duration * 0.6);
  vib.connect(vibGain).connect(osc.frequency);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.08);
  env.gain.setValueAtTime(gain, t0 + duration * 0.8);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration + 0.2);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = freq * 4;
  let node = osc.connect(lp).connect(env);
  if (pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    node = node.connect(p);
  }
  node.connect(dest ?? engine.sfx);
  osc.start(t0);
  vib.start(t0);
  osc.stop(t0 + duration + 0.3);
  vib.stop(t0 + duration + 0.3);
  engine.noiseBurst({ start, duration: 0.12, gain: gain * 0.25, type: 'bandpass', freq: freq * 2, q: 2, dest });
}
