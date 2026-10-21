// GameHost drives a single game: it owns the authoritative state, accepts
// actions from seats, runs bots with natural pacing, and notifies listeners
// whenever the state changes. It runs unchanged in the browser (local games)
// and on the server (online rooms).

import { applyAction, createGame, getActiveSeat, getView, PHASE } from '../engine/index.js';
import { chooseAction, fallbackAction } from '../bots/index.js';

export const PACING = {
  slow: 1.6,
  normal: 1,
  fast: 0.45,
  instant: 0,
};

const BASE_DELAY = {
  pick: 1100,
  discardCharacter: 900,
  keep: 900,
  takeGold: 1000,
  drawCards: 1000,
  build: 1200,
  income: 800,
  ability: 1300,
  district: 1000,
  graveyard: 900,
  endTurn: 900,
};

export class GameHost {
  /**
   * @param {object} opts
   * @param {Array<{id:string,name:string,kind:'human'|'bot',level?:string}>} opts.seats
   * @param {object} [opts.options]     engine options (cityGoal, edition)
   * @param {number} [opts.seed]
   * @param {string} [opts.pacing]      key of PACING
   * @param {number} [opts.turnTimeout] ms before an idle human is auto-played (0 = never)
   * @param {(host:GameHost)=>void} [opts.onChange]
   */
  constructor({ seats, options = {}, seed, pacing = 'normal', turnTimeout = 0, onChange = null }) {
    this.seats = seats.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind === 'bot' ? 'bot' : 'human',
      level: s.level || 'normal',
      connected: s.kind === 'bot' ? true : s.connected !== false,
      autopilot: false,
    }));
    this.state = createGame({ players: this.seats.map((s) => ({ id: s.id, name: s.name })), options, seed });
    this.pacing = PACING[pacing] ?? 1;
    this.turnTimeout = turnTimeout;
    this.onChange = onChange;
    this.timer = null;
    this.deadline = null;
    this.destroyed = false;
    this.paused = false;
  }

  start() {
    this._afterChange(null);
  }

  get over() {
    return this.state.phase === PHASE.OVER;
  }

  activeSeat() {
    return getActiveSeat(this.state);
  }

  seatIndex(id) {
    return this.seats.findIndex((s) => s.id === id);
  }

  isAutomated(seat) {
    const s = this.seats[seat];
    return !!s && (s.kind === 'bot' || s.autopilot);
  }

  submit(seat, action) {
    if (this.destroyed) return { ok: false, error: 'Game closed' };
    const s = this.seats[seat];
    if (!s) return { ok: false, error: 'Unknown seat' };
    if (s.kind === 'bot') return { ok: false, error: 'That seat is played by a bot' };
    // Acting yourself always takes control back from the autopilot.
    const resumed = s.autopilot && s.connected;
    if (resumed) s.autopilot = false;
    const result = applyAction(this.state, seat, action);
    if (result.ok) this._afterChange(action);
    else if (resumed) this._afterChange(null);
    return result;
  }

  /** A view for a seat (or null for a spectator), decorated with seat metadata. */
  view(seat = null) {
    const view = getView(this.state, seat);
    view.players.forEach((p) => {
      const s = this.seats[p.seat];
      p.kind = s.kind;
      p.level = s.kind === 'bot' ? s.level : null;
      p.connected = s.connected;
      p.autopilot = s.autopilot;
    });
    view.deadline = this.deadline;
    return view;
  }

  setConnected(seat, connected) {
    const s = this.seats[seat];
    if (!s || s.kind === 'bot') return;
    s.connected = connected;
    this._notify();
  }

  /** Let a bot play for a human seat (e.g. after a disconnect), or hand control back. */
  setAutopilot(seat, on) {
    const s = this.seats[seat];
    if (!s || s.kind === 'bot' || s.autopilot === on) return;
    s.autopilot = on;
    this._notify();
    this._schedule();
  }

  setPacing(pacing) {
    this.pacing = PACING[pacing] ?? this.pacing;
  }

  pause(paused = true) {
    this.paused = paused;
    if (paused) this._clearTimer();
    else this._schedule();
  }

  destroy() {
    this.destroyed = true;
    this._clearTimer();
    this.onChange = null;
  }

  // ------------------------------------------------------------ internals

  _notify() {
    if (!this.destroyed) this.onChange?.(this);
  }

  _afterChange() {
    this._schedule();
    this._notify();
  }

  _clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  _schedule() {
    this._clearTimer();
    this.deadline = null;
    if (this.destroyed || this.paused || this.over) return;
    const seat = this.activeSeat();
    if (seat == null) return;

    if (this.isAutomated(seat)) {
      // Decide now, but act after a delay that depends on the kind of move,
      // so humans can follow what the bots are doing.
      const action = this._decide(seat);
      const delay = (BASE_DELAY[action?.type] ?? 1000) * this.pacing * (0.85 + Math.random() * 0.3);
      this.timer = setTimeout(() => this._botStep(seat, action), delay);
    } else if (this.turnTimeout > 0) {
      // An idle human is handed to the autopilot until they act again.
      this.deadline = Date.now() + this.turnTimeout;
      this.timer = setTimeout(() => {
        this.timer = null;
        this.setAutopilot(seat, true);
      }, this.turnTimeout);
    }
  }

  _decide(seat) {
    const view = getView(this.state, seat);
    const level = this.seats[seat].kind === 'bot' ? this.seats[seat].level : 'normal';
    try {
      return chooseAction(view, level) ?? fallbackAction(view);
    } catch (err) {
      console.error('[bot] decision failed', err);
      return fallbackAction(view);
    }
  }

  _botStep(seat, action) {
    this.timer = null;
    if (this.destroyed || this.paused || this.activeSeat() !== seat || !this.isAutomated(seat)) return this._schedule();
    let result = applyAction(this.state, seat, action);
    if (!result.ok) {
      const fallback = fallbackAction(getView(this.state, seat));
      result = fallback ? applyAction(this.state, seat, fallback) : result;
      if (!result.ok) console.error('[bot] could not act:', result.error, action);
    }
    this._afterChange(action);
  }
}
