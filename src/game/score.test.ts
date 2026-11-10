import { describe, expect, it } from 'vitest';
import {
  DECK,
  type Card,
  type CardKind,
  type Month,
  getCard,
} from './cards';
import {
  bestKukjinChoice,
  calculateGoScore,
  canDeclare,
  scoreHand,
} from './score';

function pick(month: Month, kind: CardKind): Card[] {
  return DECK.filter((card) => card.month === month && card.kind === kind);
}

function first(month: Month, kind: CardKind): Card {
  const [card] = pick(month, kind);

  if (!card) {
    throw new Error(`Missing card: ${month}/${kind}`);
  }

  return card;
}

function many(months: readonly Month[], kind: CardKind): Card[] {
  return months.map((month) => first(month, kind));
}

function regularPi(count: number): Card[] {
  return DECK.filter(
    (card) => card.kind === 'pi' && card.piValue === 1,
  ).slice(0, count);
}

const doublePi = DECK.filter(
  (card) => card.kind === 'pi' && card.piValue === 2,
);
const gwang = (months: readonly Month[]) => many(months, 'gwang');
const tti = (months: readonly Month[]) => many(months, 'tti');
const yeol = (months: readonly Month[]) => many(months, 'yeol');

describe('deck', () => {
  it('has 48 unique cards with the standard composition', () => {
    expect(DECK).toHaveLength(48);
    expect(new Set(DECK.map((card) => card.id)).size).toBe(48);
    expect(DECK.filter((card) => card.kind === 'gwang')).toHaveLength(5);
    expect(DECK.filter((card) => card.kind === 'yeol')).toHaveLength(9);
    expect(DECK.filter((card) => card.kind === 'tti')).toHaveLength(10);
    expect(DECK.filter((card) => card.kind === 'pi')).toHaveLength(24);
    expect(DECK.filter((card) => card.piValue === 1)).toHaveLength(22);
    expect(DECK.filter((card) => card.piValue === 2)).toHaveLength(2);
  });

  it('marks the five gwang, three godori birds and kukjin', () => {
    expect(
      DECK.filter((card) => card.kind === 'gwang').map((card) => card.month),
    ).toEqual([1, 3, 8, 11, 12]);
    expect(
      DECK.filter((card) => card.bird).map((card) => card.month),
    ).toEqual([2, 4, 8]);
    expect(DECK.filter((card) => card.kukjin).map((card) => card.month)).toEqual(
      [9],
    );
    expect(first(12, 'gwang').name).toBe('비광');
    expect(first(12, 'tti').ribbon).toBe('rain');
    expect(first(3, 'gwang').name).toBe('벚꽃 광');
  });

  it('builds stable ids and resolves them', () => {
    expect(getCard('m01-gwang-1').month).toBe(1);
    expect(getCard('m12-pi-1').piValue).toBe(2);
    expect(getCard('m11-pi-1').piValue).toBe(2);
    expect(() => getCard('missing')).toThrow('Unknown card: missing');
  });
});

describe('gwang', () => {
  it('scores three gwang without rain as 3', () => {
    expect(scoreHand(gwang([1, 3, 8])).gwang).toEqual({
      count: 3,
      points: 3,
      hasRain: false,
    });
  });

  it('scores rain three gwang as 2', () => {
    expect(scoreHand(gwang([1, 3, 12])).gwang.points).toBe(2);
  });

  it('scores four gwang as 4 even with rain', () => {
    expect(scoreHand(gwang([1, 3, 8, 12])).gwang.points).toBe(4);
  });

  it('scores five gwang as 15', () => {
    const score = scoreHand(gwang([1, 3, 8, 11, 12]));
    expect(score.gwang.points).toBe(15);
    expect(score.base).toBe(15);
    expect(score.total).toBe(15);
  });

  it('does not score fewer than three gwang', () => {
    expect(scoreHand(gwang([1, 3])).gwang.points).toBe(0);
  });
});

describe('yeol', () => {
  it('scores godori as 5', () => {
    const score = scoreHand(yeol([2, 4, 8]));
    expect(score.yeol.count).toBe(3);
    expect(score.yeol.lengthPoints).toBe(0);
    expect(score.yeol.godori).toBe(true);
    expect(score.yeol.godoriPoints).toBe(5);
    expect(score.yeol.points).toBe(5);
    expect(score.base).toBe(5);
  });

  it('adds godori to yeol length points', () => {
    const score = scoreHand(yeol([2, 4, 5, 6, 8]));
    expect(score.yeol.count).toBe(5);
    expect(score.yeol.lengthPoints).toBe(1);
    expect(score.yeol.points).toBe(6);
  });

  it('doubles the hand from seven yeol', () => {
    const score = scoreHand(yeol([2, 4, 5, 6, 7, 8, 9]));
    expect(score.yeol.count).toBe(7);
    expect(score.yeol.lengthPoints).toBe(3);
    expect(score.yeol.points).toBe(8);
    expect(score.yeol.double).toBe(true);
    expect(score.base).toBe(8);
    expect(score.total).toBe(16);
  });

  it('doubles eight yeol without godori', () => {
    const score = scoreHand(yeol([2, 4, 5, 6, 7, 9, 10, 12]));
    expect(score.yeol.count).toBe(8);
    expect(score.yeol.godori).toBe(false);
    expect(score.yeol.points).toBe(4);
    expect(score.yeol.double).toBe(true);
    expect(score.total).toBe(8);
  });

  it('does not score four yeol', () => {
    const score = scoreHand(yeol([5, 6, 7, 9]));
    expect(score.yeol.lengthPoints).toBe(0);
    expect(score.yeol.double).toBe(false);
  });
});

describe('tti', () => {
  it('scores red ribbons', () => {
    const score = scoreHand(tti([1, 2, 3]));
    expect(score.tti).toEqual({
      count: 3,
      lengthPoints: 0,
      red: true,
      blue: false,
      grass: false,
      danPoints: 3,
      points: 3,
    });
  });

  it('adds ribbon length points to a dan', () => {
    const score = scoreHand(tti([1, 2, 3, 4, 5]));
    expect(score.tti.count).toBe(5);
    expect(score.tti.lengthPoints).toBe(1);
    expect(score.tti.danPoints).toBe(3);
    expect(score.tti.points).toBe(4);
  });

  it('scores red and blue dans together', () => {
    const score = scoreHand(tti([1, 2, 3, 6, 9, 10]));
    expect(score.tti.count).toBe(6);
    expect(score.tti.lengthPoints).toBe(2);
    expect(score.tti.danPoints).toBe(6);
    expect(score.tti.points).toBe(8);
  });

  it('scores all ten ribbons with all three dans', () => {
    const score = scoreHand(tti([1, 2, 3, 4, 5, 6, 7, 9, 10, 12]));
    expect(score.tti.count).toBe(10);
    expect(score.tti.lengthPoints).toBe(6);
    expect(score.tti.red).toBe(true);
    expect(score.tti.blue).toBe(true);
    expect(score.tti.grass).toBe(true);
    expect(score.tti.danPoints).toBe(9);
    expect(score.tti.points).toBe(15);
  });

  it('does not count the December ribbon as a grass dan', () => {
    expect(scoreHand(tti([4, 5, 12])).tti.grass).toBe(false);
    expect(scoreHand(tti([4, 5, 7, 12])).tti.grass).toBe(true);
  });
});

describe('pi', () => {
  it('scores from ten pi units', () => {
    expect(scoreHand(regularPi(9)).pi).toEqual({ units: 9, points: 0 });
    expect(scoreHand(regularPi(10)).pi).toEqual({ units: 10, points: 1 });
    expect(scoreHand(regularPi(11)).pi).toEqual({ units: 11, points: 2 });
  });

  it('counts double pi as two units', () => {
    const score = scoreHand([...regularPi(8), doublePi[0]]);
    expect(score.pi).toEqual({ units: 10, points: 1 });
  });

  it('counts all pi units', () => {
    const score = scoreHand([...regularPi(18), ...doublePi]);
    expect(score.pi.units).toBe(22);
    expect(score.pi.points).toBe(13);
  });
});

describe('kukjin', () => {
  const kukjin = first(9, 'yeol');

  it('can be used as pi to reach a pi score', () => {
    const cards = [...regularPi(9), kukjin];
    const asYeol = scoreHand(cards, { kukjinAsPi: false });
    const asPi = scoreHand(cards, { kukjinAsPi: true });

    expect(asYeol.pi.units).toBe(9);
    expect(asYeol.pi.points).toBe(0);
    expect(asPi.yeol.count).toBe(0);
    expect(asPi.pi.units).toBe(11);
    expect(asPi.pi.points).toBe(2);
    expect(asPi.base).toBe(2);
    expect(bestKukjinChoice(cards).kukjinAsPi).toBe(true);
  });

  it('stays a yeol when that completes a yeol score', () => {
    const cards = [...yeol([2, 4, 5, 6]), kukjin];
    const asYeol = scoreHand(cards, { kukjinAsPi: false });

    expect(asYeol.yeol.count).toBe(5);
    expect(asYeol.yeol.lengthPoints).toBe(1);
    expect(asYeol.base).toBe(1);
    expect(bestKukjinChoice(cards).kukjinAsPi).toBe(false);
  });

  it('stays a yeol to keep the seven-yeol double', () => {
    const cards = yeol([2, 4, 5, 6, 7, 8, 9]);
    const asYeol = scoreHand(cards, { kukjinAsPi: false });
    const asPi = scoreHand(cards, { kukjinAsPi: true });

    expect(asYeol.total).toBe(16);
    expect(asPi.total).toBe(7);
    expect(bestKukjinChoice(cards).kukjinAsPi).toBe(false);
  });

  it('prefers a legal declaration over a higher ineligible total', () => {
    const cards = [
      ...yeol([2, 4, 5, 6, 7, 9, 10]),
      ...tti([1, 2, 3]),
      ...regularPi(9),
    ];
    const asYeol = scoreHand(cards, { kukjinAsPi: false });
    const asPi = scoreHand(cards, { kukjinAsPi: true });

    expect(asYeol.base).toBe(6);
    expect(asYeol.total).toBe(12);
    expect(canDeclare(asYeol)).toBe(false);
    expect(asPi.base).toBe(7);
    expect(canDeclare(asPi)).toBe(true);
    expect(bestKukjinChoice(cards).kukjinAsPi).toBe(true);
  });

  it('is ignored when it is not in the hand', () => {
    const cards = regularPi(10);
    expect(bestKukjinChoice(cards).kukjinAsPi).toBe(false);
    expect(scoreHand(cards, { kukjinAsPi: true }).pi.units).toBe(10);
  });
});

describe('go and stop', () => {
  const baseSeven = [
    ...gwang([1, 3, 8]),
    ...tti([1, 2, 3, 4, 5]),
  ];

  it('allows stop from seven base points', () => {
    const score = scoreHand(baseSeven);
    expect(score.base).toBe(7);
    expect(canDeclare(score)).toBe(true);
    expect(canDeclare(score, 6)).toBe(true);
    expect(canDeclare(score, 7)).toBe(false);
  });

  it('does not allow a declaration below seven', () => {
    const score = scoreHand([...gwang([1, 3, 8]), ...tti([1, 2, 3, 4])]);
    expect(score.base).toBe(6);
    expect(canDeclare(score)).toBe(false);
  });

  it('applies the go bonus and multiplier', () => {
    const score = scoreHand(baseSeven);
    expect(calculateGoScore(score, 0)).toBe(7);
    expect(calculateGoScore(score, 1)).toBe(8);
    expect(calculateGoScore(score, 2)).toBe(9);
    expect(calculateGoScore(score, 3)).toBe(20);
    expect(calculateGoScore(score, 4)).toBe(44);
    expect(calculateGoScore(score, 5)).toBe(96);
  });

  it('applies the yeol double after go', () => {
    const score = scoreHand(yeol([2, 4, 5, 6, 7, 8, 9]));
    expect(score.total).toBe(16);
    expect(calculateGoScore(score, 0)).toBe(16);
    expect(calculateGoScore(score, 3)).toBe(44);
  });

  it('scores the documented three-gwang and red-dan example', () => {
    const score = scoreHand([
      ...gwang([1, 3, 8]),
      ...tti([1, 2, 3]),
      ...regularPi(9),
      doublePi[0],
    ]);

    expect(score.gwang.points).toBe(3);
    expect(score.tti.points).toBe(3);
    expect(score.pi.units).toBe(11);
    expect(score.pi.points).toBe(2);
    expect(score.base).toBe(8);
    expect(calculateGoScore(score, 2)).toBe(10);
  });

  it('returns zero for an empty hand', () => {
    const score = scoreHand([]);
    expect(score.base).toBe(0);
    expect(score.total).toBe(0);
    expect(calculateGoScore(score, 0)).toBe(0);
    expect(canDeclare(score)).toBe(false);
  });
});
