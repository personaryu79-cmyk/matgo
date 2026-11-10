import { describe, expect, it } from 'vitest';
import { DECK, getCard, sortCards, type Card } from './cards';
import {
  chooseCpuHandCard,
  chooseGoStop,
  cpuChooseGoStop,
  cpuPlay,
  createGame,
  createNextRound,
  playHandCard,
  shouldCpuStop,
  type GameState,
} from './engine';

const cards = (...ids: string[]): Card[] => ids.map(getCard);
const regularPi = (count: number): Card[] =>
  DECK.filter((card) => card.kind === 'pi' && card.piValue === 1).slice(
    0,
    count,
  );

function baseGame(overrides: Partial<GameState> = {}): GameState {
  const base = createGame({ rng: () => 0.31, startingPlayer: 'human' });

  return {
    ...base,
    deck: [],
    hands: { human: [], cpu: [] },
    floor: [],
    captured: { human: [], cpu: [] },
    goCounts: { human: 0, cpu: 0 },
    lastDeclaredBase: { human: 0, cpu: 0 },
    scores: { human: 0, cpu: 0 },
    phase: 'playing',
    turn: 'human',
    result: null,
    log: [],
    ...overrides,
  };
}

const gwang = cards('m01-gwang-1', 'm03-gwang-1', 'm08-gwang-1');
const red = cards('m01-tti-1', 'm02-tti-1', 'm03-tti-1');
const baseSeven = [...gwang, ...red, ...regularPi(10)];
const baseEight = [...gwang, ...red, ...regularPi(11)];
const baseTen = [...gwang, ...red, ...regularPi(13)];

describe('deal', () => {
  it('deals ten cards each, eight on the floor and twenty in the deck', () => {
    const game = createGame({ rng: () => 0.5 });

    expect(game.hands.human).toHaveLength(10);
    expect(game.hands.cpu).toHaveLength(10);
    expect(game.floor).toHaveLength(8);
    expect(game.deck).toHaveLength(20);
    expect(game.turn).toBe('human');
    expect(game.phase).toBe('playing');
    expect(game.result).toBeNull();
  });

  it('deals every card exactly once', () => {
    const game = createGame({ rng: () => 0.25 });
    const all = [
      ...game.hands.human,
      ...game.hands.cpu,
      ...game.floor,
      ...game.deck,
    ];

    expect(all).toHaveLength(48);
    expect(new Set(all.map((card) => card.id)).size).toBe(48);
  });

  it('sorts cards by month and kind', () => {
    const sorted = sortCards([
      getCard('m03-pi-1'),
      getCard('m01-tti-1'),
      getCard('m01-gwang-1'),
    ]);

    expect(sorted.map((card) => card.id)).toEqual([
      'm01-gwang-1',
      'm01-tti-1',
      'm03-pi-1',
    ]);
  });
});

describe('playHandCard', () => {
  it('captures every matching floor card', () => {
    const game = baseGame({
      hands: {
        human: cards('m05-yeol-1'),
        cpu: cards('m01-pi-1'),
      },
      floor: cards('m01-gwang-1', 'm05-tti-1', 'm05-pi-1'),
      deck: cards('m12-pi-1'),
      turn: 'human',
    });
    const next = playHandCard(game, 'm05-yeol-1');

    expect(next.hands.human).toHaveLength(0);
    expect(next.captured.human.map((card) => card.id).sort()).toEqual(
      ['m05-yeol-1', 'm05-tti-1', 'm05-pi-1'].sort(),
    );
    expect(next.captured.cpu).toHaveLength(0);
    expect(next.floor.map((card) => card.id).sort()).toEqual(
      ['m01-gwang-1', 'm12-pi-1'].sort(),
    );
    expect(next.turn).toBe('cpu');
    expect(next.phase).toBe('playing');
  });

  it('places a non-matching hand card on the floor', () => {
    const game = baseGame({
      hands: {
        human: cards('m02-tti-1'),
        cpu: cards('m01-pi-1'),
      },
      floor: cards('m01-gwang-1'),
      deck: cards('m12-pi-1'),
    });
    const next = playHandCard(game, 'm02-tti-1');

    expect(next.floor.map((card) => card.id).sort()).toEqual(
      ['m01-gwang-1', 'm02-tti-1', 'm12-pi-1'].sort(),
    );
    expect(next.captured.human).toHaveLength(0);
    expect(next.turn).toBe('cpu');
  });

  it('captures with the drawn card as well', () => {
    const game = baseGame({
      hands: {
        human: cards('m01-tti-1'),
        cpu: cards('m02-pi-1'),
      },
      floor: cards('m01-gwang-1', 'm05-pi-1'),
      deck: cards('m05-tti-1'),
    });
    const next = playHandCard(game, 'm01-tti-1');

    expect(next.captured.human.map((card) => card.id).sort()).toEqual(
      ['m01-tti-1', 'm01-gwang-1', 'm05-tti-1', 'm05-pi-1'].sort(),
    );
    expect(next.floor).toHaveLength(0);
    expect(next.deck).toHaveLength(0);
  });

  it('rejects cards that are not in hand or not playable now', () => {
    const game = baseGame({
      hands: {
        human: cards('m01-pi-1'),
        cpu: cards('m02-pi-1'),
      },
    });

    const finished = { ...game, phase: 'round-over' as const };

    expect(playHandCard(game, 'missing')).toBe(game);
    expect(playHandCard(finished, 'm01-pi-1')).toBe(finished);
  });
});

describe('go and stop', () => {
  it('prompts at seven base points and scores a stop', () => {
    const game = baseGame({
      hands: {
        human: cards('m05-yeol-1'),
        cpu: cards('m11-pi-3'),
      },
      deck: cards('m12-pi-1'),
      captured: { human: baseSeven, cpu: [] },
    });
    const prompted = playHandCard(game, 'm05-yeol-1');

    expect(prompted.phase).toBe('choose-go-stop');
    expect(prompted.turn).toBe('human');

    const stopped = chooseGoStop(prompted, 'stop');

    expect(stopped.phase).toBe('round-over');
    expect(stopped.result).toMatchObject({
      winner: 'human',
      points: 7,
      reason: 'stop',
      base: 7,
      goCount: 0,
    });
    expect(stopped.scores.human).toBe(7);
  });

  it('records a go and passes the turn', () => {
    const game = baseGame({
      hands: {
        human: cards('m05-yeol-1'),
        cpu: cards('m11-pi-3'),
      },
      deck: cards('m12-pi-1'),
      captured: { human: baseSeven, cpu: [] },
    });
    const prompted = playHandCard(game, 'm05-yeol-1');
    const went = chooseGoStop(prompted, 'go');

    expect(went.phase).toBe('playing');
    expect(went.turn).toBe('cpu');
    expect(went.goCounts.human).toBe(1);
    expect(went.lastDeclaredBase.human).toBe(7);
    expect(went.scores.human).toBe(0);
  });

  it('adds the go bonus after a go', () => {
    const game = baseGame({
      phase: 'choose-go-stop',
      turn: 'human',
      captured: { human: baseTen, cpu: [] },
      goCounts: { human: 1, cpu: 0 },
      lastDeclaredBase: { human: 7, cpu: 0 },
    });
    const stopped = chooseGoStop(game, 'stop');

    expect(stopped.result?.points).toBe(11);
    expect(stopped.result?.goCount).toBe(1);
    expect(stopped.scores.human).toBe(11);
  });

  it('automatically stops when the last cards are played', () => {
    const game = baseGame({
      hands: {
        human: cards('m05-yeol-1'),
        cpu: [],
      },
      deck: [],
      captured: { human: baseSeven, cpu: [] },
    });
    const next = playHandCard(game, 'm05-yeol-1');

    expect(next.phase).toBe('round-over');
    expect(next.result).toMatchObject({
      winner: 'human',
      points: 7,
      reason: 'stop',
    });
  });

  it('ends the round as a draw when the cards run out', () => {
    const game = baseGame({
      hands: {
        human: cards('m05-yeol-1'),
        cpu: [],
      },
      deck: [],
      captured: { human: [], cpu: [] },
    });
    const next = playHandCard(game, 'm05-yeol-1');

    expect(next.phase).toBe('round-over');
    expect(next.result).toMatchObject({
      winner: null,
      points: 0,
      reason: 'exhausted',
    });
    expect(next.scores).toEqual({ human: 0, cpu: 0 });
  });
});

describe('computer', () => {
  it('chooses a capture that completes a dan', () => {
    const game = baseGame({
      phase: 'playing',
      turn: 'cpu',
      hands: {
        human: cards('m01-pi-1'),
        cpu: cards('m03-pi-1', 'm05-pi-1'),
      },
      floor: cards('m03-tti-1'),
      deck: cards('m12-pi-1'),
      captured: {
        human: [],
        cpu: cards('m01-tti-1', 'm02-tti-1'),
      },
    });

    expect(chooseCpuHandCard(game)?.id).toBe('m03-pi-1');
  });

  it('plays a card and captures the floor match', () => {
    const game = baseGame({
      phase: 'playing',
      turn: 'cpu',
      hands: {
        human: cards('m01-pi-1'),
        cpu: cards('m03-pi-1', 'm05-pi-1'),
      },
      floor: cards('m03-tti-1'),
      deck: cards('m12-pi-1'),
      captured: {
        human: [],
        cpu: cards('m01-tti-1', 'm02-tti-1'),
      },
    });
    const next = cpuPlay(game);

    expect(
      next.captured.cpu.some((card) => card.id === 'm03-tti-1'),
    ).toBe(true);
    expect(next.turn).toBe('human');
  });

  const safeDeck = cards('m11-gwang-1', 'm12-pi-1', 'm12-tti-1');

  it('goes at seven and stops at ten', () => {
    expect(
      shouldCpuStop(
        baseGame({
          captured: { human: [], cpu: baseSeven },
          deck: safeDeck,
        }),
      ),
    ).toBe(false);
    expect(
      shouldCpuStop(baseGame({ captured: { human: [], cpu: baseTen } })),
    ).toBe(true);
  });

  it('stops after one go at eight points', () => {
    expect(
      shouldCpuStop(
        baseGame({
          captured: { human: [], cpu: baseEight },
          goCounts: { human: 0, cpu: 1 },
          deck: safeDeck,
        }),
      ),
    ).toBe(true);
    expect(
      shouldCpuStop(
        baseGame({
          captured: { human: [], cpu: baseSeven },
          goCounts: { human: 0, cpu: 1 },
          deck: safeDeck,
        }),
      ),
    ).toBe(false);
  });

  it('always stops after two go calls', () => {
    expect(
      shouldCpuStop(
        baseGame({
          captured: { human: [], cpu: baseSeven },
          goCounts: { human: 0, cpu: 2 },
          deck: safeDeck,
        }),
      ),
    ).toBe(true);
  });

  it('applies the computer go decision', () => {
    const state = baseGame({
      phase: 'choose-go-stop',
      turn: 'cpu',
      captured: { human: [], cpu: baseSeven },
      hands: {
        human: cards('m01-pi-1'),
        cpu: cards('m02-pi-1'),
      },
      deck: safeDeck,
    });
    const next = cpuChooseGoStop(state);

    expect(next.phase).toBe('playing');
    expect(next.goCounts.cpu).toBe(1);
    expect(next.turn).toBe('human');
  });

  it('applies a computer stop and adds the round score', () => {
    const state = baseGame({
      phase: 'choose-go-stop',
      turn: 'cpu',
      captured: { human: [], cpu: baseTen },
      scores: { human: 2, cpu: 4 },
    });
    const next = cpuChooseGoStop(state);

    expect(next.phase).toBe('round-over');
    expect(next.result?.winner).toBe('cpu');
    expect(next.result?.points).toBe(10);
    expect(next.scores).toEqual({ human: 2, cpu: 14 });
  });
});

describe('full round simulation', () => {
  it('finishes with all 48 cards accounted for', () => {
    let state = createGame({ rng: () => 0.37 });
    let steps = 0;

    while (state.phase !== 'round-over' && steps < 200) {
      steps += 1;

      if (state.phase === 'choose-go-stop') {
        state = chooseGoStop(state, 'stop');
      } else if (state.turn === 'cpu') {
        state = cpuPlay(state);
      } else {
        const card = state.hands.human[0];
        state = card ? playHandCard(state, card.id) : state;
      }

      const zones = [
        ...state.deck,
        ...state.hands.human,
        ...state.hands.cpu,
        ...state.floor,
        ...state.captured.human,
        ...state.captured.cpu,
      ];

      expect(zones).toHaveLength(48);
      expect(new Set(zones.map((item) => item.id)).size).toBe(48);
    }

    expect(state.phase).toBe('round-over');
    expect(steps).toBeLessThan(200);
  });
});

describe('next round', () => {
  it('keeps match scores and alternates the starting player', () => {
    const first = createGame({
      rng: () => 0.2,
      scores: { human: 7, cpu: 3 },
    });
    const next = createNextRound(first);

    expect(next.round).toBe(2);
    expect(next.startingPlayer).toBe('cpu');
    expect(next.turn).toBe('cpu');
    expect(next.scores).toEqual({ human: 7, cpu: 3 });
    expect(next.goCounts).toEqual({ human: 0, cpu: 0 });
    expect(next.captured.human).toHaveLength(0);
    expect(next.deck).toHaveLength(20);
  });
});
