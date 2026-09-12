import { useEffect } from "react";
import type { GameStatus } from "./useGameState";

// home stays hash-less rather than "#home" so a fresh visit and a reset
// both land on a clean root URL.
export const GAME_STATUS_HASHES: Record<GameStatus, string> = {
  home: "",
  teamSetup: "#teamSetup",
  playing: "#playing",
  roundSummary: "#roundSummary",
  gameOver: "#gameOver",
};

// Keeps the URL in sync with the current screen using replaceState (not
// pushState) so game transitions never grow the browser history stack —
// there's no sensible "undo" for actions like CORRECT/TIME_UP, so the back
// button shouldn't walk through them.
export function useGameStatusHash(gameStatus: GameStatus): void {
  useEffect(() => {
    const hash = GAME_STATUS_HASHES[gameStatus];
    const url = window.location.pathname + window.location.search + hash;
    window.history.replaceState(null, "", url);
  }, [gameStatus]);
}
