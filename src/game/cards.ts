export const MONTHS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
] as const;

export type Month = (typeof MONTHS)[number];

export type CardKind = 'gwang' | 'yeol' | 'tti' | 'pi';

export type RibbonColor = 'red' | 'blue' | 'grass' | 'rain';

export type Card = {
  id: string;
  month: Month;
  kind: CardKind;
  name: string;
  ribbon?: RibbonColor;
  piValue?: 1 | 2;
  bird?: boolean;
  kukjin?: boolean;
};

type CardSeed = Omit<Card, 'id' | 'month'>;

type MonthSeed = {
  month: Month;
  cards: readonly CardSeed[];
};

export const KIND_LABELS: Record<CardKind, string> = {
  gwang: '광',
  yeol: '열끗',
  tti: '띠',
  pi: '피',
};

const KIND_ORDER: Record<CardKind, number> = {
  gwang: 0,
  yeol: 1,
  tti: 2,
  pi: 3,
};

export const MONTH_LABELS: Record<Month, string> = {
  1: '송학',
  2: '매조',
  3: '벚꽃',
  4: '흑싸리',
  5: '난초',
  6: '모란',
  7: '홍싸리',
  8: '공산',
  9: '국화',
  10: '단풍',
  11: '오동',
  12: '비',
};

const MONTH_SEEDS: readonly MonthSeed[] = [
  {
    month: 1,
    cards: [
      { kind: 'gwang', name: '송학 광' },
      { kind: 'tti', name: '홍단', ribbon: 'red' },
      { kind: 'pi', name: '송학 피', piValue: 1 },
      { kind: 'pi', name: '송학 피', piValue: 1 },
    ],
  },
  {
    month: 2,
    cards: [
      { kind: 'yeol', name: '매조 새', bird: true },
      { kind: 'tti', name: '홍단', ribbon: 'red' },
      { kind: 'pi', name: '매조 피', piValue: 1 },
      { kind: 'pi', name: '매조 피', piValue: 1 },
    ],
  },
  {
    month: 3,
    cards: [
      { kind: 'gwang', name: '벚꽃 광' },
      { kind: 'tti', name: '홍단', ribbon: 'red' },
      { kind: 'pi', name: '벚꽃 피', piValue: 1 },
      { kind: 'pi', name: '벚꽃 피', piValue: 1 },
    ],
  },
  {
    month: 4,
    cards: [
      { kind: 'yeol', name: '두견새', bird: true },
      { kind: 'tti', name: '초단', ribbon: 'grass' },
      { kind: 'pi', name: '흑싸리 피', piValue: 1 },
      { kind: 'pi', name: '흑싸리 피', piValue: 1 },
    ],
  },
  {
    month: 5,
    cards: [
      { kind: 'yeol', name: '난초 다리' },
      { kind: 'tti', name: '초단', ribbon: 'grass' },
      { kind: 'pi', name: '난초 피', piValue: 1 },
      { kind: 'pi', name: '난초 피', piValue: 1 },
    ],
  },
  {
    month: 6,
    cards: [
      { kind: 'yeol', name: '모란 나비' },
      { kind: 'tti', name: '청단', ribbon: 'blue' },
      { kind: 'pi', name: '모란 피', piValue: 1 },
      { kind: 'pi', name: '모란 피', piValue: 1 },
    ],
  },
  {
    month: 7,
    cards: [
      { kind: 'yeol', name: '멧돼지' },
      { kind: 'tti', name: '초단', ribbon: 'grass' },
      { kind: 'pi', name: '홍싸리 피', piValue: 1 },
      { kind: 'pi', name: '홍싸리 피', piValue: 1 },
    ],
  },
  {
    month: 8,
    cards: [
      { kind: 'gwang', name: '공산 명월' },
      { kind: 'yeol', name: '기러기', bird: true },
      { kind: 'pi', name: '공산 피', piValue: 1 },
      { kind: 'pi', name: '공산 피', piValue: 1 },
    ],
  },
  {
    month: 9,
    cards: [
      { kind: 'yeol', name: '국진', kukjin: true },
      { kind: 'tti', name: '청단', ribbon: 'blue' },
      { kind: 'pi', name: '국화 피', piValue: 1 },
      { kind: 'pi', name: '국화 피', piValue: 1 },
    ],
  },
  {
    month: 10,
    cards: [
      { kind: 'yeol', name: '단풍 사슴' },
      { kind: 'tti', name: '청단', ribbon: 'blue' },
      { kind: 'pi', name: '단풍 피', piValue: 1 },
      { kind: 'pi', name: '단풍 피', piValue: 1 },
    ],
  },
  {
    month: 11,
    cards: [
      { kind: 'gwang', name: '오동 광' },
      { kind: 'pi', name: '오동 쌍피', piValue: 2 },
      { kind: 'pi', name: '오동 피', piValue: 1 },
      { kind: 'pi', name: '오동 피', piValue: 1 },
    ],
  },
  {
    month: 12,
    cards: [
      { kind: 'gwang', name: '비광' },
      { kind: 'yeol', name: '제비' },
      { kind: 'tti', name: '비띠', ribbon: 'rain' },
      { kind: 'pi', name: '비 쌍피', piValue: 2 },
    ],
  },
];

function buildDeck(): Card[] {
  const deck: Card[] = [];

  for (const { month, cards } of MONTH_SEEDS) {
    const counts = new Map<CardKind, number>();

    for (const seed of cards) {
      const index = (counts.get(seed.kind) ?? 0) + 1;
      counts.set(seed.kind, index);
      deck.push({
        ...seed,
        id: `m${String(month).padStart(2, '0')}-${seed.kind}-${index}`,
        month,
      });
    }
  }

  return deck;
}

export const DECK: readonly Card[] = buildDeck();

export function sortCards(cards: readonly Card[]): Card[] {
  return [...cards].sort(
    (a, b) =>
      a.month - b.month ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.id.localeCompare(b.id),
  );
}

export function getCard(id: string): Card {
  const card = DECK.find((item) => item.id === id);

  if (!card) {
    throw new Error(`Unknown card: ${id}`);
  }

  return card;
}
