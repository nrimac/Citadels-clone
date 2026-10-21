// The local player's area: profile and purse, characters, city and hand.

import { h, fromHTML, reconcile, setChildren } from '../core/dom.js';
import { crestSVG, crownSVG, seatColor } from '../art/icons.js';
import { characterCard, districtCard, coin } from '../ui/cards.js';
import { icon } from '../ui/components.js';
import { getDistrict, SUIT_ORDER, SUITS } from '../../../shared/content/index.js';
import { statAnchor } from './seats.js';

const BLOCK_REASONS = {
  action: 'Gather resources (gold or cards) before building',
  limit: 'You cannot build any more districts this turn',
  duplicate: 'You already have this district',
  gold: 'Not enough gold',
  choosing: 'Choose which cards to keep first',
};

export class PlayerArea {
  constructor(root, { onBuild }) {
    this.root = root;
    this.onBuild = onBuild;
    this.profile = h('div', { class: 'me-profile' });
    this.cityLabel = h('div', { class: 'zone-label' });
    this.city = h('div', { class: 'me-city' });
    this.handLabel = h('div', { class: 'zone-label' });
    this.hand = h('div', { class: 'me-hand' });
    this.public = h('div', { class: 'me-public' });
    this.board = h(
      'div',
      { class: 'me-board' },
      h('div', { class: 'zone zone-city' }, this.cityLabel, this.city),
      h('div', { class: 'zone zone-hand' }, this.handLabel, this.hand),
    );
    this.root.append(this.profile, this.board, this.public);
  }

  update(view) {
    const spectator = view.you == null;
    this.root.classList.toggle('spectating', spectator);
    if (spectator) {
      setChildren(
        this.public,
        h(
          'div',
          { class: 'public-note' },
          icon('eye'),
          h(
            'span',
            null,
            view.phase === 'over' ? 'The game is over.' : 'Public table — private cards are hidden until the next player takes the device.',
          ),
        ),
      );
      return;
    }
    const me = view.players[view.you];
    this._profile(view, me);
    this._city(view, me);
    this._hand(view, me);
  }

  _profile(view, me) {
    const color = seatColor(me.seat);
    this.root.style.setProperty('--seat-color', color.main);
    this.root.style.setProperty('--seat-light', color.light);
    const active =
      (view.phase === 'draft' && view.draft?.seat === me.seat) ||
      (view.phase === 'play' && (view.prompt ? view.prompt.seat === me.seat : view.turn?.seat === me.seat));
    this.root.classList.toggle('active', !!active);
    const chars = me.characters.map((c) =>
      characterCard(c.id, {
        classes: [
          'mine-char',
          view.turn?.character === c.id ? 'current' : '',
          view.murdered === c.id ? 'murdered' : '',
          view.robbed === c.id ? 'robbed' : '',
          c.revealed ? 'revealed' : '',
        ].join(' '),
      }),
    );
    setChildren(
      this.profile,
      h(
        'div',
        { class: 'profile-head' },
        fromHTML(crestSVG(me.seat)),
        h(
          'div',
          { class: 'profile-name' },
          h(
            'div',
            { class: 'name' },
            h('span', null, me.name),
            h('span', {
              class: `profile-crown seat-anchor ${view.crown === me.seat ? 'on' : ''}`,
              dataset: { seat: me.seat, anchor: 'crown' },
              title: 'You hold the crown',
              html: crownSVG(),
            }),
          ),
          h('div', { class: 'sub' }, active ? 'Your move' : 'Waiting'),
        ),
      ),
      h(
        'div',
        { class: 'profile-stats' },
        statAnchor(me.seat, 'gold', [coin(), h('b', null, String(me.gold))], 'Your gold'),
        statAnchor(me.seat, 'hand', [icon('cards'), h('b', null, String(me.handCount))], 'Cards in hand'),
      ),
      h(
        'div',
        { class: 'profile-chars' },
        chars.length ? chars : h('div', { class: 'no-char' }, view.phase === 'draft' ? 'Choosing…' : '—'),
      ),
    );
  }

  _city(view, me) {
    const goal = view.options.cityGoal;
    const suits = new Set(me.city.map((c) => getDistrict(c.id).suit));
    setChildren(
      this.cityLabel,
      h('span', null, 'Your City'),
      h('b', { class: me.complete ? 'done' : '' }, `${me.city.length} / ${goal}`),
      h(
        'span',
        { class: 'suit-pips', title: 'Build all five suits for a bonus' },
        SUIT_ORDER.map((s) => h('i', { class: `pip suit-${s} ${suits.has(s) ? 'on' : ''}`, title: SUITS[s].name })),
      ),
    );
    this.city.classList.toggle('empty', !me.city.length);
    reconcile(this.city, me.city, {
      key: (c) => c.uid,
      create: (c) => districtCard(c, { classes: 'in-city' }),
    });
  }

  _hand(view, me) {
    const legal = view.legal?.turn;
    const myTurn = !!legal;
    const buildable = new Set(legal?.build ?? []);
    setChildren(
      this.handLabel,
      h('span', null, 'Your Hand'),
      myTurn && view.turn.actionTaken && legal.buildsLeft > 0
        ? h(
            'em',
            { class: 'hint' },
            buildable.size
              ? `Click a glowing card to build it${legal.buildsLeft > 1 ? ` (${legal.buildsLeft} builds left)` : ''}`
              : 'Nothing you can build right now',
          )
        : null,
    );
    this.hand.classList.toggle('empty', !view.hand.length);
    this.hand.style.setProperty('--n', String(view.hand.length));
    reconcile(this.hand, view.hand, {
      key: (c) => c.uid,
      create: (c) => {
        const el = districtCard(c, { classes: 'in-hand show-text' });
        el.addEventListener('click', () => {
          if (el.classList.contains('playable')) this.onBuild(c.uid, el);
        });
        el.addEventListener('keydown', (e) => {
          if ((e.key === 'Enter' || e.key === ' ') && el.classList.contains('playable')) this.onBuild(c.uid, el);
        });
        return el;
      },
    });
    for (const el of this.hand.children) {
      const uid = Number(el.dataset.uid);
      const can = buildable.has(uid);
      el.classList.toggle('playable', can);
      el.tabIndex = can ? 0 : -1;
      const reason = myTurn && view.turn.actionTaken ? legal.blocked?.[uid] : null;
      el.classList.toggle('blocked', !!reason && reason !== 'limit');
      el.title = can ? `Build for ${getDistrict(el.dataset.previewId).cost} gold` : reason ? (BLOCK_REASONS[reason] ?? '') : '';
    }
  }
}
