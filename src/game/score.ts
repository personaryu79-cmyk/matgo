import type { Card, Month } from './cards';

export const MATGO_WIN_THRESHOLD = 7;
export const GODORI_POINTS = 5;
export const DAN_POINTS = 3;

export const GODORI_MONTHS: readonly Month[] = [2, 4, 8];
export const RED_RIBBON_MONTHS: readonly Month[] = [1, 2, 3];
export const BLUE_RIBBON_MONTHS: readonly Month[] = [6, 9, 10];
export const GRASS_RIBBON_MONTHS: readonly Month[] = [4, 5, 7];

export type ScoreOptions = {
  kukjinAsPi?: boolean;
};

export type HandScore = {
  gwang: {
    count: number;
    points: number;
    hasRain: boolean;
  };
  yeol: {
    count: number;
    lengthPoints: number;
    godori: boolean;
    godoriPoints: number;
    double: boolean;
    points: number;
  };
  tti: {
    count: number;
    lengthPoints: number;
    red: boolean;
    blue: boolean;
    grass: boolean;
    danPoints: number;
    points: number;
  };
  pi: {
    units: number;
    points: number;
  };
  kukjinAsPi: boolean;
  base: number;
  total: number;
};

function hasAllMonths(cards: readonly Card[], months: readonly Month[]): boolean {
  const present = new Set(cards.map((card) => card.month));
  return months.every((month) => present.has(month));
}

export function scoreHand(
  cards: readonly Card[],
  options: ScoreOptions = {},
): HandScore {
  const kukjinAsPi = options.kukjinAsPi ?? false;

  const gwangCards = cards.filter((card) => card.kind === 'gwang');
  const gwangCount = gwangCards.length;
  const hasRain = gwangCards.some((card) => card.month === 12);
  const gwangPoints =
    gwangCount === 5
      ? 15
      : gwangCount === 4
        ? 4
        : gwangCount === 3
          ? hasRain
            ? 2
            : 3
          : 0;

  const yeolCards = cards.filter(
    (card) => card.kind === 'yeol' && !(kukjinAsPi && card.kukjin),
  );
  const yeolCount = yeolCards.length;
  const yeolLengthPoints = Math.max(0, yeolCount - 4);
  const godori = hasAllMonths(yeolCards, GODORI_MONTHS);
  const godoriPoints = godori ? GODORI_POINTS : 0;
  const yeolDouble = yeolCount >= 7;
  const yeolPoints = yeolLengthPoints + godoriPoints;

  const ttiCards = cards.filter((card) => card.kind === 'tti');
  const ttiCount = ttiCards.length;
  const ttiLengthPoints = Math.max(0, ttiCount - 4);
  const red = hasAllMonths(ttiCards, RED_RIBBON_MONTHS);
  const blue = hasAllMonths(ttiCards, BLUE_RIBBON_MONTHS);
  const grass = hasAllMonths(ttiCards, GRASS_RIBBON_MONTHS);
  const danPoints =
    (red ? DAN_POINTS : 0) +
    (blue ? DAN_POINTS : 0) +
    (grass ? DAN_POINTS : 0);
  const ttiPoints = ttiLengthPoints + danPoints;

  const piUnits =
    cards
      .filter((card) => card.kind === 'pi')
      .reduce((sum, card) => sum + (card.piValue ?? 1), 0) +
    (kukjinAsPi ? cards.filter((card) => card.kukjin).length * 2 : 0);
  const piPoints = Math.max(0, piUnits - 9);

  const base = gwangPoints + yeolPoints + ttiPoints + piPoints;
  const total = base * (yeolDouble ? 2 : 1);

  return {
    gwang: {
      count: gwangCount,
      points: gwangPoints,
      hasRain,
    },
    yeol: {
      count: yeolCount,
      lengthPoints: yeolLengthPoints,
      godori,
      godoriPoints,
      double: yeolDouble,
      points: yeolPoints,
    },
    tti: {
      count: ttiCount,
      lengthPoints: ttiLengthPoints,
      red,
      blue,
      grass,
      danPoints,
      points: ttiPoints,
    },
    pi: {
      units: piUnits,
      points: piPoints,
    },
    kukjinAsPi,
    base,
    total,
  };
}

export function calculateGoScore(score: HandScore, goCount = 0): number {
  const go = Math.max(0, Math.floor(goCount));
  const goMultiplier = go >= 3 ? 2 ** (go - 2) : 1;
  const doubleMultiplier = score.yeol.double ? 2 : 1;

  return (score.base + go) * goMultiplier * doubleMultiplier;
}

export function canDeclare(score: HandScore, lastDeclaredBase = 0): boolean {
  return (
    score.base >= MATGO_WIN_THRESHOLD && score.base > lastDeclaredBase
  );
}

export function bestKukjinChoice(
  cards: readonly Card[],
  lastDeclaredBase = 0,
): HandScore {
  const asYeol = scoreHand(cards, { kukjinAsPi: false });
  const asPi = scoreHand(cards, { kukjinAsPi: true });
  const yeolCanDeclare = canDeclare(asYeol, lastDeclaredBase);
  const piCanDeclare = canDeclare(asPi, lastDeclaredBase);

  if (yeolCanDeclare !== piCanDeclare) {
    return piCanDeclare ? asPi : asYeol;
  }

  return asPi.total > asYeol.total ? asPi : asYeol;
}
