// Seeded, serializable random number generation (mulberry32).
// The generator state lives on the game state object (`state.rng`) so a game
// can be saved, sent over the wire, or replayed deterministically.

export function makeSeed() {
  return (Math.random() * 0xffffffff) >>> 0;
}

export function nextFloat(holder) {
  let t = (holder.rng = (holder.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(holder, n) {
  return Math.floor(nextFloat(holder) * n);
}

export function shuffle(holder, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(holder, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pick(holder, arr) {
  return arr[randInt(holder, arr.length)];
}
