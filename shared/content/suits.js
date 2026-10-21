// District suits ("colors"). Characters that collect taxes reference a suit id.
export const SUITS = {
  noble: { id: 'noble', name: 'Noble', color: '#e2b13c', dark: '#8a6514', glyph: 'crown' },
  religious: { id: 'religious', name: 'Religious', color: '#4a7fc8', dark: '#1f3f73', glyph: 'cross' },
  trade: { id: 'trade', name: 'Trade', color: '#4f9a5a', dark: '#22532b', glyph: 'scales' },
  military: { id: 'military', name: 'Military', color: '#c2423a', dark: '#6e1813', glyph: 'swords' },
  unique: { id: 'unique', name: 'Unique', color: '#8d5cc4', dark: '#43236e', glyph: 'star' },
};

export const SUIT_ORDER = ['noble', 'religious', 'trade', 'military', 'unique'];
