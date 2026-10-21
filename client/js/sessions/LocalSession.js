// A game played entirely in this browser: the GameHost runs here, bots are
// simulated locally, and several humans can share one device ("hot seat").
//
// Session interface (shared with OnlineSession):
//   events: 'view' (view), 'handoff' ({ seat, name }), 'actionError' (message)
//   submit(action), leave(), rematch(), kind, canChat

import { GameHost } from '../../../shared/host/GameHost.js';
import { Emitter } from '../core/emitter.js';

export class LocalSession extends Emitter {
  constructor({ seats, options = {}, pacing = 'normal' }) {
    super();
    this.kind = 'local';
    this.canChat = false;
    this.config = { seats, options, pacing };
    this.humanSeats = seats.flatMap((s, i) => (s.kind === 'human' ? [i] : []));
    this.multiHuman = this.humanSeats.length > 1;
    this._createHost();
  }

  _createHost() {
    const { seats, options, pacing } = this.config;
    this.host?.destroy();
    this.host = new GameHost({ seats, options, pacing, onChange: () => this._update() });
    this.perspective = this.multiHuman ? null : (this.humanSeats[0] ?? null);
    this.lastHuman = null;
    this.pendingHandoff = null;
  }

  start() {
    this.host.start();
  }

  get isHost() {
    return true;
  }

  _update() {
    if (this.multiHuman) {
      const active = this.host.activeSeat();
      const activeHuman = active != null && this.host.seats[active].kind === 'human' ? active : null;
      if (activeHuman == null) {
        // Bots are moving (or the game ended): show the public table only.
        this.perspective = null;
      } else if (activeHuman === this.lastHuman) {
        // Only bots acted since this player last had the device.
        this.perspective = activeHuman;
      } else if (this.pendingHandoff !== activeHuman) {
        this.perspective = null;
        this.pendingHandoff = activeHuman;
        this.emit('handoff', { seat: activeHuman, name: this.host.seats[activeHuman].name });
      }
    }
    this.emit('view', this.host.view(this.perspective));
  }

  /** The named player has the device: reveal their private view. */
  confirmHandoff() {
    if (this.pendingHandoff == null) return;
    this.perspective = this.pendingHandoff;
    this.lastHuman = this.pendingHandoff;
    this.pendingHandoff = null;
    this.emit('view', this.host.view(this.perspective));
  }

  submit(action) {
    if (this.perspective == null) return { ok: false, error: 'Not your turn' };
    const res = this.host.submit(this.perspective, action);
    if (!res.ok) this.emit('actionError', res.error);
    return res;
  }

  setPacing(pacing) {
    this.config.pacing = pacing;
    this.host.setPacing(pacing);
  }

  pause(paused) {
    this.host.pause(paused);
  }

  rematch() {
    this._createHost();
    this.emit('restart');
    this.start();
  }

  leave() {
    this.host.destroy();
    this.removeAll();
  }
}
