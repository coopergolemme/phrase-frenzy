import { useState } from "react";
import type { RoundLogEntry, Team } from "../hooks/useGameState";

interface RoundSummaryScreenProps {
  teamName: string;
  roundScore: number;
  roundLog: RoundLogEntry[];
  teams: Team[];
  isLastTurn: boolean;
  nextTeamName: string | null;
  onNext: () => void;
  onToggleWordOutcome: (index: number) => void;
  isWordFlagged: (word: string) => boolean;
  onToggleFlag: (word: string) => void;
}

export function RoundSummaryScreen({
  teamName,
  roundScore,
  roundLog,
  teams,
  isLastTurn,
  nextTeamName,
  onNext,
  onToggleWordOutcome,
  isWordFlagged,
  onToggleFlag,
}: RoundSummaryScreenProps) {
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const standings = [...teams].sort((a, b) => b.totalScore - a.totalScore);
  const leadingScore = standings[0]?.totalScore ?? 0;

  return (
    <div className="screen justify-center items-center gap-5 text-center landscape-compact:gap-3 landscape-compact:overflow-y-auto">
      <div className="flex w-full flex-col items-center gap-2 landscape-compact:flex-row landscape-compact:items-stretch landscape-compact:gap-5 landscape-compact:text-left">
        <div className="hero-card landscape-compact:flex landscape-compact:flex-1 landscape-compact:flex-col landscape-compact:items-start landscape-compact:justify-center">
          <p className="m-0 text-[1.1rem] font-bold tracking-wide text-text-secondary">
            {teamName}'s round
          </p>
          <p className="m-[4px_0_0] font-display font-bold text-[3.25rem] text-primary landscape-compact:text-[clamp(1.8rem,9vh,3.25rem)]">
            {roundScore}
          </p>
          <p className="m-0 mb-4 text-text-secondary">words guessed</p>
          {roundLog.length > 0 && (
            <button
              type="button"
              className="btn btn--outline mt-2 w-full"
              onClick={() => setIsReviewOpen(true)}
            >
              Review Words
            </button>
          )}
        </div>

        <div className="standings landscape-compact:flex-1 landscape-compact:justify-center">
          <p className="standings__title landscape-compact:text-left">Standings</p>
          {standings.map((team) => (
            <div
              key={team.id}
              className={
                "standings__row" +
                (team.totalScore === leadingScore ? " standings__row--leader" : "")
              }
            >
              <span className="standings__name">{team.name}</span>
              <span className="standings__score">{team.totalScore}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn--primary btn--large w-full" onClick={onNext}>
        {isLastTurn ? "See Final Results" : `Next Team's Turn — ${nextTeamName}`}
      </button>

      {isReviewOpen && (
        <div className="review-sheet">
          <div className="review-sheet__header">
            <p className="review-sheet__title">{teamName}'s words</p>
            <button
              type="button"
              className="review-sheet__close"
              onClick={() => setIsReviewOpen(false)}
              aria-label="Close review"
            >
              &times;
            </button>
          </div>

          <div className="review-sheet__list">
            {roundLog.map((entry, index) => {
              const flagged = isWordFlagged(entry.word);
              return (
                <div className="review-row" key={index}>
                  <span className="review-row__word">{entry.word}</span>
                  <div className="review-row__actions">
                    <button
                      type="button"
                      className={
                        "outcome-pill" +
                        (entry.outcome === "correct"
                          ? " outcome-pill--correct"
                          : " outcome-pill--skipped")
                      }
                      onClick={() => onToggleWordOutcome(index)}
                    >
                      {entry.outcome === "correct" ? "Correct" : "Skipped"}
                    </button>
                    <button
                      type="button"
                      className={"flag-btn" + (flagged ? " flag-btn--active" : "")}
                      onClick={() => onToggleFlag(entry.word)}
                      aria-pressed={flagged}
                      aria-label={
                        flagged
                          ? `Unflag "${entry.word}"`
                          : `Flag "${entry.word}" as too hard`
                      }
                    >
                      🚩
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="btn btn--primary btn--large"
            onClick={() => setIsReviewOpen(false)}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
