// Turns engine log events into short sentences for the chronicle and banners.

import { getCharacter, getDistrict } from '../../../shared/content/index.js';

const charName = (id) => (id ? getCharacter(id).name : 'someone');
const cardName = (card) => (card ? getDistrict(card.id).name : 'a district');

export function makeNamer(view) {
  return (seat, { capital = true } = {}) => {
    if (seat == null) return capital ? 'Someone' : 'someone';
    if (seat === view.you) return capital ? 'You' : 'you';
    return view.players[seat]?.name ?? `Player ${seat + 1}`;
  };
}

const plural = (n, word) => (word === 'gold' ? `${n} gold` : `${n} ${word}${n === 1 ? '' : 's'}`);

/**
 * Returns { text, tone } or null when an event isn't worth narrating.
 * tone: 'info' | 'good' | 'bad' | 'gold' | 'muted'
 */
export function narrate(event, view) {
  const name = makeNamer(view);
  const you = (seat) => seat === view.you;
  const verb = (seat, mine, theirs) => (you(seat) ? mine : theirs);
  switch (event.type) {
    case 'game-start':
      return {
        text: `${name(event.crown)} ${verb(event.crown, 'hold', 'holds')} the crown. First to ${event.cityGoal} districts ends the game.`,
        tone: 'info',
      };
    case 'round-start':
      return {
        text: `Round ${event.round} begins.${event.faceUp?.length ? ` Set aside face up: ${event.faceUp.map(charName).join(', ')}.` : ''}`,
        tone: 'info',
        heading: true,
      };
    case 'pick':
      return event.private
        ? { text: `You chose the ${charName(event.private.character)}.`, tone: 'good' }
        : { text: `${name(event.seat)} chose a character.`, tone: 'muted' };
    case 'discard-character':
      return event.private
        ? { text: `You set the ${charName(event.private.character)} aside face down.`, tone: 'muted' }
        : { text: `${name(event.seat)} set a character aside.`, tone: 'muted' };
    case 'draft-end':
      return { text: 'The characters are called in order.', tone: 'muted' };
    case 'call':
      if (event.murdered) return { text: `The ${charName(event.character)} was murdered and loses the turn.`, tone: 'bad' };
      if (event.seat == null) return { text: `No one answers to the ${charName(event.character)}.`, tone: 'muted' };
      return { text: `${name(event.seat)} ${verb(event.seat, 'are', 'is')} the ${charName(event.character)}.`, tone: 'info' };
    case 'murder-revealed':
      return { text: `${name(event.seat)} ${verb(event.seat, 'were', 'was')} the murdered ${charName(event.character)}.`, tone: 'bad' };
    case 'robbed':
      return {
        text: `${name(event.seat)} robbed ${name(event.target, { capital: false })} of ${plural(event.amount, 'gold')}.`,
        tone: 'bad',
      };
    case 'crown':
      return { text: `${name(event.seat)} ${verb(event.seat, 'take', 'takes')} the crown.`, tone: 'gold' };
    case 'take-gold':
      return { text: `${name(event.seat)} took ${plural(event.amount, 'gold')}.`, tone: 'gold' };
    case 'gold':
      if (event.source === 'merchant')
        return { text: `${name(event.seat)} earned ${event.amount} extra gold as the Merchant.`, tone: 'gold' };
      if (event.source === 'laboratory') return { text: `${name(event.seat)} turned a card into gold in the Laboratory.`, tone: 'gold' };
      return { text: `${name(event.seat)} gained ${plural(event.amount, 'gold')}.`, tone: 'gold' };
    case 'income':
      if (!event.amount) return null;
      return { text: `${name(event.seat)} collected ${plural(event.amount, 'gold')} in taxes.`, tone: 'gold' };
    case 'draw':
      if (event.choosing) return { text: `${name(event.seat)} drew ${plural(event.count, 'card')} to choose from.`, tone: 'info' };
      return { text: `${name(event.seat)} drew ${plural(event.count, 'card')}.`, tone: 'info' };
    case 'keep':
      return { text: `${name(event.seat)} kept ${plural(event.kept, 'card')}.`, tone: 'muted' };
    case 'bonus-cards':
      return { text: `${name(event.seat)} drew ${plural(event.count, 'extra card')} as the Architect.`, tone: 'info' };
    case 'build':
      return {
        text: `${name(event.seat)} built the ${cardName(event.card)} for ${plural(event.cost, 'gold')}.`,
        tone: 'good',
        card: event.card,
      };
    case 'complete':
      return event.first
        ? {
            text: `${name(event.seat)} completed ${verb(event.seat, 'your', 'their')} city first! The game ends after this round.`,
            tone: 'gold',
            heading: true,
          }
        : { text: `${name(event.seat)} also completed ${verb(event.seat, 'your', 'their')} city.`, tone: 'gold' };
    case 'murder':
      return { text: `The Assassin marks the ${charName(event.target)} for death.`, tone: 'bad' };
    case 'rob':
      return { text: `The Thief will rob the ${charName(event.target)}.`, tone: 'bad' };
    case 'exchange':
      return { text: `${name(event.seat)} swapped hands with ${name(event.target, { capital: false })}.`, tone: 'info' };
    case 'redraw':
      return { text: `${name(event.seat)} discarded and redrew ${plural(event.count, 'card')}.`, tone: 'info' };
    case 'destroy':
      return {
        text: `${name(event.seat)} destroyed ${you(event.target) ? 'your' : `${name(event.target)}’s`} ${cardName(event.card)}.`,
        tone: 'bad',
        card: event.card,
      };
    case 'graveyard':
      return event.accepted
        ? { text: `${name(event.seat)} rescued the ${cardName(event.card)} from the Graveyard.`, tone: 'info' }
        : { text: `${name(event.seat)} let the ${cardName(event.card)} rest in peace.`, tone: 'muted' };
    case 'laboratory':
      return null;
    case 'smithy':
      return { text: `${name(event.seat)} paid 2 gold at the Smithy to draw ${plural(event.count, 'card')}.`, tone: 'info' };
    case 'end-turn':
      return null;
    case 'round-end':
      return null;
    case 'game-over':
      return { text: `${name(event.winner)} ${verb(event.winner, 'win', 'wins')} the game!`, tone: 'gold', heading: true };
    default:
      return null;
  }
}
