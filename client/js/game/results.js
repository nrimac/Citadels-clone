// End-of-game scoreboard.

import { h, fromHTML } from '../core/dom.js';
import { crestSVG, crownSVG } from '../art/icons.js';
import { districtMini } from '../ui/cards.js';
import { button } from '../ui/components.js';

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];

export function buildResults(view, { canRematch, onRematch, onLeave, onClose }) {
  const { result } = view;
  const winner = view.players[result.winner];
  const youWon = result.winner === view.you;
  const rows = result.standings.map((seat, i) => {
    const p = view.players[seat];
    const s = result.scores.find((x) => x.seat === seat);
    return h(
      'div',
      { class: `score-row ${i === 0 ? 'first' : ''} ${seat === view.you ? 'me' : ''}`, style: { animationDelay: `${0.25 + i * 0.12}s` } },
      h('div', { class: 'score-place' }, i === 0 ? h('div', { class: 'score-crown', html: crownSVG() }) : ORDINAL[i]),
      fromHTML(crestSVG(seat)),
      h(
        'div',
        { class: 'score-name' },
        h('div', null, p.name),
        h(
          'div',
          { class: 'score-city' },
          p.city.map((c) => districtMini(c)),
        ),
      ),
      h('div', { class: 'score-part', title: 'District value' }, h('small', null, 'Districts'), h('b', null, String(s.districts))),
      h(
        'div',
        { class: 'score-part', title: 'All five suits' },
        h('small', null, 'Suits'),
        h('b', null, s.allSuits ? `+${s.allSuits}` : '—'),
      ),
      h(
        'div',
        { class: 'score-part', title: 'Completed city' },
        h('small', null, 'Complete'),
        h('b', null, s.complete ? `+${s.complete}` : '—'),
      ),
      h('div', { class: 'score-total' }, String(s.total)),
    );
  });

  return h(
    'div',
    { class: 'results' },
    h('div', { class: 'results-crown', html: crownSVG() }),
    h('h2', { class: 'overlay-title gold-text' }, youWon ? 'Victory!' : `${winner.name} Rules the Realm`),
    h(
      'p',
      { class: 'overlay-sub' },
      youWon
        ? 'Your citadel is the envy of the land.'
        : view.you != null
          ? 'The crown slips from your grasp… this time.'
          : 'The final reckoning',
    ),
    h('div', { class: 'score-table' }, rows),
    h(
      'div',
      { class: 'overlay-actions' },
      button('Back to the table', { variant: 'ghost', icon: 'eye', onClick: onClose }),
      button('Leave', { variant: 'ghost', icon: 'exit', onClick: onLeave }),
      canRematch
        ? button('Play again', { variant: 'primary', icon: 'refresh', onClick: onRematch })
        : h('div', { class: 'waiting-note' }, 'Waiting for the host to call a rematch…'),
    ),
  );
}
