// Content registry.
//
// Characters, districts and editions are plain data objects (with optional
// hook functions) registered here. The engine never hard-codes a specific
// character or district: everything flows through these definitions, so an
// expansion (e.g. "Dark City") can be added by registering new content and a
// new edition without touching the engine.

const characters = new Map();
const districts = new Map();
const editions = new Map();

export function registerCharacter(def) {
  if (!def?.id || typeof def.rank !== 'number') throw new Error('Character needs id and rank');
  characters.set(def.id, Object.freeze({ abilities: [], buildLimit: 1, ...def }));
}

export function registerDistrict(def) {
  if (!def?.id || typeof def.cost !== 'number' || !def.suit) throw new Error('District needs id, cost and suit');
  districts.set(def.id, Object.freeze({ count: 1, ...def }));
}

/**
 * An edition bundles a character set, a district deck and draft rules.
 * draft(n) => { faceUp, faceDown, rounds, discardAfterPick, mergeFaceDownOnLastPick }
 */
export function registerEdition(def) {
  if (!def?.id) throw new Error('Edition needs an id');
  editions.set(def.id, Object.freeze(def));
}

export function getCharacter(id) {
  const c = characters.get(id);
  if (!c) throw new Error(`Unknown character: ${id}`);
  return c;
}

export function getDistrict(id) {
  const d = districts.get(id);
  if (!d) throw new Error(`Unknown district: ${id}`);
  return d;
}

export function getEdition(id) {
  const e = editions.get(id);
  if (!e) throw new Error(`Unknown edition: ${id}`);
  return e;
}

export function hasCharacter(id) {
  return characters.has(id);
}

export function listCharacters() {
  return [...characters.values()].sort((a, b) => a.rank - b.rank);
}

export function listDistricts() {
  return [...districts.values()];
}

export function listEditions() {
  return [...editions.values()];
}
