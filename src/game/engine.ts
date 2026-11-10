import { DECK, sortCards, type Card } from './cards';
import {
  bestKukjinChoice,
  calculateGoScore,
  canDeclare,
  type HandScore,
} from './score';

export type PlayerId = 'human' | 'cpu';
export type GamePhase = 'playing' | 'choose-go-stop' | 'round-over';

export type RoundResult = {
  winner: PlayerId | null;
  points: number;
  reason: 'stop' | 'exhausted';
  base: number;
  goCount: number;
  score: HandScore | null;
};

export type GameState = {
  round: number;
  startingPlayer: PlayerId;
  turn: PlayerId;
  phase: GamePhase;
  deck: Card[];
  hands: Record<PlayerId, Card[]>;
  floor: Card[];
  captured: Record<PlayerId, Card[]>;
  goCounts: Record<PlayerId, number>;
  lastDeclaredBase: Record<PlayerId, number>;
  scores: Record<PlayerId, number>;
  result: RoundResult | null;
  log: string[];
};

export type CreateGameOptions = {
  rng?: () => number;
  startingPlayer?: PlayerId;
  round?: number;
  scores?: Record<PlayerId, number>;
};

export const PLAYER_LABEL: Record<PlayerId, string> = {
  human: '나',
  cpu: '컴퓨터',
};

export function otherPlayer(player: PlayerId): PlayerId {
  return player === 'human' ? 'cpu' : 'human';
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function addLog(log: readonly string[], message: string): string[] {
  return [...log.slice(-39), message];
}

export function createGame(options: CreateGameOptions = {}): GameState {
  const rng = options.rng ?? Math.random;
  const deck = shuffle(DECK, rng);
  const humanHand = sortCards(deck.splice(0, 10));
  const cpuHand = sortCards(deck.splice(0, 10));
  const floor = sortCards(deck.splice(0, 8));
  const startingPlayer = options.startingPlayer ?? 'human';
  const round = options.round ?? 1;
  const scores = options.scores ?? { human: 0, cpu: 0 };

  return {
    round,
    startingPlayer,
    turn: startingPlayer,
    phase: 'playing',
    deck,
    hands: { human: humanHand, cpu: cpuHand },
    floor,
    captured: { human: [], cpu: [] },
    goCounts: { human: 0, cpu: 0 },
    lastDeclaredBase: { human: 0, cpu: 0 },
    scores: { ...scores },
    result: null,
    log: [`라운드 ${round} 시작. ${PLAYER_LABEL[startingPlayer]} 선공.`],
  };
}

export function createNextRound(state: GameState): GameState {
  return createGame({
    round: state.round + 1,
    startingPlayer: otherPlayer(state.startingPlayer),
    scores: state.scores,
  });
}

function captureCards(
  state: GameState,
  player: PlayerId,
  card: Card,
  matches: readonly Card[],
  source: 'hand' | 'draw',
): GameState {
  const matchIds = new Set(matches.map((match) => match.id));
  const captured = sortCards([...state.captured[player], card, ...matches]);
  const sourceLabel = source === 'hand' ? '' : ' (뒤집은 패)';

  return {
    ...state,
    floor: state.floor.filter((floorCard) => !matchIds.has(floorCard.id)),
    captured: { ...state.captured, [player]: captured },
    log: addLog(
      state.log,
      `${PLAYER_LABEL[player]}: ${card.name}${sourceLabel} → ${matches
        .map((match) => match.name)
        .join(', ')} 획득.`,
    ),
  };
}

function endRound(state: GameState, result: RoundResult): GameState {
  const scores = result.winner
    ? {
        ...state.scores,
        [result.winner]: state.scores[result.winner] + result.points,
      }
    : state.scores;
  const message = result.winner
    ? `${PLAYER_LABEL[result.winner]} 스톱! ${result.points}점 획득.`
    : '덱이 모두 소진되어 이번 라운드는 나가리입니다.';

  return {
    ...state,
    phase: 'round-over',
    result,
    scores,
    log: addLog(state.log, message),
  };
}

function passTurn(state: GameState, player: PlayerId): GameState {
  if (state.hands.human.length === 0 && state.hands.cpu.length === 0) {
    return endRound(state, {
      winner: null,
      points: 0,
      reason: 'exhausted',
      base: 0,
      goCount: 0,
      score: null,
    });
  }

  const nextTurn = otherPlayer(player);

  return {
    ...state,
    phase: 'playing',
    turn: nextTurn,
    log: addLog(state.log, `${PLAYER_LABEL[nextTurn]} 차례입니다.`),
  };
}

function evaluateAndPass(state: GameState, player: PlayerId): GameState {
  const score = bestKukjinChoice(state.captured[player]);

  if (canDeclare(score, state.lastDeclaredBase[player])) {
    if (state.hands.human.length === 0 && state.hands.cpu.length === 0) {
      const points = calculateGoScore(score, state.goCounts[player]);
      const finished: GameState = {
        ...state,
        log: addLog(
          state.log,
          `${PLAYER_LABEL[player]}: 마지막 턴이라 자동 스톱.`,
        ),
      };

      return endRound(finished, {
        winner: player,
        points,
        reason: 'stop',
        base: score.base,
        goCount: state.goCounts[player],
        score,
      });
    }

    return {
      ...state,
      phase: 'choose-go-stop',
      log: addLog(
        state.log,
        `${PLAYER_LABEL[player]}: ${score.base}점. 고 또는 스톱을 선택합니다.`,
      ),
    };
  }

  return passTurn(state, player);
}

export function playHandCard(state: GameState, cardId: string): GameState {
  if (state.phase !== 'playing') return state;

  const player = state.turn;
  const card = state.hands[player].find((handCard) => handCard.id === cardId);

  if (!card) return state;

  let next: GameState = {
    ...state,
    hands: {
      ...state.hands,
      [player]: state.hands[player].filter((handCard) => handCard.id !== cardId),
    },
  };

  const handMatches = next.floor.filter(
    (floorCard) => floorCard.month === card.month,
  );

  if (handMatches.length > 0) {
    next = captureCards(next, player, card, handMatches, 'hand');
  } else {
    next = {
      ...next,
      floor: sortCards([...next.floor, card]),
      log: addLog(
        next.log,
        `${PLAYER_LABEL[player]}: ${card.name} 바닥에 놓음.`,
      ),
    };
  }

  if (next.deck.length === 0) {
    return evaluateAndPass(next, player);
  }

  const [drawn, ...rest] = next.deck;
  next = { ...next, deck: rest };

  const drawMatches = next.floor.filter(
    (floorCard) => floorCard.month === drawn.month,
  );

  if (drawMatches.length > 0) {
    next = captureCards(next, player, drawn, drawMatches, 'draw');
  } else {
    next = {
      ...next,
      floor: sortCards([...next.floor, drawn]),
      log: addLog(
        next.log,
        `${PLAYER_LABEL[player]}: 뒤집은 ${drawn.name} 바닥에 놓음.`,
      ),
    };
  }

  return evaluateAndPass(next, player);
}

export function chooseGoStop(
  state: GameState,
  decision: 'go' | 'stop',
): GameState {
  if (state.phase !== 'choose-go-stop') return state;

  const player = state.turn;
  const score = bestKukjinChoice(state.captured[player]);

  if (!canDeclare(score, state.lastDeclaredBase[player])) return state;

  if (decision === 'stop') {
    const points = calculateGoScore(score, state.goCounts[player]);

    return endRound(state, {
      winner: player,
      points,
      reason: 'stop',
      base: score.base,
      goCount: state.goCounts[player],
      score,
    });
  }

  const goCount = state.goCounts[player] + 1;
  const next: GameState = {
    ...state,
    phase: 'playing',
    goCounts: { ...state.goCounts, [player]: goCount },
    lastDeclaredBase: { ...state.lastDeclaredBase, [player]: score.base },
    log: addLog(
      state.log,
      `${PLAYER_LABEL[player]}: 고! (${goCount}고, 기준 ${score.base}점)`,
    ),
  };

  return passTurn(next, player);
}

function cardStrength(card: Card): number {
  const kindValue = {
    gwang: 7,
    yeol: 5,
    tti: 3,
    pi: 1,
  }[card.kind];

  return (
    kindValue +
    (card.bird ? 2 : 0) +
    (card.kukjin ? 1 : 0) +
    (card.piValue === 2 ? 1 : 0)
  );
}

export function chooseCpuHandCard(state: GameState): Card | null {
  const current = bestKukjinChoice(state.captured.cpu);
  let best: Card | null = null;
  let bestValue = Number.NEGATIVE_INFINITY;

  for (const card of state.hands.cpu) {
    const matches = state.floor.filter(
      (floorCard) => floorCard.month === card.month,
    );
    const after = bestKukjinChoice([
      ...state.captured.cpu,
      card,
      ...matches,
    ]);
    const gain = after.total - current.total;
    const captureValue = matches.reduce(
      (sum, match) => sum + cardStrength(match),
      0,
    );
    const discardCost = matches.length === 0 ? cardStrength(card) : 0;
    const value =
      matches.length > 0
        ? gain * 12 + captureValue * 2 + matches.length * 1.5 + cardStrength(card) * 0.1
        : -discardCost;

    if (
      value > bestValue ||
      (value === bestValue && best !== null && card.id < best.id)
    ) {
      best = card;
      bestValue = value;
    }
  }

  return best;
}

export function cpuPlay(state: GameState): GameState {
  if (state.phase !== 'playing' || state.turn !== 'cpu') return state;

  const card = chooseCpuHandCard(state);

  return card ? playHandCard(state, card.id) : state;
}

export function shouldCpuStop(state: GameState): boolean {
  const score = bestKukjinChoice(state.captured.cpu);
  const goCount = state.goCounts.cpu;

  if (goCount >= 2) return true;
  if (score.base >= 10) return true;
  if (goCount >= 1 && score.base >= 8) return true;
  if (state.deck.length <= 2 && score.base >= 7) return true;

  return false;
}

export function cpuChooseGoStop(state: GameState): GameState {
  if (state.phase !== 'choose-go-stop' || state.turn !== 'cpu') return state;

  return chooseGoStop(state, shouldCpuStop(state) ? 'stop' : 'go');
}
