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
  type PlayerId,
} from './game';

const CARD_BASE = `${import.meta.env.BASE_URL}cards/`;

function CardFace({
  card,
  className,
  onClick,
  disabled = false,
}: {
  card: Card;
  className: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const alt = `${MONTH_LABELS[card.month]} ${KIND_LABELS[card.kind]} ${card.name}`;
  const image = (
    <img
      src={`${CARD_BASE}${card.id}.png`}
      alt={onClick ? '' : alt}
      draggable={false}
      loading="eager"
    />
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`card-play ${className}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={`${alt} 내기`}
      >
        {image}
      </button>
    );
  }

  return (
    <div className={`card-face ${className}`} title={alt}>
      {image}
    </div>
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

function PlayerBadge({
  player,
  game,
  score,
  total,
  active,
}: {
  player: PlayerId;
  game: GameState;
  score: HandScore;
  total: number;
  active: boolean;
}) {
  const isCpu = player === 'cpu';
  return (
    <section className={`player-badge${active ? ' active' : ''}`}>
      <span className={`player-avatar${isCpu ? ' cpu' : ''}`} aria-hidden="true">
        {isCpu ? 'CPU' : '나'}
      </span>
      <div className="player-label">
        <strong>{PLAYER_LABEL[player]}</strong>
        <span>
          고 {game.goCounts[player]} · 누적 {game.scores[player]}
        </span>
      </div>
      <div className="player-score">
        <strong>{total}</strong>
        <span>기본 {score.base}</span>
      </div>
      {isCpu && (
        <div className="opponent-cards" aria-label={`상대 패 ${game.hands.cpu.length}장`}>
          {Array.from({ length: Math.min(game.hands.cpu.length, 7) }, (_, index) => (
            <CardBack key={index} small />
          ))}
          <b>{game.hands.cpu.length}</b>
        </div>
      )}
    </section>
  );
}

function CaptureArea({
  player,
  game,
  score,
}: {
  player: PlayerId;
  game: GameState;
  score: HandScore;
}) {
  const cards = sortCards(game.captured[player]);
  const kinds = ['gwang', 'yeol', 'tti', 'pi'] as const;
  const points = [score.gwang.points, score.yeol.points, score.tti.points, score.pi.points];

  return (
    <section className="capture-area" aria-label={`${PLAYER_LABEL[player]} 획득 패`}>
      <h2>{player === 'cpu' ? '상대 먹은 패' : '내가 먹은 패'}</h2>
      <div className="capture-groups">
        {kinds.map((kind, index) => {
          const group = cards.filter((card) => card.kind === kind);
          return (
            <div className={`capture-group ${kind}`} key={kind}>
              <div className="captured-stack" aria-hidden="true">
                {group.slice(-3).map((card, stackIndex) => (
                  <img
                    key={card.id}
                    src={`${CARD_BASE}${card.id}.png`}
                    alt=""
                    style={{ '--stack': stackIndex } as CSSProperties}
                  />
                ))}
                {group.length === 0 && <span className="empty-stack" />}
                {group.length > 3 && <b>+{group.length - 3}</b>}
              </div>
              <span className="capture-label">
                {KIND_LABELS[kind]} <b>{group.length}</b>
              </span>
              <span className="capture-points">{points[index]}점</span>
            </div>
          );
        })}
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
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className="result-card">
        <span className="eyebrow">ROUND {game.round} COMPLETE</span>
        <h2 id="result-title">{winner ? `${winner} 스톱` : '나가리'}</h2>
        <p>
          {result.reason === 'stop'
            ? `${result.base}점 기본 · ${result.goCount}고`
            : '덱이 모두 소진되어 점수 없이 끝났습니다.'}
        </p>
        {result.reason === 'stop' && (
          <div className="result-score"><strong>{result.points}</strong><span>점</span></div>
        )}
        <div className="match-summary">
          <span>나 <strong>{game.scores.human}</strong></span>
          <i>:</i>
          <span><strong>{game.scores.cpu}</strong> 컴퓨터</span>
        </div>
        <div className="result-actions">
          <button type="button" className="button primary" onClick={onNext}>다음 판</button>
          <button type="button" className="button" onClick={onReset}>새 게임</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => createGame());

  const humanScore = bestKukjinChoice(game.captured.human);
  const cpuScore = bestKukjinChoice(game.captured.cpu);
  const humanTotal = calculateGoScore(humanScore, game.goCounts.human);
  const cpuTotal = calculateGoScore(cpuScore, game.goCounts.cpu);
  const canPlay = game.phase === 'playing' && game.turn === 'human';

  useEffect(() => {
    if (game.phase === 'playing' && game.turn === 'cpu' && game.hands.cpu.length > 0) {
      const timer = window.setTimeout(() => setGame((current) => cpuPlay(current)), 750);
      return () => window.clearTimeout(timer);
    }
    if (game.phase === 'choose-go-stop' && game.turn === 'cpu') {
      const timer = window.setTimeout(() => setGame((current) => cpuChooseGoStop(current)), 850);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [game]);

  const playCard = (cardId: string) => {
    if (canPlay) setGame((current) => playHandCard(current, cardId));
  };
  const decide = (decision: 'go' | 'stop') => {
    setGame((current) => chooseGoStop(current, decision));
  };
  const nextRound = () => setGame((current) => createNextRound(current));
  const reset = () => setGame(createGame());

  const status = game.phase === 'round-over'
    ? '판 종료'
    : game.phase === 'choose-go-stop'
      ? game.turn === 'human' ? '고 / 스톱 선택' : '상대 선택 중'
      : game.turn === 'human' ? '내 차례' : '상대 차례';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">花</span>
          <div><span className="eyebrow">KOREAN CARD GAME</span><h1>맞고</h1></div>
        </div>
        <div className="match-scoreboard" aria-label="대국 점수">
          <span>나 <b>{game.scores.human}</b></span>
          <i>:</i>
          <span><b>{game.scores.cpu}</b> 상대</span>
        </div>
        <div className="top-actions">
          <span className="round-label">{game.round}판째</span>
          <button type="button" className="new-game" onClick={reset}>새 게임</button>
        </div>
      </header>

      <main className="game-board">
        <div className="players-row">
          <PlayerBadge player="cpu" game={game} score={cpuScore} total={cpuTotal} active={game.turn === 'cpu'} />
          <div className={`turn-indicator ${game.turn}${game.phase !== 'playing' ? ' waiting' : ''}`} aria-live="polite">
            <span className="turn-dot" />{status}
          </div>
          <PlayerBadge player="human" game={game} score={humanScore} total={humanTotal} active={game.turn === 'human'} />
        </div>

        <div className="arena">
          <CaptureArea player="cpu" game={game} score={cpuScore} />
          <section className="table" aria-label="게임 바닥">
            <div className="table-head">
              <span>ROUND <b>{String(game.round).padStart(2, '0')}</b></span>
              <span>바닥 패 <b>{game.floor.length}</b></span>
            </div>
            <div className="table-center">
              <div className={`deck-pile${game.deck.length === 0 ? ' empty' : ''}`} aria-label={`남은 덱 ${game.deck.length}장`}>
                {game.deck.length > 0 ? <CardBack /> : <span className="deck-empty">덱 소진</span>}
                <b>{game.deck.length}</b>
              </div>
              <div className="floor" aria-live="polite">
                {game.floor.map((card) => (
                  <CardFace key={card.id} card={card} className="floor-card" />
                ))}
                {game.floor.length === 0 && <p className="empty-floor">바닥이 비었습니다</p>}
              </div>
            </div>
            <div className="table-foot"><span>같은 월을 맞춰 패를 가져오세요</span><span className="deck-caption">남은 패 {game.deck.length}장</span></div>
          </section>
          <CaptureArea player="human" game={game} score={humanScore} />
        </div>

        <section className={`hand-area${canPlay ? ' playable' : ''}`}>
          <div className="hand-heading">
            <div><span className="eyebrow">YOUR HAND</span><h2>내 패 <b>{game.hands.human.length}</b></h2></div>
            <span>{canPlay ? '낼 패를 선택하세요' : game.turn === 'cpu' ? '상대가 두는 중입니다' : '선택 대기 중'}</span>
          </div>
          <div className="hand" aria-label="내 손패">
            {game.hands.human.map((card) => (
              <CardFace key={card.id} card={card} className="hand-card" onClick={() => playCard(card.id)} disabled={!canPlay} />
            ))}
            {game.hands.human.length === 0 && <p className="empty-hand">남은 패가 없습니다.</p>}
          </div>
        </section>

        <div className="under-table">
          <details className="log-panel">
            <summary>진행 기록 <span>최근 {Math.min(8, game.log.length)}개</span></summary>
            <ol aria-live="polite">{[...game.log].reverse().slice(0, 8).map((entry, index) => <li key={`${game.log.length}-${index}`}>{entry}</li>)}</ol>
          </details>
          <details className="rules-panel">
            <summary>규칙</summary>
            <p>같은 월 패를 맞추면 가져옵니다. 광·열끗·띠·피 조합으로 점수를 얻고, 7점부터 고 또는 스톱을 선택합니다. 보너스패·흔들기·폭탄·박은 아직 적용하지 않았습니다.</p>
          </details>
        </div>
      </main>

      {game.phase === 'choose-go-stop' && game.turn === 'human' && (
        <div className="decision-wrap">
          <div className="decision-card" role="dialog" aria-modal="true" aria-labelledby="decision-title">
            <div><span className="eyebrow">고 / 스톱</span><h2 id="decision-title">{humanScore.base}점입니다</h2><p>지금 스톱하면 <strong>{humanTotal}점</strong>입니다.</p></div>
            <div className="decision-actions">
              <button type="button" className="button stop" onClick={() => decide('stop')}>스톱</button>
              <button type="button" className="button go" onClick={() => decide('go')}>고</button>
            </div>
          </div>
        </div>
      )}
      {game.phase === 'round-over' && <RoundResultPanel game={game} onNext={nextRound} onReset={reset} />}
      <footer className="app-footer"><span>맞고 · 화투 48장</span><a href={`${import.meta.env.BASE_URL}credits.html`}>화투 이미지 출처</a><span>빌드 {__BUILD_ID__}</span></footer>
    </div>
  );
}
