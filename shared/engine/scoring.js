import { getEdition, SUIT_ORDER } from '../content/index.js';
import { cardDef } from './context.js';

export function scoreSeat(state, seat) {
  const rules = getEdition(state.edition).scoring;
  const player = state.players[seat];
  let districts = 0;
  let wild = 0;
  const suits = new Set();
  for (const entry of player.city) {
    const def = cardDef(state, entry.uid);
    districts += def.points ?? def.cost;
    if (def.wildScoring?.(state, entry)) wild++;
    else suits.add(def.suit);
  }
  const missing = SUIT_ORDER.filter((s) => !suits.has(s)).length;
  const allSuits = player.city.length && missing <= wild ? rules.allSuitsBonus : 0;
  let complete = 0;
  if (state.firstComplete === seat) complete = rules.firstCompleteBonus;
  else if (player.city.length >= state.options.cityGoal) complete = rules.completeBonus;
  return { seat, districts, allSuits, complete, total: districts + allSuits + complete };
}

// Ties are broken by the highest-ranked character a player held in the final
// round, then by remaining gold.
export function computeResult(state) {
  const scores = state.players.map((_, seat) => ({
    ...scoreSeat(state, seat),
    tiebreak: state.lastRanks?.[seat] ?? 0,
    gold: state.players[seat].gold,
  }));
  const standings = [...scores].sort((a, b) => b.total - a.total || b.tiebreak - a.tiebreak || b.gold - a.gold).map((s) => s.seat);
  return { scores, standings, winner: standings[0] };
}
