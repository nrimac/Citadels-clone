// Core rules engine.
//
// The whole game is a plain JSON-serializable `state` object. The engine
// exposes three operations:
//   createGame(setup)              -> state
//   applyAction(state, seat, act)  -> { ok, error? }   (mutates state)
//   getActiveSeat(state)           -> the seat whose input is awaited
// Views for a specific seat (hidden information removed) live in view.js.

import { getCharacter, getDistrict, getEdition } from '../content/index.js';
import { makeSeed, randInt, shuffle } from './rng.js';
import { pushLog } from './log.js';
import { makeContext, cardDef, cityDefs, drawFromDeck, ownerOf, seatCharacters } from './context.js';
import { computeResult } from './scoring.js';

export const PHASE = Object.freeze({ DRAFT: 'draft', PLAY: 'play', OVER: 'over' });

export const ACTIONS = Object.freeze({
  PICK: 'pick',
  DISCARD: 'discardCharacter',
  TAKE_GOLD: 'takeGold',
  DRAW: 'drawCards',
  KEEP: 'keep',
  BUILD: 'build',
  INCOME: 'income',
  ABILITY: 'ability',
  DISTRICT: 'district',
  END_TURN: 'endTurn',
  GRAVEYARD: 'graveyard',
});

class RuleError extends Error {}
const fail = (msg) => {
  throw new RuleError(msg);
};

// ---------------------------------------------------------------- setup

export function createGame({ players, options = {}, seed = makeSeed() }) {
  const edition = getEdition(options.edition || 'classic');
  const n = players?.length ?? 0;
  if (n < edition.minPlayers || n > edition.maxPlayers) {
    throw new Error(`${edition.name} edition supports ${edition.minPlayers}–${edition.maxPlayers} players`);
  }
  const cityGoal = Math.min(12, Math.max(4, Number(options.cityGoal) || edition.cityGoal));

  const state = {
    v: 1,
    edition: edition.id,
    options: { cityGoal },
    rng: seed >>> 0,
    seq: 0,
    round: 0,
    phase: PHASE.DRAFT,
    players: players.map((p) => ({
      id: String(p.id),
      name: String(p.name ?? 'Player').slice(0, 24),
      gold: edition.startingGold,
      hand: [],
      city: [],
    })),
    cards: {},
    deck: [],
    characters: [...edition.characters].sort((a, b) => getCharacter(a).rank - getCharacter(b).rank),
    crown: 0,
    owners: {},
    revealed: {},
    draft: null,
    callIndex: -1,
    murdered: null,
    robbed: null,
    robbedBy: null,
    turn: null,
    prompt: null,
    firstComplete: null,
    lastRanks: {},
    log: [],
    result: null,
  };

  let uid = 1;
  for (const { id, count } of edition.districts) {
    for (let k = 0; k < count; k++) {
      state.cards[uid] = id;
      state.deck.push(uid++);
    }
  }
  shuffle(state, state.deck);
  state.crown = randInt(state, n);
  state.players.forEach((_, seat) => drawFromDeck(state, seat, edition.startingHand));
  pushLog(state, 'game-start', { players: n, crown: state.crown, cityGoal });
  startRound(state);
  return state;
}

// ---------------------------------------------------------------- draft

function startRound(state) {
  const n = state.players.length;
  const rules = getEdition(state.edition).draft(n);
  state.round++;
  state.phase = PHASE.DRAFT;
  state.owners = {};
  state.revealed = {};
  state.murdered = null;
  state.robbed = null;
  state.robbedBy = null;
  state.callIndex = -1;
  state.turn = null;
  state.prompt = null;

  const pool = shuffle(state, [...state.characters]);
  const faceDown = pool.splice(0, rules.faceDown);
  const faceUp = [];
  for (let i = 0; i < rules.faceUp; i++) {
    const candidates = pool.filter((id) => !getCharacter(id).cannotBeFaceUp);
    const id = candidates[randInt(state, candidates.length)];
    pool.splice(pool.indexOf(id), 1);
    faceUp.push(id);
  }

  const steps = draftSteps(n, state.crown, rules);

  state.draft = {
    steps,
    step: 0,
    pool,
    faceUp,
    faceDown,
    mergeFaceDownOnLastPick: !!rules.mergeFaceDownOnLastPick,
  };
  pushLog(state, 'round-start', { round: state.round, crown: state.crown, faceUp: [...faceUp], faceDown: faceDown.length });
  prepareDraftStep(state);
}

/** The sequence of draft decisions for a round, starting with the crown holder. */
export function draftSteps(n, crown, rules) {
  const order = Array.from({ length: n }, (_, i) => (crown + i) % n);
  const steps = [];
  for (let r = 0; r < rules.rounds; r++) {
    for (const seat of order) {
      steps.push({ seat, kind: 'pick' });
      if (rules.discardAfterPick && steps.length > 1) steps.push({ seat, kind: 'discard' });
    }
  }
  return steps;
}

function prepareDraftStep(state) {
  const d = state.draft;
  if (d.mergeFaceDownOnLastPick && d.step === d.steps.length - 1 && d.faceDown.length) {
    d.pool.push(...d.faceDown.splice(0));
  }
}

function handleDraft(state, seat, action) {
  const d = state.draft;
  const step = d.steps[d.step];
  if (step.seat !== seat) fail('It is not your turn to choose');
  const expected = step.kind === 'pick' ? ACTIONS.PICK : ACTIONS.DISCARD;
  if (action.type !== expected) fail(step.kind === 'pick' ? 'Choose a character' : 'Discard a character');
  const id = String(action.character);
  const idx = d.pool.indexOf(id);
  if (idx < 0) fail('That character is not available');
  d.pool.splice(idx, 1);

  if (step.kind === 'pick') {
    // The picker privately remembers which characters they were offered.
    const seen = [...d.pool, id];
    state.owners[id] = seat;
    pushLog(state, 'pick', { seat }, { [seat]: { character: id, seen } });
  } else {
    d.faceDown.push(id);
    pushLog(state, 'discard-character', { seat }, { [seat]: { character: id } });
  }

  d.step++;
  if (d.step >= d.steps.length) {
    d.faceDown.push(...d.pool.splice(0));
    state.phase = PHASE.PLAY;
    pushLog(state, 'draft-end', {});
    advance(state);
  } else {
    prepareDraftStep(state);
  }
}

// ---------------------------------------------------------------- calling characters

function advance(state) {
  state.turn = null;
  for (;;) {
    state.callIndex++;
    if (state.callIndex >= state.characters.length) {
      endRound(state);
      return;
    }
    const id = state.characters[state.callIndex];
    const seat = ownerOf(state, id);
    if (seat == null) {
      pushLog(state, 'call', { character: id, seat: null });
      continue;
    }
    if (state.murdered === id) {
      // The murdered player stays silent until the end of the round.
      pushLog(state, 'call', { character: id, seat: null, murdered: true });
      continue;
    }
    state.revealed[id] = seat;
    pushLog(state, 'call', { character: id, seat });

    if (state.robbed === id && state.robbedBy != null) {
      const amount = state.players[seat].gold;
      state.players[seat].gold = 0;
      state.players[state.robbedBy].gold += amount;
      pushLog(state, 'robbed', { seat: state.robbedBy, target: seat, character: id, amount });
    }

    const def = getCharacter(id);
    state.turn = {
      seat,
      character: id,
      actionTaken: false,
      drawn: null,
      keep: 0,
      builds: 0,
      buildLimit: def.buildLimit ?? 1,
      incomeTaken: !def.income,
      used: {},
    };
    def.onCalled?.(makeContext(state, seat));
    return;
  }
}

function endRound(state) {
  state.turn = null;
  state.lastRanks = {};
  for (const id of state.characters) {
    const owner = ownerOf(state, id);
    const murdered = state.murdered === id;
    if (murdered && owner != null) {
      state.revealed[id] = owner;
      pushLog(state, 'murder-revealed', { character: id, seat: owner });
    }
    if (owner != null) {
      state.lastRanks[owner] = Math.max(state.lastRanks[owner] ?? 0, getCharacter(id).rank);
    }
    getCharacter(id).onRoundEnd?.(makeContext(state, owner), { owner, murdered });
  }
  pushLog(state, 'round-end', { round: state.round });
  if (state.firstComplete != null) finishGame(state);
  else startRound(state);
}

function finishGame(state) {
  state.phase = PHASE.OVER;
  state.turn = null;
  state.prompt = null;
  state.result = computeResult(state);
  pushLog(state, 'game-over', { winner: state.result.winner, standings: state.result.standings });
}

// ---------------------------------------------------------------- turn helpers

export function drawRules(state, seat) {
  const defs = cityDefs(state, seat);
  return {
    draw: 2 + defs.reduce((s, d) => s + (d.drawBonus || 0), 0),
    keep: 1 + defs.reduce((s, d) => s + (d.keepBonus || 0), 0),
  };
}

export function incomeFor(state, seat, suit) {
  if (!suit) return 0;
  return cityDefs(state, seat).filter((d) => d.suit === suit || d.wildIncome).length;
}

export function buildProblem(state, seat, uid) {
  const t = state.turn;
  const player = state.players[seat];
  if (!t || t.seat !== seat) return 'turn';
  if (t.drawn) return 'choosing';
  if (!t.actionTaken) return 'action';
  if (t.builds >= t.buildLimit) return 'limit';
  if (!player.hand.includes(uid)) return 'hand';
  const def = cardDef(state, uid);
  if (player.city.some((e) => state.cards[e.uid] === def.id)) return 'duplicate';
  if (player.gold < def.cost) return 'gold';
  return null;
}

const BUILD_MESSAGES = {
  turn: 'It is not your turn',
  choosing: 'Choose which cards to keep first',
  action: 'Take gold or draw cards before building',
  limit: 'You cannot build any more districts this turn',
  hand: 'That card is not in your hand',
  duplicate: 'You already have that district in your city',
  gold: 'You cannot afford that district',
};

function afterAction(state, seat) {
  const def = getCharacter(state.turn.character);
  def.afterAction?.(makeContext(state, seat));
}

function collectIncome(state, seat) {
  const t = state.turn;
  const def = getCharacter(t.character);
  t.incomeTaken = true;
  const amount = incomeFor(state, seat, def.income);
  state.players[seat].gold += amount;
  pushLog(state, 'income', { seat, amount, character: def.id, suit: def.income });
}

const asInt = (v) => (Number.isInteger(v) ? v : Number.isInteger(Number(v)) && v !== '' && v !== null ? Number(v) : NaN);

function asCardList(value) {
  if (!Array.isArray(value)) fail('Expected a list of cards');
  const list = value.map(asInt);
  if (list.some(Number.isNaN)) fail('Invalid card');
  if (new Set(list).size !== list.length) fail('Duplicate card');
  return list;
}

function handleTurn(state, seat, action) {
  const t = state.turn;
  if (!t || t.seat !== seat) fail('It is not your turn');
  const player = state.players[seat];
  const def = getCharacter(t.character);
  const ctx = makeContext(state, seat);

  if (t.drawn && action.type !== ACTIONS.KEEP) fail('Choose which cards to keep first');

  switch (action.type) {
    case ACTIONS.TAKE_GOLD: {
      if (t.actionTaken) fail('You already took your action');
      t.actionTaken = true;
      player.gold += 2;
      pushLog(state, 'take-gold', { seat, amount: 2 });
      afterAction(state, seat);
      return;
    }
    case ACTIONS.DRAW: {
      if (t.actionTaken) fail('You already took your action');
      if (!state.deck.length) fail('The district deck is empty');
      const { draw, keep } = drawRules(state, seat);
      const drawn = drawFromDeck(state, null, draw);
      if (drawn.length <= keep) {
        player.hand.push(...drawn);
        t.actionTaken = true;
        pushLog(state, 'draw', { seat, count: drawn.length, kept: drawn.length }, { [seat]: { cards: drawn } });
        afterAction(state, seat);
      } else {
        t.drawn = drawn;
        t.keep = keep;
        pushLog(state, 'draw', { seat, count: drawn.length, choosing: true }, { [seat]: { cards: drawn } });
      }
      return;
    }
    case ACTIONS.KEEP: {
      if (!t.drawn) fail('There are no drawn cards to choose from');
      const cards = asCardList(action.cards);
      if (cards.length !== t.keep) fail(`Keep exactly ${t.keep} card${t.keep > 1 ? 's' : ''}`);
      if (cards.some((c) => !t.drawn.includes(c))) fail('You can only keep cards you drew');
      const rest = t.drawn.filter((c) => !cards.includes(c));
      player.hand.push(...cards);
      state.deck.push(...rest);
      t.drawn = null;
      t.keep = 0;
      t.actionTaken = true;
      pushLog(state, 'keep', { seat, kept: cards.length, returned: rest.length }, { [seat]: { cards } });
      afterAction(state, seat);
      return;
    }
    case ACTIONS.BUILD: {
      const uid = asInt(action.card);
      const problem = buildProblem(state, seat, uid);
      if (problem) fail(BUILD_MESSAGES[problem]);
      const card = cardDef(state, uid);
      player.gold -= card.cost;
      player.hand.splice(player.hand.indexOf(uid), 1);
      player.city.push({ uid, builtRound: state.round });
      t.builds++;
      pushLog(state, 'build', { seat, card: { uid, id: card.id }, cost: card.cost });
      if (player.city.length === state.options.cityGoal) {
        const first = state.firstComplete == null;
        if (first) state.firstComplete = seat;
        pushLog(state, 'complete', { seat, first });
      }
      return;
    }
    case ACTIONS.INCOME: {
      if (!def.income) fail(`The ${def.name} does not collect taxes`);
      if (t.incomeTaken) fail('You already collected taxes this turn');
      collectIncome(state, seat);
      return;
    }
    case ACTIONS.ABILITY: {
      const ability = def.abilities.find((a) => a.id === action.ability);
      if (!ability) fail('Unknown ability');
      const key = ability.group || ability.id;
      if (t.used[key]) fail('You already used that ability this turn');
      const payload = resolveAbilityPayload(ctx, ability, action);
      t.used[key] = true;
      ability.apply(ctx, payload);
      return;
    }
    case ACTIONS.DISTRICT: {
      const id = String(action.district);
      if (!player.city.some((e) => state.cards[e.uid] === id)) fail('You have not built that district');
      const ddef = getDistrict(id);
      if (!ddef.action) fail('That district has no ability to use');
      const key = `district:${id}`;
      if (t.used[key]) fail('You already used that district this turn');
      if (!ddef.action.available(ctx)) fail('You cannot use that right now');
      const payload = {};
      if (ddef.action.input === 'card') {
        payload.card = asInt(action.card);
        if (!player.hand.includes(payload.card)) fail('Choose a card from your hand');
      }
      t.used[key] = true;
      ddef.action.apply(ctx, payload);
      return;
    }
    case ACTIONS.END_TURN: {
      if (!t.actionTaken) fail('Take gold or draw cards before ending your turn');
      if (!t.incomeTaken) collectIncome(state, seat);
      pushLog(state, 'end-turn', { seat, character: t.character });
      advance(state);
      return;
    }
    default:
      fail('Unknown action');
  }
}

function resolveAbilityPayload(ctx, ability, action) {
  const options = ability.options(ctx);
  switch (ability.input) {
    case 'character': {
      const target = String(action.target);
      if (!options.includes(target)) fail('Invalid target');
      return { target };
    }
    case 'player': {
      const target = asInt(action.target);
      if (!options.includes(target)) fail('Invalid target');
      return { target };
    }
    case 'district': {
      const seat = asInt(action.target?.seat);
      const uid = asInt(action.target?.uid);
      const option = options.find((o) => o.seat === seat && o.uid === uid);
      if (!option) fail('You cannot destroy that district');
      return { target: option };
    }
    case 'cards': {
      const cards = asCardList(action.cards);
      if (!cards.length) fail('Choose at least one card');
      if (cards.some((c) => !options.includes(c))) fail('Invalid card');
      return { cards };
    }
    default:
      return {};
  }
}

function handlePrompt(state, seat, action) {
  const prompt = state.prompt;
  if (prompt.seat !== seat) fail('Waiting for another player');
  if (prompt.type === 'graveyard') {
    if (action.type !== ACTIONS.GRAVEYARD) fail('Decide whether to use your Graveyard');
    const player = state.players[seat];
    const card = { uid: prompt.card, id: state.cards[prompt.card] };
    if (action.accept && player.gold >= prompt.cost) {
      player.gold -= prompt.cost;
      player.hand.push(prompt.card);
      pushLog(state, 'graveyard', { seat, card, accepted: true });
    } else {
      state.deck.push(prompt.card);
      pushLog(state, 'graveyard', { seat, card, accepted: false });
    }
    state.prompt = null;
    return;
  }
  fail('Unknown prompt');
}

// ---------------------------------------------------------------- public API

/**
 * Apply one action for `seat`. Invalid actions leave the state untouched.
 * `trusted` skips the rollback snapshot; only simulations (bot lookahead),
 * which discard the state on failure anyway, should use it.
 */
export function applyAction(state, seat, action, { trusted = false } = {}) {
  if (!action || typeof action !== 'object' || typeof action.type !== 'string') {
    return { ok: false, error: 'Malformed action' };
  }
  if (!Number.isInteger(seat) || !state.players[seat]) return { ok: false, error: 'Unknown player' };
  const backup = trusted ? null : structuredClone(state);
  try {
    if (state.phase === PHASE.OVER) fail('The game is over');
    if (state.prompt) handlePrompt(state, seat, action);
    else if (state.phase === PHASE.DRAFT) handleDraft(state, seat, action);
    else handleTurn(state, seat, action);
    return { ok: true };
  } catch (err) {
    if (backup) {
      for (const key of Object.keys(state)) delete state[key];
      Object.assign(state, backup);
    }
    if (err instanceof RuleError) return { ok: false, error: err.message };
    console.error('[engine] unexpected error', err);
    return { ok: false, error: 'Something went wrong applying that action' };
  }
}

export function getActiveSeat(state) {
  if (state.phase === PHASE.OVER) return null;
  if (state.prompt) return state.prompt.seat;
  if (state.phase === PHASE.DRAFT) return state.draft.steps[state.draft.step]?.seat ?? null;
  return state.turn?.seat ?? null;
}

export { seatCharacters };

// Internal hooks exposed for unit tests and tooling (not part of the public API).
export const __internals = { advance, startRound, endRound };
