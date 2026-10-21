// The game's sound effects, all synthesized. Each entry receives the audio
// engine and optional parameters. Use `play(name, opts)` from audio/index.js.

import { NOTE, bell, brass, flute, pluck } from './instruments.js';

const rand = (a, b) => a + Math.random() * (b - a);

export const SFX = {
  // ------------------------------------------------------------ interface
  click(e) {
    e.tone({ type: 'triangle', freq: rand(820, 900), to: 500, decay: 0.05, gain: 0.3 });
    e.noiseBurst({ duration: 0.03, gain: 0.16, freq: 3200, q: 2 });
  },
  hover(e) {
    e.tone({ type: 'sine', freq: rand(1500, 1700), decay: 0.04, gain: 0.045 });
  },
  open(e) {
    e.noiseBurst({ duration: 0.25, gain: 0.14, type: 'lowpass', freq: 400, to: 2400, attack: 0.08 });
    e.tone({ type: 'sine', freq: NOTE('A4'), decay: 0.25, gain: 0.09 });
  },
  close(e) {
    e.noiseBurst({ duration: 0.2, gain: 0.12, type: 'lowpass', freq: 2400, to: 300, attack: 0.02 });
  },
  error(e) {
    e.tone({ type: 'square', freq: 140, decay: 0.12, gain: 0.07 });
    e.tone({ type: 'square', freq: 133, start: 0.09, decay: 0.16, gain: 0.07 });
  },
  toggle(e) {
    e.tone({ type: 'sine', freq: NOTE('E5'), decay: 0.08, gain: 0.14 });
    e.tone({ type: 'sine', freq: NOTE('B5'), start: 0.05, decay: 0.12, gain: 0.1 });
  },
  chat(e) {
    bell(e, { freq: NOTE('A5'), gain: 0.1, decay: 0.8 });
  },
  join(e) {
    pluck(e, { freq: NOTE('D4'), gain: 0.18 });
    pluck(e, { freq: NOTE('A4'), start: 0.09, gain: 0.16 });
    pluck(e, { freq: NOTE('D5'), start: 0.18, gain: 0.14 });
  },
  leave(e) {
    pluck(e, { freq: NOTE('D5'), gain: 0.14 });
    pluck(e, { freq: NOTE('A4'), start: 0.09, gain: 0.14 });
    pluck(e, { freq: NOTE('D4'), start: 0.18, gain: 0.14 });
  },

  // ------------------------------------------------------------ cards
  cardDraw(e, { delay = 0 } = {}) {
    e.noiseBurst({ start: delay, duration: 0.12, gain: 0.36, freq: 1800, to: 5200, q: 0.8, attack: 0.01 });
    e.tone({ type: 'sine', start: delay, freq: 180, to: 90, decay: 0.07, gain: 0.14 });
  },
  cardFlip(e, { delay = 0 } = {}) {
    e.noiseBurst({ start: delay, duration: 0.08, gain: 0.32, freq: 4000, to: 1500, q: 1.2 });
    e.noiseBurst({ start: delay + 0.06, duration: 0.05, gain: 0.18, freq: 2500, q: 1.5 });
  },
  cardSelect(e) {
    e.noiseBurst({ duration: 0.06, gain: 0.2, freq: 3000, q: 1 });
    e.tone({ type: 'sine', freq: NOTE('D6'), decay: 0.1, gain: 0.07 });
  },
  shuffle(e) {
    for (let i = 0; i < 9; i++)
      e.noiseBurst({ start: i * 0.035, duration: 0.05, gain: 0.17, freq: rand(2500, 4500), q: 1.2, pan: rand(-0.3, 0.3) });
  },

  // ------------------------------------------------------------ gold
  coin(e, { delay = 0, pan = 0 } = {}) {
    const base = rand(2400, 2900);
    for (const [ratio, amp] of [
      [1, 1],
      [2.76, 0.55],
      [5.4, 0.3],
      [8.93, 0.15],
    ]) {
      e.tone({
        type: 'sine',
        freq: base * ratio,
        start: delay,
        attack: 0.001,
        decay: rand(0.18, 0.32) / Math.sqrt(ratio),
        gain: 0.15 * amp,
        pan,
      });
    }
    e.noiseBurst({ start: delay, duration: 0.02, gain: 0.1, freq: 6000, q: 2, pan });
  },
  coins(e, { count = 2, pan = 0 } = {}) {
    const n = Math.min(count, 8);
    for (let i = 0; i < n; i++) SFX.coin(e, { delay: i * rand(0.06, 0.1), pan: pan + rand(-0.2, 0.2) });
  },
  purse(e) {
    e.noiseBurst({ duration: 0.18, gain: 0.08, type: 'lowpass', freq: 900, attack: 0.03 });
    SFX.coins(e, { count: 3 });
  },

  // ------------------------------------------------------------ the city
  build(e) {
    e.tone({ type: 'sine', freq: 120, to: 48, decay: 0.35, gain: 0.32 });
    e.noiseBurst({ duration: 0.3, gain: 0.18, type: 'lowpass', freq: 700, to: 200 });
    for (let i = 0; i < 4; i++) e.noiseBurst({ start: 0.08 + i * 0.05, duration: 0.04, gain: 0.04, freq: rand(1500, 3000), q: 3 });
    bell(e, { freq: NOTE('G5'), start: 0.16, gain: 0.08, decay: 1.2 });
    bell(e, { freq: NOTE('D6'), start: 0.22, gain: 0.05, decay: 1 });
  },
  destroy(e) {
    e.tone({ type: 'sine', freq: 90, to: 30, decay: 0.9, gain: 0.4 });
    e.noiseBurst({ duration: 1.1, gain: 0.32, type: 'lowpass', freq: 1800, to: 120, attack: 0.01 });
    for (let i = 0; i < 12; i++)
      e.noiseBurst({
        start: 0.12 + rand(0, 0.9),
        duration: rand(0.03, 0.08),
        gain: rand(0.03, 0.07),
        freq: rand(600, 2800),
        q: 2,
        pan: rand(-0.6, 0.6),
      });
  },
  complete(e) {
    [NOTE('D4'), NOTE('A4'), NOTE('D5'), NOTE('F#5')].forEach((f, i) => brass(e, { freq: f, start: i * 0.02, duration: 1.1, gain: 0.07 }));
    bell(e, { freq: NOTE('D5'), start: 0.05, gain: 0.12, decay: 3 });
    bell(e, { freq: NOTE('A5'), start: 0.35, gain: 0.1, decay: 3 });
  },

  // ------------------------------------------------------------ characters
  call(e) {
    bell(e, { freq: NOTE('D4'), gain: 0.14, decay: 3 });
  },
  yourTurn(e) {
    bell(e, { freq: NOTE('A5'), gain: 0.14, decay: 1.6 });
    bell(e, { freq: NOTE('D6'), start: 0.16, gain: 0.12, decay: 2 });
  },
  pick(e) {
    SFX.cardFlip(e);
    pluck(e, { freq: NOTE('A3'), start: 0.05, gain: 0.16 });
    pluck(e, { freq: NOTE('E4'), start: 0.12, gain: 0.12 });
  },
  murder(e) {
    e.noiseBurst({ duration: 0.35, gain: 0.22, freq: 5000, to: 600, q: 2.5, attack: 0.04 });
    e.tone({ type: 'sawtooth', freq: NOTE('D2'), start: 0.15, attack: 0.05, decay: 1.6, gain: 0.07 });
    e.tone({ type: 'sawtooth', freq: NOTE('Eb2'), start: 0.15, attack: 0.05, decay: 1.6, gain: 0.06 });
    e.tone({ type: 'sine', freq: NOTE('D3'), to: NOTE('D2'), start: 0.15, decay: 1.2, gain: 0.18 });
  },
  murdered(e) {
    bell(e, { freq: NOTE('D3'), gain: 0.16, decay: 3.5 });
    e.tone({ type: 'sine', freq: NOTE('Ab2'), start: 0.05, decay: 2, gain: 0.08 });
  },
  rob(e) {
    ['B4', 'Bb4', 'A4', 'F4'].forEach((n, i) => pluck(e, { freq: NOTE(n), start: i * 0.11, gain: 0.18, brightness: 0.8, decay: 0.985 }));
  },
  robbed(e) {
    SFX.purse(e);
    pluck(e, { freq: NOTE('F4'), start: 0.15, gain: 0.15, decay: 0.985 });
    pluck(e, { freq: NOTE('C4'), start: 0.28, gain: 0.15, decay: 0.985 });
  },
  magic(e) {
    const notes = ['D5', 'F5', 'A5', 'C6', 'E6', 'A6'];
    notes.forEach((n, i) =>
      e.tone({ type: 'sine', freq: NOTE(n), start: i * 0.06, attack: 0.01, decay: 0.9, gain: 0.06, pan: rand(-0.6, 0.6) }),
    );
    e.noiseBurst({ duration: 0.6, gain: 0.04, type: 'highpass', freq: 6000, attack: 0.2 });
  },
  crown(e) {
    const seq = [
      ['D4', 0, 0.22],
      ['A4', 0.18, 0.22],
      ['D5', 0.36, 0.9],
    ];
    seq.forEach(([n, s, d]) => brass(e, { freq: NOTE(n), start: s, duration: d, gain: 0.12 }));
    brass(e, { freq: NOTE('F#4'), start: 0.36, duration: 0.9, gain: 0.08 });
    bell(e, { freq: NOTE('D6'), start: 0.36, gain: 0.06, decay: 2 });
  },
  income(e, { count = 1 } = {}) {
    SFX.coins(e, { count: Math.max(1, count) });
  },
  architect(e) {
    for (let i = 0; i < 3; i++) e.tone({ type: 'triangle', freq: rand(1800, 2200), start: i * 0.14, decay: 0.08, gain: 0.14 });
  },
  warcry(e) {
    brass(e, { freq: NOTE('A2'), duration: 0.6, gain: 0.08 });
    brass(e, { freq: NOTE('E3'), start: 0.02, duration: 0.6, gain: 0.06 });
  },
  graveyard(e) {
    bell(e, { freq: NOTE('F3'), gain: 0.1, decay: 2.5 });
    SFX.coin(e, { delay: 0.2 });
  },
  lab(e) {
    for (let i = 0; i < 6; i++)
      e.tone({ type: 'sine', freq: rand(500, 1400), to: rand(1400, 2200), start: i * 0.06, decay: 0.06, gain: 0.05 });
    SFX.coin(e, { delay: 0.4 });
  },
  anvil(e) {
    bell(e, { freq: 980, gain: 0.12, decay: 0.9 });
    bell(e, { freq: 980, start: 0.28, gain: 0.08, decay: 0.7 });
  },

  // ------------------------------------------------------------ rounds and endings
  roundStart(e) {
    SFX.shuffle(e);
    flute(e, { freq: NOTE('D5'), start: 0.25, duration: 0.3, gain: 0.07 });
    flute(e, { freq: NOTE('A5'), start: 0.55, duration: 0.5, gain: 0.07 });
  },
  victory(e) {
    const melody = [
      ['D4', 0, 0.25],
      ['F#4', 0.22, 0.25],
      ['A4', 0.44, 0.25],
      ['D5', 0.66, 0.5],
      ['A4', 1.1, 0.22],
      ['D5', 1.3, 1.4],
    ];
    melody.forEach(([n, s, d]) => brass(e, { freq: NOTE(n), start: s, duration: d, gain: 0.13 }));
    [
      ['D3', 1.3],
      ['A3', 1.3],
      ['F#4', 1.3],
    ].forEach(([n, s]) => brass(e, { freq: NOTE(n), start: s, duration: 1.4, gain: 0.07 }));
    [0, 0.5, 1.0, 1.3].forEach((s, i) => bell(e, { freq: NOTE(['D5', 'A5', 'F#5', 'D6'][i]), start: s + 0.02, gain: 0.08, decay: 2.5 }));
  },
  defeat(e) {
    const seq = [
      ['A3', 0, 0.5],
      ['F3', 0.45, 0.5],
      ['D3', 0.9, 1.4],
    ];
    seq.forEach(([n, s, d]) => flute(e, { freq: NOTE(n) * 2, start: s, duration: d, gain: 0.08 }));
    bell(e, { freq: NOTE('D3'), start: 0.9, gain: 0.1, decay: 3 });
  },
  countdown(e) {
    e.tone({ type: 'sine', freq: NOTE('E6'), decay: 0.06, gain: 0.12 });
  },
};
