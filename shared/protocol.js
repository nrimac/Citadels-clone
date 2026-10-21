// Wire protocol shared by the browser client and the server.
// Every message is a JSON object with a `t` (type) field.

export const PROTOCOL_VERSION = 1;

// Client -> server
export const C = Object.freeze({
  HELLO: 'hello', // { token?, version }
  CREATE: 'create', // { name, settings? }
  JOIN: 'join', // { code, name }
  LEAVE: 'leave', // {}
  SETTINGS: 'settings', // { settings }
  ADD_BOT: 'addBot', // { level }
  REMOVE_SEAT: 'removeSeat', // { seatId }
  START: 'start', // {}
  ACTION: 'action', // { action }
  CHAT: 'chat', // { text }
  REMATCH: 'rematch', // {}
  PING: 'ping', // {}
});

// Server -> client
export const S = Object.freeze({
  WELCOME: 'welcome', // { token }
  ROOM: 'room', // { room }
  VIEW: 'view', // { view }
  CHAT: 'chat', // { message }
  ERROR: 'error', // { code, message }
  ACTION_ERROR: 'actionError', // { error }
  LEFT: 'left', // { reason }
  PONG: 'pong', // {}
});

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;

export const DEFAULT_ROOM_SETTINGS = Object.freeze({
  cityGoal: 8,
  pacing: 'normal',
  turnTimeout: 120, // seconds; 0 = no limit
});

export const TURN_TIMEOUT_CHOICES = [0, 60, 120, 300];
export const PACING_CHOICES = ['slow', 'normal', 'fast'];
export const CITY_GOAL_CHOICES = [6, 7, 8];
export const BOT_LEVEL_CHOICES = ['easy', 'normal', 'hard'];

export function normalizeCode(code) {
  return String(code ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ROOM_CODE_LENGTH);
}

export function sanitizeName(name, fallback = 'Wanderer') {
  const clean = String(name ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20);
  return clean || fallback;
}

export function sanitizeSettings(input = {}, base = DEFAULT_ROOM_SETTINGS) {
  const out = { ...base };
  if (CITY_GOAL_CHOICES.includes(Number(input.cityGoal))) out.cityGoal = Number(input.cityGoal);
  if (PACING_CHOICES.includes(input.pacing)) out.pacing = input.pacing;
  if (TURN_TIMEOUT_CHOICES.includes(Number(input.turnTimeout))) out.turnTimeout = Number(input.turnTimeout);
  return out;
}
