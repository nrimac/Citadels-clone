// The night-time citadel skyline used behind menus. Layers are returned
// separately so CSS can give them parallax and atmosphere.

import { circle, path, rect, seeded, starfield, svg } from './svg.js';

const W = 1600;
const H = 600;

function roofPath(x, w, top, kind, rnd) {
  switch (kind) {
    case 'gable':
      return `L${x} ${top} L${x + w / 2} ${top - w * 0.55} L${x + w} ${top}`;
    case 'spire': {
      const h = w * (1.6 + rnd());
      return `L${x} ${top} L${x + w / 2} ${top - h} L${x + w} ${top}`;
    }
    case 'dome':
      return `L${x} ${top} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${top}`;
    case 'crenel': {
      let d = `L${x} ${top}`;
      const n = Math.max(2, Math.round(w / 9));
      const step = w / (n * 2 - 1);
      for (let i = 0; i < n * 2 - 1; i++) {
        const cx = x + i * step;
        d += i % 2 === 0 ? ` L${cx} ${top - 6} L${cx + step} ${top - 6} L${cx + step} ${top}` : ` L${cx + step} ${top}`;
      }
      return d;
    }
    default:
      return `L${x} ${top} L${x + w} ${top}`;
  }
}

function cityLayer({ seed, baseY, minH, maxH, minW, maxW, color, windowChance, windowSize, kinds }) {
  const rnd = seeded(seed);
  let d = `M0 ${H}`;
  let windows = '';
  let x = -20;
  while (x < W + 20) {
    const w = minW + rnd() * (maxW - minW);
    const h = minH + rnd() * (maxH - minH);
    const top = baseY - h;
    const kind = kinds[Math.floor(rnd() * kinds.length)];
    d += ` L${x} ${baseY} ${roofPath(x, w, top, kind, rnd)} L${x + w} ${baseY}`;
    for (let wy = top + 10; wy < baseY - 8; wy += windowSize * 2.6) {
      for (let wx = x + 6; wx < x + w - windowSize - 4; wx += windowSize * 2.4) {
        if (rnd() < windowChance) {
          const flicker = rnd() < 0.18 ? ` class="twinkle" style="animation-delay:${(rnd() * 8).toFixed(2)}s"` : '';
          windows += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="${windowSize}" height="${(windowSize * 1.4).toFixed(1)}" rx="${windowSize / 2.5}" fill="#ffcf6a"${flicker}/>`;
        }
      }
    }
    x += w + rnd() * 6;
  }
  d += ` L${W + 40} ${H} Z`;
  return path(d, color) + `<g filter="url(#glow)" opacity="0.9">${windows}</g>`;
}

function citadel() {
  // The great citadel on the hill, centre stage.
  const c = '#1a2150';
  const hill = path(`M420 600 Q560 400 800 360 Q1040 400 1180 600 Z`, '#10162e');
  const body = [
    rect(660, 250, 280, 130, c),
    rect(730, 190, 140, 80, c),
    rect(620, 210, 50, 170, c),
    rect(930, 210, 50, 170, c),
    rect(780, 120, 40, 90, c),
    path('M612 212 L645 150 L678 212Z', c),
    path('M922 212 L955 150 L988 212Z', c),
    path('M772 122 L800 40 L828 122Z', c),
    path('M722 192 L750 150 L778 192Z', c),
    path('M822 192 L850 150 L878 192Z', c),
  ].join('');
  const windows = [
    [795, 140], [645, 240], [645, 280], [955, 240], [955, 280], [750, 215], [850, 215], [700, 300], [900, 300], [800, 300],
  ]
    .map(([x, y], i) => `<rect x="${x - 4}" y="${y}" width="8" height="13" rx="4" fill="#ffd27a" class="${i % 3 ? '' : 'twinkle'}" style="animation-delay:${i * 0.7}s"/>`)
    .join('');
  const flags = [
    [800, 40], [645, 150], [955, 150],
  ]
    .map(([x, y]) => `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - 28}" stroke="${c}" stroke-width="3"/><path class="banner" d="M${x} ${y - 28} L${x + 26} ${y - 22} L${x} ${y - 14}Z" fill="#b3262e"/>`)
    .join('');
  // Set back and to the left so it frames the title instead of crowding it.
  return `<g transform="translate(-300 110) scale(0.86)" opacity="0.92">${hill}${body}<g filter="url(#glow)" opacity="0.75">${windows}</g>${flags}</g>`;
}

export function skylineLayers() {
  const sky = svg(
    `0 0 ${W} ${H}`,
    starfield(5, 180, W, H, { maxR: 1.5, yMax: 380 }) +
      `<g class="twinkle-stars">${starfield(9, 40, W, H, { maxR: 2, yMax: 300 })}</g>` +
      circle(1260, 120, 120, 'url(#halo)', 'opacity="0.55"') +
      circle(1260, 120, 52, 'url(#moon)') +
      circle(1240, 108, 9, '#d6c79a', 'opacity="0.45"') +
      circle(1278, 138, 6, '#d6c79a', 'opacity="0.4"') +
      circle(1272, 98, 4, '#d6c79a', 'opacity="0.35"'),
    'preserveAspectRatio="xMidYMax slice" class="layer layer-sky"',
  );
  const far = svg(
    `0 0 ${W} ${H}`,
    path(`M0 430 Q200 360 400 410 Q600 330 800 380 Q1000 320 1200 390 Q1400 350 1600 400 L1600 600 L0 600Z`, '#1a2046') + citadel(),
    'preserveAspectRatio="xMidYMax slice" class="layer layer-far"',
  );
  const mid = svg(
    `0 0 ${W} ${H}`,
    cityLayer({ seed: 21, baseY: 520, minH: 50, maxH: 140, minW: 36, maxW: 80, color: '#0d1228', windowChance: 0.22, windowSize: 4, kinds: ['gable', 'gable', 'spire', 'dome', 'crenel', 'flat'] }),
    'preserveAspectRatio="xMidYMax slice" class="layer layer-mid"',
  );
  const near = svg(
    `0 0 ${W} ${H}`,
    cityLayer({ seed: 77, baseY: 610, minH: 60, maxH: 150, minW: 70, maxW: 140, color: '#070a18', windowChance: 0.16, windowSize: 6, kinds: ['gable', 'gable', 'crenel', 'spire'] }),
    'preserveAspectRatio="xMidYMax slice" class="layer layer-near"',
  );
  return { sky, far, mid, near };
}
