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
  onRefreshWords: () => void | Promise<void>;
  isRefreshingWords: boolean;
  refreshWordsError: string | null;
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

  return (
    <div className="screen screen--home">
      <div className="home__content">
        <div className="home__intro">
          <div className="home__intro-row">
            <h1 className="home__title">Phrase Frenzy</h1>
            <div className="home__menu-anchor">
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
                  </div>
                </>
              )}
            </div>
          </div>
          <p className="home__subtitle">
            Pass the phone, describe the word before time runs out, and keep the
            streak going with your team.
          </p>
          {refreshWordsError && <p className="home__error">{refreshWordsError}</p>}
        </div>
        <ul className="home__instructions">
          <li>Describe the word on screen &mdash; no saying it outright.</li>
          <li>Tap <strong>Correct</strong> when your team guesses it.</li>
          <li>Tap <strong>Pass</strong> as many times as you need if you're stuck.</li>
          <li>When the timer hits zero, whoever's holding the phone is out!</li>
        </ul>
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
