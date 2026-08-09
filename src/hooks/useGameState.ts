import { useReducer } from "react";
import { WORD_BANK } from "../data/words";
import { shuffle } from "../utils/shuffle";

export type GameStatus = "home" | "playing" | "ended";

export interface GameState {
  gameStatus: GameStatus;
  currentWord: string;
  score: number;
  passUsed: boolean;
  deckOrder: string[];
  deckIndex: number;
}

type GameAction =
  | { type: "START_GAME" }
  | { type: "CORRECT" }
  | { type: "PASS" }
  | { type: "TIME_UP" }
  | { type: "RESET" };

const initialState: GameState = {
  gameStatus: "home",
  currentWord: "",
  score: 0,
  passUsed: false,
  deckOrder: [],
  deckIndex: 0,
};

function drawNextWord(deckOrder: string[], deckIndex: number, currentWord: string) {
  if (deckIndex >= deckOrder.length) {
    let reshuffled = shuffle(WORD_BANK);
    if (reshuffled[0] === currentWord && reshuffled.length > 1) {
      const swapIndex = 1 + Math.floor(Math.random() * (reshuffled.length - 1));
      [reshuffled[0], reshuffled[swapIndex]] = [reshuffled[swapIndex], reshuffled[0]];
    }
    return { deckOrder: reshuffled, deckIndex: 1, word: reshuffled[0] };
  }
  return { deckOrder, deckIndex: deckIndex + 1, word: deckOrder[deckIndex] };
}

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      const deckOrder = shuffle(WORD_BANK);
      return {
        gameStatus: "playing",
        currentWord: deckOrder[0],
        score: 0,
        passUsed: false,
        deckOrder,
        deckIndex: 1,
      };
    }
    case "CORRECT": {
      if (state.gameStatus !== "playing") return state;
      const next = drawNextWord(state.deckOrder, state.deckIndex, state.currentWord);
      return {
        ...state,
        score: state.score + 1,
        currentWord: next.word,
        deckOrder: next.deckOrder,
        deckIndex: next.deckIndex,
      };
    }
    case "PASS": {
      if (state.gameStatus !== "playing" || state.passUsed) return state;
      const next = drawNextWord(state.deckOrder, state.deckIndex, state.currentWord);
      return {
        ...state,
        passUsed: true,
        currentWord: next.word,
        deckOrder: next.deckOrder,
        deckIndex: next.deckIndex,
      };
    }
    case "TIME_UP":
      if (state.gameStatus !== "playing") return state;
      return { ...state, gameStatus: "ended" };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return {
    state,
    startGame: () => dispatch({ type: "START_GAME" }),
    markCorrect: () => dispatch({ type: "CORRECT" }),
    markPass: () => dispatch({ type: "PASS" }),
    timeUp: () => dispatch({ type: "TIME_UP" }),
    reset: () => dispatch({ type: "RESET" }),
  };
}
