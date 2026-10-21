// Presents new game events with sound, motion and announcements. The state
// is rendered first; the presenter then animates from where things *were*
// (captured just before rendering) to where they are now.

import { getCharacter, getDistrict } from '../../../shared/content/index.js';
import { play } from '../audio/index.js';
import { FX } from './fx.js';
import { makeNamer } from './narrate.js';

export class Presenter {
  constructor({ root, fx, banners }) {
    this.root = root;
    this.fx = fx;
    this.banners = banners;
  }

  /** Remember element positions before the DOM is updated. */
  snapshot() {
    const rects = new Map();
    for (const el of this.root.querySelectorAll('[data-uid]')) {
      if (el.closest('.fx-layer')) continue;
      const r = el.getBoundingClientRect();
      if (r.width) rects.set(`${el.dataset.uid}`, FX.cloneRect(r));
    }
    return rects;
  }

  anchor(seat, kind) {
    const el =
      this.root.querySelector(`.seat-anchor[data-seat="${seat}"][data-anchor="${kind}"]`) ??
      this.root.querySelector(`.seat[data-seat="${seat}"]`);
    return FX.fromNode(el);
  }

  place(name) {
    return FX.fromNode(this.root.querySelector(`.seat-anchor[data-anchor="${name}"]`));
  }

  cardRect(uid) {
    const el = this.root.querySelector(`.me-city [data-uid="${uid}"], .seat-city [data-uid="${uid}"], .me-hand [data-uid="${uid}"]`);
    return el ? { el, rect: FX.fromNode(el) } : null;
  }

  present(view, events, before) {
    const name = makeNamer(view);
    const you = view.you;
    let delay = 0;
    for (const e of events) {
      try {
        delay = this._one(e, view, before, name, you, delay) ?? delay;
      } catch (err) {
        console.warn('[presenter]', e.type, err);
      }
    }
  }

  _one(e, view, before, name, you) {
    const fx = this.fx;
    switch (e.type) {
      case 'round-start':
        play('roundStart');
        this.banners.push({ title: `Round ${e.round}`, subtitle: 'Choose your characters', tone: 'gold', duration: 1300, minor: true });
        break;
      case 'pick':
        play(e.seat === you ? 'pick' : 'cardFlip');
        break;
      case 'discard-character':
        play('cardFlip');
        break;
      case 'call': {
        const c = getCharacter(e.character);
        if (e.murdered) {
          play('murdered');
          this.banners.push({ character: e.character, title: `The ${c.name}`, subtitle: 'lies murdered — the turn is lost', tone: 'bad', duration: 1700 });
        } else if (e.seat === you) {
          play('yourTurn');
          this.banners.push({ character: e.character, title: `You are the ${c.name}`, subtitle: 'It is your turn!', tone: 'gold', duration: 1600, big: true });
        } else if (e.seat != null) {
          // The spotlight already shows who was called; a bell is enough.
          play('call');
        }
        break;
      }
      case 'murder':
        play('murder');
        this.banners.push({ character: 'assassin', title: `The ${getCharacter(e.target).name} is marked`, subtitle: 'The Assassin strikes from the shadows', tone: 'bad', duration: 1600 });
        break;
      case 'rob':
        play('rob');
        this.banners.push({ character: 'thief', title: `The ${getCharacter(e.target).name} will be robbed`, subtitle: 'The Thief lies in wait', tone: 'bad', duration: 1500 });
        break;
      case 'robbed':
        play('robbed');
        fx.coins(this.anchor(e.target, 'gold'), this.anchor(e.seat, 'gold'), Math.max(1, e.amount));
        this.banners.push({ character: 'thief', title: `${e.amount} gold stolen!`, subtitle: `${name(e.seat)} robbed ${name(e.target, { capital: false })}`, tone: 'bad', duration: 1500 });
        break;
      case 'crown': {
        play('crown');
        const target = this.anchor(e.seat, 'crown');
        const from = this.place('bank');
        fx.crown(from, target);
        break;
      }
      case 'take-gold':
        play('coins', { count: e.amount });
        fx.coins(this.place('bank'), this.anchor(e.seat, 'gold'), e.amount);
        break;
      case 'gold':
        if (e.source === 'laboratory') play('lab');
        else play('coins', { count: e.amount });
        fx.coins(this.place('bank'), this.anchor(e.seat, 'gold'), e.amount, { delay: 250 });
        break;
      case 'income':
        if (e.amount > 0) {
          play('income', { count: e.amount });
          fx.coins(this.place('bank'), this.anchor(e.seat, 'gold'), e.amount);
        }
        break;
      case 'draw':
        for (let i = 0; i < e.count; i++) play('cardDraw', { delay: i * 0.1 });
        if (e.seat === you && e.choosing) break; // the choice overlay presents them
        fx.cards(this.place('deck'), e.seat === you ? FX.fromNode(this.root.querySelector('.me-hand')) : this.anchor(e.seat, 'hand'), e.count);
        break;
      case 'keep':
        play('cardSelect');
        break;
      case 'bonus-cards':
      case 'smithy':
        if (e.type === 'smithy') play('anvil');
        else play('architect');
        fx.cards(this.place('deck'), e.seat === you ? FX.fromNode(this.root.querySelector('.me-hand')) : this.anchor(e.seat, 'hand'), e.count, { delay: 150 });
        break;
      case 'build': {
        play('build');
        const dest = this.cardRect(e.card.uid);
        const from = before.get(String(e.card.uid)) ?? this.anchor(e.seat, 'hand');
        if (dest?.el && from) {
          dest.el.classList.add('fx-hidden');
          const clone = dest.el.cloneNode(true);
          clone.classList.remove('fx-hidden', 'is-entering');
          this.fx.element(clone, from, dest.rect, { scaleFrom: from.width / dest.rect.width, scaleTo: 1, duration: 650 }).then(() => {
            dest.el.classList.remove('fx-hidden');
            dest.el.classList.add('fx-land');
            fx.dust(FX.fromNode(dest.el));
            setTimeout(() => dest.el.classList.remove('fx-land'), 700);
          });
        }
        break;
      }
      case 'complete':
        play('complete');
        this.banners.push({ crown: true, title: e.seat === you ? 'Your city is complete!' : `${name(e.seat)} completed their city`, subtitle: e.first ? 'The game ends after this round' : 'A city fit for a king', tone: 'gold', duration: 2200, big: true });
        fx.burst(this.anchor(e.seat, 'city'), { count: 24, spread: 110 });
        break;
      case 'exchange':
        play('magic');
        fx.cards(this.anchor(e.seat, 'hand'), this.anchor(e.target, 'hand'), Math.min(4, e.gave || 1));
        fx.cards(this.anchor(e.target, 'hand'), this.anchor(e.seat, 'hand'), Math.min(4, e.got || 1), { delay: 120 });
        this.banners.push({ character: 'magician', title: 'Hands exchanged!', subtitle: `${name(e.seat)} ⇄ ${name(e.target)}`, tone: 'info', duration: 1500 });
        break;
      case 'redraw':
        play('magic');
        fx.cards(this.anchor(e.seat, 'hand'), this.place('deck'), Math.min(4, e.count));
        fx.cards(this.place('deck'), this.anchor(e.seat, 'hand'), Math.min(4, e.count), { delay: 450 });
        break;
      case 'destroy': {
        play('destroy');
        const rect = before.get(String(e.card.uid));
        const def = getDistrict(e.card.id);
        if (rect) fx.crumble(rect, getComputedStyle(document.documentElement).getPropertyValue(`--${def.suit}`).trim() || '#8a7a66');
        fx.shake(this.root.querySelector(`.seat[data-seat="${e.target}"]`) ?? (e.target === you ? this.root.querySelector('.me-city') : null));
        this.banners.push({ character: 'warlord', title: `The ${def.name} falls!`, subtitle: `${name(e.seat)} razed ${e.target === you ? 'your' : `${name(e.target)}’s`} district`, tone: 'bad', duration: 1700 });
        break;
      }
      case 'graveyard':
        if (e.accepted) {
          play('graveyard');
          fx.cards(this.anchor(e.seat, 'city'), this.anchor(e.seat, 'hand'), 1);
        }
        break;
      case 'end-turn':
        break;
      case 'game-over':
        play(e.winner === you || you == null ? 'victory' : 'defeat');
        if (e.winner === you || you == null) fx.confetti();
        break;
      default:
        break;
    }
    return undefined;
  }
}
