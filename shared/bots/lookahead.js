// Monte-Carlo lookahead for the strongest bots: for each candidate move,
// sample possible worlds consistent with the bot's view, play the rest of
// the round out with a fast default policy, and compare the outcomes.

import { getDistrict } from '../content/index.js';
import { applyAction, getActiveSeat, PHASE } from '../engine/game.js';
import { getView } from '../engine/view.js';
import { determinize } from './determinize.js';

const now = () => globalThis.performance?.now?.() ?? Date.now();

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Play until the current round ends (or the game does). Returns false if the world broke. */
export function simulateRound(state, policy, random, maxSteps = 500) {
  const round = state.round;
  for (let i = 0; i < maxSteps; i++) {
    if (state.phase === PHASE.OVER || state.round !== round) return true;
    const seat = getActiveSeat(state);
    if (seat == null) return true;
    const action = policy(getView(state, seat, { logSize: 16 }), random);
    if (!action || !applyAction(state, seat, action, { trusted: true }).ok) return false;
  }
  return true;
}

/** How good the position is for `seat`, relative to the strongest rival. */
export function evaluate(state, seat) {
  if (state.phase === PHASE.OVER && state.result) {
    const scores = state.result.scores;
    const mine = scores[seat].total;
    const rival = Math.max(...scores.filter((s) => s.seat !== seat).map((s) => s.total));
    return (state.result.winner === seat ? 12 : -4) + (mine - rival) * 0.5;
  }
  const goal = state.options.cityGoal;
  const value = (s) => {
    const p = state.players[s];
    let points = 0;
    for (const e of p.city) {
      const d = getDistrict(state.cards[e.uid]);
      points += d.points ?? d.cost;
    }
    return points + p.city.length * 1.2 + p.gold * 0.75 + Math.min(p.hand.length, 5) * 0.6 + (p.city.length >= goal ? 4 : 0);
  };
  const rival = Math.max(
    ...state.players
      .map((_, s) => s)
      .filter((s) => s !== seat)
      .map(value),
  );
  return value(seat) - rival;
}

/**
 * Choose among `candidates` by simulation.
 * @param view        the deciding bot's view
 * @param candidates  options to compare
 * @param toAction    candidate -> engine action
 * @param policy      (view, random) -> action, used for every player in rollouts
 */
export function lookahead(view, candidates, toAction, { policy, random = Math.random, budgetMs = 120, maxWorlds = 48, prior = () => 0 }) {
  if (candidates.length <= 1) return candidates[0];
  const stats = candidates.map(() => ({ sum: 0, n: 0 }));
  const start = now();
  for (let w = 0; w < maxWorlds; w++) {
    if (w >= 4 && now() - start > budgetMs) break;
    const world = determinize(view, random);
    const seed = Math.floor(random() * 0xffffffff);
    candidates.forEach((candidate, i) => {
      // Common random numbers: every candidate faces the same world and luck.
      const state = structuredClone(world);
      state.rng = seed >>> 0;
      if (!applyAction(state, view.you, toAction(candidate), { trusted: true }).ok) return;
      if (!simulateRound(state, policy, seededRandom(seed))) return;
      stats[i].sum += evaluate(state, view.you);
      stats[i].n++;
    });
  }
  let best = 0;
  let bestScore = -Infinity;
  candidates.forEach((candidate, i) => {
    if (!stats[i].n) return;
    const score = stats[i].sum / stats[i].n + prior(candidate);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return candidates[best];
}
