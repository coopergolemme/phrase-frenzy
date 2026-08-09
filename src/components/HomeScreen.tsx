import { useState } from "react";
import { FlaggedWordsSheet } from "./FlaggedWordsSheet";

interface HomeScreenProps {
  onStart: () => void;
  flaggedWords: string[];
  onUnflagWord: (word: string) => void;
}

export function HomeScreen({ onStart, flaggedWords, onUnflagWord }: HomeScreenProps) {
  const [isManagingFlags, setIsManagingFlags] = useState(false);

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
        {flaggedWords.length > 0 && (
          <button
            type="button"
            className="btn btn--text"
            onClick={() => setIsManagingFlags(true)}
          >
            Manage flagged words ({flaggedWords.length})
          </button>
        )}
      </div>
      <button className="btn btn--primary btn--large" onClick={onStart}>
        Start Game
      </button>

      {isManagingFlags && (
        <FlaggedWordsSheet
          flaggedWords={flaggedWords}
          onUnflag={onUnflagWord}
          onClose={() => setIsManagingFlags(false)}
        />
      )}
    </div>
  );
}
