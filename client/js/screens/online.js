import { h, fromHTML, setChildren } from '../core/dom.js';
import { registerScreen } from '../core/router.js';
import { settings } from '../core/settings.js';
import { C, S, CITY_GOAL_CHOICES, normalizeCode, sanitizeName, ROOM_CODE_LENGTH } from '../../../shared/protocol.js';
import { crestSVG } from '../art/icons.js';
import { music, play } from '../audio/index.js';
import { button, iconButton, segmented, toast, icon } from '../ui/components.js';
import { getClient } from '../net/socket.js';
import { OnlineSession } from '../sessions/OnlineSession.js';
import { sceneBackdrop } from './title.js';
import { LEVEL_OPTIONS } from './localSetup.js';
import { chatPanel } from '../game/chat.js';

const PACE_OPTIONS = [
  { value: 'slow', label: 'Leisurely' },
  { value: 'normal', label: 'Steady' },
  { value: 'fast', label: 'Brisk' },
];

const TIMER_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
];

function inviteLink(code) {
  return `${location.origin}/join/${code}`;
}

async function copy(text, what) {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${what} copied`);
  } catch {
    toast(text, { duration: 5000 });
  }
}

registerScreen('online', (app, params = {}) => {
  music.play('menu');
  const client = getClient();
  client.connect();
  const backdrop = sceneBackdrop();
  const panel = h('div', { class: 'menu-panel leather online-panel' });
  const status = h('div', { class: 'connection-status' });
  let chat = [];
  let chatView = null;
  let lastSeatCount = 0;
  let pendingAction = null;
  let botLevel = 'normal';

  const nameInput = h('input', { class: 'input', maxlength: '20', placeholder: 'Your name', value: settings.get('name') || '' });
  const codeInput = h('input', {
    class: 'input code',
    maxlength: String(ROOM_CODE_LENGTH),
    size: String(ROOM_CODE_LENGTH),
    placeholder: '•••••',
    'aria-label': 'Friend code',
    autocapitalize: 'characters',
    value: params.code ? normalizeCode(params.code) : '',
    autocomplete: 'off',
    spellcheck: 'false',
  });
  codeInput.addEventListener('input', () => {
    codeInput.value = normalizeCode(codeInput.value);
  });

  const myName = () => {
    const name = sanitizeName(nameInput.value, '');
    if (name) settings.set({ name });
    return name || 'Wanderer';
  };

  const host = () => {
    pendingAction = 'create';
    client.send({ t: C.CREATE, name: myName(), settings: { cityGoal: 8, pacing: 'normal', turnTimeout: 120 } });
  };
  const join = () => {
    const code = normalizeCode(codeInput.value);
    if (code.length !== ROOM_CODE_LENGTH) {
      toast(`Friend codes have ${ROOM_CODE_LENGTH} characters.`, { type: 'error' });
      codeInput.focus();
      return;
    }
    pendingAction = 'join';
    client.send({ t: C.JOIN, code, name: myName() });
  };
  codeInput.addEventListener('keydown', (e) => e.key === 'Enter' && join());

  function renderEntry() {
    setChildren(
      panel,
      h(
        'header',
        { class: 'menu-header' },
        iconButton('back', { title: 'Back', onClick: () => app.go('title') }),
        h(
          'div',
          null,
          h('h2', { class: 'gold-text' }, 'Play Online'),
          h('p', { class: 'menu-sub' }, 'Host a table and share the friend code, or join a friend’s table.'),
        ),
        status,
      ),
      h('div', { class: 'field' }, h('label', null, 'Your name'), nameInput),
      h(
        'div',
        { class: 'online-choices' },
        h(
          'section',
          { class: 'online-card' },
          h('div', { class: 'online-card-icon' }, icon('crown')),
          h('h3', null, 'Host a Table'),
          h('p', null, 'Create a private table, invite friends with a code and fill empty seats with bots.'),
          button('Create Table', { variant: 'primary', icon: 'plus', onClick: host }),
        ),
        h(
          'section',
          { class: 'online-card' },
          h('div', { class: 'online-card-icon' }, icon('link')),
          h('h3', null, 'Join a Table'),
          h('p', null, 'Enter the friend code your host shared with you.'),
          codeInput,
          button('Join', { variant: 'gold', icon: 'play', onClick: join }),
        ),
      ),
    );
  }

  function renderLobby(room) {
    const me = room.seats.find((s) => s.id === room.you);
    const isHost = room.hostId === room.you;
    const canStart = room.seats.length >= room.minSeats;

    const seatRows = room.seats.map((s, i) =>
      h(
        'div',
        { class: `seat-row ${s.kind} ${s.id === room.you ? 'me' : ''} ${s.connected ? '' : 'offline'}` },
        fromHTML(crestSVG(i)),
        h('div', { class: 'seat-kind', title: s.kind === 'bot' ? 'Bot' : 'Player' }, icon(s.kind === 'bot' ? 'bot' : 'user')),
        h(
          'div',
          { class: 'seat-name' },
          s.name,
          s.host ? h('span', { class: 'host-tag', title: 'Host' }, icon('crown')) : null,
          s.id === room.you ? h('span', { class: 'you-tag' }, 'you') : null,
        ),
        s.kind === 'bot'
          ? h('span', { class: 'seat-hint' }, LEVEL_OPTIONS.find((l) => l.value === s.level)?.label ?? 'Bot')
          : h('span', { class: `seat-hint ${s.connected ? 'online' : 'away'}` }, s.connected ? 'Ready' : 'Reconnecting…'),
        isHost && s.id !== room.you
          ? iconButton('close', {
              title: s.kind === 'bot' ? 'Remove bot' : 'Remove player',
              onClick: () => client.send({ t: C.REMOVE_SEAT, seatId: s.id }),
            })
          : h('span'),
      ),
    );

    const empty = Array.from({ length: Math.max(0, room.maxSeats - room.seats.length) }, () =>
      h('div', { class: 'seat-row empty' }, h('span', { class: 'seat-empty' }, 'Empty seat')),
    );

    const hostControls = isHost
      ? h(
          'div',
          { class: 'lobby-host' },
          h(
            'div',
            { class: 'seat-actions' },
            segmented(LEVEL_OPTIONS, botLevel, (v) => (botLevel = v)),
            button('Add Bot', {
              icon: 'bot',
              size: 'small',
              disabled: room.seats.length >= room.maxSeats,
              onClick: () => client.send({ t: C.ADD_BOT, level: botLevel }),
            }),
          ),
          h('div', { class: 'ornament' }, 'Rules'),
          optionRow(
            'City size',
            segmented(
              CITY_GOAL_CHOICES.map((n) => ({ value: n, label: `${n} districts` })),
              room.settings.cityGoal,
              (v) => sendSettings({ cityGoal: v }),
            ),
          ),
          optionRow(
            'Bot speed',
            segmented(PACE_OPTIONS, room.settings.pacing, (v) => sendSettings({ pacing: v })),
          ),
          optionRow(
            'Turn timer',
            segmented(TIMER_OPTIONS, room.settings.turnTimeout, (v) => sendSettings({ turnTimeout: v })),
          ),
        )
      : h(
          'div',
          { class: 'lobby-rules' },
          h('div', { class: 'ornament' }, 'Rules'),
          h(
            'p',
            null,
            `${room.settings.cityGoal} districts complete a city · ${PACE_OPTIONS.find((p) => p.value === room.settings.pacing)?.label} bots · ${TIMER_OPTIONS.find((t) => t.value === room.settings.turnTimeout)?.label ?? ''} turn timer`,
          ),
        );

    if (!chatView) chatView = chatPanel({ onSend: (text) => client.send({ t: C.CHAT, text }) });
    chatView.update(chat, room);
    // Re-rendering moves the chat box; keep the cursor there if someone was typing.
    const typing = chatView.el.contains(document.activeElement);

    setChildren(
      panel,
      h(
        'header',
        { class: 'menu-header' },
        iconButton('exit', { title: 'Leave table', onClick: () => client.send({ t: C.LEAVE }) }),
        h(
          'div',
          null,
          h('h2', { class: 'gold-text' }, `${room.seats.find((s) => s.host)?.name ?? 'The'}’s Table`),
          h(
            'p',
            { class: 'menu-sub' },
            isHost ? 'Share the friend code. Start when everyone is seated.' : 'Waiting for the host to begin…',
          ),
        ),
        status,
      ),
      h(
        'div',
        { class: 'lobby' },
        h(
          'div',
          { class: 'lobby-main' },
          h(
            'div',
            { class: 'friend-code' },
            h('span', { class: 'label' }, 'Friend code'),
            h(
              'div',
              { class: 'code-letters' },
              room.code.split('').map((c) => h('span', null, c)),
            ),
            h(
              'div',
              { class: 'code-actions' },
              button('Copy code', { icon: 'copy', size: 'small', variant: 'ghost', onClick: () => copy(room.code, 'Code') }),
              button('Copy invite link', {
                icon: 'link',
                size: 'small',
                variant: 'ghost',
                onClick: () => copy(inviteLink(room.code), 'Invite link'),
              }),
            ),
          ),
          h('div', { class: 'ornament' }, `Seats · ${room.seats.length}/${room.maxSeats}`),
          h('div', { class: 'seat-list' }, seatRows, empty.slice(0, 2)),
          hostControls,
        ),
        h('aside', { class: 'lobby-chat' }, chatView.el),
      ),
      h(
        'div',
        { class: 'menu-footer' },
        isHost
          ? button(canStart ? 'Begin the Game' : `Need ${room.minSeats} players`, {
              variant: 'primary',
              size: 'large',
              icon: 'play',
              disabled: !canStart,
              onClick: () => client.send({ t: C.START }),
            })
          : h('div', { class: 'waiting-note' }, h('span', { class: 'spinner' }), me ? `Seated as ${me.name}` : ''),
      ),
    );
    if (typing) chatView.focus();
  }

  function optionRow(label, control) {
    return h('div', { class: 'option-row' }, h('span', { class: 'label' }, label), control);
  }

  function sendSettings(patch) {
    client.send({ t: C.SETTINGS, settings: { ...client.room?.settings, ...patch } });
  }

  function renderStatus() {
    const s = client.status;
    status.className = `connection-status ${s}`;
    setChildren(
      status,
      icon('wifi'),
      h('span', null, s === 'open' ? 'Connected' : s === 'connecting' ? 'Connecting…' : 'Offline — retrying'),
    );
  }

  function onRoom(room) {
    if (!room) {
      chatView = null;
      chat = [];
      lastSeatCount = 0;
      renderEntry();
      return;
    }
    if (room.status === 'playing' || room.status === 'over') {
      const session = new OnlineSession(client);
      session.chat = chat;
      app.go('game', { session });
      return;
    }
    if (room.seats.length > lastSeatCount && lastSeatCount) play('join');
    else if (room.seats.length < lastSeatCount) play('leave');
    if (pendingAction) play('join');
    pendingAction = null;
    lastSeatCount = room.seats.length;
    renderLobby(room);
  }

  const offs = [
    client.on(S.ROOM, ({ room }) => onRoom(room)),
    client.on(S.ERROR, ({ message }) => {
      pendingAction = null;
      toast(message, { type: 'error' });
    }),
    client.on(S.LEFT, ({ reason }) => {
      if (reason === 'kicked') toast('The host removed you from the table.', { type: 'error' });
      if (reason === 'replaced') toast('You joined this table from another tab.', { type: 'error' });
    }),
    client.on(S.CHAT, (msg) => {
      if (msg.history) chat = [...msg.history];
      if (msg.message) {
        chat.push(msg.message);
        if (msg.message.seatId !== client.room?.you) play('chat');
      }
      if (chatView && client.room) chatView.update(chat, client.room);
    }),
    client.on('status', renderStatus),
  ];

  renderStatus();
  if (client.room) onRoom(client.room);
  else renderEntry();
  if (params.code && !client.room) setTimeout(() => codeInput.focus(), 100);

  const el = h('div', { class: 'menu-screen' }, backdrop, panel);
  return {
    el,
    destroy() {
      offs.forEach((off) => off());
      backdrop.destroy();
    },
  };
});
