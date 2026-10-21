// Flavourful names for bot opponents.
export const BOT_NAMES = [
  'Lady Rowena',
  'Sir Aldric',
  'Brother Anselm',
  'Mistress Elowen',
  'Baron Godfrey',
  'Dame Isolde',
  'Master Tobias',
  'Countess Mireille',
  'Old Wilhelm',
  'Lord Percival',
  'Sister Agathe',
  'Captain Roderick',
  'Magistra Linnea',
  'Squire Bertram',
];

export function pickBotName(taken = [], random = Math.random) {
  const used = new Set(taken);
  const free = BOT_NAMES.filter((n) => !used.has(n));
  if (free.length) return free[Math.floor(random() * free.length)];
  return `Bot ${taken.length + 1}`;
}
