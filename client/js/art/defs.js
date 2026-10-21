// Global SVG definitions (gradients, patterns, filters) shared by every
// illustration. They are injected once into the document so that the many
// inline SVGs on screen can reference them by id.

const lin = (id, stops, attrs = 'x1="0" y1="0" x2="0" y2="1"') =>
  `<linearGradient id="${id}" ${attrs}>${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join('')}</linearGradient>`;

const rad = (id, stops, attrs = 'cx="0.5" cy="0.5" r="0.5"') =>
  `<radialGradient id="${id}" ${attrs}>${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join('')}</radialGradient>`;

export const SKIES = {
  noble: ['#f6c86b', '#e58a4b', '#7c3b52'],
  religious: ['#9cc7ee', '#5d8ccc', '#2c4a86'],
  trade: ['#bfe3c8', '#7fb7a0', '#3d6f73'],
  military: ['#f19a6a', '#b8423a', '#3f1324'],
  unique: ['#b99be6', '#6c4ab0', '#211544'],
  night: ['#2a3466', '#141a3a', '#070914'],
};

const skyDefs = Object.entries(SKIES)
  .map(([k, [a, b, c]]) =>
    lin(`sky-${k}`, [
      [0, c],
      [0.55, b],
      [1, a],
    ]),
  )
  .join('');

const DEFS = `
  ${lin('gold', [
    [0, '#fff1b8'],
    [0.35, '#f2c94c'],
    [0.7, '#c8901f'],
    [1, '#7a5212'],
  ])}
  ${lin(
    'gold-h',
    [
      [0, '#8a5d14'],
      [0.3, '#e7b83e'],
      [0.5, '#fff0b0'],
      [0.7, '#e2ad33'],
      [1, '#7a5212'],
    ],
    'x1="0" y1="0" x2="1" y2="0"',
  )}
  ${lin('silver', [
    [0, '#ffffff'],
    [0.4, '#c9d1dc'],
    [0.75, '#8d97a6'],
    [1, '#4b5361'],
  ])}
  ${lin(
    'silver-h',
    [
      [0, '#5d6573'],
      [0.45, '#e9eef5'],
      [0.6, '#b8c0cc'],
      [1, '#4b5361'],
    ],
    'x1="0" y1="0" x2="1" y2="0"',
  )}
  ${lin('steel', [
    [0, '#d7dee8'],
    [1, '#596273'],
  ])}
  ${lin('wood', [
    [0, '#9a6a3c'],
    [1, '#5a3a1e'],
  ])}
  ${lin('wood-dark', [
    [0, '#5b3b20'],
    [1, '#2e1d0f'],
  ])}
  ${lin('stone', [
    [0, '#d9cfbd'],
    [1, '#9b8f7b'],
  ])}
  ${lin('stone-dark', [
    [0, '#9a9083'],
    [1, '#5d554b'],
  ])}
  ${lin('stone-cool', [
    [0, '#c9ccd4'],
    [1, '#7c8190'],
  ])}
  ${lin('roof-red', [
    [0, '#c4523c'],
    [1, '#7a2618'],
  ])}
  ${lin('roof-blue', [
    [0, '#5a7fb8'],
    [1, '#2a426e'],
  ])}
  ${lin('roof-slate', [
    [0, '#6c7386'],
    [1, '#353a48'],
  ])}
  ${lin('roof-green', [
    [0, '#5e9a6b'],
    [1, '#2a5534'],
  ])}
  ${lin('roof-purple', [
    [0, '#8d6ac9'],
    [1, '#43286f'],
  ])}
  ${lin('roof-gold', [
    [0, '#ffe08a'],
    [0.5, '#e0a832'],
    [1, '#8a5a14'],
  ])}
  ${lin('water', [
    [0, '#5aa0c8'],
    [1, '#1d4766'],
  ])}
  ${lin('grass', [
    [0, '#7fae5a'],
    [1, '#3f6b2c'],
  ])}
  ${lin('earth', [
    [0, '#8c6f4c'],
    [1, '#4f3c26'],
  ])}
  ${lin('cloth-red', [
    [0, '#d6453b'],
    [1, '#7c1a16'],
  ])}
  ${lin('cloth-blue', [
    [0, '#4d74c9'],
    [1, '#1d2f6b'],
  ])}
  ${lin('cloth-green', [
    [0, '#4f9a5a'],
    [1, '#1e4a27'],
  ])}
  ${lin('cloth-purple', [
    [0, '#8b5cc4'],
    [1, '#3a1d63'],
  ])}
  ${lin('cloth-dark', [
    [0, '#3a3a48'],
    [1, '#121219'],
  ])}
  ${lin('skin', [
    [0, '#f2c9a0'],
    [1, '#c98f63'],
  ])}
  ${lin('skin-dark', [
    [0, '#c48b5c'],
    [1, '#8a5a35'],
  ])}
  ${lin('parchment', [
    [0, '#f7ecd0'],
    [1, '#e2cc9a'],
  ])}
  ${rad('window-glow', [
    [0, '#fff3b0'],
    [0.5, '#ffc04d'],
    [1, '#e07b1a'],
  ])}
  ${rad('halo', [
    [0, '#fff6c8', 0.9],
    [0.6, '#ffd36b', 0.25],
    [1, '#ffd36b', 0],
  ])}
  ${rad('orb', [
    [0, '#ffffff'],
    [0.35, '#bff3ff'],
    [0.75, '#3fb4e8'],
    [1, '#1b5fa8', 0.8],
  ])}
  ${rad('fire', [
    [0, '#fff7c2'],
    [0.4, '#ffbf3d'],
    [0.8, '#e2561c'],
    [1, '#a32610', 0],
  ])}
  ${rad('ghost', [
    [0, '#d8fff0', 0.9],
    [0.6, '#7cf0c4', 0.35],
    [1, '#7cf0c4', 0],
  ])}
  ${rad('moon', [
    [0, '#fffbe8'],
    [0.8, '#f1e6bd'],
    [1, '#d6c79a'],
  ])}
  ${rad('vignette', [
    [0.55, '#000', 0],
    [1, '#000', 0.55],
  ])}
  ${skyDefs}
  <pattern id="bricks" width="16" height="8" patternUnits="userSpaceOnUse">
    <path d="M0 0H16M0 4H16M4 0V4M12 4V8" stroke="#000" stroke-opacity="0.16" stroke-width="0.7" fill="none"/>
  </pattern>
  <pattern id="bricks-small" width="10" height="5" patternUnits="userSpaceOnUse">
    <path d="M0 0H10M0 2.5H10M2.5 0V2.5M7.5 2.5V5" stroke="#000" stroke-opacity="0.18" stroke-width="0.5" fill="none"/>
  </pattern>
  <pattern id="shingles" width="8" height="6" patternUnits="userSpaceOnUse">
    <path d="M0 6 Q2 2 4 6 Q6 2 8 6" stroke="#000" stroke-opacity="0.22" stroke-width="0.6" fill="none"/>
  </pattern>
  <pattern id="planks" width="6" height="40" patternUnits="userSpaceOnUse">
    <path d="M0 0V40" stroke="#000" stroke-opacity="0.25" stroke-width="0.7"/>
  </pattern>
  <pattern id="awning" width="12" height="10" patternUnits="userSpaceOnUse">
    <rect width="6" height="10" fill="#f4ead2"/>
  </pattern>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="2.2" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="glow-strong" x="-80%" y="-80%" width="260%" height="260%">
    <feGaussianBlur stdDeviation="5" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="1.4"/>
  </filter>
  <filter id="blur-lg" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="6"/>
  </filter>
  <filter id="paper" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0.28 0" result="t"/>
    <feComposite in="t" in2="SourceGraphic" operator="in" result="tex"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="tex"/></feMerge>
  </filter>
  <filter id="drop" x="-20%" y="-20%" width="140%" height="150%">
    <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000" flood-opacity="0.45"/>
  </filter>
`;

const extra = [];
let holder = null;

/** Art modules register their own gradients here (before or after injection). */
export function registerDefs(markup) {
  extra.push(markup);
  if (holder) holder.querySelector('defs').insertAdjacentHTML('beforeend', markup);
}

export { lin, rad };

export function injectDefs(root = document.body) {
  if (holder) return;
  holder = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  holder.setAttribute('aria-hidden', 'true');
  holder.setAttribute('width', '0');
  holder.setAttribute('height', '0');
  // Not display:none — gradients inside hidden SVGs stop rendering in Chrome.
  holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  holder.innerHTML = `<defs>${DEFS}${extra.join('')}</defs>`;
  root.prepend(holder);
}
