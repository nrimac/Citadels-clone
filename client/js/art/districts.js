// Hand-drawn district illustrations (SVG, 200×130). Each scene is composed
// from a small kit of architectural parts over a suit-themed sky.

import { registerDefs, lin, rad } from './defs.js';
import { circle, ellipse, g, line, path, poly, rect, seeded, sparkle, star, starfield, svg } from './svg.js';

registerDefs(`
  ${lin('plaster', [
    [0, '#f6ecd4'],
    [1, '#d8c79f'],
  ])}
  ${lin('marble', [
    [0, '#ffffff'],
    [1, '#d5d2cc'],
  ])}
  ${lin('sea', [
    [0, '#4f8fb8'],
    [1, '#173a57'],
  ])}
  ${lin('fog', [
    [0, '#d9f2ff', 0],
    [1, '#d9f2ff', 0.55],
  ])}
  ${lin('ghost-fog', [
    [0, '#9fffd9', 0],
    [1, '#9fffd9', 0.35],
  ])}
  ${lin('dragon', [
    [0, '#d63a2a'],
    [1, '#6e1209'],
  ])}
  ${lin('potion-green', [
    [0, '#9dff8a'],
    [1, '#2a9a3a'],
  ])}
  ${lin('potion-purple', [
    [0, '#e3a6ff'],
    [1, '#7a2ab0'],
  ])}
  ${rad('forge', [
    [0, '#fff3b0'],
    [0.35, '#ffb13d'],
    [0.75, '#d9431a'],
    [1, '#5a1206'],
  ])}
  ${rad('lamp', [
    [0, '#fff6c8', 0.95],
    [0.4, '#ffcf5a', 0.5],
    [1, '#ffcf5a', 0],
  ])}
`);

// ------------------------------------------------------------------ kit

const sky = (suit) => rect(0, 0, 200, 130, `url(#sky-${suit})`);
const ground = (fill = 'url(#grass)', y = 112) => rect(0, y, 200, 130 - y, fill);
const cobbles = (y = 112) => rect(0, y, 200, 130 - y, 'url(#stone-dark)') + rect(0, y, 200, 130 - y, 'url(#bricks-small)', 'opacity="0.8"');

function hills(color, y, seed = 1, amp = 10) {
  const rnd = seeded(seed);
  let d = `M0 ${y}`;
  for (let x = 0; x <= 200; x += 40) d += ` Q${x + 20} ${y - amp * (0.4 + rnd())} ${x + 40} ${y}`;
  return path(`${d} L200 130 L0 130Z`, color);
}

function clouds(seed, color = '#fff', opacity = 0.35) {
  const rnd = seeded(seed);
  let out = '';
  for (let i = 0; i < 3; i++) {
    const x = 20 + rnd() * 160;
    const y = 12 + rnd() * 28;
    const w = 18 + rnd() * 20;
    out +=
      ellipse(x, y, w, 4 + rnd() * 3, color, `opacity="${opacity}"`) +
      ellipse(x + w * 0.3, y - 3, w * 0.5, 4, color, `opacity="${opacity}"`);
  }
  return out;
}

const outline = 'stroke="#2a1d14" stroke-width="0.8" stroke-opacity="0.55"';

function wall(x, y, w, h, fill = 'url(#stone)', pattern = 'bricks') {
  return rect(x, y, w, h, fill, outline) + (pattern ? rect(x, y, w, h, `url(#${pattern})`) : '');
}

function gable(x, y, w, h, fill = 'url(#roof-red)', overhang = 4) {
  const pts = `${x - overhang},${y} ${x + w / 2},${y - h} ${x + w + overhang},${y}`;
  return poly(pts, fill, outline) + poly(pts, 'url(#shingles)');
}

function cone(cx, y, w, h, fill = 'url(#roof-blue)') {
  const pts = `${cx - w / 2 - 2},${y} ${cx},${y - h} ${cx + w / 2 + 2},${y}`;
  return poly(pts, fill, outline) + poly(pts, 'url(#shingles)');
}

function dome(cx, y, r, fill = 'url(#roof-gold)') {
  return (
    path(`M${cx - r} ${y} A${r} ${r} 0 0 1 ${cx + r} ${y} Z`, fill, outline) +
    path(
      `M${cx - r * 0.5} ${y - r * 0.2} Q${cx - r * 0.35} ${y - r * 0.8} ${cx} ${y - r * 0.95}`,
      'none',
      'stroke="#fff" stroke-opacity="0.45" stroke-width="1.2"',
    )
  );
}

function win(x, y, w, h, lit = true) {
  const r = w / 2;
  const d = `M${x} ${y + h} V${y + r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h} Z`;
  return (
    path(d, lit ? 'url(#window-glow)' : '#1f1a24', 'stroke="#2a1d14" stroke-width="0.8"') +
    (w > 5 ? line(x + r, y + 1, x + r, y + h, '#2a1d14', 0.6, 'opacity="0.6"') : '')
  );
}

function pointedWin(x, y, w, h, fill = 'url(#window-glow)') {
  return path(
    `M${x} ${y + h} V${y + w * 0.7} Q${x} ${y} ${x + w / 2} ${y - 2} Q${x + w} ${y} ${x + w} ${y + w * 0.7} V${y + h}Z`,
    fill,
    'stroke="#2a1d14" stroke-width="0.8"',
  );
}

function door(x, y, w, h, fill = 'url(#wood-dark)') {
  const r = w / 2;
  return (
    path(`M${x} ${y + h} V${y + r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h} Z`, fill, 'stroke="#1a110a" stroke-width="0.8"') +
    path(`M${x} ${y + h} V${y + r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h} Z`, 'url(#planks)', 'opacity="0.6"') +
    circle(x + w * 0.72, y + h * 0.6, 0.9, '#e2b13c')
  );
}

function crenels(x, y, w, n, h = 5, fill = 'url(#stone)') {
  const step = w / (n * 2 - 1);
  let out = '';
  for (let i = 0; i < n; i++) out += rect(x + i * step * 2, y - h, step, h, fill, outline);
  return out;
}

function flag(x, y, color = '#c2423a', h = 14) {
  return line(x, y, x, y - h, '#3a2a1a', 1.2) + path(`M${x} ${y - h} L${x + 11} ${y - h + 3} L${x} ${y - h + 7}Z`, color);
}

function cross(x, y, s = 6, fill = 'url(#gold)') {
  return rect(x - s * 0.12, y - s, s * 0.24, s * 1.6, fill) + rect(x - s * 0.45, y - s * 0.6, s * 0.9, s * 0.24, fill);
}

function tree(x, y, s = 1, color = '#3f6b2c') {
  return (
    rect(x - 1.2 * s, y - 6 * s, 2.4 * s, 7 * s, '#5a3a1e') +
    circle(x, y - 10 * s, 6 * s, color) +
    circle(x - 4 * s, y - 7 * s, 4.5 * s, color) +
    circle(x + 4 * s, y - 7 * s, 4.5 * s, color) +
    circle(x - 1.5 * s, y - 12 * s, 2.5 * s, '#fff', 'opacity="0.12"')
  );
}

function cypress(x, y, s = 1, color = '#2f5a2a') {
  return path(
    `M${x} ${y - 22 * s} Q${x + 5 * s} ${y - 10 * s} ${x + 3 * s} ${y} L${x - 3 * s} ${y} Q${x - 5 * s} ${y - 10 * s} ${x} ${y - 22 * s}Z`,
    color,
  );
}

function smoke(x, y, color = '#ddd') {
  return (
    circle(x, y, 3, color, 'opacity="0.45"') +
    circle(x + 3, y - 6, 4, color, 'opacity="0.35"') +
    circle(x + 7, y - 13, 5, color, 'opacity="0.25"')
  );
}

function column(x, y, w, h, fill = 'url(#marble)') {
  return (
    rect(x, y, w, h, fill, outline) +
    rect(x - 1, y - 2, w + 2, 3, fill, outline) +
    rect(x - 1, y + h - 1, w + 2, 3, fill, outline) +
    line(x + w / 2, y + 2, x + w / 2, y + h - 2, '#000', 0.4, 'opacity="0.2"')
  );
}

function tower(x, y, w, h, { roof = 'cone', roofFill, wallFill = 'url(#stone)', windows = true, roofH } = {}) {
  let out = wall(x, y, w, h, wallFill);
  if (roof === 'cone') out += cone(x + w / 2, y, w, roofH ?? w * 1.2, roofFill);
  if (roof === 'crenel') out += crenels(x - 1, y, w + 2, Math.max(2, Math.round(w / 7)), 4, wallFill);
  if (roof === 'dome') out += dome(x + w / 2, y, w / 2, roofFill);
  if (windows) out += win(x + w / 2 - 2.5, y + h * 0.25, 5, 8);
  return out;
}

const glowAt = (x, y, r = 14) => circle(x, y, r, 'url(#lamp)');

// ------------------------------------------------------------------ scenes

export const DISTRICT_ART = {
  // ---------- noble
  manor: () =>
    sky('noble') +
    clouds(3) +
    hills('#8a6a4a', 100, 2, 8) +
    ground('url(#grass)', 108) +
    tree(28, 110, 1.3) +
    tree(176, 110, 1.2) +
    rect(64, 22, 8, 22, 'url(#stone-dark)', outline) +
    rect(128, 22, 8, 22, 'url(#stone-dark)', outline) +
    smoke(132, 18) +
    wall(52, 60, 96, 50, 'url(#plaster)', null) +
    path('M52 84 H148', 'none', 'stroke="#8a6a4a" stroke-width="1.4"') +
    gable(48, 60, 104, 32, 'url(#roof-slate)', 2) +
    [60, 80, 112, 132].map((x) => win(x, 66, 8, 12)).join('') +
    [60, 132].map((x) => win(x, 90, 8, 12)).join('') +
    win(80, 90, 8, 12) +
    win(112, 90, 8, 12) +
    door(94, 88, 12, 22) +
    rect(40, 104, 14, 6, '#2f5a2a', 'rx="3"') +
    rect(146, 104, 14, 6, '#2f5a2a', 'rx="3"') +
    path('M94 110 L86 130 L114 130 L106 110Z', '#c9b48a', 'opacity="0.8"'),

  castle: () =>
    sky('noble') +
    clouds(5) +
    hills('#7d6146', 104, 4, 12) +
    ground('url(#grass)', 112) +
    wall(30, 82, 140, 30) +
    crenels(30, 82, 140, 10) +
    tower(68, 34, 64, 78, { roof: 'crenel', windows: false }) +
    win(84, 50, 7, 11) +
    win(109, 50, 7, 11) +
    tower(36, 46, 24, 66, { roofFill: 'url(#roof-blue)', roofH: 28 }) +
    tower(140, 46, 24, 66, { roofFill: 'url(#roof-blue)', roofH: 28 }) +
    flag(48, 18, '#e2b13c') +
    flag(152, 18, '#e2b13c') +
    flag(100, 30, '#c2423a', 18) +
    door(88, 82, 24, 30) +
    path('M88 112 h24', 'none', 'stroke="#000" stroke-opacity="0.3"'),

  palace: () =>
    sky('noble') +
    clouds(8, '#fff3d6') +
    ground('url(#marble)', 112) +
    rect(0, 112, 200, 18, 'url(#bricks-small)', 'opacity="0.4"') +
    tower(18, 50, 16, 62, { roof: 'dome', roofFill: 'url(#roof-gold)', wallFill: 'url(#marble)' }) +
    tower(166, 50, 16, 62, { roof: 'dome', roofFill: 'url(#roof-gold)', wallFill: 'url(#marble)' }) +
    rect(24, 34, 4, 8, 'url(#gold)') +
    rect(172, 34, 4, 8, 'url(#gold)') +
    wall(36, 66, 128, 46, 'url(#marble)', null) +
    rect(36, 62, 128, 5, 'url(#gold-h)') +
    rect(80, 46, 40, 20, 'url(#marble)', outline) +
    dome(100, 46, 22) +
    rect(98, 16, 4, 10, 'url(#gold)') +
    circle(100, 15, 3, 'url(#gold)') +
    [44, 60, 76, 116, 132, 148].map((x) => win(x, 72, 8, 14)).join('') +
    [86, 94, 102, 110].map((x) => column(x - 2, 72, 4, 38)).join('') +
    door(93, 92, 14, 20, 'url(#roof-red)') +
    rect(80, 110, 40, 2, '#cfc8bb') +
    rect(76, 112, 48, 3, '#bfb8aa'),

  // ---------- religious
  temple: () =>
    sky('religious') +
    clouds(11) +
    hills('#7a9a6e', 104, 6, 10) +
    ground('url(#grass)', 110) +
    cypress(30, 112, 1.3) +
    cypress(170, 112, 1.2) +
    cypress(182, 112, 0.9) +
    rect(52, 100, 96, 5, 'url(#marble)', outline) +
    rect(46, 105, 108, 5, 'url(#marble)', outline) +
    rect(58, 50, 84, 6, 'url(#marble)', outline) +
    [62, 80, 98, 116, 132].map((x) => column(x, 58, 6, 42)).join('') +
    poly('54,50 100,24 146,50', 'url(#marble)', outline) +
    poly('64,47 100,30 136,47', '#cfc8bb') +
    circle(100, 40, 4, 'url(#gold)') +
    rect(86, 64, 28, 36, '#3a3a4a', 'opacity="0.55"') +
    glowAt(100, 84, 10),

  church: () =>
    sky('religious') +
    clouds(13) +
    ground('url(#grass)', 110) +
    tree(176, 112, 1.1) +
    wall(76, 64, 76, 46, 'url(#stone-cool)') +
    gable(76, 64, 76, 26, 'url(#roof-slate)', 2) +
    [92, 112, 132].map((x) => pointedWin(x, 74, 7, 16)).join('') +
    tower(38, 46, 30, 64, { roof: 'cone', roofFill: 'url(#roof-slate)', wallFill: 'url(#stone-cool)', windows: false, roofH: 30 }) +
    cross(53, 12, 6) +
    circle(53, 54, 6, 'url(#window-glow)', 'stroke="#2a1d14" stroke-width="1"') +
    path('M47 54 h12 M53 48 v12', 'none', 'stroke="#2a1d14" stroke-width="0.8"') +
    door(46, 90, 14, 20),

  monastery: () =>
    sky('religious') +
    clouds(17) +
    hills('#6d8d63', 100, 9, 12) +
    ground('url(#grass)', 110) +
    wall(20, 70, 160, 40, 'url(#plaster)', null) +
    path('M14 70 L186 70 L180 58 L20 58Z', 'url(#roof-red)', outline) +
    path('M14 70 L186 70 L180 58 L20 58Z', 'url(#shingles)') +
    [28, 48, 68, 88, 108, 128, 148, 168]
      .map((x) => path(`M${x} 110 V88 A6 6 0 0 1 ${x + 12} 88 V110Z`, '#4a3a2e', 'opacity="0.85"'))
      .join('') +
    [28, 48, 68, 88, 108, 128, 148, 168].map((x) => win(x + 3, 74, 6, 8)).join('') +
    tower(88, 26, 24, 32, { roof: 'cone', roofFill: 'url(#roof-red)', wallFill: 'url(#plaster)', windows: false, roofH: 20 }) +
    path('M96 34 h8 v10 h-8z', '#2a1d14') +
    circle(100, 40, 3, 'url(#gold)') +
    cross(100, 4, 4) +
    tree(10, 116, 0.9) +
    tree(192, 116, 0.9),

  cathedral: () =>
    sky('religious') +
    clouds(19) +
    cobbles(114) +
    wall(56, 46, 88, 68, 'url(#stone-cool)') +
    poly('56,46 100,18 144,46', 'url(#stone-cool)', outline) +
    tower(34, 40, 26, 74, { roof: 'cone', roofFill: 'url(#roof-slate)', wallFill: 'url(#stone-cool)', windows: false, roofH: 28 }) +
    tower(140, 40, 26, 74, { roof: 'cone', roofFill: 'url(#roof-slate)', wallFill: 'url(#stone-cool)', windows: false, roofH: 28 }) +
    cross(47, 9, 5) +
    cross(153, 9, 5) +
    cross(100, 12, 5) +
    pointedWin(40, 50, 14, 26) +
    pointedWin(146, 50, 14, 26) +
    circle(100, 56, 14, 'url(#window-glow)', 'stroke="#2a1d14" stroke-width="1.4"') +
    [0, 30, 60, 90, 120, 150]
      .map((a) => line(100, 56, 100 + 14 * Math.cos((a * Math.PI) / 180), 56 + 14 * Math.sin((a * Math.PI) / 180), '#2a1d14', 1))
      .join('') +
    [0, 30, 60, 90, 120, 150]
      .map((a) => line(100, 56, 100 - 14 * Math.cos((a * Math.PI) / 180), 56 - 14 * Math.sin((a * Math.PI) / 180), '#2a1d14', 1))
      .join('') +
    circle(100, 56, 4, '#b8343a') +
    path('M84 114 V92 Q84 76 100 74 Q116 76 116 92 V114Z', 'url(#wood-dark)', outline) +
    path('M100 76 V114', 'none', 'stroke="#000" stroke-opacity="0.4"') +
    pointedWin(64, 82, 10, 22) +
    pointedWin(126, 82, 10, 22),

  // ---------- trade
  tavern: () =>
    sky('trade') +
    clouds(23) +
    cobbles(112) +
    wall(46, 60, 100, 52, 'url(#plaster)', null) +
    rect(42, 56, 108, 5, 'url(#wood-dark)') +
    path(
      'M46 60 V112 M70 60 V112 M98 60 V112 M122 60 V112 M146 60 V112 M46 86 H146 M46 60 L70 86 M98 60 L122 86 M70 60 L46 86 M122 60 L98 86',
      'none',
      'stroke="#4a2c16" stroke-width="2.4"',
    ) +
    gable(42, 56, 108, 34, 'url(#roof-red)', 4) +
    rect(124, 18, 10, 20, 'url(#stone-dark)', outline) +
    smoke(129, 14) +
    win(54, 92, 10, 12) +
    win(130, 92, 10, 12) +
    win(78, 66, 10, 12) +
    win(106, 66, 10, 12) +
    door(88, 90, 16, 22) +
    // Hanging sign with a tankard
    path('M150 66 H172 M168 66 V70', 'none', 'stroke="#2a1d14" stroke-width="2"') +
    rect(156, 70, 22, 18, 'url(#wood)', 'rx="2" stroke="#2a1d14" stroke-width="1"') +
    rect(162, 74, 9, 10, 'url(#gold)', 'rx="1"') +
    path('M171 76 q4 0 4 3 q0 3 -4 3', 'none', 'stroke="#c8901f" stroke-width="1.5"') +
    rect(161, 73, 11, 3, '#fff', 'rx="1.5"') +
    glowAt(46, 92, 12) +
    circle(46, 92, 2.5, '#fff3b0') +
    ellipse(30, 108, 8, 4, 'url(#wood)') +
    rect(22, 96, 16, 12, 'url(#wood)', 'rx="3"') +
    path('M22 100 h16 M22 104 h16', 'none', 'stroke="#2a1d14" stroke-width="0.8"'),

  market: () => {
    const stall = (x, color) =>
      rect(x + 2, 76, 2, 36, '#5a3a1e') +
      rect(x + 40, 76, 2, 36, '#5a3a1e') +
      rect(x, 94, 44, 10, 'url(#wood)', outline) +
      path(`M${x - 4} 76 L${x + 48} 76 L${x + 44} 62 L${x} 62Z`, color, outline) +
      path(`M${x - 4} 76 L${x + 48} 76 L${x + 44} 62 L${x} 62Z`, 'url(#awning)', 'opacity="0.85"') +
      path(
        `M${x - 4} 76 Q${x + 2} 82 ${x + 9} 76 Q${x + 15} 82 ${x + 22} 76 Q${x + 28} 82 ${x + 35} 76 Q${x + 41} 82 ${x + 48} 76`,
        color,
        outline,
      );
    return (
      sky('trade') +
      clouds(29) +
      hills('#5f8a6a', 92, 12, 10) +
      cobbles(110) +
      wall(10, 40, 50, 52, 'url(#plaster)', null) +
      gable(10, 40, 50, 18, 'url(#roof-red)', 2) +
      win(20, 52, 8, 10) +
      win(40, 52, 8, 10) +
      wall(140, 44, 50, 48, 'url(#plaster)', null) +
      gable(140, 44, 50, 16, 'url(#roof-slate)', 2) +
      win(150, 56, 8, 10) +
      win(170, 56, 8, 10) +
      stall(10, '#b8343a') +
      stall(78, '#2f5fae') +
      stall(146, '#2f7d5a') +
      [16, 24, 32, 40].map((x, i) => circle(x, 92, 3.2, ['#e05a3a', '#f2c94c', '#7fbf4a', '#e05a3a'][i])).join('') +
      [84, 92, 100, 108, 116].map((x, i) => ellipse(x, 92, 3.5, 2.5, ['#d9c08a', '#c9a066', '#d9c08a', '#e8d6a8', '#c9a066'][i])).join('') +
      [152, 160, 168, 176].map((x, i) => rect(x, 88, 6, 6, ['#8d5cc4', '#4a7fc8', '#c2423a', '#e2b13c'][i])).join('') +
      rect(62, 104, 12, 10, 'url(#wood)', outline) +
      rect(128, 102, 12, 12, 'url(#wood)', outline)
    );
  },

  'trading-post': () =>
    sky('trade') +
    clouds(31) +
    hills('#6d8a5a', 98, 14, 8) +
    ground('url(#earth)', 110) +
    wall(40, 54, 104, 56, 'url(#wood)', 'planks') +
    gable(40, 54, 104, 26, 'url(#roof-slate)', 3) +
    path('M76 110 V74 H108 V110Z', 'url(#wood-dark)', outline) +
    path('M76 74 L108 110 M108 74 L76 110 M92 74 V110', 'none', 'stroke="#2a1708" stroke-width="1.6"') +
    win(52, 68, 10, 12) +
    win(122, 68, 10, 12) +
    // Scales sign
    rect(86, 40, 12, 10, 'url(#wood)', outline) +
    line(92, 42, 92, 48, '#c8901f', 1) +
    line(88, 43, 96, 43, '#c8901f', 1) +
    path('M86 46 q2 2 4 0 M94 46 q2 2 4 0', 'none', 'stroke="#c8901f" stroke-width="1"') +
    // Crates and a cart
    rect(150, 94, 16, 16, 'url(#wood)', outline) +
    path('M150 94 l16 16 M166 94 l-16 16', 'none', 'stroke="#2a1708" stroke-width="0.8"') +
    rect(166, 98, 12, 12, 'url(#wood)', outline) +
    rect(156, 82, 12, 12, 'url(#wood)', outline) +
    rect(10, 92, 26, 10, 'url(#wood)', outline) +
    line(36, 96, 46, 92, '#5a3a1e', 2) +
    circle(16, 106, 6, 'none', 'stroke="#3a2412" stroke-width="2"') +
    circle(30, 106, 6, 'none', 'stroke="#3a2412" stroke-width="2"') +
    path('M16 100 v12 M10 106 h12 M30 100 v12 M24 106 h12', 'none', 'stroke="#3a2412" stroke-width="1"') +
    ellipse(22, 90, 9, 4, '#e8d6a8'),

  docks: () =>
    sky('trade') +
    clouds(37) +
    rect(0, 84, 200, 46, 'url(#sea)') +
    path(
      'M0 92 q10 -3 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0',
      'none',
      'stroke="#cfeaff" stroke-width="1" opacity="0.5"',
    ) +
    path(
      'M0 104 q10 -3 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0',
      'none',
      'stroke="#cfeaff" stroke-width="1" opacity="0.35"',
    ) +
    wall(120, 46, 60, 40, 'url(#wood)', 'planks') +
    gable(120, 46, 60, 18, 'url(#roof-red)', 2) +
    win(132, 58, 8, 10) +
    win(160, 58, 8, 10) +
    rect(0, 86, 140, 8, 'url(#wood)', outline) +
    [10, 40, 70, 100, 130].map((x) => rect(x, 94, 5, 22, 'url(#wood-dark)')).join('') +
    // Crane lifting a crate
    path('M44 86 V30 L92 30 M44 44 L60 30', 'none', 'stroke="#5a3a1e" stroke-width="4" stroke-linecap="round"') +
    line(88, 30, 88, 56, '#2a1d14', 1) +
    rect(80, 56, 16, 14, 'url(#wood)', outline) +
    path('M80 56 l16 14 M96 56 l-16 14', 'none', 'stroke="#2a1708" stroke-width="0.8"') +
    rect(20, 74, 12, 12, 'url(#wood)', outline) +
    ellipse(108, 80, 6, 7, 'url(#wood)') +
    path('M102 78 h12 M102 82 h12', 'none', 'stroke="#2a1708" stroke-width="0.8"') +
    // Rowing boat
    path('M150 110 Q160 120 186 116 L192 106 L146 106Z', 'url(#wood)', outline),

  harbor: () =>
    sky('trade') +
    clouds(41, '#fff', 0.4) +
    rect(0, 80, 200, 50, 'url(#sea)') +
    path(
      'M0 90 q10 -3 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0',
      'none',
      'stroke="#cfeaff" stroke-width="1" opacity="0.5"',
    ) +
    path(
      'M0 112 q10 -3 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0',
      'none',
      'stroke="#cfeaff" stroke-width="1" opacity="0.35"',
    ) +
    // Lighthouse on rocks
    path('M138 130 L146 98 L172 92 L190 104 L196 130Z', 'url(#stone-dark)', outline) +
    path('M154 98 L158 40 L174 40 L178 98Z', '#f4ead2', outline) +
    path('M155 84 L177 84 L176.5 74 L155.7 74Z M156.4 60 L175.6 60 L175 50 L157 50Z', '#c2423a') +
    rect(156, 30, 20, 10, 'url(#window-glow)', 'filter="url(#glow)"') +
    poly('154,30 166,20 178,30', 'url(#roof-red)', outline) +
    path('M176 35 L200 26 L200 44Z', '#fff6c8', 'opacity="0.35"') +
    path('M156 35 L110 22 L110 48Z', '#fff6c8', 'opacity="0.25"') +
    // Sailing ship
    path('M28 96 L92 96 L84 108 L36 108Z', 'url(#wood-dark)', outline) +
    rect(36, 92, 48, 4, 'url(#wood)') +
    line(60, 92, 60, 36, '#3a2412', 2) +
    line(42, 92, 42, 54, '#3a2412', 1.6) +
    path('M62 40 Q84 52 62 70Z', '#f4ead2', outline) +
    path('M62 72 Q90 80 62 90Z', '#f4ead2', outline) +
    path('M44 56 Q58 66 44 76Z', '#f4ead2', outline) +
    flag(60, 36, '#c2423a', 8),

  'town-hall': () =>
    sky('trade') +
    clouds(43) +
    cobbles(112) +
    wall(30, 62, 140, 50, 'url(#stone)') +
    rect(28, 58, 144, 5, 'url(#stone-dark)', outline) +
    gable(30, 58, 140, 14, 'url(#roof-slate)', 1) +
    tower(84, 18, 32, 44, { roof: 'cone', roofFill: 'url(#roof-green)', windows: false, roofH: 20 }) +
    circle(100, 34, 9, '#f7ecd0', 'stroke="#2a1d14" stroke-width="1.2"') +
    line(100, 34, 100, 28, '#2a1d14', 1.2) +
    line(100, 34, 104, 36, '#2a1d14', 1.2) +
    flag(100, -2, '#4f9a5a', 10) +
    [40, 56, 128, 144].map((x) => win(x, 70, 8, 14)).join('') +
    [76, 88, 108, 120].map((x) => column(x, 70, 5, 40)).join('') +
    door(92, 86, 16, 26) +
    rect(70, 110, 60, 2, '#bfb8aa'),

  // ---------- military
  watchtower: () =>
    sky('military') +
    clouds(47, '#ffd1b0', 0.3) +
    hills('#5a2a26', 96, 15, 16) +
    ground('url(#earth)', 112) +
    path('M70 112 L84 46 L116 46 L130 112Z', 'url(#stone)', outline) +
    path('M70 112 L84 46 L116 46 L130 112Z', 'url(#bricks)') +
    rect(78, 34, 44, 12, 'url(#stone)', outline) +
    crenels(78, 34, 44, 4, 5) +
    rect(96, 60, 8, 12, '#1f1a24') +
    rect(96, 84, 8, 12, '#1f1a24') +
    door(93, 98, 14, 14) +
    // Signal fire
    circle(100, 22, 14, 'url(#fire)', 'filter="url(#glow-strong)"') +
    path('M92 30 Q94 16 100 8 Q104 18 108 14 Q110 24 108 30Z', '#ffbf3d') +
    path('M96 30 Q98 22 100 16 Q103 24 104 30Z', '#fff3b0') +
    flag(122, 30, '#e2b13c', 12),

  prison: () =>
    sky('military') +
    clouds(53, '#ffd1b0', 0.25) +
    cobbles(112) +
    wall(30, 52, 140, 60, 'url(#stone-dark)') +
    crenels(30, 52, 140, 9, 5, 'url(#stone-dark)') +
    tower(150, 30, 26, 82, { roof: 'crenel', wallFill: 'url(#stone-dark)', windows: false }) +
    [44, 76, 116]
      .map(
        (x) =>
          rect(x, 64, 16, 16, '#141018') +
          path(`M${x + 4} 64 v16 M${x + 8} 64 v16 M${x + 12} 64 v16 M${x} 72 h16`, 'none', 'stroke="#8d97a6" stroke-width="1.4"'),
      )
      .join('') +
    rect(158, 46, 10, 12, '#141018') +
    path('M161 46 v12 M165 46 v12', 'none', 'stroke="#8d97a6" stroke-width="1.2"') +
    path('M88 112 V90 H112 V112Z', '#2b2f3a', outline) +
    path('M88 96 H112 M88 104 H112 M96 90 V112 M104 90 V112', 'none', 'stroke="#596273" stroke-width="1.5"') +
    circle(108, 101, 1.6, '#e2b13c') +
    path('M60 84 q4 6 0 12 q-4 6 0 12', 'none', 'stroke="#596273" stroke-width="2" stroke-dasharray="3 2"') +
    glowAt(130, 90, 10) +
    rect(128, 86, 4, 8, '#2a1d14'),

  battlefield: () => {
    const sword = (x, y, a) =>
      g(
        poly('0,-34 3,-28 3,0 -3,0 -3,-28', 'url(#silver-h)') +
          rect(-9, 0, 18, 3, 'url(#gold)', 'rx="1"') +
          rect(-1.5, 3, 3, 9, '#2a1006') +
          circle(0, 13, 2.2, 'url(#gold)'),
        `transform="translate(${x} ${y}) rotate(${a})"`,
      );
    return (
      sky('military') +
      clouds(59, '#ffb08a', 0.25) +
      circle(150, 46, 18, '#ffb347', 'opacity="0.6" filter="url(#glow-strong)"') +
      hills('#4a1f1c', 92, 17, 18) +
      hills('#3a1715', 106, 19, 10) +
      // Banners and spears
      line(40, 112, 46, 40, '#2a1006', 2) +
      path('M46 42 L72 48 L66 56 L72 64 L45 60Z', '#7c1a16', outline) +
      line(160, 114, 150, 50, '#2a1006', 2) +
      path('M150 52 L128 56 L132 64 L126 72 L149 68Z', '#2f5fae', outline) +
      line(70, 116, 84, 62, '#2a1006', 1.4) +
      poly('84,62 86,54 87,63', 'url(#silver)') +
      line(126, 116, 118, 66, '#2a1006', 1.4) +
      poly('118,66 116,58 119,66', 'url(#silver)') +
      // Crossed swords planted in the ground
      sword(92, 110, -18) +
      sword(108, 110, 18) +
      // Shields
      path('M56 104 Q56 118 66 124 Q76 118 76 104Z', 'url(#cloth-red)', outline) +
      path('M66 104 v20 M56 110 h20', 'none', 'stroke="#e2b13c" stroke-width="1.6"') +
      ellipse(140, 116, 10, 7, 'url(#steel)', outline) +
      circle(140, 116, 2.5, 'url(#gold)') +
      path('M30 34 l4 -2 l4 2 M120 26 l3 -2 l3 2 M128 30 l3 -1.5 l3 1.5', 'none', 'stroke="#1a0503" stroke-width="1.2"')
    );
  },

  fortress: () =>
    sky('military') +
    clouds(61, '#ffd1b0', 0.3) +
    hills('#5a2a26', 98, 21, 12) +
    ground('url(#earth)', 112) +
    wall(16, 60, 168, 52) +
    crenels(16, 60, 168, 12, 5) +
    tower(8, 40, 32, 72, { roof: 'crenel', windows: false }) +
    tower(84, 30, 32, 82, { roof: 'crenel', windows: false }) +
    tower(160, 40, 32, 72, { roof: 'crenel', windows: false }) +
    [22, 98, 174].map((x) => rect(x, 52, 4, 10, '#1f1a24')).join('') +
    path('M88 112 V86 Q88 74 100 74 Q112 74 112 86 V112Z', '#1a1418') +
    path(
      'M88 80 H112 M88 88 H112 M88 96 H112 M88 104 H112 M94 76 V112 M100 74 V112 M106 76 V112',
      'none',
      'stroke="#6a6f7c" stroke-width="1.4"',
    ) +
    flag(24, 26, '#c2423a', 14) +
    flag(100, 16, '#c2423a', 16) +
    flag(176, 26, '#c2423a', 14),

  // ---------- unique
  'haunted-city': () =>
    rect(0, 0, 200, 130, 'url(#sky-unique)') +
    starfield(71, 30, 200, 70) +
    circle(150, 36, 20, 'url(#moon)', 'filter="url(#glow)"') +
    circle(144, 32, 4, '#d6c79a', 'opacity="0.5"') +
    circle(156, 42, 3, '#d6c79a', 'opacity="0.5"') +
    ground('#1d1630', 108) +
    path('M20 108 L20 52 L26 46 L30 56 L36 44 L42 58 L42 108Z', '#2b2340', outline) +
    path('M58 108 L58 66 L66 60 L72 70 L80 62 L86 74 L86 108Z', '#251e38', outline) +
    path('M110 108 L110 38 L118 30 L120 40 L128 34 L132 46 L136 42 L136 108Z', '#2b2340', outline) +
    path('M150 108 L150 74 L156 70 L164 80 L170 72 L176 82 L176 108Z', '#251e38', outline) +
    [26, 64, 116, 124, 158]
      .map((x, i) => rect(x, 64 + (i % 2) * 10, 6, 9, i % 2 ? '#7cf0c4' : '#0d0a16', i % 2 ? 'opacity="0.7" filter="url(#glow)"' : ''))
      .join('') +
    // Ghosts
    g(
      ellipse(0, 0, 16, 16, 'url(#ghost)') +
        path('M-7 -2 Q-7 -12 0 -12 Q7 -12 7 -2 L7 9 L4 6 L1 9 L-2 6 L-5 9 L-7 6Z', '#e6fff6', 'opacity="0.85"') +
        circle(-2.5, -5, 1.2, '#1d1630') +
        circle(2.5, -5, 1.2, '#1d1630'),
      'transform="translate(96 66)"',
    ) +
    g(
      ellipse(0, 0, 12, 12, 'url(#ghost)') +
        path('M-5 -1 Q-5 -9 0 -9 Q5 -9 5 -1 L5 6 L2.5 4 L0 6 L-2.5 4 L-5 6Z', '#e6fff6', 'opacity="0.75"') +
        circle(-1.8, -4, 0.9, '#1d1630') +
        circle(1.8, -4, 0.9, '#1d1630'),
      'transform="translate(46 34) rotate(-12)"',
    ) +
    rect(0, 92, 200, 38, 'url(#ghost-fog)'),

  keep: () =>
    sky('unique') +
    clouds(73, '#e7d8ff', 0.3) +
    hills('#3b2a5e', 100, 23, 14) +
    ground('url(#grass)', 112) +
    wall(64, 30, 72, 82, 'url(#stone)') +
    crenels(62, 30, 76, 6, 6) +
    rect(58, 60, 8, 52, 'url(#stone-dark)', outline) +
    rect(134, 60, 8, 52, 'url(#stone-dark)', outline) +
    [44, 70].map((y) => rect(78, y, 4, 12, '#1f1a24') + rect(118, y, 4, 12, '#1f1a24')).join('') +
    win(94, 40, 12, 16) +
    door(90, 88, 20, 24) +
    path('M86 112 L80 124 L120 124 L114 112Z', 'url(#wood)', outline) +
    flag(100, 16, '#8d5cc4', 18) +
    tree(30, 114, 1.2, '#2f5a2a') +
    tree(172, 114, 1.1, '#2f5a2a'),

  laboratory: () =>
    rect(0, 0, 200, 130, 'url(#stone-dark)') +
    rect(0, 0, 200, 130, 'url(#bricks)') +
    path('M120 0 L120 54 Q150 30 180 54 L180 0Z', '#140f1e', 'opacity="0.0"') +
    // Arched window with night sky
    path('M140 70 V30 A20 20 0 0 1 180 30 V70Z', 'url(#sky-unique)', 'stroke="#2a1d14" stroke-width="2"') +
    starfield(79, 10, 36, 30, { maxR: 0.8 }).replace(
      /cx="([\d.]+)" cy="([\d.]+)"/g,
      (m, x, y) => `cx="${142 + Number(x)}" cy="${16 + Number(y)}"`,
    ) +
    line(160, 12, 160, 70, '#2a1d14', 1.4) +
    line(140, 44, 180, 44, '#2a1d14', 1.4) +
    // Shelf of jars
    rect(14, 40, 100, 4, 'url(#wood)', outline) +
    [20, 36, 52, 70, 88]
      .map((x, i) =>
        rect(
          x,
          26,
          10,
          14,
          ['#7cf0c4', '#e3a6ff', '#ffcf5a', '#9cc7ee', '#ff8a7a'][i],
          'rx="2" opacity="0.8" stroke="#2a1d14" stroke-width="0.6"',
        ),
      )
      .join('') +
    // Table with flasks
    rect(0, 96, 200, 34, 'url(#wood)', outline) +
    rect(0, 96, 200, 4, 'url(#wood-dark)') +
    circle(60, 84, 14, 'url(#potion-green)', 'stroke="#e6fff6" stroke-width="1.2" opacity="0.95"') +
    rect(56, 62, 8, 10, '#d8f5ff', 'opacity="0.6"') +
    circle(60, 84, 22, 'url(#ghost)', 'opacity="0.6"') +
    path('M92 96 L98 66 L104 66 L110 96Z', 'url(#potion-purple)', 'stroke="#f3e0ff" stroke-width="1"') +
    path('M100 66 Q104 40 130 44 L134 52', 'none', 'stroke="#d8f5ff" stroke-width="2.4" opacity="0.7"') +
    rect(128, 76, 14, 20, '#ffcf5a', 'rx="3" opacity="0.85" stroke="#2a1d14" stroke-width="0.6"') +
    [0, 1, 2, 3].map((i) => circle(56 + i * 3, 66 - i * 9, 2 + i * 0.6, '#9dff8a', 'opacity="0.5"')).join('') +
    // Candle
    rect(26, 80, 6, 16, '#f4ead2') +
    path('M29 72 Q32 76 29 80 Q26 76 29 72Z', '#ffbf3d') +
    glowAt(29, 76, 16),

  smithy: () =>
    sky('unique') +
    clouds(83, '#e7d8ff', 0.25) +
    ground('url(#earth)', 112) +
    wall(26, 46, 120, 66, 'url(#stone-dark)') +
    gable(26, 46, 120, 22, 'url(#roof-slate)', 4) +
    rect(118, 6, 14, 30, 'url(#stone-dark)', outline) +
    smoke(124, 2, '#bbb') +
    // Open forge
    path('M40 112 V74 Q40 62 56 62 H96 Q112 62 112 74 V112Z', '#1a1012', outline) +
    ellipse(76, 104, 30, 12, 'url(#forge)', 'filter="url(#glow-strong)"') +
    path('M58 108 Q62 92 70 98 Q72 84 80 94 Q86 86 90 100 Q96 96 96 108Z', '#ffbf3d') +
    // Anvil and hammer
    path(
      'M140 112 L146 98 L134 98 Q132 92 140 90 L180 90 Q178 96 168 98 L164 98 L170 112Z',
      '#2b2f3a',
      'stroke="#596273" stroke-width="1"',
    ) +
    g(rect(-2, -22, 4, 24, 'url(#wood)') + rect(-8, -26, 16, 8, 'url(#steel)', 'rx="1"'), 'transform="translate(176 84) rotate(28)"') +
    [0, 1, 2, 3, 4, 5].map((i) => sparkle(150 + i * 5 - 10, 82 - (i % 3) * 7, 2.4, '#ffd36b')).join('') +
    rect(12, 100, 14, 12, 'url(#wood)', outline),

  graveyard: () =>
    rect(0, 0, 200, 130, 'url(#sky-unique)') +
    starfield(89, 24, 200, 60) +
    circle(40, 34, 16, 'url(#moon)', 'filter="url(#glow)"') +
    hills('#21183a', 96, 25, 10) +
    ground('#1a1430', 108) +
    // Dead tree with crows
    path(
      'M160 110 L162 70 L150 54 M162 70 L176 50 M162 82 L148 74 M166 62 L172 40',
      'none',
      'stroke="#120d1f" stroke-width="4" stroke-linecap="round"',
    ) +
    path('M150 52 l3 -2 l3 2 M172 38 l3 -2 l3 2', 'none', 'stroke="#000" stroke-width="1.6"') +
    // Headstones and crosses
    path('M30 112 V92 Q30 82 40 82 Q50 82 50 92 V112Z', 'url(#stone-cool)', outline) +
    path('M36 92 h8 M40 88 v10', 'none', 'stroke="#5d554b" stroke-width="1"') +
    path('M68 112 V96 Q68 88 76 88 Q84 88 84 96 V112Z', 'url(#stone-cool)', outline) +
    rect(104, 84, 5, 28, 'url(#stone-cool)', outline) +
    rect(97, 90, 19, 5, 'url(#stone-cool)', outline) +
    path('M124 112 V98 Q124 92 132 92 Q140 92 140 98 V112Z', 'url(#stone-dark)', outline) +
    // Iron fence
    rect(0, 104, 200, 1.5, '#0b0814') +
    [4, 14, 24, 54, 64, 90, 120, 150, 180, 190].map((x) => path(`M${x} 112 V96 l1.5 -3 l1.5 3 V112`, '#0b0814')).join('') +
    rect(0, 100, 200, 30, 'url(#fog)', 'opacity="0.6"'),

  observatory: () =>
    rect(0, 0, 200, 130, 'url(#sky-night)') +
    starfield(97, 60, 200, 90, { maxR: 1.3 }) +
    star(30, 24, 4, '#fff6c8') +
    star(170, 18, 3, '#fff6c8') +
    path('M10 30 Q60 10 120 26', 'none', 'stroke="#fff" stroke-width="0.6" stroke-dasharray="2 3" opacity="0.5"') +
    hills('#1d2244', 100, 27, 12) +
    ground('#262a4a', 110) +
    wall(54, 70, 92, 40, 'url(#stone-cool)') +
    dome(100, 70, 40, 'url(#roof-blue)') +
    path('M96 32 L104 32 L106 70 L94 70Z', '#0d1028') +
    g(
      rect(-6, -40, 12, 44, 'url(#gold-h)', 'rx="3"') + rect(-8, -44, 16, 6, 'url(#gold)', 'rx="2"'),
      'transform="translate(108 46) rotate(32)"',
    ) +
    [66, 84, 116, 134].map((x) => win(x, 80, 6, 10)).join('') +
    door(94, 88, 12, 22) +
    sparkle(140, 28, 4, '#cfe3ff'),

  'school-of-magic': () =>
    sky('unique') +
    starfield(101, 30, 200, 80) +
    circle(100, 50, 60, 'url(#halo)', 'opacity="0.35"') +
    hills('#2b1d4e', 102, 29, 12) +
    ground('#2b2048', 112) +
    // Crooked tower
    path('M84 112 L86 80 Q82 64 90 48 L112 48 Q118 64 114 80 L116 112Z', 'url(#stone-cool)', outline) +
    path('M84 112 L86 80 Q82 64 90 48 L112 48 Q118 64 114 80 L116 112Z', 'url(#bricks-small)') +
    path('M86 50 Q96 30 104 6 Q106 2 112 0 Q106 10 112 28 Q116 40 116 50Z', 'url(#roof-purple)', outline) +
    star(104, 22, 3.4, '#f2c94c') +
    star(110, 38, 2.4, '#f2c94c') +
    win(94, 58, 10, 14) +
    win(96, 86, 8, 12) +
    // Orbiting runes and stars
    ellipse(100, 70, 58, 16, 'none', 'stroke="#d8c3ff" stroke-width="0.8" stroke-dasharray="3 4" opacity="0.8"') +
    circle(44, 70, 4, '#bff3ff', 'filter="url(#glow)"') +
    circle(154, 74, 3.2, '#ffcf5a', 'filter="url(#glow)"') +
    circle(126, 56, 2.6, '#e3a6ff', 'filter="url(#glow)"') +
    sparkle(58, 40, 5, '#fff') +
    sparkle(150, 32, 4, '#fff') +
    sparkle(140, 96, 3.5, '#fff') +
    sparkle(54, 96, 3, '#fff') +
    wall(46, 92, 22, 20, 'url(#stone-cool)') +
    cone(57, 92, 22, 18, 'url(#roof-purple)') +
    wall(132, 96, 20, 16, 'url(#stone-cool)') +
    cone(142, 96, 20, 14, 'url(#roof-purple)'),

  library: () => {
    const rnd = seeded(103);
    const colors = ['#8a2a22', '#2f4a8a', '#2f6a3a', '#a07020', '#5a2a6a', '#7a4a22', '#2a5a6a'];
    let books = '';
    for (const y of [12, 40, 68]) {
      let x = 8;
      while (x < 192) {
        const w = 4 + Math.floor(rnd() * 5);
        const h = 18 + Math.floor(rnd() * 7);
        const tilt = rnd() < 0.08;
        books += rect(
          x,
          y + 25 - h,
          w,
          h,
          colors[Math.floor(rnd() * colors.length)],
          `stroke="#1a110a" stroke-width="0.4"${tilt ? ` transform="rotate(-8 ${x} ${y + 25})"` : ''}`,
        );
        books += line(x + 0.6, y + 28 - h, x + w - 0.6, y + 28 - h, '#e2b13c', 0.5, 'opacity="0.7"');
        x += w + (rnd() < 0.1 ? 4 : 0.6);
      }
      books += rect(4, y + 25, 192, 4, 'url(#wood)', outline);
    }
    return (
      rect(0, 0, 200, 130, 'url(#wood-dark)') +
      books +
      // Ladder
      path('M150 8 L162 104 M168 8 L180 104', 'none', 'stroke="#9a6a3c" stroke-width="2.4"') +
      [20, 36, 52, 68, 84].map((y) => line(151.5 + (y - 8) * 0.125, y, 169.5 + (y - 8) * 0.125, y, '#9a6a3c', 2)).join('') +
      // Lectern with open book and candle
      rect(0, 100, 200, 30, 'url(#wood-dark)') +
      path('M60 130 L66 104 L94 104 L100 130Z', 'url(#wood)', outline) +
      path('M50 104 Q66 94 80 100 Q94 94 110 104 L104 108 Q92 100 80 106 Q68 100 56 108Z', '#f7ecd0', outline) +
      path('M60 102 h14 M60 104 h12 M86 102 h14 M88 104 h12', 'none', 'stroke="#5a4a3a" stroke-width="0.5"') +
      rect(124, 100, 6, 14, '#f4ead2') +
      path('M127 92 Q130 96 127 100 Q124 96 127 92Z', '#ffbf3d') +
      glowAt(127, 96, 22)
    );
  },

  'great-wall': () => {
    const wallSeg = (x1, y1, x2, y2, h) =>
      path(`M${x1} ${y1} L${x2} ${y2} L${x2} ${y2 + h} L${x1} ${y1 + h}Z`, 'url(#stone)', outline) +
      path(`M${x1} ${y1} L${x2} ${y2} L${x2} ${y2 + h} L${x1} ${y1 + h}Z`, 'url(#bricks)');
    return (
      sky('unique') +
      clouds(107, '#e7d8ff', 0.3) +
      hills('#4a3a72', 70, 31, 22) +
      hills('#3b5a3a', 92, 33, 16) +
      ground('url(#grass)', 112) +
      wallSeg(-4, 96, 44, 76, 16) +
      wallSeg(44, 76, 96, 86, 16) +
      wallSeg(96, 86, 150, 62, 16) +
      wallSeg(150, 62, 204, 72, 16) +
      crenels(-4, 96, 18, 2, 4) +
      tower(36, 54, 18, 38, { roof: 'crenel' }) +
      tower(90, 64, 16, 38, { roof: 'crenel' }) +
      tower(144, 38, 18, 40, { roof: 'crenel' }) +
      flag(45, 46, '#8d5cc4', 12) +
      flag(153, 30, '#8d5cc4', 12) +
      tree(20, 120, 1.1, '#2f5a2a') +
      tree(180, 122, 1.2, '#2f5a2a')
    );
  },

  university: () =>
    sky('unique') +
    clouds(109, '#fff', 0.3) +
    ground('url(#marble)', 114) +
    tree(14, 116, 1.1) +
    tree(186, 116, 1.1) +
    wall(24, 64, 40, 50, 'url(#plaster)', null) +
    gable(24, 64, 40, 14, 'url(#roof-purple)', 2) +
    win(32, 74, 8, 14) +
    win(48, 74, 8, 14) +
    wall(136, 64, 40, 50, 'url(#plaster)', null) +
    gable(136, 64, 40, 14, 'url(#roof-purple)', 2) +
    win(144, 74, 8, 14) +
    win(160, 74, 8, 14) +
    wall(62, 56, 76, 58, 'url(#marble)', null) +
    rect(70, 42, 60, 16, 'url(#marble)', outline) +
    dome(100, 42, 26, 'url(#roof-purple)') +
    circle(100, 14, 3, 'url(#gold)') +
    poly('60,58 100,44 140,58', 'url(#marble)', outline) +
    [68, 82, 112, 126].map((x) => column(x, 62, 6, 50)).join('') +
    door(92, 84, 16, 30, 'url(#wood)') +
    // Banner with a quill
    rect(96, 62, 8, 16, '#8d5cc4') +
    path('M98 64 L102 74', 'none', 'stroke="#f7ecd0" stroke-width="1.2"'),

  'dragon-gate': () =>
    rect(0, 0, 200, 130, 'url(#sky-unique)') +
    starfield(113, 18, 200, 50) +
    ground('url(#stone-dark)', 112) +
    // Great gate
    wall(30, 40, 140, 72, 'url(#stone-dark)') +
    path('M64 112 V72 Q64 44 100 44 Q136 44 136 72 V112Z', 'url(#fire)') +
    path('M64 112 V72 Q64 44 100 44 Q136 44 136 72 V112Z', 'none', 'stroke="#2a1d14" stroke-width="2"') +
    circle(100, 84, 26, 'url(#fire)', 'filter="url(#glow-strong)" opacity="0.8"') +
    rect(26, 36, 148, 8, 'url(#stone)', outline) +
    crenels(26, 36, 148, 9, 5) +
    // Coiled dragon atop the gate
    path(
      'M40 34 Q30 6 60 10 Q80 12 92 26 Q100 34 116 24 Q132 12 150 18 Q170 24 164 34',
      'none',
      'stroke="url(#dragon)" stroke-width="10" stroke-linecap="round"',
    ) +
    path(
      'M40 34 Q30 6 60 10 Q80 12 92 26 Q100 34 116 24 Q132 12 150 18 Q170 24 164 34',
      'none',
      'stroke="#ffb347" stroke-width="1.4" stroke-dasharray="2 4" opacity="0.7"',
    ) +
    path('M60 12 L50 -2 L70 6 L74 -6 L82 10Z', '#8a1a10') +
    path('M164 34 Q182 30 186 18 Q176 20 172 14 Q166 22 158 22Z', 'url(#dragon)') +
    path('M186 18 L196 14 L188 24Z', '#8a1a10') +
    circle(176, 22, 1.6, '#ffe08a', 'filter="url(#glow)"') +
    path('M190 22 Q200 28 196 36', 'none', 'stroke="#ffbf3d" stroke-width="2" opacity="0.8"') +
    [44, 74, 126, 156].map((x) => rect(x, 52, 6, 12, '#1f1a24')).join(''),
};

const cache = new Map();

export function districtSVG(id) {
  if (!cache.has(id)) {
    const draw = DISTRICT_ART[id];
    const body = draw ? draw() : sky('night') + ground();
    cache.set(id, svg('0 0 200 130', body, 'preserveAspectRatio="xMidYMid slice" class="district-svg"'));
  }
  return cache.get(id);
}
