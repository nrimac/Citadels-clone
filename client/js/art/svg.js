// Tiny helpers for composing SVG markup as strings. All art in the game is
// hand-built from these primitives — no external images are used.

export const svg = (viewBox, body, attrs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" ${attrs}>${body}</svg>`;

export const g = (body, attrs = '') => `<g ${attrs}>${body}</g>`;

export const rect = (x, y, w, h, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;

export const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;

export const ellipse = (cx, cy, rx, ry, fill, extra = '') =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;

export const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;

export const line = (x1, y1, x2, y2, stroke, width = 1, extra = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;

export const poly = (points, fill, extra = '') => `<polygon points="${points}" fill="${fill}" ${extra}/>`;

export const text = (x, y, content, extra = '') => `<text x="${x}" y="${y}" ${extra}>${content}</text>`;

/** Deterministic pseudo-random sequence so procedural details are stable. */
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function star(cx, cy, r, fill, points = 5, inner = 0.45, extra = '') {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 ? r * inner : r;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return poly(pts.join(' '), fill, extra);
}

export function sparkle(cx, cy, r, fill, extra = '') {
  const s = r * 0.22;
  return path(
    `M${cx} ${cy - r} Q${cx + s} ${cy - s} ${cx + r} ${cy} Q${cx + s} ${cy + s} ${cx} ${cy + r} Q${cx - s} ${cy + s} ${cx - r} ${cy} Q${cx - s} ${cy - s} ${cx} ${cy - r}Z`,
    fill,
    extra,
  );
}

export function starfield(seed, count, w, h, { maxR = 1.4, color = '#fff', yMax = h } = {}) {
  const rnd = seeded(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = (rnd() * w).toFixed(1);
    const y = (rnd() * yMax).toFixed(1);
    const r = (0.3 + rnd() * maxR).toFixed(2);
    const o = (0.35 + rnd() * 0.65).toFixed(2);
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${o}"/>`;
  }
  return out;
}
