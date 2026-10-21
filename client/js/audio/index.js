import { AudioEngine } from './engine.js';
import { MusicDirector } from './music.js';
import { SFX } from './sfx.js';

export const engine = new AudioEngine();
export const music = new MusicDirector(engine);

const lastPlayed = new Map();
const MIN_GAP = { hover: 60, click: 30, coin: 25, cardDraw: 40, cardFlip: 40 };

/** Play a named sound effect. Silently ignored until audio is unlocked. */
export function play(name, opts) {
  if (!engine.ctx || engine.levels.muted) return;
  const fx = SFX[name];
  if (!fx) return;
  const now = performance.now();
  const gap = MIN_GAP[name] ?? 20;
  if (now - (lastPlayed.get(name) ?? 0) < gap) return;
  lastPlayed.set(name, now);
  try {
    fx(engine, opts);
  } catch (err) {
    console.warn('[audio]', name, err);
  }
}

/** Unlock audio on the first user interaction anywhere on the page. */
export function installUnlock() {
  const unlock = () => {
    if (engine.unlock()) {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    }
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

export function setLevels(levels) {
  engine.setLevels(levels);
}
