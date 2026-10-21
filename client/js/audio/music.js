// Generative medieval music: a lute arpeggiating modal chord progressions over
// a soft drone, with an occasional recorder melody and (in game) a frame drum.
// Nothing is pre-recorded; every phrase is composed on the fly.

import { NOTE, flute, pluck } from './instruments.js';

const CHORDS = {
  Dm: ['D3', 'F3', 'A3', 'D4', 'F4'],
  C: ['C3', 'E3', 'G3', 'C4', 'E4'],
  G: ['G2', 'B2', 'D3', 'G3', 'B3'],
  Am: ['A2', 'C3', 'E3', 'A3', 'C4'],
  F: ['F2', 'A2', 'C3', 'F3', 'A3'],
  Bb: ['Bb2', 'D3', 'F3', 'Bb3', 'D4'],
};

// D dorian, two octaves for the recorder.
const SCALE = ['D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6', 'D6', 'E6'];

const MOODS = {
  menu: {
    bpm: 64,
    progression: ['Dm', 'Dm', 'C', 'C', 'G', 'G', 'Dm', 'Am'],
    patterns: [
      [0, 2, 1, 3, 2, 4, 3, 2],
      [0, 1, 2, 3, 4, 3, 2, 1],
      [0, 2, 4, 2, 3, 2, 1, 2],
    ],
    melodyChance: 0.55,
    drum: false,
    drone: ['D2', 'A2'],
    density: 0.85,
  },
  game: {
    bpm: 74,
    progression: ['Dm', 'C', 'Dm', 'Am', 'F', 'C', 'G', 'Dm'],
    patterns: [
      [0, 2, 1, 2, 3, 2, 1, 2],
      [0, 3, 2, 3, 1, 3, 2, 4],
      [0, 2, 4, 3, 2, 1, 2, 3],
    ],
    melodyChance: 0.35,
    drum: true,
    drone: ['D2', 'A2'],
    density: 0.75,
  },
};

export class MusicDirector {
  constructor(engine) {
    this.engine = engine;
    this.mood = null;
    this.timer = null;
    this.session = null;
  }

  play(mood) {
    if (mood === this.mood) return;
    this.mood = mood;
    if (!this.engine.ctx) {
      // Start as soon as audio is unlocked.
      this.engine.onReady(() => {
        const m = this.mood;
        this.mood = null;
        this.play(m);
      });
      return;
    }
    this._stopSession();
    if (!mood || !MOODS[mood]) return;
    this._startSession(MOODS[mood]);
  }

  stop() {
    this.mood = null;
    this._stopSession();
  }

  _startSession(def) {
    const e = this.engine;
    const ctx = e.ctx;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 2.5);
    out.connect(e.music);

    // Drone: detuned saws through a slowly breathing low-pass filter.
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 380;
    droneFilter.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain).connect(droneFilter.frequency);
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.045;
    droneFilter.connect(droneGain).connect(out);
    const oscs = [lfo];
    for (const n of def.drone) {
      for (const detune of [-6, 5]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = NOTE(n);
        o.detune.value = detune;
        o.connect(droneFilter);
        oscs.push(o);
      }
    }
    oscs.forEach((o) => o.start());

    const session = { def, out, oscs, step: 0, nextTime: ctx.currentTime + 0.3, pattern: def.patterns[0], melody: [] };
    this.session = session;
    this.timer = setInterval(() => this._schedule(session), 60);
  }

  _stopSession() {
    clearInterval(this.timer);
    this.timer = null;
    const s = this.session;
    this.session = null;
    if (!s) return;
    const t = this.engine.ctx.currentTime;
    s.out.gain.cancelScheduledValues(t);
    s.out.gain.setValueAtTime(Math.max(0.0001, s.out.gain.value), t);
    s.out.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    setTimeout(() => {
      s.oscs.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      });
      s.out.disconnect();
    }, 1400);
  }

  _schedule(s) {
    const e = this.engine;
    if (!e.ctx || this.session !== s) return;
    const eighth = 60 / s.def.bpm / 2;
    while (s.nextTime < e.ctx.currentTime + 0.35) {
      this._step(s, s.nextTime);
      s.nextTime += eighth * (s.step % 2 ? 0.94 : 1.06); // a gentle lilt
      s.step++;
    }
  }

  _step(s, time) {
    const e = this.engine;
    const { def } = s;
    const bar = Math.floor(s.step / 8);
    const beat = s.step % 8;
    const chord = CHORDS[def.progression[bar % def.progression.length]];
    const start = Math.max(0, time - e.ctx.currentTime);

    if (beat === 0) {
      if (Math.random() < 0.3) s.pattern = def.patterns[Math.floor(Math.random() * def.patterns.length)];
      // Bass note on the downbeat.
      pluck(e, { freq: NOTE(chord[0]) / 2, start, gain: 0.2, dest: s.out, brightness: 0.25, decay: 0.997, seconds: 2.6 });
      if (bar % 4 === 0 && Math.random() < def.melodyChance) s.melody = this._composePhrase(chord);
    }

    if (Math.random() < def.density) {
      const note = chord[s.pattern[beat] % chord.length];
      const pan = (beat % 2 ? 0.25 : -0.25) + (Math.random() - 0.5) * 0.2;
      pluck(e, { freq: NOTE(note), start, gain: beat === 0 ? 0.16 : 0.11, dest: s.out, pan, brightness: 0.45, decay: 0.995 });
    }

    const phraseNote = s.melody.find((m) => m.step === beat + (bar % 4) * 8);
    if (phraseNote) {
      const dur = (60 / def.bpm / 2) * phraseNote.len;
      flute(e, { freq: NOTE(phraseNote.note), start, duration: dur, gain: 0.05, dest: s.out, pan: 0.1 });
    }
    if (beat === 7 && bar % 4 === 3) s.melody = [];

    if (def.drum && (beat === 0 || beat === 4 || (beat === 6 && Math.random() < 0.3))) {
      const accent = beat === 0 ? 1 : 0.6;
      e.tone({ type: 'sine', freq: 95, to: 50, start, decay: 0.28, gain: 0.12 * accent, dest: s.out });
      e.noiseBurst({ start, duration: 0.08, gain: 0.03 * accent, type: 'lowpass', freq: 600, dest: s.out });
    }
  }

  _composePhrase(chord) {
    // Random walk on the scale, starting near a chord tone, spanning a few bars.
    const chordTones = chord.map((n) => n[0]);
    let idx = SCALE.findIndex((n) => chordTones.includes(n[0]));
    if (idx < 0) idx = 0;
    const notes = [];
    let step = 2 + Math.floor(Math.random() * 3);
    const total = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < total && step < 30; i++) {
      const len = [2, 2, 3, 4, 6][Math.floor(Math.random() * 5)];
      notes.push({ step, note: SCALE[idx], len });
      step += len;
      idx = Math.max(0, Math.min(SCALE.length - 1, idx + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
    }
    return notes;
  }
}
