// Hand-drawn character portraits (SVG, 200×260). Each portrait is a bust in
// front of a themed backdrop, built from simple shapes and shared gradients.

import { registerDefs, lin, rad } from './defs.js';
import { circle, ellipse, path, rect, line, poly, star, sparkle, starfield, svg, g } from './svg.js';

registerDefs(`
  ${lin('bg-assassin', [[0, '#3c2160'], [0.6, '#1c0f2e'], [1, '#0a0610']])}
  ${lin('bg-thief', [[0, '#3f6463'], [0.6, '#1c3133'], [1, '#0c1517']])}
  ${lin('bg-magician', [[0, '#2c3c92'], [0.6, '#151d55'], [1, '#080b24']])}
  ${rad('bg-king', [[0, '#ffe9a6'], [0.55, '#e3ad45'], [1, '#8d5b16']], 'cx="0.5" cy="0.38" r="0.75"')}
  ${lin('bg-bishop', [[0, '#1d2440'], [1, '#0c0f1c']])}
  ${lin('bg-merchant', [[0, '#4b8f55'], [0.6, '#235a2e'], [1, '#0f2a16']])}
  ${lin('bg-architect', [[0, '#f6b562'], [0.55, '#d4702e'], [1, '#5e2610']])}
  ${lin('bg-warlord', [[0, '#c23b22'], [0.55, '#6e160d'], [1, '#220604']])}
  ${lin('cloth-olive', [[0, '#6b7445'], [1, '#2d331b']])}
  ${lin('cloth-brown', [[0, '#8a5a32'], [1, '#432812']])}
  ${lin('cloth-cream', [[0, '#fbf6e8'], [1, '#d9cfb4']])}
  ${lin('hat-blue', [[0, '#3c55c4'], [1, '#18235a']])}
  ${lin('beard-white', [[0, '#ffffff'], [1, '#c3c8d6']])}
  ${lin('plume-red', [[0, '#ff5a3c'], [1, '#8a120b']])}
  ${lin('blueprint', [[0, '#3f78c2'], [1, '#1d3f73']])}
  ${rad('cheek', [[0, '#e8786a', 0.55], [1, '#e8786a', 0]])}
`);

// ------------------------------------------------------------------ parts

const shoulders = (fill, extra = '') =>
  path('M14 260 C18 206 54 184 100 180 C146 184 182 206 186 260 Z', fill, extra);

const neck = (fill = 'url(#skin)') => path('M86 150 L114 150 L116 186 Q100 194 84 186 Z', fill);

const head = (fill = 'url(#skin)', rx = 30, ry = 36, cy = 120) =>
  ellipse(100, cy, rx, ry, fill) +
  ellipse(70.5, cy + 4, 5, 8, fill) +
  ellipse(129.5, cy + 4, 5, 8, fill);

const eyes = (y = 118, color = '#2a1a10', spread = 11) =>
  ellipse(100 - spread, y, 4, 2.6, '#fff') +
  ellipse(100 + spread, y, 4, 2.6, '#fff') +
  circle(100 - spread, y, 2, color) +
  circle(100 + spread, y, 2, color) +
  circle(100 - spread + 0.7, y - 0.7, 0.6, '#fff') +
  circle(100 + spread + 0.7, y - 0.7, 0.6, '#fff');

const brows = (y = 110, color = '#3a2412', w = 2.4, tilt = 0) =>
  path(`M${82} ${y + tilt} Q89 ${y - 3} 96 ${y - tilt * 0.3}`, 'none', `stroke="${color}" stroke-width="${w}" stroke-linecap="round"`) +
  path(`M${104} ${y - tilt * 0.3} Q111 ${y - 3} 118 ${y + tilt}`, 'none', `stroke="${color}" stroke-width="${w}" stroke-linecap="round"`);

const nose = (y = 120) =>
  path(`M100 ${y - 6} Q97 ${y + 6} 99 ${y + 9} Q102 ${y + 11} 105 ${y + 8}`, 'none', 'stroke="#9a6440" stroke-width="1.6" stroke-linecap="round" opacity="0.75"');

const mouth = (y = 140, curve = 3, color = '#8a3b2a') =>
  path(`M91 ${y} Q100 ${y + curve} 109 ${y}`, 'none', `stroke="${color}" stroke-width="2" stroke-linecap="round"`);

const folds = (paths, opacity = 0.28) =>
  paths.map((d) => path(d, 'none', `stroke="#000" stroke-opacity="${opacity}" stroke-width="1.6" stroke-linecap="round"`)).join('');

const vignette = rect(0, 0, 200, 260, 'url(#vignette)');

function dagger(x, y, angle, scale = 1) {
  return g(
    poly('0,-62 5,-12 0,-6 -5,-12', 'url(#silver-h)') +
      line(0, -58, 0, -12, '#ffffff', 0.8, 'opacity="0.7"') +
      rect(-14, -8, 28, 5, 'url(#gold)', 'rx="2"') +
      rect(-3.5, -3, 7, 20, '#3b2416', 'rx="2"') +
      path('M-3.5 2h7M-3.5 7h7M-3.5 12h7', 'none', 'stroke="#c8901f" stroke-width="1"') +
      circle(0, 20, 4.5, 'url(#gold)'),
    `transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})"`,
  );
}

function rooftops(fill, seed = 0) {
  return path(
    `M0 200 L0 170 L18 170 L18 150 L30 138 L42 150 L42 166 L60 166 L60 156 L72 156 L72 176 L128 176 L128 152 L140 140 L152 152 L152 168 L166 168 L166 146 L174 146 L174 160 L200 160 L200 200 Z`,
    fill,
    seed ? `transform="translate(0 ${seed})"` : '',
  );
}

// ------------------------------------------------------------------ portraits

const PORTRAITS = {
  assassin() {
    return (
      rect(0, 0, 200, 260, 'url(#bg-assassin)') +
      starfield(11, 26, 200, 120, { maxR: 1 }) +
      circle(152, 52, 22, 'url(#moon)', 'filter="url(#glow)"') +
      circle(162, 45, 20, '#33204f') +
      rooftops('#140b20', 20) +
      // Cloak and hood
      path('M100 48 C58 50 42 96 46 136 C49 168 34 200 18 260 L182 260 C166 200 151 168 154 136 C158 96 142 50 100 48 Z', 'url(#cloth-dark)') +
      path('M100 48 C58 50 42 96 46 136 C49 168 34 200 18 260', 'none', 'stroke="#55556c" stroke-width="2" opacity="0.6"') +
      path('M100 48 C142 50 158 96 154 136 C151 168 166 200 182 260', 'none', 'stroke="#000" stroke-width="2" opacity="0.4"') +
      folds(['M70 190 Q76 220 66 258', 'M132 190 Q126 222 136 258', 'M100 196 L100 258']) +
      // Shadowed face inside the hood
      path('M72 126 C72 94 86 80 100 80 C114 80 128 94 128 126 C128 152 116 166 100 166 C84 166 72 152 72 126 Z', '#060409') +
      path('M80 112 L96 117 L82 121 Z', '#ff4b3e', 'filter="url(#glow)"') +
      path('M120 112 L104 117 L118 121 Z', '#ff4b3e', 'filter="url(#glow)"') +
      // Crimson mask
      path('M72 132 Q100 144 128 132 L125 156 Q100 172 75 156 Z', 'url(#cloth-red)') +
      folds(['M82 146 Q100 154 118 146'], 0.35) +
      // Crossed daggers
      dagger(84, 236, -32, 1.05) +
      dagger(116, 236, 32, 1.05) +
      vignette
    );
  },

  thief() {
    return (
      rect(0, 0, 200, 260, 'url(#bg-thief)') +
      starfield(23, 14, 200, 90, { maxR: 0.9 }) +
      rooftops('#0f1f21', 0) +
      rect(146, 150, 7, 9, 'url(#window-glow)', 'filter="url(#glow)"') +
      rect(28, 160, 6, 8, 'url(#window-glow)', 'filter="url(#glow)"') +
      // Cape and jerkin
      shoulders('url(#cloth-olive)') +
      path('M62 190 L100 250 L138 190 Q100 200 62 190Z', 'url(#cloth-brown)') +
      path('M100 200 L100 260', 'none', 'stroke="#2a1708" stroke-width="2"') +
      circle(100, 214, 2.4, 'url(#gold)') + circle(100, 230, 2.4, 'url(#gold)') +
      neck() +
      head() +
      // Hair tufts
      path('M70 118 Q66 98 78 92 L80 120Z', '#3b2414') + path('M130 118 Q134 98 122 92 L120 120Z', '#3b2414') +
      // Domino mask
      path('M70 110 Q100 100 130 110 L128 124 Q116 130 104 122 L96 122 Q84 130 72 124 Z', '#141414') +
      eyes(116, '#1f6f4a', 12) +
      nose(122) +
      // Moustache & smirk
      path('M88 136 Q96 131 100 134 Q104 131 112 136 Q104 134 100 137 Q96 134 88 136Z', '#3b2414') +
      path('M92 143 Q102 147 110 140', 'none', 'stroke="#7a3322" stroke-width="2" stroke-linecap="round"') +
      // Feathered cap
      path('M64 104 Q66 70 100 68 Q136 70 138 102 Q120 92 100 92 Q80 92 64 104Z', '#6b3d1f') +
      path('M58 106 Q100 86 144 104 Q100 98 58 106Z', '#4a2812') +
      path('M120 78 Q156 40 182 34 Q160 54 128 86 Z', '#c8352a') +
      path('M124 82 Q150 56 176 38', 'none', 'stroke="#ffd1c4" stroke-width="1" opacity="0.6"') +
      // Coin purse held by its drawstring
      path('M140 224 Q124 238 134 252 Q152 262 170 252 Q180 238 164 224 Z', 'url(#cloth-brown)') +
      path('M134 246 Q152 254 170 246', 'none', 'stroke="#2a1708" stroke-width="1" opacity="0.5"') +
      path('M144 224 L138 212 L147 217 L152 207 L157 217 L166 212 L160 224 Z', '#8a5a32') +
      path('M142 224 Q152 228 162 224', 'none', 'stroke="#e2c27a" stroke-width="2"') +
      ellipse(152, 210, 9, 7, 'url(#skin)') +
      circle(128, 236, 5, 'url(#gold)', 'stroke="#7a5212" stroke-width="0.8"') +
      circle(120, 250, 5, 'url(#gold)', 'stroke="#7a5212" stroke-width="0.8"') +
      sparkle(176, 200, 5, '#fff6c0', 'opacity="0.9"') +
      vignette
    );
  },

  magician() {
    return (
      rect(0, 0, 200, 260, 'url(#bg-magician)') +
      starfield(37, 40, 200, 200, { maxR: 1.2 }) +
      path('M30 60 C10 90 40 120 70 100 C90 86 70 64 56 76', 'none', 'stroke="#8fb3ff" stroke-width="1.2" opacity="0.35"') +
      path('M150 200 C190 180 186 140 160 140 C142 140 140 162 156 164', 'none', 'stroke="#8fb3ff" stroke-width="1.2" opacity="0.35"') +
      // Robe
      shoulders('url(#cloth-blue)') +
      path('M66 188 Q100 206 134 188', 'none', 'stroke="url(#gold-h)" stroke-width="5"') +
      star(60, 230, 5, '#f2c94c', 5, 0.45, 'opacity="0.8"') + star(146, 240, 4, '#f2c94c', 5, 0.45, 'opacity="0.8"') +
      neck() +
      head() +
      eyes(118, '#2a3f8a', 11) +
      brows(109, '#eef0f6', 4, 2) +
      nose(122) +
      // Flowing beard and moustache
      path('M72 128 Q70 160 82 196 Q92 230 100 244 Q108 230 118 196 Q130 160 128 128 Q116 146 100 146 Q84 146 72 128Z', 'url(#beard-white)') +
      folds(['M88 160 Q92 196 98 230', 'M110 160 Q108 196 102 230', 'M80 150 Q84 176 90 200', 'M120 150 Q116 176 110 200'], 0.12) +
      path('M84 136 Q92 130 100 134 Q108 130 116 136 Q110 142 100 139 Q90 142 84 136Z', '#f6f7fb') +
      // Hat
      ellipse(100, 98, 60, 11, 'url(#hat-blue)') +
      path('M64 98 Q80 60 104 26 Q112 14 132 12 Q118 24 118 38 Q124 70 136 98 Z', 'url(#hat-blue)') +
      path('M66 94 Q100 104 134 94 L136 99 Q100 110 64 99Z', 'url(#gold)') +
      star(98, 64, 6, '#f2c94c') + star(118, 80, 4, '#f2c94c') + star(110, 42, 3.5, '#f2c94c') +
      path('M84 80 a7 7 0 1 0 9 -8 a5.5 5.5 0 1 1 -9 8z', '#f2c94c') +
      // Orb with hands
      circle(100, 214, 30, 'url(#halo)') +
      circle(100, 214, 17, 'url(#orb)', 'filter="url(#glow)"') +
      ellipse(84, 228, 9, 7, 'url(#skin)') + ellipse(116, 228, 9, 7, 'url(#skin)') +
      sparkle(66, 196, 6, '#dff6ff') + sparkle(138, 186, 5, '#dff6ff') + sparkle(126, 240, 4, '#dff6ff') + sparkle(150, 130, 4, '#dff6ff') +
      vignette
    );
  },

  king() {
    let rays = '';
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const b = a + Math.PI / 18;
      rays += path(
        `M100 110 L${100 + 260 * Math.cos(a)} ${110 + 260 * Math.sin(a)} L${100 + 260 * Math.cos(b)} ${110 + 260 * Math.sin(b)} Z`,
        '#fff3c4',
        'opacity="0.18"',
      );
    }
    return (
      rect(0, 0, 200, 260, 'url(#bg-king)') +
      rays +
      // Red mantle with ermine collar
      shoulders('url(#cloth-red)') +
      path('M40 206 Q100 236 160 206 L166 226 Q100 256 34 226Z', '#f7f3ea') +
      [52, 70, 88, 106, 124, 142].map((x, i) => path(`M${x} ${218 + (i % 2) * 6} l2 6 l2 -6z`, '#151515')).join('') +
      neck() +
      head() +
      // Auburn hair and beard
      path('M70 110 Q66 80 100 76 Q134 80 130 110 Q126 96 100 94 Q74 96 70 110Z', '#8a4b1f') +
      eyes(118, '#3a2412', 11) +
      brows(110, '#6e3714', 3) +
      nose(122) +
      path('M70 122 Q70 168 100 176 Q130 168 130 122 Q124 146 112 148 Q100 140 88 148 Q76 146 70 122Z', '#8a4b1f') +
      path('M86 140 Q100 134 114 140 Q100 146 86 140Z', '#6e3714') +
      mouth(146, 2, '#5a2412') +
      // Crown
      path('M66 98 L68 66 L80 84 L90 58 L100 80 L110 58 L120 84 L132 66 L134 98 Z', 'url(#gold)', 'stroke="#7a5212" stroke-width="1"') +
      rect(64, 92, 72, 12, 'url(#gold-h)', 'rx="2" stroke="#7a5212" stroke-width="1"') +
      circle(68, 64, 3.5, 'url(#gold)') + circle(90, 56, 3.5, 'url(#gold)') + circle(110, 56, 3.5, 'url(#gold)') + circle(132, 64, 3.5, 'url(#gold)') +
      ellipse(100, 98, 5, 4, '#c0162b', 'stroke="#fff" stroke-width="0.6"') +
      ellipse(80, 98, 3.5, 3, '#1f5fc8') + ellipse(120, 98, 3.5, 3, '#1f9a4a') +
      // Scepter
      rect(150, 150, 6, 110, 'url(#gold-h)', 'rx="3"') +
      circle(153, 146, 9, 'url(#gold)', 'stroke="#7a5212" stroke-width="1"') +
      path('M153 128 L157 138 L153 142 L149 138Z', 'url(#gold)') +
      ellipse(153, 146, 3.5, 3.5, '#c0162b') +
      vignette
    );
  },

  bishop() {
    const pane = (d, fill) => path(d, fill, 'stroke="#141414" stroke-width="2.2" opacity="0.9"');
    return (
      rect(0, 0, 200, 260, 'url(#bg-bishop)') +
      // Stained glass window
      g(
        pane('M30 260 L30 90 Q30 20 100 14 Q170 20 170 90 L170 260Z', '#24345e') +
          pane('M100 14 L100 260', 'none') +
          pane('M30 90 L170 90', 'none') +
          pane('M30 150 L170 150', 'none') +
          pane('M30 90 Q30 20 100 14 L100 90Z', '#2f5fae') +
          pane('M100 14 Q170 20 170 90 L100 90Z', '#b8343a') +
          pane('M30 90 L100 90 L100 150 L30 150Z', '#d9a63a') +
          pane('M100 90 L170 90 L170 150 L100 150Z', '#2f7d5a') +
          pane('M30 150 L100 150 L100 260 L30 260Z', '#7a3da0') +
          pane('M100 150 L170 150 L170 260 L100 260Z', '#2f5fae') +
          circle(100, 60, 22, '#f2c94c', 'stroke="#141414" stroke-width="2.2"'),
        'opacity="0.85"',
      ) +
      path('M100 0 L40 260 L160 260Z', '#fff7d6', 'opacity="0.08"') +
      // Vestments
      shoulders('url(#cloth-cream)') +
      path('M88 186 L112 186 L118 260 L82 260Z', 'url(#gold-h)') +
      path('M100 200 L100 236 M90 212 L110 212', 'none', 'stroke="#b8343a" stroke-width="4"') +
      path('M60 196 Q100 214 140 196', 'none', 'stroke="#2f5fae" stroke-width="5"') +
      neck() +
      head() +
      // Serene closed eyes and gentle smile
      path('M84 119 Q89 123 94 119 M106 119 Q111 123 116 119', 'none', 'stroke="#3a2412" stroke-width="2" stroke-linecap="round"') +
      brows(111, '#8a8070', 2) +
      nose(122) +
      mouth(140, 3) +
      // Mitre
      path('M70 102 L74 52 Q100 14 126 52 L130 102 Q100 94 70 102Z', '#f5f0e2', 'stroke="#c8901f" stroke-width="2"') +
      path('M70 102 Q100 94 130 102 L130 94 Q100 86 70 94Z', 'url(#gold-h)') +
      path('M100 30 L100 92', 'none', 'stroke="url(#gold-h)" stroke-width="7"') +
      path('M100 44 L100 74 M89 56 L111 56', 'none', 'stroke="#b8343a" stroke-width="3.4" stroke-linecap="round"') +
      // Crozier
      rect(40, 70, 5, 190, 'url(#gold-h)', 'rx="2"') +
      path('M42.5 74 C42 46 66 42 66 60 C66 72 52 72 52 62 C52 56 58 56 58 60', 'none', 'stroke="url(#gold)" stroke-width="5" stroke-linecap="round"') +
      vignette
    );
  },

  merchant() {
    let awning = '';
    for (let i = 0; i < 10; i++) {
      awning += path(`M${i * 20} 0 L${i * 20 + 20} 0 L${i * 20 + 20} 30 Q${i * 20 + 10} 40 ${i * 20} 30Z`, i % 2 ? '#f4ead2' : '#b8343a');
    }
    return (
      rect(0, 0, 200, 260, 'url(#bg-merchant)') +
      awning +
      path('M0 30 Q10 40 20 30 Q30 40 40 30 Q50 40 60 30 Q70 40 80 30 Q90 40 100 30 Q110 40 120 30 Q130 40 140 30 Q150 40 160 30 Q170 40 180 30 Q190 40 200 30', 'none', 'stroke="#5a1a14" stroke-width="1.2" opacity="0.5"') +
      circle(28, 64, 6, 'url(#window-glow)', 'filter="url(#glow)"') + circle(172, 64, 6, 'url(#window-glow)', 'filter="url(#glow)"') +
      // Robe with fur collar
      shoulders('url(#cloth-green)') +
      path('M44 204 Q100 230 156 204 Q150 190 100 196 Q50 190 44 204Z', '#7a5534') +
      folds(['M52 206 q4 6 0 12', 'M70 214 q4 6 0 12', 'M130 214 q4 6 0 12', 'M148 206 q4 6 0 12'], 0.35) +
      circle(100, 222, 5, 'url(#gold)') +
      neck() +
      head('url(#skin)', 33, 35, 122) +
      circle(80, 132, 9, 'url(#cheek)') + circle(120, 132, 9, 'url(#cheek)') +
      path('M84 120 Q89 115 94 120 M106 120 Q111 115 116 120', 'none', 'stroke="#2a1a10" stroke-width="2.4" stroke-linecap="round"') +
      brows(110, '#5a3a1e', 2.4) +
      nose(124) +
      path('M82 140 Q90 132 100 138 Q110 132 118 140 Q122 136 124 130 M82 140 Q78 136 76 130', 'none', 'stroke="#5a3a1e" stroke-width="3" stroke-linecap="round"') +
      path('M92 146 Q100 152 108 146', 'none', 'stroke="#8a3b2a" stroke-width="2" stroke-linecap="round"') +
      path('M97 154 Q100 162 103 154Z', '#5a3a1e') +
      // Wide hat
      ellipse(100, 92, 58, 12, '#21472a') +
      path('M62 92 Q62 58 100 56 Q138 58 138 92Z', 'url(#cloth-green)') +
      rect(63, 82, 74, 8, 'url(#gold-h)') +
      path('M128 80 Q150 50 168 50 Q150 64 136 86Z', '#f4ead2') +
      // Scales
      rect(158, 150, 4, 90, 'url(#gold-h)') +
      rect(132, 150, 56, 3, 'url(#gold-h)') +
      path('M134 153 L126 182 M134 153 L142 182', 'none', 'stroke="#c8901f" stroke-width="1"') +
      path('M186 153 L178 176 M186 153 L194 176', 'none', 'stroke="#c8901f" stroke-width="1"') +
      path('M122 182 Q134 192 146 182Z', 'url(#gold)') +
      path('M174 176 Q186 186 198 176Z', 'url(#gold)') +
      circle(134, 179, 4, 'url(#gold)', 'stroke="#7a5212" stroke-width="0.6"') +
      // Coin stacks
      [0, 1, 2, 3, 4].map((i) => ellipse(30, 246 - i * 5, 12, 4, 'url(#gold)', 'stroke="#7a5212" stroke-width="0.7"')).join('') +
      [0, 1, 2].map((i) => ellipse(52, 250 - i * 5, 10, 3.5, 'url(#gold)', 'stroke="#7a5212" stroke-width="0.7"')).join('') +
      vignette
    );
  },

  architect() {
    let scaffold = '';
    for (let y = 60; y < 200; y += 22) scaffold += line(132, y, 186, y, '#5e2610', 2, 'opacity="0.5"');
    for (let x = 132; x <= 186; x += 18) scaffold += line(x, 50, x, 200, '#5e2610', 2, 'opacity="0.5"');
    return (
      rect(0, 0, 200, 260, 'url(#bg-architect)') +
      g(path('M0 0 V260 M20 0 V260 M40 0 V260 M60 0 V260 M80 0 V260 M100 0 V260 M120 0 V260 M140 0 V260 M160 0 V260 M180 0 V260 M0 20 H200 M0 40 H200 M0 60 H200 M0 80 H200 M0 100 H200 M0 120 H200 M0 140 H200', 'none', 'stroke="#fff" stroke-width="0.4"'), 'opacity="0.12"') +
      // Unfinished tower with scaffolding and a crane
      path('M140 200 L140 76 L178 76 L178 200Z', '#7a3416', 'opacity="0.75"') +
      scaffold +
      path('M24 200 L24 40 M24 44 L86 44 M24 60 L44 44', 'none', 'stroke="#5e2610" stroke-width="3" opacity="0.6"') +
      path('M80 44 L80 72', 'none', 'stroke="#5e2610" stroke-width="1.2" opacity="0.6"') +
      rect(74, 72, 12, 8, '#5e2610', 'opacity="0.6"') +
      // Shirt, jerkin, apron
      shoulders('url(#cloth-blue)') +
      path('M70 186 L130 186 L136 260 L64 260Z', 'url(#cloth-brown)') +
      path('M70 186 Q100 196 130 186', 'none', 'stroke="#2e1a0b" stroke-width="2"') +
      rect(78, 214, 16, 10, '#5a3a1e', 'rx="2"') +
      neck() +
      head() +
      eyes(118, '#2a3f8a', 11) +
      circle(89, 118, 8, 'none', 'stroke="url(#gold)" stroke-width="2"') +
      circle(111, 118, 8, 'none', 'stroke="url(#gold)" stroke-width="2"') +
      line(97, 118, 103, 118, '#c8901f', 1.6) +
      brows(106, '#4a2c16', 2.6) +
      nose(124) +
      path('M74 132 Q76 160 100 164 Q124 160 126 132 Q118 150 100 150 Q82 150 74 132Z', '#4a2c16') +
      mouth(142, 2, '#5a2412') +
      // Soft cap with pencil
      path('M66 108 Q62 74 100 72 Q144 72 140 100 Q124 92 100 94 Q80 96 66 108Z', '#2f4a73') +
      ellipse(132, 94, 18, 7, '#2f4a73') +
      line(124, 100, 146, 84, '#e2a64a', 3, 'stroke-linecap="round"') +
      // Rolled blueprint
      g(rect(-26, -8, 52, 16, 'url(#blueprint)', 'rx="8"') + ellipse(26, 0, 4, 8, '#9ec4f2') + path('M-18 -3 H14 M-18 3 H8', 'none', 'stroke="#cfe3ff" stroke-width="0.8"'), 'transform="translate(52 214) rotate(-18)"') +
      // Compass / dividers
      g(
        line(0, 0, -16, 62, 'url(#silver-h)', 4, 'stroke-linecap="round"') +
          line(0, 0, 16, 62, 'url(#silver-h)', 4, 'stroke-linecap="round"') +
          path('M-9 34 Q0 30 9 34', 'none', 'stroke="#c9d1dc" stroke-width="2"') +
          circle(0, 0, 6, 'url(#gold)'),
        'transform="translate(148 176) rotate(12)"',
      ) +
      ellipse(150, 192, 9, 8, 'url(#skin)') +
      vignette
    );
  },

  warlord() {
    let embers = '';
    for (let i = 0; i < 14; i++) {
      embers += circle(10 + ((i * 53) % 180), 20 + ((i * 37) % 150), 1 + (i % 3) * 0.6, '#ffb347', 'opacity="0.75" filter="url(#glow)"');
    }
    const banner = (x, flip) =>
      line(x, 30, x, 200, '#2a1006', 3) +
      path(flip ? `M${x} 36 L${x - 34} 40 L${x - 26} 60 L${x - 34} 80 L${x} 76Z` : `M${x} 36 L${x + 34} 40 L${x + 26} 60 L${x + 34} 80 L${x} 76Z`, '#7c1a16', 'stroke="#1a0503" stroke-width="1.2"');
    return (
      rect(0, 0, 200, 260, 'url(#bg-warlord)') +
      ellipse(40, 120, 60, 30, '#2a0805', 'opacity="0.55" filter="url(#blur-lg)"') +
      ellipse(170, 90, 50, 26, '#2a0805', 'opacity="0.55" filter="url(#blur-lg)"') +
      banner(22, false) +
      banner(178, true) +
      embers +
      // Armour: tabard and pauldrons
      shoulders('url(#steel)') +
      path('M66 190 L134 190 L140 260 L60 260Z', 'url(#cloth-red)') +
      path('M100 204 L108 226 L100 246 L92 226Z', '#1a0503') +
      ellipse(48, 204, 34, 22, 'url(#silver)', 'stroke="#3b4250" stroke-width="1.5"') +
      ellipse(152, 204, 34, 22, 'url(#silver)', 'stroke="#3b4250" stroke-width="1.5"') +
      path('M22 206 Q48 190 74 206 M126 206 Q152 190 178 206', 'none', 'stroke="#3b4250" stroke-width="1.5"') +
      neck('url(#skin-dark)') +
      head('url(#skin-dark)') +
      eyes(120, '#1a1a1a', 11) +
      brows(112, '#141414', 3.4, 3) +
      nose(124) +
      path('M114 104 L122 130', 'none', 'stroke="#8a3a2a" stroke-width="1.8" stroke-linecap="round"') +
      path('M72 128 Q72 166 100 172 Q128 166 128 128 Q120 148 100 150 Q80 148 72 128Z', '#1c1410') +
      path('M88 144 Q100 140 112 144', 'none', 'stroke="#5a2412" stroke-width="2.2" stroke-linecap="round"') +
      // Helmet with nasal guard and plume
      path('M66 112 Q64 68 100 64 Q136 68 134 112 L126 112 Q124 86 100 84 Q76 86 74 112Z', 'url(#silver)', 'stroke="#3b4250" stroke-width="1.5"') +
      path('M66 112 Q100 104 134 112 L134 102 Q100 94 66 102Z', 'url(#steel)') +
      rect(97, 98, 6, 30, 'url(#silver-h)', 'rx="2"') +
      path('M100 64 Q90 40 106 22 Q124 10 140 18 Q120 24 116 40 Q112 54 104 66Z', 'url(#plume-red)') +
      // Sword
      g(
        poly('0,-118 6,-108 6,0 -6,0 -6,-108', 'url(#silver-h)') +
          line(0, -110, 0, -4, '#5d6573', 1.4) +
          rect(-22, 0, 44, 7, 'url(#gold)', 'rx="3"') +
          rect(-4, 7, 8, 26, '#2a1006', 'rx="2"') +
          circle(0, 37, 6, 'url(#gold)'),
        'transform="translate(160 214)"',
      ) +
      ellipse(160, 228, 10, 8, 'url(#skin-dark)') +
      vignette
    );
  },
};

const cache = new Map();

/** Portrait SVG markup for a character id (falls back to a generic silhouette). */
export function portraitSVG(id) {
  if (!cache.has(id)) {
    const draw = PORTRAITS[id];
    const body = draw
      ? draw()
      : rect(0, 0, 200, 260, '#2a2a38') + shoulders('#444') + head('#555') + vignette;
    cache.set(id, svg('0 0 200 260', body, 'preserveAspectRatio="xMidYMid slice" class="portrait-svg"'));
  }
  return cache.get(id);
}

export const CHARACTER_ACCENTS = {
  assassin: '#8e3bd1',
  thief: '#5fa59e',
  magician: '#5b7cf0',
  king: '#e8b13a',
  bishop: '#5b8fe0',
  merchant: '#55a860',
  architect: '#e08a3c',
  warlord: '#d9473a',
};
