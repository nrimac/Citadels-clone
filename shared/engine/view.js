// Per-seat views: everything a given player is allowed to see, plus the list
// of legal moves available to them. Both the UI and the bots consume views,
// so bots never peek at hidden information.

import { getCharacter, getDistrict } from '../content/index.js';
import { PHASE, buildProblem, drawRules, incomeFor } from './game.js';
import { makeContext, seatCharacters } from './context.js';
import { redactEvent } from './log.js';

export const VIEW_LOG_SIZE = 60;

const cardRef = (state, uid) => ({ uid, id: state.cards[uid] });

function visibleCharacters(state, seat, viewer) {
  const owned = seatCharacters(state, seat);
  if (state.phase === PHASE.OVER || seat === viewer) {
    return owned.map((id) => ({ id, revealed: state.revealed[id] === seat }));
  }
  return owned.filter((id) => state.revealed[id] === seat).map((id) => ({ id, revealed: true }));
}

function serializeOptions(input, options) {
  if (input === 'district') return options.map((o) => ({ seat: o.seat, uid: o.uid, cost: o.cost }));
  return [...options];
}

export function getLegal(state, seat) {
  const legal = { pick: null, discard: null, turn: null, prompt: null };
  if (state.phase === PHASE.OVER) return legal;
  const player = state.players[seat];

  if (state.prompt) {
    if (state.prompt.seat === seat) {
      legal.prompt = { type: state.prompt.type, cost: state.prompt.cost, canAccept: player.gold >= state.prompt.cost };
    }
    return legal;
  }

  if (state.phase === PHASE.DRAFT) {
    const step = state.draft.steps[state.draft.step];
    if (step?.seat === seat) legal[step.kind === 'pick' ? 'pick' : 'discard'] = [...state.draft.pool];
    return legal;
  }

  const t = state.turn;
  if (!t || t.seat !== seat) return legal;
  const def = getCharacter(t.character);
  const ctx = makeContext(state, seat);
  const choosing = !!t.drawn;
  const { draw, keep } = drawRules(state, seat);

  const buildable = [];
  const blocked = {};
  for (const uid of player.hand) {
    const problem = buildProblem(state, seat, uid);
    if (problem) blocked[uid] = problem;
    else buildable.push(uid);
  }

  legal.turn = {
    choosing,
    keep: t.keep,
    takeGold: !t.actionTaken && !choosing,
    drawCards: !t.actionTaken && !choosing && state.deck.length > 0,
    drawCount: draw,
    keepCount: keep,
    build: buildable,
    blocked,
    buildsLeft: t.buildLimit - t.builds,
    income: def.income && !t.incomeTaken ? { suit: def.income, amount: incomeFor(state, seat, def.income) } : null,
    abilities: def.abilities.map((a) => {
      const used = !!t.used[a.group || a.id];
      const options = used || choosing ? [] : serializeOptions(a.input, a.options(ctx));
      return { id: a.id, label: a.label, prompt: a.prompt, input: a.input, group: a.group ?? null, used, options };
    }),
    districts: player.city
      .map((e) => getDistrict(state.cards[e.uid]))
      .filter((d) => d.action)
      .map((d) => {
        const used = !!t.used[`district:${d.id}`];
        return {
          id: d.id,
          label: d.action.label,
          input: d.action.input,
          used,
          available: !used && !choosing && d.action.available(ctx),
        };
      }),
    endTurn: t.actionTaken && !choosing,
  };
  return legal;
}

export function getView(state, seat = null, { logSize = VIEW_LOG_SIZE } = {}) {
  const viewer = Number.isInteger(seat) && state.players[seat] ? seat : null;
  const d = state.draft;
  const step = state.phase === PHASE.DRAFT ? d.steps[d.step] : null;
  const t = state.turn;

  return {
    seq: state.seq,
    edition: state.edition,
    options: { ...state.options },
    phase: state.phase,
    round: state.round,
    crown: state.crown,
    you: viewer,
    deckCount: state.deck.length,
    characters: [...state.characters],
    callIndex: state.callIndex,
    calling: state.phase === PHASE.PLAY ? state.characters[state.callIndex] ?? null : null,
    murdered: state.murdered,
    robbed: state.robbed,
    revealed: { ...state.revealed },
    firstComplete: state.firstComplete,
    players: state.players.map((p, i) => ({
      seat: i,
      id: p.id,
      name: p.name,
      gold: p.gold,
      handCount: p.hand.length,
      city: p.city.map((e) => ({ ...cardRef(state, e.uid), builtRound: e.builtRound })),
      characters: visibleCharacters(state, i, viewer),
      complete: p.city.length >= state.options.cityGoal,
    })),
    hand: viewer != null ? state.players[viewer].hand.map((uid) => cardRef(state, uid)) : [],
    draft: d
      ? {
          active: state.phase === PHASE.DRAFT,
          seat: step?.seat ?? null,
          kind: step?.kind ?? null,
          step: d.step,
          steps: d.steps.length,
          faceUp: [...d.faceUp],
          faceDownCount: d.faceDown.length,
          poolCount: d.pool.length,
          pool: step && step.seat === viewer ? [...d.pool] : null,
        }
      : null,
    turn: t
      ? {
          seat: t.seat,
          character: t.character,
          actionTaken: t.actionTaken,
          choosing: !!t.drawn,
          drawn: t.drawn && t.seat === viewer ? t.drawn.map((uid) => cardRef(state, uid)) : null,
          keep: t.keep,
          builds: t.builds,
          buildLimit: t.buildLimit,
          incomeTaken: t.incomeTaken,
          used: { ...t.used },
        }
      : null,
    prompt: state.prompt
      ? { type: state.prompt.type, seat: state.prompt.seat, card: cardRef(state, state.prompt.card), cost: state.prompt.cost }
      : null,
    result: state.result,
    log: state.log.slice(-logSize).map((e) => redactEvent(e, viewer)),
    legal: viewer != null ? getLegal(state, viewer) : null,
  };
}
