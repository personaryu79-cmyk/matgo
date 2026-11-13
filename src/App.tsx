import { useEffect, useState, type CSSProperties } from 'react';
import {
  KIND_LABELS,
  MONTH_LABELS,
  PLAYER_LABEL,
  bestKukjinChoice,
  calculateGoScore,
  chooseGoStop,
  cpuChooseGoStop,
  cpuPlay,
  createGame,
  createNextRound,
  playHandCard,
  sortCards,
  type Card,
  type GameState,
  type HandScore,
  type Month,
  type PlayerId,
} from './game';

type CardTileProps = { 
  card: Card;
  onClick?: (e: React.MouseEvent) => void;
  onHover?: () => void;
  disabled?: boolean;
  matched?: boolean;
  matchCount?: number;
};
const MONTH_HUE: Record<Month, number> = {
  1: 352,
  2: 330,
  3: 335,
  4: 112,
  5: 144,
  6: 302,
  7: 94,
  8: 202,
  9: 44,
  10: 24,
  11: 274,
  12: 212,
};

function cardTone(card: Card): string {
  switch (card.kind) {
    case 'gwang':
      return '#d8a84e';
    case 'yeol':
      return card.bird ? '#72b58b' : '#b4a46b';
    case 'tti':
      switch (card.ribbon) {
        case 'red':
          return '#c63a3a';
        case 'blue':
          return '#4f7db3';
        case 'grass':
          return '#7d9b58';
        case 'rain':
          return '#9a7fc1';
        default:
          return '#8e9388';
      }
    case 'pi':
      return card.piValue === 2 ? '#8a6fb0' : '#9b9d8e';
  }
}

function cardStyle(card: Card): CSSProperties {
  return {
    '--tone': cardTone(card),
    '--month-hue': String(MONTH_HUE[card.month]),
  } as CSSProperties;
}

function CardTile({
  card,
  onClick,
  onHover,
  disabled = false,
  matched = false,
  matchCount = 0,
}: CardTileProps) {
  const className = `card${matched ? ' matched' : ''}${
    disabled ? ' disabled' : ''
  }`;
  const content = (
    <>
      <span className="card-band" aria-hidden="true" />
      <span className="card-month">{String(card.month).padStart(2, '0')}</span>
      <span className="card-name">{card.name}</span>
      <span className="card-kind">{KIND_LABELS[card.kind]}</span>
      {matchCount > 0 && (
        <span className="card-match" aria-hidden="true">
          +{matchCount}
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`${className} playable`}
        style={cardStyle(card)}
        onClick={onClick}
        onMouseEnter={onHover}
        onFocus={onHover}
        disabled={disabled}
        aria-label={`${MONTH_LABELS[card.month]} ${card.name}${
          disabled ? '' : ' 내기'
        }`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={className}
      style={cardStyle(card)}
      title={`${MONTH_LABELS[card.month]} ${card.name}`}
    >
      {content}
    </div>
  );
}

function CompactCard({ card }: { card: Card }) {
  return (
    <span
      className="chip"
      style={cardStyle(card)}
      title={`${MONTH_LABELS[card.month]} ${card.name}`}
    >
      <b>{String(card.month).padStart(2, '0')}</b>
      <span>{KIND_LABELS[card.kind]}</span>
    </span>
  );
}

function CardBack({ small = false }: { small?: boolean }) {
  return (
    <span className={`card-back${small ? ' small' : ''}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function PlayerPanel({
  player,
  game,
  score,
  total,
  active,
  showHand,
}: {
  player: PlayerId;
  game: GameState;
  score: HandScore;
  total: number;
  active: boolean;
  showHand: boolean;
}) {
  const captured = sortCards(game.captured[player]);

  return (
    <section className={`player-panel${active ? ' active' : ''}`}>
      <header className="player-head">
        <div className="player-id">
          <span className="avatar">{player === 'human' ? '나' : '컴'}</span>
          <div>
            <strong>{PLAYER_LABEL[player]}</strong>
            <span>
              누적 {game.scores[player]}점 · 고 {game.goCounts[player]}회
            </span>
          </div>
        </div>
        <div className="player-points">
          <strong>{total}</strong>
          <span>현재 · 기본 {score.base}</span>
        </div>
      </header>

      {showHand && (
        <div
          className="opponent-hand"
          aria-label={`컴퓨터 패 ${game.hands[player].length}장`}
        >
          <div className="backs">
            {Array.from({ length: game.hands[player].length }, (_, index) => (
              <CardBack key={index} small />
            ))}
          </div>
          <span>{game.hands[player].length}장</span>
        </div>
      )}

      <div className="chips" aria-label={`${PLAYER_LABEL[player]} 획득 패`}>
        {captured.length === 0 ? (
          <span className="empty-chips">획득한 패 없음</span>
        ) : (
          captured.map((card) => <CompactCard key={card.id} card={card} />)
        )}
      </div>

      <div className="breakdown">
        <span>광 {score.gwang.points}</span>
        <span>열끗 {score.yeol.points}</span>
        <span>띠 {score.tti.points}</span>
        <span>피 {score.pi.points}</span>
        {score.yeol.double && <span className="double">멍따 ×2</span>}
      </div>
    </section>
  );
}

function RoundResultPanel({
  game,
  onNext,
  onReset,
}: {
  game: GameState;
  onNext: () => void;
  onReset: () => void;
}) {
  const result = game.result;

  if (!result) return null;

  const winner = result.winner ? PLAYER_LABEL[result.winner] : null;

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
    >
      <div className="result-card">
        <span className="eyebrow">라운드 {game.round} 종료</span>
        <h2 id="result-title">{winner ? `${winner} 스톱` : '나가리'}</h2>
        <p>
          {result.reason === 'stop'
            ? `${result.base}점 기본 · ${result.goCount}고`
            : '덱이 모두 소진되어 점수 없이 끝났습니다.'}
        </p>

        {result.reason === 'stop' && (
          <div className="result-score">
            <strong>{result.points}</strong>
            <span>점</span>
          </div>
        )}

        {result.score && (
          <div className="result-breakdown">
            <span>광 {result.score.gwang.points}</span>
            <span>열끗 {result.score.yeol.points}</span>
            <span>띠 {result.score.tti.points}</span>
            <span>피 {result.score.pi.points}</span>
            {result.score.yeol.double && <span>멍따 ×2</span>}
          </div>
        )}

        <div className="match-summary">
          <span>
            나 <strong>{game.scores.human}</strong>
          </span>
          <span className="colon">:</span>
          <span>
            <strong>{game.scores.cpu}</strong> 컴퓨터
          </span>
        </div>

        <div className="result-actions">
          <button type="button" className="button primary" onClick={onNext}>
            다음 라운드
          </button>
          <button type="button" className="button" onClick={onReset}>
            새 게임
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [hoverMonth, setHoverMonth] = useState<Month | null>(null);

  const humanScore = bestKukjinChoice(game.captured.human);
  const cpuScore = bestKukjinChoice(game.captured.cpu);
  const humanTotal = calculateGoScore(humanScore, game.goCounts.human);
  const cpuTotal = calculateGoScore(cpuScore, game.goCounts.cpu);
  const canPlay = game.phase === 'playing' && game.turn === 'human';

  useEffect(() => {
    if (
      game.phase === 'playing' &&
      game.turn === 'cpu' &&
      game.hands.cpu.length > 0
    ) {
      const timer = window.setTimeout(
        () => setGame((current) => cpuPlay(current)),
        800,
      );
      return () => window.clearTimeout(timer);
    }

    if (game.phase === 'choose-go-stop' && game.turn === 'cpu') {
      const timer = window.setTimeout(
        () => setGame((current) => cpuChooseGoStop(current)),
        1000,
      );
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [game]);

  const playCard = (cardId: string) => {
    if (!canPlay) return;
    setGame((current) => playHandCard(current, cardId));
    setHoverMonth(null);
  };

  const decide = (decision: 'go' | 'stop') => {
    setGame((current) => chooseGoStop(current, decision));
  };

  const nextRound = () => {
    setGame((current) => createNextRound(current));
    setHoverMonth(null);
  };

  const reset = () => {
    setGame(createGame());
    setHoverMonth(null);
  };

  const status =
    game.phase === 'round-over'
      ? '라운드 종료'
      : game.phase === 'choose-go-stop'
        ? game.turn === 'human'
          ? '고 / 스톱 선택'
          : '컴퓨터 선택 중'
        : game.turn === 'human'
          ? '내 차례'
          : '컴퓨터 차례';

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div>
            <span className="eyebrow">2인 맞고 · 라운드 {game.round}</span>
            <h1>맞고</h1>
          </div>
        </div>
        <div className="match-scores">
          <span>
            나 <strong>{game.scores.human}</strong>
          </span>
          <span>
            컴퓨터 <strong>{game.scores.cpu}</strong>
          </span>
          <button type="button" className="reset" onClick={reset}>
            새 게임
          </button>
        </div>
      </header>

      <main className="game">
        <PlayerPanel
          player="cpu"
          game={game}
          score={cpuScore}
          total={cpuTotal}
          active={game.turn === 'cpu'}
          showHand
        />

        <section className="table" aria-label="바닥">
          <div className="table-top">
            <div
              className={`deck-pile${game.deck.length === 0 ? ' empty' : ''}`}
              aria-label={`남은 덱 ${game.deck.length}장`}
            >
              <CardBack />
              <span className="deck-count">
                {game.deck.length}
                <small>장</small>
              </span>
            </div>
            <div className="table-status">
              <span
                className={`turn-pill ${game.turn}${
                  game.phase !== 'playing' ? ' wait' : ''
                }`}
              >
                {status}
              </span>
              <span>바닥 {game.floor.length}장</span>
            </div>
          </div>

          <div className="floor" onMouseLeave={() => setHoverMonth(null)} aria-live="polite">
             {game.floor.map((card) => (
               <img 
                 key={card.id} 
                 src={`${import.meta.env.BASE_URL}cards/${card.id}.svg`}
                 alt={`${card.kind === 'gwang' ? '광' : card.kind === 'yeol' ? '열끗' : card.kind === 'tti' ? '띠' : '피'} - ${card.name}`} 
                 className="floor-card"
               />
             ))}
            {game.floor.length === 0 && (
              <p>바닥이 비었습니다</p>
            )}
          </div>
        </section>

        <PlayerPanel
          player="human"
          game={game}
          score={humanScore}
          total={humanTotal}
          active={game.turn === 'human'}
          showHand={false}
        />

        <section className="hand-area">
          <div className="hand-head">
            <h2>내 패</h2>
            <span>
              {canPlay
                ? '낼 카드를 선택하세요'
                : game.turn === 'cpu'
                  ? '컴퓨터가 두는 중입니다'
                  : '선택 대기 중'}
            </span>
          </div>
          <div className="hand" onMouseLeave={() => setHoverMonth(null)}>
            {game.hands.human.map((card) => {
               return (
                 <img 
                   key={card.id} 
                   src={`${import.meta.env.BASE_URL}cards/${card.id}.svg`}
                   alt={`${card.kind === 'gwang' ? '광' : card.kind === 'yeol' ? '열끗' : card.kind === 'tti' ? '띠' : '피'} - ${card.name}`} 
                   className="hand-card"
                 />
               );
             })}
            {game.hands.human.length === 0 && (
              <p className="empty-hand">남은 패가 없습니다.</p>
            )}
          </div>
          <p className="hand-tip">
            같은 월의 바닥 패는 자동으로 함께 먹습니다. 피는 10장부터
            점수가 됩니다.
          </p>
        </section>

        <section className="log-panel">
          <div className="panel-head">
            <h2>진행 기록</h2>
            <span>최근 8개</span>
          </div>
          <ol aria-live="polite">
            {[...game.log]
              .reverse()
              .slice(0, 8)
              .map((entry, index) => (
                <li key={`${game.log.length}-${index}`}>{entry}</li>
              ))}
          </ol>
        </section>

        <details className="rules-panel">
          <summary>규칙 보기</summary>
          <ul>
            <li>광 3장 3점(비광 포함 2점), 4장 4점, 5장 15점입니다.</li>
            <li>고도리 5점. 홍단·청단·초단은 각 3점입니다.</li>
            <li>열끗·띠는 5장부터, 피는 10장부터 1점씩 올라갑니다.</li>
            <li>7점부터 고/스톱. 고 후에는 이전 기준보다 높아야 합니다.</li>
            <li>열끗 7장 이상은 최종 점수 2배(멍따)입니다.</li>
            <li>국진은 열끗과 쌍피 중 유리한 쪽으로 자동 계산합니다.</li>
            <li>덱이 소진되면 점수 없이 라운드가 끝납니다.</li>
            <li>보너스패·흔들기·폭탄·박은 다음 단계에서 추가합니다.</li>
          </ul>
        </details>
      </main>

      {game.phase === 'choose-go-stop' && game.turn === 'human' && (
        <div className="decision-wrap">
          <div
            className="decision-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="decision-title"
          >
            <div>
              <span className="eyebrow">고 / 스톱</span>
              <h2 id="decision-title">{humanScore.base}점입니다</h2>
              <p>
                지금 스톱하면 <strong>{humanTotal}점</strong>입니다. 고를
                외치면 계속합니다.
              </p>
            </div>
            <div className="decision-actions">
              <button
                type="button"
                className="button primary"
                onClick={() => decide('stop')}
              >
                스톱
              </button>
              <button
                type="button"
                className="button"
                onClick={() => decide('go')}
              >
                고
              </button>
            </div>
          </div>
        </div>
      )}

      {game.phase === 'round-over' && (
        <RoundResultPanel game={game} onNext={nextRound} onReset={reset} />
      )}

      <footer className="footer">
        <span>오프라인에서도 플레이할 수 있습니다</span>
        <span className="build-id">빌드 {__BUILD_ID__}</span>
      </footer>
    </div>
  );
}
