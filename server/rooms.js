// Online rooms. A room is created by a host, shared via a short friend code,
// filled with humans and/or bots, and then runs a GameHost. Seats are tied to
// a private reconnect token so a refresh or a dropped connection does not
// cost a player their seat.

import crypto from 'node:crypto';
import { GameHost } from '../shared/host/GameHost.js';
import { pickBotName } from '../shared/bots/index.js';
import { getEdition } from '../shared/content/index.js';
import {
  BOT_LEVEL_CHOICES,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  S,
  sanitizeName,
  sanitizeSettings,
} from '../shared/protocol.js';

const EDITION = getEdition('classic');
export const MAX_SEATS = EDITION.maxPlayers;
export const MIN_SEATS = EDITION.minPlayers;

export const TIMINGS = {
  reconnectGrace: 20_000, // in-game: autopilot takes over after this long offline
  lobbyGrace: 45_000, // lobby: a disconnected seat is freed after this long
  roomIdle: 20 * 60_000, // rooms with nobody connected are removed after this long
  sweepEvery: 60_000,
};

const MAX_ROOMS = 1000;
const CHAT_HISTORY = 40;

const randomId = (bytes = 6) => crypto.randomBytes(bytes).toString('base64url');

export class RoomError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export class Room {
  constructor(manager, code, settings) {
    this.manager = manager;
    this.code = code;
    this.settings = sanitizeSettings(settings);
    this.seats = [];
    this.hostSeatId = null;
    this.status = 'lobby';
    this.game = null;
    this.chat = [];
    this.touch();
  }

  touch() {
    this.lastActive = Date.now();
  }

  seat(seatId) {
    return this.seats.find((s) => s.id === seatId) ?? null;
  }

  seatIndex(seatId) {
    return this.seats.findIndex((s) => s.id === seatId);
  }

  get connectedHumans() {
    return this.seats.filter((s) => s.kind === 'human' && s.connected);
  }

  isHost(seatId) {
    return this.hostSeatId === seatId;
  }

  // ------------------------------------------------------------ membership

  uniqueName(name) {
    const taken = new Set(this.seats.map((s) => s.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    for (let i = 2; ; i++) {
      const candidate = `${name.slice(0, 17)} ${i}`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
  }

  addHuman(client, rawName) {
    if (this.status !== 'lobby') throw new RoomError('started', 'That game has already begun.');
    if (this.seats.length >= MAX_SEATS) throw new RoomError('full', 'That table is full.');
    const seat = {
      id: randomId(),
      token: client.token,
      name: this.uniqueName(sanitizeName(rawName)),
      kind: 'human',
      level: null,
      client,
      connected: true,
      timer: null,
    };
    this.seats.push(seat);
    if (!this.hostSeatId) this.hostSeatId = seat.id;
    this.bind(client, seat);
    this.touch();
    this.broadcastRoom();
    return seat;
  }

  addBot(level) {
    if (this.status !== 'lobby') throw new RoomError('started', 'The game has already begun.');
    if (this.seats.length >= MAX_SEATS) throw new RoomError('full', 'The table is full.');
    const lvl = BOT_LEVEL_CHOICES.includes(level) ? level : 'normal';
    const name = pickBotName(this.seats.map((s) => s.name));
    this.seats.push({ id: randomId(), token: null, name, kind: 'bot', level: lvl, client: null, connected: true, timer: null });
    this.touch();
    this.broadcastRoom();
  }

  bind(client, seat) {
    client.room = this;
    client.seatId = seat.id;
    this.manager.tokens.set(client.token, { code: this.code, seatId: seat.id });
  }

  unbind(seat) {
    if (seat.token) this.manager.tokens.delete(seat.token);
    if (seat.client) {
      seat.client.room = null;
      seat.client.seatId = null;
    }
    seat.client = null;
    clearTimeout(seat.timer);
    seat.timer = null;
  }

  /** Remove a seat entirely (lobby) or hand it to the autopilot (in game). */
  removeSeat(seatId, reason = 'left') {
    const seat = this.seat(seatId);
    if (!seat) return;
    if (seat.client && reason !== 'left') seat.client.send({ t: S.LEFT, reason });
    this.unbind(seat);

    if (this.status === 'lobby' || seat.kind === 'bot') {
      if (this.status !== 'lobby') return; // bots stay seated during a game
      this.seats.splice(this.seatIndex(seatId), 1);
    } else {
      seat.connected = false;
      seat.left = true;
      const idx = this.seatIndex(seatId);
      this.game?.setConnected(idx, false);
      this.game?.setAutopilot(idx, true);
    }
    if (this.hostSeatId === seatId) this.reassignHost();
    if (!this.seats.some((s) => s.kind === 'human' && !s.left)) {
      this.manager.removeRoom(this.code);
      return;
    }
    this.touch();
    this.broadcastRoom();
  }

  reassignHost() {
    const next = this.seats.find((s) => s.kind === 'human' && !s.left && s.connected) ??
      this.seats.find((s) => s.kind === 'human' && !s.left);
    this.hostSeatId = next?.id ?? null;
  }

  onDisconnect(seat) {
    seat.client = null;
    seat.connected = false;
    clearTimeout(seat.timer);
    if (this.status === 'lobby') {
      seat.timer = setTimeout(() => this.removeSeat(seat.id, 'timeout'), TIMINGS.lobbyGrace);
    } else if (this.game) {
      const idx = this.seatIndex(seat.id);
      this.game.setConnected(idx, false);
      seat.timer = setTimeout(() => this.game?.setAutopilot(idx, true), TIMINGS.reconnectGrace);
    }
    if (this.isHost(seat.id) && this.status === 'lobby') {
      // Keep the host role unless someone else is around to take it.
      const other = this.seats.find((s) => s.kind === 'human' && s.connected);
      if (other) this.hostSeatId = other.id;
    }
    this.touch();
    this.broadcastRoom();
  }

  onReconnect(seat, client) {
    if (seat.client && seat.client !== client) {
      seat.client.send({ t: S.LEFT, reason: 'replaced' });
      seat.client.room = null;
      seat.client.seatId = null;
    }
    clearTimeout(seat.timer);
    seat.timer = null;
    seat.client = client;
    seat.connected = true;
    this.bind(client, seat);
    if (!this.hostSeatId) this.hostSeatId = seat.id;
    if (this.game) {
      const idx = this.seatIndex(seat.id);
      this.game.setConnected(idx, true);
      this.game.setAutopilot(idx, false);
    }
    this.touch();
    this.broadcastRoom();
    client.send({ t: S.CHAT, history: this.chat });
    if (this.game) this.sendView(seat);
  }

  // ------------------------------------------------------------ host controls

  updateSettings(settings) {
    if (this.status !== 'lobby') throw new RoomError('started', 'Settings are locked once the game begins.');
    this.settings = sanitizeSettings(settings, this.settings);
    this.broadcastRoom();
  }

  start() {
    if (this.status !== 'lobby') throw new RoomError('started', 'The game has already begun.');
    if (this.seats.length < MIN_SEATS) throw new RoomError('players', `You need at least ${MIN_SEATS} players.`);
    this.seats.forEach((s) => {
      clearTimeout(s.timer);
      s.timer = null;
    });
    this.status = 'playing';
    this.game = new GameHost({
      seats: this.seats.map((s) => ({ id: s.id, name: s.name, kind: s.kind, level: s.level, connected: s.connected })),
      options: { cityGoal: this.settings.cityGoal },
      pacing: this.manager.options.forcePacing ?? this.settings.pacing,
      turnTimeout: this.settings.turnTimeout * 1000,
      onChange: () => this.onGameChange(),
    });
    this.broadcastRoom();
    this.game.start();
    // Seats that dropped during the lobby countdown start on autopilot.
    this.seats.forEach((s, i) => {
      if (s.kind === 'human' && !s.connected) this.game.setAutopilot(i, true);
    });
  }

  rematch() {
    if (this.status === 'lobby') return;
    this.game?.destroy();
    this.game = null;
    this.status = 'lobby';
    // Players who left during the game lose their seat.
    for (const s of [...this.seats]) {
      if (s.left || (s.kind === 'human' && !s.connected)) {
        this.unbind(s);
        this.seats.splice(this.seats.indexOf(s), 1);
      }
    }
    if (!this.seat(this.hostSeatId)) this.reassignHost();
    this.broadcastRoom();
  }

  onGameChange() {
    this.touch();
    if (this.game?.over && this.status !== 'over') {
      this.status = 'over';
      this.broadcastRoom();
    }
    this.broadcastViews();
  }

  handleAction(seatId, action) {
    if (!this.game) throw new RoomError('no-game', 'The game has not started.');
    const result = this.game.submit(this.seatIndex(seatId), action);
    this.touch();
    return result;
  }

  addChat(seatId, text) {
    const seat = this.seat(seatId);
    const clean = String(text ?? '')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim()
      .slice(0, 200);
    if (!seat || !clean) return;
    const message = { id: randomId(4), seatId, name: seat.name, text: clean, at: Date.now() };
    this.chat.push(message);
    if (this.chat.length > CHAT_HISTORY) this.chat.shift();
    this.broadcast({ t: S.CHAT, message });
  }

  // ------------------------------------------------------------ broadcasting

  publicState(forSeatId) {
    return {
      code: this.code,
      status: this.status,
      settings: { ...this.settings },
      hostId: this.hostSeatId,
      you: forSeatId,
      maxSeats: MAX_SEATS,
      minSeats: MIN_SEATS,
      seats: this.seats.map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.kind,
        level: s.level,
        connected: s.connected,
        left: !!s.left,
        host: s.id === this.hostSeatId,
      })),
    };
  }

  broadcast(message) {
    for (const s of this.seats) s.client?.send(message);
  }

  broadcastRoom() {
    for (const s of this.seats) s.client?.send({ t: S.ROOM, room: this.publicState(s.id) });
  }

  sendView(seat) {
    if (!this.game || !seat.client) return;
    seat.client.send({ t: S.VIEW, view: this.game.view(this.seatIndex(seat.id)) });
  }

  broadcastViews() {
    for (const s of this.seats) if (s.client) this.sendView(s);
  }

  destroy() {
    this.game?.destroy();
    this.game = null;
    for (const s of this.seats) {
      if (s.client) s.client.send({ t: S.LEFT, reason: 'closed' });
      this.unbind(s);
    }
    this.seats = [];
  }
}

export class RoomManager {
  /** @param {{ forcePacing?: string }} [options] forcePacing overrides room pacing (tests). */
  constructor(options = {}) {
    this.options = options;
    this.rooms = new Map();
    this.tokens = new Map(); // reconnect token -> { code, seatId }
    this.sweeper = setInterval(() => this.sweep(), TIMINGS.sweepEvery);
    this.sweeper.unref?.();
  }

  newCode() {
    for (let attempt = 0; attempt < 1000; attempt++) {
      let code = '';
      const bytes = crypto.randomBytes(ROOM_CODE_LENGTH);
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[bytes[i] % ROOM_CODE_ALPHABET.length];
      if (!this.rooms.has(code)) return code;
    }
    throw new RoomError('busy', 'Could not allocate a room code.');
  }

  createRoom(client, name, settings) {
    if (this.rooms.size >= MAX_ROOMS) throw new RoomError('busy', 'The server is busy. Try again soon.');
    this.leave(client);
    const room = new Room(this, this.newCode(), settings);
    this.rooms.set(room.code, room);
    room.addHuman(client, name);
    return room;
  }

  joinRoom(client, code, name) {
    const room = this.rooms.get(code);
    if (!room) throw new RoomError('not-found', 'No table found with that code.');
    if (client.room === room) return room;
    this.leave(client);
    room.addHuman(client, name);
    return room;
  }

  /** Re-attach a client to the seat its token belongs to, if any. */
  resume(client) {
    const entry = this.tokens.get(client.token);
    if (!entry) return null;
    const room = this.rooms.get(entry.code);
    const seat = room?.seat(entry.seatId);
    if (!room || !seat || seat.left) {
      this.tokens.delete(client.token);
      return null;
    }
    room.onReconnect(seat, client);
    return room;
  }

  leave(client) {
    const room = client.room;
    if (!room) return;
    room.removeSeat(client.seatId, 'left');
    client.room = null;
    client.seatId = null;
  }

  onClose(client) {
    const room = client.room;
    if (!room) return;
    const seat = room.seat(client.seatId);
    if (seat && seat.client === client) room.onDisconnect(seat);
  }

  removeRoom(code) {
    const room = this.rooms.get(code);
    if (!room) return;
    this.rooms.delete(code);
    room.destroy();
  }

  sweep(now = Date.now()) {
    for (const room of [...this.rooms.values()]) {
      if (!room.connectedHumans.length && now - room.lastActive > TIMINGS.roomIdle) this.removeRoom(room.code);
    }
  }

  stats() {
    let players = 0;
    for (const room of this.rooms.values()) players += room.connectedHumans.length;
    return { rooms: this.rooms.size, players };
  }

  shutdown() {
    clearInterval(this.sweeper);
    for (const code of [...this.rooms.keys()]) this.removeRoom(code);
  }
}
