import { createGame } from '../shared/engine/index.js';
import { __internals } from '../shared/engine/game.js';

export function newGame(n = 4, options = {}, seed = 1234) {
  const players = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` }));
  return createGame({ players, options, seed });
}

/** Pull a card with the given district id out of the deck. */
export function takeCard(state, id) {
  const idx = state.deck.findIndex((uid) => state.cards[uid] === id);
  if (idx >= 0) return state.deck.splice(idx, 1)[0];
  // The card was dealt to someone: swap it out of their hand for a deck card.
  for (const p of state.players) {
    const h = p.hand.findIndex((uid) => state.cards[uid] === id);
    if (h >= 0) {
      const [uid] = p.hand.splice(h, 1, state.deck.shift());
      return uid;
    }
  }
  throw new Error(`No ${id} left to take`);
}

export function giveHand(state, seat, ids) {
  return ids.map((id) => {
    const uid = takeCard(state, id);
    state.players[seat].hand.push(uid);
    return uid;
  });
}

export function giveCity(state, seat, ids, builtRound = 0) {
  return ids.map((id) => {
    const uid = takeCard(state, id);
    state.players[seat].city.push({ uid, builtRound });
    return uid;
  });
}

/**
 * Skip the draft: assign characters directly and start calling them.
 * owners: { characterId: seat }
 */
export function startPlay(state, owners, { faceUp = [] } = {}) {
  state.phase = 'play';
  state.owners = { ...owners };
  state.draft.faceUp = faceUp;
  state.draft.pool = [];
  state.draft.step = state.draft.steps.length;
  state.callIndex = -1;
  __internals.advance(state);
  return state;
}

export function lastEvent(state, type) {
  return [...state.log].reverse().find((e) => e.type === type);
}
