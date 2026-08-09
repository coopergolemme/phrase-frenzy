interface EndScreenProps {
  score: number;
  onPlayAgain: () => void;
}

export function EndScreen({ score, onPlayAgain }: EndScreenProps) {
  return (
    <div className="screen screen--end">
      <div className="end__content">
        <h1 className="end__title">Time's Up!</h1>
        <p className="end__score-label">Words guessed</p>
        <p className="end__score">{score}</p>
      </div>
      <button className="btn btn--primary btn--large" onClick={onPlayAgain}>
        Play Again
      </button>
    </div>
  );
}
