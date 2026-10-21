// Icons and small emblems. UI icons use `currentColor` so they follow CSS;
// illustrated emblems (coin, crown, card back, crests) carry their own colors.

import { registerDefs, lin, rad } from './defs.js';
import { circle, ellipse, g, line, path, poly, rect, star, svg } from './svg.js';

registerDefs(`
  ${rad(
    'coin-face',
    [
      [0, '#fff3b8'],
      [0.55, '#f0c443'],
      [0.9, '#c8901f'],
      [1, '#8a5d14'],
    ],
    'cx="0.4" cy="0.35" r="0.7"',
  )}
  ${lin('cardback', [
    [0, '#2a3a78'],
    [1, '#121a3c'],
  ])}
  ${rad('cardback-glow', [
    [0, '#4a64c8', 0.55],
    [1, '#4a64c8', 0],
  ])}
`);

// ------------------------------------------------------------------ UI icons (24×24, stroke-based)

const ui = (body, extra = '') =>
  svg(
    '0 0 24 24',
    body,
    `class="icon" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}`,
  );

export const ICONS = {
  menu: ui('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  close: ui('<path d="M6 6l12 12M18 6L6 18"/>'),
  back: ui('<path d="M15 5l-7 7 7 7"/>'),
  sound: ui('<path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor" stroke="none"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>'),
  mute: ui('<path d="M4 10v4h4l5 4V6L8 10H4z" fill="currentColor" stroke="none"/><path d="M17 9l5 6M22 9l-5 6"/>'),
  music: ui(
    '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="17.5" cy="16" r="2.5" fill="currentColor"/>',
  ),
  gear: ui(
    '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  ),
  book: ui(
    '<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5C4.7 20 4 19.3 4 18.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z"/>',
  ),
  scroll: ui(
    '<path d="M7 4h11a2 2 0 012 2v1h-4"/><path d="M16 7v11a2 2 0 01-2 2H6a2 2 0 01-2-2v-1h10"/><path d="M7 4a2 2 0 00-2 2v11"/><path d="M9 9h4M9 13h4"/>',
  ),
  chat: ui('<path d="M4 5h16v11H9l-5 4z"/>'),
  exit: ui('<path d="M14 4h5v16h-5"/><path d="M10 8l-4 4 4 4M6 12h10"/>'),
  copy: ui('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>'),
  link: ui('<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7L12 6.3"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>'),
  user: ui('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'),
  users: ui(
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14.8c2 .7 3.2 2.5 3.5 5.2"/>',
  ),
  bot: ui(
    '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16.5h5"/><circle cx="12" cy="3.5" r="1" fill="currentColor"/>',
  ),
  globe: ui('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>'),
  plus: ui('<path d="M12 5v14M5 12h14"/>'),
  minus: ui('<path d="M5 12h14"/>'),
  check: ui('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  play: ui('<path d="M7 5l12 7-12 7z" fill="currentColor"/>'),
  crown: ui('<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" fill="currentColor" stroke="none"/>'),
  hourglass: ui('<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9"/>'),
  cards: ui('<rect x="3" y="6" width="11" height="15" rx="1.5"/><path d="M8 3.5l10.5 1.6a1.5 1.5 0 011.2 1.7l-1.9 12.4"/>'),
  coins: ui(
    '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.6-2.4-2.9-5.5-3"/>',
  ),
  hammer: ui('<path d="M14 6l4 4M4 20l9-9M12 4.5l3-1.5 6 6-1.5 3z"/>'),
  sparkles: ui(
    '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  ),
  dagger: ui('<path d="M19 5l-9 9-2-2 9-9h2zM8 12l-3 3M6 14l4 4M9 15l-5 5"/>'),
  sword: ui('<path d="M20 4l-1 4-9 9-3-3 9-9zM7 14l-3 3 3 3 3-3M5 19l-1 1"/>'),
  bag: ui('<path d="M9 4h6l-1.5 3h-3z"/><path d="M8 8c-4 3-5 12 4 12s8-9 4-12z"/><path d="M12 11v6M10.5 12.5h2.5a1.2 1.2 0 010 2.4h-2"/>'),
  swap: ui('<path d="M4 8h13l-3-3M20 16H7l3 3"/>'),
  refresh: ui('<path d="M20 11a8 8 0 00-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0014.5 4.5L20 16M20 20v-4h-4"/>'),
  flask: ui('<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 006 21h12a1.7 1.7 0 001.5-2.5L14 9V3"/><path d="M7 15h10"/>'),
  anvil: ui('<path d="M3 7h13c0 3 3 3 5 3v2c-3 0-6 1-6 3H9c0-2-3-3-6-5z"/><path d="M8 15l-2 5h12l-2-5"/>'),
  skull: ui(
    '<path d="M12 3a8 8 0 00-8 8c0 3 1.5 4.5 3 5.5V20h10v-3.5c1.5-1 3-2.5 3-5.5a8 8 0 00-8-8z"/><circle cx="9" cy="11.5" r="1.8" fill="currentColor"/><circle cx="15" cy="11.5" r="1.8" fill="currentColor"/><path d="M10 20v-2M14 20v-2"/>',
  ),
  eye: ui('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  info: ui('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>'),
  flag: ui('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
  wifi: ui('<path d="M2 9a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/>'),
  fullscreen: ui('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  trophy: ui('<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H4c0 3 2 5 4 5M16 6h4c0 3-2 5-4 5M12 13v4M8 21h8M9 17h6v4H9z"/>'),
};

// ------------------------------------------------------------------ illustrated emblems

export function coinSVG(value = null) {
  const label =
    value == null
      ? ''
      : `<text x="16" y="21.5" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="${String(value).length > 1 ? 12 : 15}" fill="#5a3a08">${value}</text>`;
  return svg(
    '0 0 32 32',
    circle(16, 16, 15, '#7a5212') +
      circle(16, 16, 14, 'url(#coin-face)') +
      circle(16, 16, 11, 'none', 'stroke="#a8761c" stroke-width="1" stroke-dasharray="1.5 1.5"') +
      (value == null ? path('M9 19l1.6-7 3.2 3.4L16 10l2.2 5.4 3.2-3.4 1.6 7z', '#a8761c') : label) +
      path('M7 10 A11 11 0 0 1 16 5', 'none', 'stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.6"'),
    'class="coin" aria-hidden="true"',
  );
}

export function crownSVG() {
  return svg(
    '0 0 48 36',
    path('M4 30 L6 8 L15 19 L24 4 L33 19 L42 8 L44 30 Z', 'url(#gold)', 'stroke="#7a5212" stroke-width="1.4" stroke-linejoin="round"') +
      rect(3, 27, 42, 7, 'url(#gold-h)', 'rx="2" stroke="#7a5212" stroke-width="1.2"') +
      circle(6, 7, 3, 'url(#gold)') +
      circle(24, 4, 3.2, 'url(#gold)') +
      circle(42, 7, 3, 'url(#gold)') +
      ellipse(24, 30.5, 3.4, 2.4, '#c0162b') +
      ellipse(13, 30.5, 2.2, 1.8, '#1f5fc8') +
      ellipse(35, 30.5, 2.2, 1.8, '#1f9a4a'),
    'class="crown-emblem" aria-hidden="true"',
  );
}

export function cardBackSVG() {
  let lattice = '';
  for (let i = -140; i < 260; i += 14) {
    lattice += line(i, 0, i + 140, 140 * 1.4, '#e2b13c', 0.5, 'opacity="0.16"');
    lattice += line(i + 140, 0, i, 140 * 1.4, '#e2b13c', 0.5, 'opacity="0.16"');
  }
  return svg(
    '0 0 140 196',
    rect(0, 0, 140, 196, 'url(#cardback)') +
      lattice +
      rect(0, 0, 140, 196, 'url(#cardback-glow)') +
      rect(7, 7, 126, 182, 'none', 'rx="6" stroke="url(#gold)" stroke-width="2"') +
      rect(12, 12, 116, 172, 'none', 'rx="4" stroke="#e2b13c" stroke-width="0.6" opacity="0.7"') +
      [
        [12, 12],
        [128, 12],
        [12, 184],
        [128, 184],
      ]
        .map(([x, y]) => star(x, y, 6, 'url(#gold)', 4, 0.35))
        .join('') +
      circle(70, 98, 34, '#101731', 'stroke="url(#gold)" stroke-width="2.4"') +
      circle(70, 98, 28, 'none', 'stroke="#e2b13c" stroke-width="0.6" opacity="0.6"') +
      // Citadel emblem
      g(
        rect(-14, -6, 28, 22, 'url(#gold)') +
          rect(-22, -2, 8, 18, 'url(#gold)') +
          rect(14, -2, 8, 18, 'url(#gold)') +
          poly('-23,-2 -18,-12 -13,-2', 'url(#gold)') +
          poly('13,-2 18,-12 23,-2', 'url(#gold)') +
          poly('-15,-6 0,-22 15,-6', 'url(#gold)') +
          path('M-4 16 V8 Q0 3 4 8 V16Z', '#101731') +
          rect(-1, -16, 2, 5, '#101731') +
          rect(-19, 4, 2, 4, '#101731') +
          rect(17, 4, 2, 4, '#101731'),
        'transform="translate(70 100)"',
      ),
    'class="cardback-svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true"',
  );
}

// Suit glyphs drawn inside the suit gem on cards.
export const SUIT_GLYPHS = {
  noble: path('M5 15l1-7 3 3 3-5 3 5 3-3 1 7z', '#fff'),
  religious: path('M10.6 4h2.8v4.6H18v2.8h-4.6V20h-2.8v-8.6H6V8.6h4.6z', '#fff'),
  trade: path(
    'M12 4v14M7 7h10M4 13l3-6 3 6a3 3 0 01-6 0zM14 13l3-6 3 6a3 3 0 01-6 0zM8 19h8',
    'none',
    'stroke="#fff" stroke-width="1.6" stroke-linejoin="round"',
  ),
  military: path(
    'M5 5l9 9M19 5l-9 9M6 16l3 3M18 16l-3 3M4 20l3-3M20 20l-3-3',
    'none',
    'stroke="#fff" stroke-width="2" stroke-linecap="round"',
  ),
  unique: star(12, 12.5, 7.5, '#fff', 5, 0.45),
};

export function suitGemSVG(suit, color, dark) {
  return svg(
    '0 0 24 24',
    circle(12, 12, 11.5, dark) +
      circle(12, 12, 10, color) +
      path('M5 9 A8 8 0 0 1 12 4', 'none', 'stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.45"') +
      g(SUIT_GLYPHS[suit] ?? '', 'opacity="0.95" transform="translate(2.4 2.4) scale(0.8)"'),
    'class="suit-gem" aria-hidden="true"',
  );
}

// ------------------------------------------------------------------ heraldry

export const SEAT_COLORS = [
  { name: 'Crimson', main: '#b3262e', light: '#e2584f', dark: '#5c0f13' },
  { name: 'Azure', main: '#2a5fb8', light: '#5b8fe6', dark: '#112c5c' },
  { name: 'Emerald', main: '#23804a', light: '#4fbf7a', dark: '#0c3d20' },
  { name: 'Amber', main: '#cc8a14', light: '#f2bc4a', dark: '#5e3c04' },
  { name: 'Violet', main: '#6f3fb0', light: '#a37de0', dark: '#2f1557' },
  { name: 'Teal', main: '#17837f', light: '#4cc2bd', dark: '#06403d' },
  { name: 'Rose', main: '#b8417a', light: '#e57aab', dark: '#5a1638' },
];

const CHARGES = [
  // Tower
  rect(-6, -4, 12, 14, '#f7ecd0') +
    rect(-8, -8, 4, 5, '#f7ecd0') +
    rect(-2, -8, 4, 5, '#f7ecd0') +
    rect(4, -8, 4, 5, '#f7ecd0') +
    path('M-2 10 V5 Q0 3 2 5 V10Z', '#2a1d14'),
  // Star
  star(0, 0, 10, '#f7ecd0', 6, 0.5),
  // Fleur
  path(
    'M0 -11 C4 -6 4 -2 0 2 C-4 -2 -4 -6 0 -11Z M-1 2 C-6 -4 -12 0 -8 5 C-6 2 -3 2 -1 4Z M1 2 C6 -4 12 0 8 5 C6 2 3 2 1 4Z M-6 5 H6 V7 H-6Z M-1 7 H1 L2 11 H-2Z',
    '#f7ecd0',
  ),
  // Crescent
  path('M4 -10 A11 11 0 1 0 4 10 A8.5 8.5 0 1 1 4 -10Z', '#f7ecd0'),
  // Key
  circle(0, -6, 5, 'none', 'stroke="#f7ecd0" stroke-width="2.6"') +
    rect(-1.3, -1, 2.6, 13, '#f7ecd0') +
    rect(1, 6, 5, 2.4, '#f7ecd0') +
    rect(1, 9.6, 3.5, 2.2, '#f7ecd0'),
  // Chevron with roundel
  path('M-11 6 L0 -4 L11 6 L11 10 L0 0 L-11 10Z', '#f7ecd0') + circle(0, -9, 3, '#f7ecd0'),
  // Lion-ish rampant beast reduced to a paw
  path('M-7 8 C-9 2 -6 -4 0 -6 C6 -4 9 2 7 8Z', '#f7ecd0') +
    circle(-6, -9, 2.6, '#f7ecd0') +
    circle(-2, -11, 2.6, '#f7ecd0') +
    circle(2, -11, 2.6, '#f7ecd0') +
    circle(6, -9, 2.6, '#f7ecd0'),
];

export function crestSVG(seat) {
  const c = SEAT_COLORS[seat % SEAT_COLORS.length];
  const charge = CHARGES[seat % CHARGES.length];
  return svg(
    '0 0 40 46',
    path('M3 3 H37 V20 C37 33 28 40 20 44 C12 40 3 33 3 20Z', '#7a5212') +
      path('M5 5 H35 V20 C35 31.5 27 38 20 41.8 C13 38 5 31.5 5 20Z', c.main) +
      path('M5 5 H20 V41.8 C13 38 5 31.5 5 20Z', '#000', 'opacity="0.12"') +
      g(charge, 'transform="translate(20 21) scale(0.95)"') +
      path('M7 7 H33', 'none', 'stroke="#fff" stroke-width="1" opacity="0.3"'),
    'class="crest" aria-hidden="true"',
  );
}

export function seatColor(seat) {
  return SEAT_COLORS[seat % SEAT_COLORS.length];
}

// ------------------------------------------------------------------ dev preview

export function preview(root) {
  const box = (html, w = 64, h = 64) =>
    `<div style="width:${w}px;height:${h}px;display:inline-block;margin:6px;background:#1a1f33;padding:4px;border-radius:6px;color:#f2c94c">${html}</div>`;
  root.insertAdjacentHTML(
    'beforeend',
    `<div>${Object.values(ICONS)
      .map((i) => box(i, 32, 32))
      .join('')}</div>`,
  );
  root.insertAdjacentHTML(
    'beforeend',
    `<div>${box(coinSVG(3))}${box(coinSVG())}${box(crownSVG(), 80, 60)}${box(cardBackSVG(), 140, 196)}</div>`,
  );
  root.insertAdjacentHTML('beforeend', `<div>${SEAT_COLORS.map((_, i) => box(crestSVG(i), 40, 46)).join('')}</div>`);
}
