// The game log is an append-only list of events. Clients use it to narrate
// the game and to trigger sounds and animations. Each event carries public
// data plus optional per-seat secrets (e.g. which cards a player drew), which
// are stripped or revealed when building a player's view.

export const LOG_LIMIT = 250;

export function pushLog(state, type, data = {}, secret = null) {
  const event = { seq: ++state.seq, round: state.round, type, ...data };
  if (secret) event._secret = secret;
  state.log.push(event);
  if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
  return event;
}

export function redactEvent(event, seat) {
  const { _secret, ...pub } = event;
  if (_secret && seat != null && _secret[seat] !== undefined) pub.private = _secret[seat];
  return pub;
}
