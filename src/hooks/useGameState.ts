import { useReducer } from "react";
import { WORD_BANK } from "../data/words";
import { shuffle } from "../utils/shuffle";

export type GameStatus =
  | "home"
  | "teamSetup"
  | "playing"
  | "roundSummary"
  | "gameOver";

export interface Team {
  id: string;
  name: string;
  totalScore: number;
}

export interface GameState {
  gameStatus: GameStatus;
  teams: Team[];
  roundsPerTeam: number;
  turnOrder: number[];
  turnIndex: number;
  currentWord: string;
  roundScore: number;
  deckOrder: string[];
  deckIndex: number;
}

type GameAction =
  | { type: "START_TEAM_SETUP" }
  | { type: "START_TOURNAMENT"; teamNames: string[]; roundsPerTeam: number }
  | { type: "CORRECT" }
  | { type: "PASS" }
  | { type: "TIME_UP" }
  | { type: "NEXT_TURN" }
  | { type: "RESET" };

const initialState: GameState = {
  gameStatus: "home",
  teams: [],
  roundsPerTeam: 3,
  turnOrder: [],
  turnIndex: 0,
  currentWord: "",
  roundScore: 0,
  deckOrder: [],
  deckIndex: 0,
};

function drawNextWord(deckOrder: string[], deckIndex: number, currentWord: string) {
  if (deckIndex >= deckOrder.length) {
    const reshuffled = shuffle(WORD_BANK);
    if (reshuffled[0] === currentWord && reshuffled.length > 1) {
      const swapIndex = 1 + Math.floor(Math.random() * (reshuffled.length - 1));
      [reshuffled[0], reshuffled[swapIndex]] = [reshuffled[swapIndex], reshuffled[0]];
    }
    return { deckOrder: reshuffled, deckIndex: 1, word: reshuffled[0] };
  }
  return { deckOrder, deckIndex: deckIndex + 1, word: deckOrder[deckIndex] };
}

function buildTurnOrder(teamCount: number, roundsPerTeam: number): number[] {
  const order: number[] = [];
  for (let round = 0; round < roundsPerTeam; round++) {
    for (let team = 0; team < teamCount; team++) {
      order.push(team);
    }
  }
  return order;
}

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_TEAM_SETUP":
      return { ...initialState, gameStatus: "teamSetup" };

    case "START_TOURNAMENT": {
      const teams: Team[] = action.teamNames.map((name, index) => ({
        id: `team-${index}`,
        name,
        totalScore: 0,
      }));
      const deckOrder = shuffle(WORD_BANK);
      return {
        ...initialState,
        gameStatus: "playing",
        teams,
        roundsPerTeam: action.roundsPerTeam,
        turnOrder: buildTurnOrder(teams.length, action.roundsPerTeam),
        turnIndex: 0,
        currentWord: deckOrder[0],
        roundScore: 0,
        deckOrder,
        deckIndex: 1,
      };
    }

    case "CORRECT": {
      if (state.gameStatus !== "playing") return state;
      const next = drawNextWord(state.deckOrder, state.deckIndex, state.currentWord);
      return {
        ...state,
        roundScore: state.roundScore + 1,
        currentWord: next.word,
        deckOrder: next.deckOrder,
        deckIndex: next.deckIndex,
      };
    }

    case "PASS": {
      if (state.gameStatus !== "playing") return state;
      const next = drawNextWord(state.deckOrder, state.deckIndex, state.currentWord);
      return {
        ...state,
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
      const next = drawNextWord(state.deckOrder, state.deckIndex, state.currentWord);
      return {
        ...state,
        gameStatus: "playing",
        turnIndex: nextTurnIndex,
        currentWord: next.word,
        deckOrder: next.deckOrder,
        deckIndex: next.deckIndex,
        roundScore: 0,
      };
    }

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
    startTeamSetup: () => dispatch({ type: "START_TEAM_SETUP" }),
    startTournament: (teamNames: string[], roundsPerTeam: number) =>
      dispatch({ type: "START_TOURNAMENT", teamNames, roundsPerTeam }),
    markCorrect: () => dispatch({ type: "CORRECT" }),
    markPass: () => dispatch({ type: "PASS" }),
    timeUp: () => dispatch({ type: "TIME_UP" }),
    nextTurn: () => dispatch({ type: "NEXT_TURN" }),
    reset: () => dispatch({ type: "RESET" }),
  };
}
