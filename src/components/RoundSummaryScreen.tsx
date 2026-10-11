import { useState } from "react";
import { IconFlag } from "./icons";
import { formatNameList } from "../utils/formatNameList";
import type { RoundLogEntry, Team } from "../hooks/useGameState";

interface RoundSummaryScreenProps {
  teamName: string;
  roundScore: number;
  roundLog: RoundLogEntry[];
  teams: Team[];
  isLastTurn: boolean;
  nextTeamName: string | null;
  nextDescriberName?: string | null;
  nextGuesserNames?: string[];
  // Ids of teams that have taken their turn this round; null hides the
  // played/up-next badges (round complete, or not tracked).
  playedThisRoundTeamIds?: string[] | null;
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
  nextDescriberName = null,
  nextGuesserNames = [],
  playedThisRoundTeamIds = null,
  onNext,
  onToggleWordOutcome,
  isWordFlagged,
  onToggleFlag,
}: RoundSummaryScreenProps) {
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const standings = [...teams].sort((a, b) => b.totalScore - a.totalScore);
  const leadingScore = standings[0]?.totalScore ?? 0;
  const guessersLabel = formatNameList(nextGuesserNames);
  const upNextTeamId = playedThisRoundTeamIds
    ? teams.find((team) => !playedThisRoundTeamIds.includes(team.id))?.id
    : undefined;

  return (
    <div className="screen justify-center items-center gap-5 text-center landscape-compact:gap-3 landscape-compact:overflow-y-auto">
      <div className="flex w-full flex-col items-center gap-2 landscape-compact:flex-row landscape-compact:items-stretch landscape-compact:gap-5 landscape-compact:text-left">
        <div className="hero-card landscape-compact:flex landscape-compact:flex-1 landscape-compact:flex-col landscape-compact:items-start landscape-compact:justify-center">
          <p className="m-0 text-[1.1rem] font-bold tracking-wide text-text-secondary">
            {teamName}'s round
          </p>
          <p className="m-[4px_0_0] font-display font-normal text-[3.25rem] text-primary [text-shadow:0_0_18px_rgba(52,209,122,0.5)] landscape-compact:text-[clamp(1.8rem,9vh,3.25rem)]">
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
              <span className="standings__name">
                {team.name}
                {playedThisRoundTeamIds && (
                  <RoundStatusBadge
                    played={playedThisRoundTeamIds.includes(team.id)}
                    upNext={team.id === upNextTeamId}
                  />
                )}
              </span>
              <span className="standings__score">{team.totalScore}</span>
            </div>
          ))}
        </div>
      </div>

      {!isLastTurn && nextDescriberName && (
        <div className="w-full">
          <p className="m-0 text-[0.95rem] text-text-secondary">
            Pass the phone to <span className="font-bold text-text">{nextDescriberName}</span>
          </p>
          <p className="m-[2px_0_0] text-[1.1rem] font-bold">
            {guessersLabel
              ? `${nextDescriberName} describes to ${guessersLabel}`
              : `${nextDescriberName} is describing`}
          </p>
        </div>
      )}

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
                      <IconFlag width="1em" height="1em" />
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

function RoundStatusBadge({ played, upNext }: { played: boolean; upNext: boolean }) {
  if (played) return <span className="round-badge round-badge--played">Played</span>;
  if (upNext) return <span className="round-badge round-badge--next">Up next</span>;
  return <span className="round-badge">Yet to play</span>;
}
