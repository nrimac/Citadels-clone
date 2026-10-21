// A game hosted by the server. Views arrive over the WebSocket; actions are
// sent back. Implements the same interface as LocalSession.

import { C, S } from '../../../shared/protocol.js';
import { Emitter } from '../core/emitter.js';

export class OnlineSession extends Emitter {
  constructor(client) {
    super();
    this.kind = 'online';
    this.canChat = true;
    this.client = client;
    this.chat = [];
    this.lastView = null;
    this.unsubs = [
      client.on(S.VIEW, ({ view }) => {
        this.lastView = view;
        this.emit('view', view);
      }),
      client.on(S.ROOM, ({ room }) => {
        if (!room) this.emit('closed', 'left');
        else this.emit('room', room);
      }),
      client.on(S.CHAT, (msg) => {
        if (msg.history) this.chat = [...msg.history];
        if (msg.message) this.chat.push(msg.message);
        this.emit('chat', this.chat, msg.message ?? null);
      }),
      client.on(S.ACTION_ERROR, ({ error }) => this.emit('actionError', error)),
      client.on(S.LEFT, ({ reason }) => {
        if (reason !== 'left') this.emit('closed', reason);
      }),
      client.on('status', (status) => this.emit('connection', status)),
    ];
  }

  get room() {
    return this.client.room;
  }

  get isHost() {
    const room = this.client.room;
    return !!room && room.hostId === room.you;
  }

  start() {
    if (this.lastView) this.emit('view', this.lastView);
  }

  submit(action) {
    this.client.send({ t: C.ACTION, action });
    return { ok: true };
  }

  sendChat(text) {
    this.client.send({ t: C.CHAT, text });
  }

  rematch() {
    this.client.send({ t: C.REMATCH });
  }

  leave() {
    this.client.send({ t: C.LEAVE });
    this.dispose();
  }

  dispose() {
    this.unsubs.forEach((off) => off());
    this.unsubs = [];
    this.removeAll();
  }
}
