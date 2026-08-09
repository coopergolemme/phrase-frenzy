import { useState } from "react";
import { FlaggedWordsSheet } from "./FlaggedWordsSheet";
import { WordStatsSheet } from "./WordStatsSheet";
import { MatchHistorySheet } from "./MatchHistorySheet";
import type { WordStats } from "../utils/wordStats";
import type { MatchRecord } from "../utils/matchHistory";

interface HomeScreenProps {
  onStart: () => void;
  flaggedWords: string[];
  onUnflagWord: (word: string) => void;
  isWordFlagged: (word: string) => boolean;
  onToggleFlag: (word: string) => void;
  wordStats: WordStats;
  matchHistory: MatchRecord[];
  onClearMatchHistory: () => void;
  canInstall: boolean;
  onInstall: () => void;
}

type ActiveSheet = "flags" | "stats" | "history" | null;

export function HomeScreen({
  onStart,
  flaggedWords,
  onUnflagWord,
  isWordFlagged,
  onToggleFlag,
  wordStats,
  matchHistory,
  onClearMatchHistory,
  canInstall,
  onInstall,
}: HomeScreenProps) {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const hasWordStats = Object.keys(wordStats).length > 0;

  return (
    <div className="screen screen--home">
      <div className="home__content">
        <div className="home__intro">
          <h1 className="home__title">Phrase Frenzy</h1>
          <p className="home__subtitle">
            Pass the phone, describe the word before time runs out, and keep the
            streak going with your team.
          </p>
        </div>
        <ul className="home__instructions">
          <li>Describe the word on screen &mdash; no saying it outright.</li>
          <li>Tap <strong>Correct</strong> when your team guesses it.</li>
          <li>Tap <strong>Pass</strong> as many times as you need if you're stuck.</li>
          <li>When the timer hits zero, whoever's holding the phone is out!</li>
        </ul>
        <div className="home__links">
          {flaggedWords.length > 0 && (
            <button
              type="button"
              className="btn btn--text"
              onClick={() => setActiveSheet("flags")}
            >
              Manage flagged words ({flaggedWords.length})
            </button>
          )}
          {hasWordStats && (
            <button
              type="button"
              className="btn btn--text"
              onClick={() => setActiveSheet("stats")}
            >
              Word stats
            </button>
          )}
          {matchHistory.length > 0 && (
            <button
              type="button"
              className="btn btn--text"
              onClick={() => setActiveSheet("history")}
            >
              Match history
            </button>
          )}
          {canInstall && (
            <button type="button" className="btn btn--text" onClick={onInstall}>
              Install App
            </button>
          )}
        </div>
      </div>
      <button className="btn btn--primary btn--large" onClick={onStart}>
        Start Game
      </button>

      {activeSheet === "flags" && (
        <FlaggedWordsSheet
          flaggedWords={flaggedWords}
          onUnflag={onUnflagWord}
          onClose={() => setActiveSheet(null)}
        />
      )}

      {activeSheet === "stats" && (
        <WordStatsSheet
          stats={wordStats}
          isWordFlagged={isWordFlagged}
          onToggleFlag={onToggleFlag}
          onClose={() => setActiveSheet(null)}
        />
      )}

      {activeSheet === "history" && (
        <MatchHistorySheet
          history={matchHistory}
          onClearHistory={onClearMatchHistory}
          onClose={() => setActiveSheet(null)}
        />
      )}
    </div>
  );
}
