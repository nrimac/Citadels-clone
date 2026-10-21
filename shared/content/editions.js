import { registerEdition } from './registry.js';
import { CLASSIC_CHARACTERS } from './characters/classic.js';
import { CLASSIC_DISTRICTS } from './districts/classic.js';

// Draft rules for the eight classic characters, by player count.
//   faceUp / faceDown – characters discarded before the draft starts
//   rounds            – how many characters each player ends up with
//   discardAfterPick  – (2 players) after picking, discard one face down
//   mergeFaceDownOnLastPick – (7 players) the last player may take the face-down card
function classicDraft(n) {
  switch (n) {
    case 2:
      return { faceUp: 0, faceDown: 1, rounds: 2, discardAfterPick: true };
    case 3:
      return { faceUp: 0, faceDown: 1, rounds: 2 };
    case 4:
      return { faceUp: 2, faceDown: 1, rounds: 1 };
    case 5:
      return { faceUp: 1, faceDown: 1, rounds: 1 };
    case 6:
      return { faceUp: 0, faceDown: 1, rounds: 1 };
    case 7:
      return { faceUp: 0, faceDown: 1, rounds: 1, mergeFaceDownOnLastPick: true };
    default:
      throw new Error(`Classic edition supports 2–7 players, got ${n}`);
  }
}

registerEdition({
  id: 'classic',
  name: 'Classic',
  minPlayers: 2,
  maxPlayers: 7,
  cityGoal: 8,
  startingGold: 2,
  startingHand: 4,
  characters: CLASSIC_CHARACTERS.map((c) => c.id),
  districts: CLASSIC_DISTRICTS.map((d) => ({ id: d.id, count: d.count ?? 1 })),
  draft: classicDraft,
  scoring: { allSuitsBonus: 3, firstCompleteBonus: 4, completeBonus: 2 },
});
