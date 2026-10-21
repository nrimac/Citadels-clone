// The context object is the API that content hooks (characters, districts)
// use to read and change the game. Keeping all mutation helpers here means new
// content never has to reach into engine internals.

import { getCharacter, getDistrict } from '../content/index.js';
import { pushLog } from './log.js';

export function cardDef(state, uid) {
  return getDistrict(state.cards[uid]);
}

export function cityDefs(state, seat) {
  return state.players[seat].city.map((e) => cardDef(state, e.uid));
}

export function cityHas(state, seat, predicate) {
  return cityDefs(state, seat).some(predicate);
}

export function isComplete(state, seat) {
  return state.players[seat].city.length >= state.options.cityGoal;
}

export function ownerOf(state, charId) {
  const seat = state.owners[charId];
  return seat === undefined ? null : seat;
}

export function seatCharacters(state, seat) {
  return state.characters.filter((id) => state.owners[id] === seat);
}

export function isProtected(state, seat) {
  return seatCharacters(state, seat).some((id) => getCharacter(id).protectsCity && state.murdered !== id);
}

export function destroyCost(state, seat, uid) {
  const def = cardDef(state, uid);
  let cost = Math.max(0, def.cost - 1);
  for (const entry of state.players[seat].city) {
    if (entry.uid === uid) continue;
    cost += cardDef(state, entry.uid).wallBonus || 0;
  }
  return cost;
}

export function drawFromDeck(state, seat, n) {
  const drawn = state.deck.splice(0, Math.max(0, n));
  if (seat != null) state.players[seat].hand.push(...drawn);
  return drawn;
}

export function makeContext(state, seat) {
  const ctx = {
    state,
    seat,
    log: (type, data, secret) => pushLog(state, type, data, secret),
    character: (id) => getCharacter(id),
    district: (uid) => cardDef(state, uid),
    characterIds: () => [...state.characters],
    isFaceUp: (id) => !!state.draft?.faceUp.includes(id),
    ownsCharacter: (s, id) => state.owners[id] === s,
    ownerOf: (id) => ownerOf(state, id),
    isComplete: (s) => isComplete(state, s),
    isProtected: (s) => isProtected(state, s),
    destroyCost: (s, uid) => destroyCost(state, s, uid),
    deckSize: () => state.deck.length,

    gainGold(s, amount, source) {
      if (amount <= 0) return;
      state.players[s].gold += amount;
      pushLog(state, 'gold', { seat: s, amount, source });
    },
    spendGold(s, amount) {
      if (state.players[s].gold < amount) throw new Error('Not enough gold');
      state.players[s].gold -= amount;
    },
    drawCards(s, n) {
      return drawFromDeck(state, s, n);
    },
    discardCards(uids) {
      state.deck.push(...uids);
    },
    removeFromHand(s, uid) {
      const hand = state.players[s].hand;
      const i = hand.indexOf(uid);
      if (i < 0) throw new Error('Card not in hand');
      hand.splice(i, 1);
    },
    giveCrown(s) {
      if (state.crown === s) return;
      state.crown = s;
      pushLog(state, 'crown', { seat: s });
    },
    destroyDistrict(targetSeat, uid, cost) {
      const city = state.players[targetSeat].city;
      const idx = city.findIndex((e) => e.uid === uid);
      if (idx < 0) throw new Error('District not found');
      ctx.spendGold(seat, cost);
      city.splice(idx, 1);
      pushLog(state, 'destroy', { seat, target: targetSeat, card: { uid, id: state.cards[uid] }, cost });

      // Any player other than the destroyer with a Graveyard may buy the
      // ruined district back (a destroyed Graveyard cannot save itself).
      const destroyed = cardDef(state, uid);
      const keeper = destroyed.graveyard
        ? -1
        : state.players.findIndex((p, s) => s !== seat && p.gold >= 1 && p.city.some((e) => cardDef(state, e.uid).graveyard));
      if (keeper >= 0) {
        state.prompt = { type: 'graveyard', seat: keeper, card: uid, cost: 1 };
      } else {
        state.deck.push(uid);
      }
    },
  };
  return ctx;
}
