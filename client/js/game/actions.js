// The action panel: every move available to the local player right now,
// derived from `view.legal` (so it can never offer an illegal move).

import { h, setChildren } from '../core/dom.js';
import { getCharacter, getDistrict } from '../../../shared/content/index.js';
import { button } from '../ui/components.js';
import { makeNamer } from './narrate.js';

const ABILITY_ICONS = { murder: 'dagger', rob: 'bag', exchange: 'swap', redraw: 'refresh', destroy: 'sword' };
const DISTRICT_ICONS = { laboratory: 'flask', smithy: 'anvil' };

export class ActionPanel {
  constructor(root, controller) {
    this.root = root;
    this.ctl = controller;
    this.key = null;
  }

  update(view) {
    // Rebuild only when something relevant changed (keeps hover states stable).
    const key = JSON.stringify([view.seq, view.you, view.phase]);
    if (key === this.key) return;
    this.key = key;
    setChildren(this.root, ...this._content(view));
  }

  _content(view) {
    const name = makeNamer(view);
    const legal = view.legal;
    if (view.phase === 'over') {
      return [
        h('div', { class: 'actions-title' }, 'The game is over'),
        button('View results', { variant: 'gold', icon: 'trophy', onClick: () => this.ctl.showResults() }),
      ];
    }
    if (view.you == null) {
      return [h('div', { class: 'actions-title' }, 'Spectating'), h('p', { class: 'actions-hint' }, 'Private cards are hidden.')];
    }
    if (legal?.prompt) {
      return [
        h('div', { class: 'actions-title' }, 'Your Graveyard'),
        h('p', { class: 'actions-hint' }, 'A district was destroyed. Will you rescue it?'),
        button('Decide', { variant: 'gold', onClick: () => this.ctl.openPrompt() }),
      ];
    }
    if (legal?.pick || legal?.discard) {
      return [
        h('div', { class: 'actions-title' }, legal.pick ? 'Choose your character' : 'Set a character aside'),
        h(
          'p',
          { class: 'actions-hint' },
          legal.pick ? 'Pick secretly — the others won’t know until it is called.' : 'This character is discarded face down.',
        ),
        button('Open the choice', { variant: 'gold', icon: 'cards', onClick: () => this.ctl.openDraft() }),
      ];
    }
    const t = legal?.turn;
    if (!t) {
      let waiting = '';
      if (view.phase === 'draft') waiting = `${name(view.draft?.seat)} is choosing a character…`;
      else if (view.prompt) waiting = `${name(view.prompt.seat)} is deciding…`;
      else if (view.turn) waiting = `${name(view.turn.seat)} is playing the ${getCharacter(view.turn.character).name}.`;
      return [
        h('div', { class: 'actions-title waiting' }, h('span', { class: 'spinner' }), 'Waiting'),
        h('p', { class: 'actions-hint' }, waiting),
      ];
    }

    const character = getCharacter(view.turn.character);
    const out = [
      h('div', { class: 'actions-title' }, h('span', { class: 'gold-text' }, 'Your turn'), h('small', null, ` · the ${character.name}`)),
    ];

    if (t.choosing) {
      out.push(
        h('p', { class: 'actions-hint' }, `Keep ${t.keep} of the cards you drew.`),
        button('Choose cards', { variant: 'gold', icon: 'cards', onClick: () => this.ctl.openKeep() }),
      );
      return out;
    }

    if (!view.turn.actionTaken) {
      out.push(
        h('div', { class: 'actions-step' }, 'Gather resources'),
        h(
          'div',
          { class: 'actions-pair' },
          button('Take 2 gold', {
            variant: 'gold',
            icon: 'coins',
            sound: null,
            title: 'Shortcut: G',
            disabled: !t.takeGold,
            onClick: () => this.ctl.submit({ type: 'takeGold' }),
          }),
          button(t.keepCount >= t.drawCount ? `Draw ${t.drawCount} cards` : `Draw ${t.drawCount}, keep ${t.keepCount}`, {
            variant: 'gold',
            icon: 'cards',
            sound: null,
            title: 'Shortcut: D',
            disabled: !t.drawCards,
            onClick: () => this.ctl.submit({ type: 'drawCards' }),
          }),
        ),
      );
    }

    const special = [];
    for (const a of t.abilities) {
      const disabled = a.used || !a.options.length;
      special.push(
        button(a.used ? `${a.label} ✓` : `${a.label}…`, {
          icon: ABILITY_ICONS[a.id] ?? 'sparkles',
          disabled,
          title: a.used ? 'Already used this turn' : !a.options.length ? 'No valid targets' : a.prompt,
          onClick: () => this.ctl.startAbility(a),
        }),
      );
    }
    if (t.income) {
      special.push(
        button(`Collect taxes (+${t.income.amount})`, {
          icon: 'coins',
          sound: null,
          title: `1 gold per ${t.income.suit} district (collected automatically when you end your turn)`,
          onClick: () => this.ctl.submit({ type: 'income' }),
        }),
      );
    }
    for (const d of t.districts) {
      special.push(
        button(d.used ? `${getDistrict(d.id).name} ✓` : d.label, {
          icon: DISTRICT_ICONS[d.id] ?? 'sparkles',
          disabled: !d.available,
          onClick: () => this.ctl.useDistrict(d),
        }),
      );
    }
    if (special.length) out.push(h('div', { class: 'actions-step' }, 'Abilities'), h('div', { class: 'actions-list' }, special));

    if (view.turn.actionTaken) {
      const left = t.buildsLeft;
      out.push(
        h(
          'p',
          { class: 'actions-hint' },
          t.build.length && left > 0
            ? `Click a glowing card in your hand to build it.`
            : left > 0
              ? 'You cannot afford anything in your hand.'
              : 'You have built all you can this turn.',
        ),
      );
    }
    out.push(
      h(
        'div',
        { class: 'actions-end' },
        button('End turn', {
          variant: 'primary',
          icon: 'hourglass',
          disabled: !t.endTurn,
          title: t.endTurn ? 'Shortcut: E' : 'Gather resources first',
          onClick: () => this.ctl.endTurn(),
        }),
      ),
    );
    return out;
  }
}
