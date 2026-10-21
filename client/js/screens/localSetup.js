import { h, fromHTML, setChildren } from '../core/dom.js';
import { registerScreen } from '../core/router.js';
import { load, save } from '../core/storage.js';
import { settings } from '../core/settings.js';
import { pickBotName } from '../../../shared/bots/index.js';
import { getEdition } from '../../../shared/content/index.js';
import { sanitizeName, CITY_GOAL_CHOICES } from '../../../shared/protocol.js';
import { crestSVG } from '../art/icons.js';
import { music, play } from '../audio/index.js';
import { button, iconButton, segmented, toast, icon } from '../ui/components.js';
import { LocalSession } from '../sessions/LocalSession.js';
import { sceneBackdrop } from './title.js';

const EDITION = getEdition('classic');

export const LEVEL_OPTIONS = [
  { value: 'easy', label: 'Squire' },
  { value: 'normal', label: 'Knight' },
  { value: 'hard', label: 'Lord' },
];

export function quickGameSeats(name) {
  const seats = [{ kind: 'human', name: sanitizeName(name, 'You') }];
  for (let i = 0; i < 3; i++) seats.push({ kind: 'bot', name: pickBotName(seats.map((s) => s.name)), level: 'normal' });
  return seats.map((s, i) => ({ ...s, id: `seat-${i}` }));
}

function defaultConfig() {
  return {
    seats: [
      { kind: 'human', name: settings.get('name') || 'You' },
      { kind: 'bot', name: 'Lady Rowena', level: 'normal' },
      { kind: 'bot', name: 'Sir Aldric', level: 'normal' },
      { kind: 'bot', name: 'Brother Anselm', level: 'easy' },
    ],
    cityGoal: 8,
  };
}

registerScreen('localSetup', (app) => {
  music.play('menu');
  const config = load('localSetup', null) ?? defaultConfig();
  if (!Array.isArray(config.seats) || config.seats.length < 2) Object.assign(config, defaultConfig());

  const persist = () => save('localSetup', config);
  const list = h('div', { class: 'seat-list' });
  const counter = h('span', { class: 'seat-count' });
  const addHuman = button('Add Player', { icon: 'user', variant: 'ghost', size: 'small', onClick: () => addSeat('human') });
  const addBot = button('Add Bot', { icon: 'bot', variant: 'ghost', size: 'small', onClick: () => addSeat('bot') });

  function addSeat(kind) {
    if (config.seats.length >= EDITION.maxPlayers) return;
    const taken = config.seats.map((s) => s.name);
    config.seats.push(kind === 'bot' ? { kind, name: pickBotName(taken), level: 'normal' } : { kind, name: `Player ${config.seats.length + 1}` });
    play('join');
    persist();
    render();
  }

  function render() {
    setChildren(list,
      ...config.seats.map((seat, i) => {
        const nameField =
          seat.kind === 'human'
            ? h('input', {
                class: 'input',
                maxlength: '20',
                value: seat.name,
                'aria-label': `Name of player ${i + 1}`,
                onchange: (e) => {
                  seat.name = sanitizeName(e.target.value, `Player ${i + 1}`);
                  e.target.value = seat.name;
                  if (i === 0) settings.set({ name: seat.name });
                  persist();
                },
              })
            : h('div', { class: 'seat-botname' }, seat.name);
        return h(
          'div',
          { class: `seat-row ${seat.kind}` },
          fromHTML(crestSVG(i)),
          h('div', { class: 'seat-kind', title: seat.kind === 'bot' ? 'Bot' : 'Human' }, icon(seat.kind === 'bot' ? 'bot' : 'user')),
          nameField,
          seat.kind === 'bot'
            ? segmented(LEVEL_OPTIONS, seat.level, (v) => {
                seat.level = v;
                persist();
              })
            : h('span', { class: 'seat-hint' }, i === 0 ? 'You' : 'Shares this device'),
          iconButton('swap', {
            title: seat.kind === 'bot' ? 'Make this a human seat' : 'Make this a bot',
            onClick: () => {
              if (seat.kind === 'bot') Object.assign(seat, { kind: 'human', name: `Player ${i + 1}` });
              else Object.assign(seat, { kind: 'bot', name: pickBotName(config.seats.map((s) => s.name)), level: 'normal' });
              persist();
              render();
            },
          }),
          iconButton('close', {
            title: 'Remove seat',
            classes: config.seats.length <= EDITION.minPlayers ? 'disabled' : '',
            onClick: () => {
              if (config.seats.length <= EDITION.minPlayers) return toast(`At least ${EDITION.minPlayers} players are needed.`, { type: 'error' });
              config.seats.splice(i, 1);
              play('leave');
              persist();
              render();
            },
          }),
        );
      }),
    );
    const n = config.seats.length;
    counter.textContent = `${n} of ${EDITION.maxPlayers} seats`;
    addHuman.disabled = addBot.disabled = n >= EDITION.maxPlayers;
  }
  render();

  const start = () => {
    if (!config.seats.some((s) => s.kind === 'human')) {
      // An all-bot table is allowed: it's a fine way to watch and learn.
      toast('Watching the bots play — enjoy the show!');
    }
    const seats = config.seats.map((s, i) => ({ id: `seat-${i}`, name: s.name, kind: s.kind, level: s.level }));
    const session = new LocalSession({ seats, options: { cityGoal: config.cityGoal }, pacing: settings.get('pacing') });
    app.go('game', { session });
  };

  const backdrop = sceneBackdrop();
  const el = h(
    'div',
    { class: 'menu-screen' },
    backdrop,
    h(
      'div',
      { class: 'menu-panel leather' },
      h(
        'header',
        { class: 'menu-header' },
        iconButton('back', { title: 'Back', onClick: () => app.go('title') }),
        h('div', null, h('h2', { class: 'gold-text' }, 'Gather at the Table'), h('p', { class: 'menu-sub' }, 'Friends sharing this device and bots, in any mix.')),
      ),
      h('div', { class: 'ornament' }, 'Players'),
      list,
      h('div', { class: 'seat-actions' }, addHuman, addBot, counter),
      h('div', { class: 'ornament' }, 'Rules'),
      h(
        'div',
        { class: 'option-row' },
        h('span', { class: 'label' }, 'Districts to complete a city'),
        segmented(
          CITY_GOAL_CHOICES.map((n) => ({ value: n, label: String(n) })),
          config.cityGoal,
          (v) => {
            config.cityGoal = v;
            persist();
          },
        ),
      ),
      h('div', { class: 'menu-footer' }, button('Begin the Game', { variant: 'primary', size: 'large', icon: 'play', onClick: start })),
    ),
  );

  return { el, destroy: () => backdrop.destroy() };
});
