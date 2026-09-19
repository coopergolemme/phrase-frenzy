import { useEffect, useReducer } from "react";
import type { WordCategory } from "../data/wordCategory";
import { loadGameState, saveGameState } from "../utils/gameStateStorage";
import { shuffle } from "../utils/shuffle";
import { buildTurnOrder, drawNextWord } from "../game/turnLogic";
import type { RoundLogEntry, Team, WordOutcome } from "../game/turnLogic";

export type { RoundLogEntry, Team, WordOutcome };

export type GameStatus =
  | "home"
  | "teamSetup"
  | "playing"
  | "roundSummary"
  | "gameOver";

export interface GameState {
  gameStatus: GameStatus;
  teams: Team[];
  roundsPerTeam: number;
  turnOrder: number[];
  turnIndex: number;
  currentWord: string;
  roundScore: number;
  roundLog: RoundLogEntry[];
  categoryIds: string[];
  wordBank: string[];
  deckOrder: string[];
  deckIndex: number;
}

type GameAction =
  | { type: "START_TEAM_SETUP" }
  | {
      type: "START_TOURNAMENT";
      teamNames: string[];
      teamMembers: string[][];
      roundsPerTeam: number;
      categoryIds: string[];
      flaggedWords: string[];
      categories: WordCategory[];
    }
  | { type: "CORRECT" }
  | { type: "PASS" }
  | { type: "TIME_UP" }
  | { type: "NEXT_TURN" }
  | { type: "TOGGLE_WORD_OUTCOME"; index: number }
  | { type: "RESET" };

const initialState: GameState = {
  gameStatus: "home",
  teams: [],
  roundsPerTeam: 3,
  turnOrder: [],
  turnIndex: 0,
  currentWord: "",
  roundScore: 0,
  roundLog: [],
  categoryIds: [],
  wordBank: [],
  deckOrder: [],
  deckIndex: 0,
};

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_TEAM_SETUP":
      return { ...initialState, gameStatus: "teamSetup" };

    case "START_TOURNAMENT": {
      const teams: Team[] = action.teamNames.map((name, index) => ({
        id: `team-${index}`,
        name,
        totalScore: 0,
        members: action.teamMembers[index] ?? [],
      }));
      const selectedCategories = action.categories.filter((c) =>
        action.categoryIds.includes(c.id)
      );
      const flaggedSet = new Set(action.flaggedWords);
      const wordBank = Array.from(
        new Set(
          (selectedCategories.length > 0 ? selectedCategories : action.categories).flatMap(
            (c) => c.words
          )
        )
      ).filter((word) => !flaggedSet.has(word.toLowerCase()));
      const deckOrder = shuffle(wordBank);
      return {
        ...initialState,
        gameStatus: "playing",
        teams,
        roundsPerTeam: action.roundsPerTeam,
        turnOrder: buildTurnOrder(teams.length, action.roundsPerTeam),
        turnIndex: 0,
        currentWord: deckOrder[0],
        roundScore: 0,
        roundLog: [],
        categoryIds: action.categoryIds,
        wordBank,
        deckOrder,
        deckIndex: 1,
      };
    }

    case "CORRECT": {
      if (state.gameStatus !== "playing") return state;
      const next = drawNextWord(
        state.deckOrder,
        state.deckIndex,
        state.currentWord,
        state.wordBank
      );
      return {
        ...state,
        roundScore: state.roundScore + 1,
        roundLog: [...state.roundLog, { word: state.currentWord, outcome: "correct" }],
        currentWord: next.word,
        deckOrder: next.deckOrder,
        deckIndex: next.deckIndex,
      };
    }

    case "PASS": {
      if (state.gameStatus !== "playing") return state;
      const next = drawNextWord(
        state.deckOrder,
        state.deckIndex,
        state.currentWord,
        state.wordBank
      );
      return {
        ...state,
        roundLog: [...state.roundLog, { word: state.currentWord, outcome: "passed" }],
        currentWord: next.word,
        deckOrder: next.deckOrder,
        deckIndex: next.deckIndex,
      };
    }

    case "TIME_UP": {
      if (state.gameStatus !== "playing") return state;
      const activeTeamIndex = state.turnOrder[state.turnIndex];
      const teams = state.teams.map((team, index) =>
        index === activeTeamIndex
          ? { ...team, totalScore: team.totalScore + state.roundScore }
          : team
      );
      return { ...state, teams, gameStatus: "roundSummary" };
    }

    case "NEXT_TURN": {
      if (state.gameStatus !== "roundSummary") return state;
      const nextTurnIndex = state.turnIndex + 1;
      if (nextTurnIndex >= state.turnOrder.length) {
        return { ...state, gameStatus: "gameOver" };
      }
      const next = drawNextWord(
        state.deckOrder,
        state.deckIndex,
        state.currentWord,
        state.wordBank
      );
      return {
        ...state,
        gameStatus: "playing",
        turnIndex: nextTurnIndex,
        currentWord: next.word,
        deckOrder: next.deckOrder,
        deckIndex: next.deckIndex,
        roundScore: 0,
        roundLog: [],
      };
    }

    case "TOGGLE_WORD_OUTCOME": {
      if (state.gameStatus !== "roundSummary") return state;
      const entry = state.roundLog[action.index];
      if (!entry) return state;

      const newOutcome: WordOutcome = entry.outcome === "correct" ? "passed" : "correct";
      const scoreDelta = newOutcome === "correct" ? 1 : -1;

      const roundLog = state.roundLog.map((logEntry, index) =>
        index === action.index ? { ...logEntry, outcome: newOutcome } : logEntry
      );

      const activeTeamIndex = state.turnOrder[state.turnIndex];
      const teams = state.teams.map((team, index) =>
        index === activeTeamIndex
          ? { ...team, totalScore: team.totalScore + scoreDelta }
          : team
      );

      return {
        ...state,
        roundLog,
        roundScore: state.roundScore + scoreDelta,
        teams,
      };
    }

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadGameState() ?? initialState);

  useEffect(() => {
    saveGameState(state);
  }, [state]);

  return {
    state,
    startTeamSetup: () => dispatch({ type: "START_TEAM_SETUP" }),
    startTournament: (
      teamNames: string[],
      teamMembers: string[][],
      roundsPerTeam: number,
      categoryIds: string[],
      flaggedWords: string[],
      categories: WordCategory[]
    ) =>
      dispatch({
        type: "START_TOURNAMENT",
        teamNames,
        teamMembers,
        roundsPerTeam,
        categoryIds,
        flaggedWords,
        categories,
      }),
    markCorrect: () => dispatch({ type: "CORRECT" }),
    markPass: () => dispatch({ type: "PASS" }),
    timeUp: () => dispatch({ type: "TIME_UP" }),
    nextTurn: () => dispatch({ type: "NEXT_TURN" }),
    toggleWordOutcome: (index: number) =>
      dispatch({ type: "TOGGLE_WORD_OUTCOME", index }),
    reset: () => dispatch({ type: "RESET" }),
  };
}
