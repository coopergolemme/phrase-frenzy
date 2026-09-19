import { useState } from "react";
import { FlaggedWordsSheet } from "./FlaggedWordsSheet";
import { WordStatsSheet } from "./WordStatsSheet";
import { MatchHistorySheet } from "./MatchHistorySheet";
import type { WordStats } from "../utils/wordStats";
import type { MatchRecord } from "../utils/matchHistory";

interface HomeScreenProps {
  onStart: () => void;
  onStartTestGame?: () => void;
  flaggedWords: string[];
  onUnflagWord: (word: string) => void;
  isWordFlagged: (word: string) => boolean;
  onToggleFlag: (word: string) => void;
  wordStats: WordStats;
  matchHistory: MatchRecord[];
  canInstall: boolean;
  onInstall: () => void;
  onRefreshWords: () => void | Promise<void>;
  isRefreshingWords: boolean;
  refreshWordsError: string | null;
}

type ActiveSheet = "flags" | "stats" | "history" | null;

export function HomeScreen({
  onStart,
  onStartTestGame,
  flaggedWords,
  onUnflagWord,
  isWordFlagged,
  onToggleFlag,
  wordStats,
  matchHistory,
  canInstall,
  onInstall,
  onRefreshWords,
  isRefreshingWords,
  refreshWordsError,
}: HomeScreenProps) {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const hasWordStats = Object.keys(wordStats).length > 0;

  const openSheet = (sheet: ActiveSheet) => {
    setActiveSheet(sheet);
  };

  const handleInstall = () => {
    onInstall();
  };

  const handleRefreshWords = () => {
    void onRefreshWords();
  };

  const handleOpenAdmin = () => {
    window.location.hash = "admin";
  };

  const handleStartTestGame = () => {
    onStartTestGame?.();
  };

  return (
    <div className="screen flex flex-col justify-between pt-6 pb-4 landscape-compact:pt-2 landscape-compact:pb-2 landscape-compact:overflow-y-auto">
      <div className="flex flex-col gap-4 landscape-compact:flex-row landscape-compact:items-center landscape-compact:gap-5">
        <div className="flex flex-col items-center gap-3 landscape-compact:flex-1 landscape-compact:flex-row landscape-compact:items-center landscape-compact:gap-4">
          <img
            src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
            alt=""
            width={72}
            height={72}
            className="h-[72px] w-[72px] rounded-[1.25rem] shadow-[0_4px_0_rgba(0,0,0,0.35)]"
          />
          <div className="flex flex-col gap-4 landscape-compact:gap-2">
            <h1 className="m-0 -rotate-1 text-center font-display font-bold text-[clamp(1.75rem,7.5vmin,2.5rem)] leading-tight text-yellow [text-shadow:3px_3px_0_rgba(0,0,0,0.35)] landscape-compact:text-left">
              Phrase Frenzy
            </h1>
            {refreshWordsError && (
              <p className="m-0 text-center text-[0.9rem] leading-snug text-danger">
                {refreshWordsError}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <button className="btn btn--primary btn--large" onClick={onStart}>
            Start Game
          </button>
          <button
            type="button"
            className="btn btn--outline btn--large"
            onClick={() => {
              window.location.hash = "multiplayer";
            }}
          >
            Play Online
          </button>
          <div className="flex flex-wrap justify-center gap-2">
            {flaggedWords.length > 0 && (
              <button type="button" className="btn btn--small btn--outline" onClick={() => openSheet("flags")}>
                <span className="btn__icon" aria-hidden="true">
                  🚩
                </span>
                Flagged ({flaggedWords.length})
              </button>
            )}
            {hasWordStats && (
              <button type="button" className="btn btn--small btn--outline" onClick={() => openSheet("stats")}>
                <span className="btn__icon" aria-hidden="true">
                  📊
                </span>
                Stats
              </button>
            )}
            {matchHistory.length > 0 && (
              <button type="button" className="btn btn--small btn--outline" onClick={() => openSheet("history")}>
                <span className="btn__icon" aria-hidden="true">
                  🕐
                </span>
                History
              </button>
            )}
            {canInstall && (
              <button type="button" className="btn btn--small btn--outline" onClick={handleInstall}>
                <span className="btn__icon" aria-hidden="true">
                  ⬇️
                </span>
                Install
              </button>
            )}
            <button
              type="button"
              className="btn btn--small btn--outline"
              onClick={handleRefreshWords}
              disabled={isRefreshingWords}
            >
              <span className="btn__icon" aria-hidden="true">
                🔄
              </span>
              {isRefreshingWords ? "Refreshing…" : "Refresh Words"}
            </button>
            <button type="button" className="btn btn--small btn--outline" onClick={handleOpenAdmin}>
              <span className="btn__icon" aria-hidden="true">
                🛠️
              </span>
              Admin
            </button>
            {import.meta.env.DEV && onStartTestGame && (
              <button type="button" className="btn btn--small btn--outline" onClick={handleStartTestGame}>
                <span className="btn__icon" aria-hidden="true">
                  🧪
                </span>
                Test Game
              </button>
            )}
          </div>
        </div>
      </div>

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
        <MatchHistorySheet history={matchHistory} onClose={() => setActiveSheet(null)} />
      )}
    </div>
  );
}
