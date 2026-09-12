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
  onClearMatchHistory: () => void;
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
  onClearMatchHistory,
  canInstall,
  onInstall,
  onRefreshWords,
  isRefreshingWords,
  refreshWordsError,
}: HomeScreenProps) {
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hasWordStats = Object.keys(wordStats).length > 0;

  const closeMenu = () => setIsMenuOpen(false);

  const openSheet = (sheet: ActiveSheet) => {
    closeMenu();
    setActiveSheet(sheet);
  };

  const handleInstall = () => {
    closeMenu();
    onInstall();
  };

  const handleRefreshWords = () => {
    closeMenu();
    void onRefreshWords();
  };

  const handleOpenAdmin = () => {
    closeMenu();
    window.location.hash = "admin";
  };

  return (
    <div className="screen flex flex-col justify-between pt-6 pb-4 landscape-compact:pt-2 landscape-compact:pb-2 landscape-compact:overflow-y-auto">
      <div className="flex flex-col gap-4 landscape-compact:flex-row landscape-compact:items-center landscape-compact:gap-5">
        <div className="flex flex-col gap-4 landscape-compact:flex-1 landscape-compact:gap-2">
          <div className="relative">
            <h1 className="m-0 -rotate-1 text-center font-display font-bold text-[clamp(1.75rem,7.5vmin,2.5rem)] leading-tight text-yellow [text-shadow:3px_3px_0_rgba(0,0,0,0.35)] landscape-compact:text-left">
              Phrase Frenzy
            </h1>
            <div className="absolute right-0 top-1">
              <button
                type="button"
                className="icon-menu-btn"
                onClick={() => setIsMenuOpen((open) => !open)}
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
              >
                ⋯
              </button>

              {isMenuOpen && (
                <>
                  <button
                    type="button"
                    className="icon-menu__backdrop"
                    onClick={closeMenu}
                    aria-label="Close menu"
                  />
                  <div className="icon-menu" role="menu">
                    {flaggedWords.length > 0 && (
                      <button
                        type="button"
                        className="icon-menu__item"
                        role="menuitem"
                        onClick={() => openSheet("flags")}
                      >
                        <span className="icon-menu__icon" aria-hidden="true">
                          🚩
                        </span>
                        Flagged Words ({flaggedWords.length})
                      </button>
                    )}
                    {hasWordStats && (
                      <button
                        type="button"
                        className="icon-menu__item"
                        role="menuitem"
                        onClick={() => openSheet("stats")}
                      >
                        <span className="icon-menu__icon" aria-hidden="true">
                          📊
                        </span>
                        Word Stats
                      </button>
                    )}
                    {matchHistory.length > 0 && (
                      <button
                        type="button"
                        className="icon-menu__item"
                        role="menuitem"
                        onClick={() => openSheet("history")}
                      >
                        <span className="icon-menu__icon" aria-hidden="true">
                          🕐
                        </span>
                        Match History
                      </button>
                    )}
                    {canInstall && (
                      <button
                        type="button"
                        className="icon-menu__item"
                        role="menuitem"
                        onClick={handleInstall}
                      >
                        <span className="icon-menu__icon" aria-hidden="true">
                          ⬇️
                        </span>
                        Install App
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-menu__item"
                      role="menuitem"
                      onClick={handleRefreshWords}
                      disabled={isRefreshingWords}
                    >
                      <span className="icon-menu__icon" aria-hidden="true">
                        🔄
                      </span>
                      {isRefreshingWords ? "Refreshing words…" : "Refresh Word Bank"}
                    </button>
                    <button
                      type="button"
                      className="icon-menu__item"
                      role="menuitem"
                      onClick={handleOpenAdmin}
                    >
                      <span className="icon-menu__icon" aria-hidden="true">
                        🛠️
                      </span>
                      Admin
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <p className="m-0 text-center text-base leading-snug text-text-secondary landscape-compact:text-left">
            Pass the phone, describe the word before time runs out, and keep the
            streak going with your team.
          </p>
          {refreshWordsError && (
            <p className="m-0 text-center text-[0.9rem] leading-snug text-danger">
              {refreshWordsError}
            </p>
          )}
        </div>
        <ul className="m-0 flex list-none flex-col gap-3 rounded-card border border-outline bg-surface p-5 text-[0.95rem] leading-snug backdrop-blur-[20px] landscape-compact:flex-1 landscape-compact:gap-2 landscape-compact:p-4">
          <li>Describe the word on screen &mdash; no saying it outright.</li>
          <li>Tap <strong>Correct</strong> when your team guesses it.</li>
          <li>Tap <strong>Pass</strong> as many times as you need if you're stuck.</li>
          <li>When the timer hits zero, whoever's holding the phone is out!</li>
        </ul>
      </div>
      <button className="btn btn--primary btn--large" onClick={onStart}>
        Start Game
      </button>
      {import.meta.env.DEV && onStartTestGame && (
        <button
          type="button"
          className="btn btn--large mt-2 border-dashed opacity-70"
          onClick={onStartTestGame}
        >
          🧪 Test Game (dev only)
        </button>
      )}

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
