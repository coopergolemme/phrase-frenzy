import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { Lobby } from "../utils/multiplayerApi";
import type { MultiplayerSession } from "../utils/multiplayerSession";

const mockLobbySnapshot: Lobby = {
  status: "lobby",
  roundsPerTeam: 3,
  roundDurationSec: 60,
  categoryIds: ["cat1"],
  teamNames: ["Team 1", "Team 2"],
  players: [{ id: "p1", name: "Host", teamIndex: 0 }],
};

const fetchLobbySnapshotMock = vi.fn().mockResolvedValue(mockLobbySnapshot);
const subscribeToLobbyMock = vi.fn().mockReturnValue(vi.fn());
const loadMultiplayerSessionMock = vi.fn().mockReturnValue(null);
const saveMultiplayerSessionMock = vi.fn();
const clearMultiplayerSessionMock = vi.fn();
const joinRoomMock = vi.fn().mockResolvedValue({ playerToken: "token-1", playerId: "p2" });

vi.mock("../utils/multiplayerRealtime", () => ({
  fetchLobbySnapshot: (code: string) => fetchLobbySnapshotMock(code),
  subscribeToLobby: (code: string, cb: () => void) => subscribeToLobbyMock(code, cb),
}));

vi.mock("../utils/multiplayerSession", () => ({
  loadMultiplayerSession: () => loadMultiplayerSessionMock(),
  saveMultiplayerSession: (session: MultiplayerSession) => saveMultiplayerSessionMock(session),
  clearMultiplayerSession: () => clearMultiplayerSessionMock(),
}));

vi.mock("../utils/multiplayerApi", () => ({
  joinRoom: (params: unknown) => joinRoomMock(params),
  createRoom: vi.fn(),
  startGame: vi.fn(),
  MultiplayerApiError: class MultiplayerApiError extends Error {},
}));

describe("useMultiplayerRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadMultiplayerSessionMock.mockReturnValue(null);
    fetchLobbySnapshotMock.mockResolvedValue(mockLobbySnapshot);
    subscribeToLobbyMock.mockReturnValue(vi.fn());
  });

  it("automatically loads lobby preview when initialRoomCode is provided without a stored session", async () => {
    const { useMultiplayerRoom } = await import("./useMultiplayerRoom");
    const { result } = renderHook(() => useMultiplayerRoom("ROOM123"));

    await waitFor(() => {
      expect(result.current.lobby).toEqual(mockLobbySnapshot);
    });

    expect(fetchLobbySnapshotMock).toHaveBeenCalledWith("ROOM123");
    expect(subscribeToLobbyMock).toHaveBeenCalledWith("ROOM123", expect.any(Function));
    expect(result.current.session).toBeNull();
  });

  it("does not fetch preview if no initialRoomCode is provided and no session exists", async () => {
    const { useMultiplayerRoom } = await import("./useMultiplayerRoom");
    const { result } = renderHook(() => useMultiplayerRoom());

    expect(result.current.lobby).toBeNull();
    expect(result.current.session).toBeNull();
    expect(fetchLobbySnapshotMock).not.toHaveBeenCalled();
  });

  it("restores active session when stored session matches initialRoomCode", async () => {
    const session: MultiplayerSession = {
      roomCode: "ROOM123",
      playerToken: "token-1",
      playerId: "p1",
      name: "Host",
    };
    loadMultiplayerSessionMock.mockReturnValue(session);

    const { useMultiplayerRoom } = await import("./useMultiplayerRoom");
    const { result } = renderHook(() => useMultiplayerRoom("ROOM123"));

    expect(result.current.session).toEqual(session);
    await waitFor(() => {
      expect(result.current.lobby).toEqual(mockLobbySnapshot);
    });
    expect(fetchLobbySnapshotMock).toHaveBeenCalledWith("ROOM123");
  });

  it("joins a room successfully and saves session", async () => {
    const { useMultiplayerRoom } = await import("./useMultiplayerRoom");
    const { result } = renderHook(() => useMultiplayerRoom("ROOM123"));

    await waitFor(() => {
      expect(result.current.lobby).toEqual(mockLobbySnapshot);
    });

    await act(async () => {
      await result.current.join({ roomCode: "ROOM123", name: "Player 2", teamIndex: 1 });
    });

    expect(joinRoomMock).toHaveBeenCalledWith({
      roomCode: "ROOM123",
      name: "Player 2",
      teamIndex: 1,
    });
    expect(saveMultiplayerSessionMock).toHaveBeenCalledWith({
      roomCode: "ROOM123",
      playerToken: "token-1",
      playerId: "p2",
      name: "Player 2",
    });
    expect(result.current.session).toEqual({
      roomCode: "ROOM123",
      playerToken: "token-1",
      playerId: "p2",
      name: "Player 2",
    });
  });
});
