// WebSocket client with automatic reconnection. The reconnect token is kept
// in localStorage so a refresh or a flaky connection returns you to your seat.

import { C, S, PROTOCOL_VERSION } from '../../../shared/protocol.js';
import { Emitter } from '../core/emitter.js';
import { load, save } from '../core/storage.js';

export class OnlineClient extends Emitter {
  constructor(url = OnlineClient.defaultUrl()) {
    super();
    this.url = url;
    this.ws = null;
    this.status = 'idle'; // idle | connecting | open | closed
    this.queue = [];
    this.attempt = 0;
    this.timer = null;
    this.room = null;
    this.closedByUser = false;
    this.token = load('token', null);
  }

  static defaultUrl() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${location.host}/ws`;
  }

  connect() {
    if (this.ws && (this.status === 'open' || this.status === 'connecting')) return;
    this.closedByUser = false;
    this._setStatus('connecting');
    let ws;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this._scheduleReconnect();
      return;
    }
    this.ws = ws;
    ws.addEventListener('open', () => {
      this.attempt = 0;
      this._setStatus('open');
      this._raw({ t: C.HELLO, token: this.token, version: PROTOCOL_VERSION });
      const pending = this.queue.splice(0);
      pending.forEach((m) => this._raw(m));
    });
    ws.addEventListener('message', (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      this._handle(msg);
    });
    ws.addEventListener('close', () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this._setStatus('closed');
      if (!this.closedByUser) this._scheduleReconnect();
    });
    ws.addEventListener('error', () => {});
  }

  disconnect() {
    this.closedByUser = true;
    clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
    this._setStatus('idle');
  }

  send(msg) {
    if (this.status === 'open') this._raw(msg);
    else {
      this.queue.push(msg);
      this.connect();
    }
  }

  _raw(msg) {
    try {
      this.ws?.send(JSON.stringify(msg));
    } catch {
      this.queue.push(msg);
    }
  }

  _handle(msg) {
    switch (msg.t) {
      case S.WELCOME:
        this.token = msg.token;
        save('token', msg.token);
        break;
      case S.ROOM:
        this.room = msg.room;
        break;
      default:
        break;
    }
    this.emit(msg.t, msg);
    this.emit('message', msg);
  }

  _scheduleReconnect() {
    clearTimeout(this.timer);
    const delay = Math.min(10000, 500 * 2 ** this.attempt) + Math.random() * 300;
    this.attempt++;
    this.timer = setTimeout(() => this.connect(), delay);
  }

  _setStatus(status) {
    if (this.status === status) return;
    this.status = status;
    this.emit('status', status);
  }
}

let shared = null;

/** The app keeps a single connection to the server. */
export function getClient() {
  if (!shared) shared = new OnlineClient();
  return shared;
}
