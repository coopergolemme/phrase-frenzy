import { useCallback, useEffect, useRef, useState } from "react";
import {
  createRoom as apiCreateRoom,
  joinRoom as apiJoinRoom,
  getLobby as apiGetLobby,
  startGame as apiStartGame,
  MultiplayerApiError,
  type Lobby,
} from "../utils/multiplayerApi";
import {
  clearMultiplayerSession,
  loadMultiplayerSession,
  saveMultiplayerSession,
  type MultiplayerSession,
} from "../utils/multiplayerSession";
import { subscribeToRoomChannel } from "../utils/multiplayerChannel";

// Lobby-phase multiplayer state: creating/joining a room, watching the
// roster fill in over realtime, and (host-only) starting the game. Once
// `lobby.status` moves off "lobby", the caller (MultiplayerApp) switches
// to useMultiplayerGame for the same room/session.
export function useMultiplayerRoom(initialRoomCode?: string) {
  const [session, setSession] = useState<MultiplayerSession | null>(() => {
    const stored = loadMultiplayerSession();
    if (stored && (!initialRoomCode || stored.roomCode === initialRoomCode)) return stored;
    return null;
  });
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const subscribe = useCallback((roomCode: string) => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = subscribeToRoomChannel(roomCode, {
      onLobby: (payload) => setLobby(payload),
      // The game-start/advance broadcast doesn't carry the lobby roster,
      // but the status flip is what tells MultiplayerApp to switch from
      // the lobby screen to the in-game hook for this same room/session.
      onState: (payload) => setLobby((prev) => (prev ? { ...prev, status: payload.status } : prev)),
    });
  }, []);

  useEffect(() => {
    return () => unsubscribeRef.current?.();
  }, []);

  // Resume an in-progress session (e.g. a reloaded tab) by re-fetching the
  // lobby snapshot and resubscribing.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    apiGetLobby(session.roomCode)
      .then((result) => {
        if (!cancelled) setLobby(result);
      })
      .catch(() => {
        if (!cancelled) {
          clearMultiplayerSession();
          setSession(null);
        }
      });
    subscribe(session.roomCode);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.roomCode]);

  const create = useCallback(
    async (params: {
      hostName: string;
      teamNames: string[];
      roundsPerTeam: number;
      roundDurationSec: number;
      categoryIds: string[];
    }) => {
      setIsBusy(true);
      setError(null);
      try {
        const result = await apiCreateRoom(params);
        const newSession: MultiplayerSession = {
          roomCode: result.roomCode,
          playerToken: result.playerToken,
          playerId: result.playerId,
          name: params.hostName,
        };
        saveMultiplayerSession(newSession);
        setSession(newSession);
        const lobbySnapshot = await apiGetLobby(result.roomCode);
        setLobby(lobbySnapshot);
        subscribe(result.roomCode);
      } catch (err) {
        setError(err instanceof MultiplayerApiError ? err.message : "Couldn't create the room");
      } finally {
        setIsBusy(false);
      }
    },
    [subscribe]
  );

  const join = useCallback(
    async (params: { roomCode: string; name: string; teamIndex: number }) => {
      setIsBusy(true);
      setError(null);
      try {
        const roomCode = params.roomCode.toUpperCase();
        const result = await apiJoinRoom({ ...params, roomCode });
        const newSession: MultiplayerSession = {
          roomCode,
          playerToken: result.playerToken,
          playerId: result.playerId,
          name: params.name,
        };
        saveMultiplayerSession(newSession);
        setSession(newSession);
        const lobbySnapshot = await apiGetLobby(roomCode);
        setLobby(lobbySnapshot);
        subscribe(roomCode);
      } catch (err) {
        setError(err instanceof MultiplayerApiError ? err.message : "Couldn't join that room");
      } finally {
        setIsBusy(false);
      }
    },
    [subscribe]
  );

  const loadPreview = useCallback(async (roomCode: string) => {
    setIsBusy(true);
    setError(null);
    try {
      const lobbySnapshot = await apiGetLobby(roomCode.toUpperCase());
      setLobby(lobbySnapshot);
      subscribe(roomCode.toUpperCase());
    } catch (err) {
      setError(err instanceof MultiplayerApiError ? err.message : "Couldn't find that room");
    } finally {
      setIsBusy(false);
    }
  }, [subscribe]);

  const startGame = useCallback(async () => {
    if (!session) return;
    setIsBusy(true);
    setError(null);
    try {
      await apiStartGame(session.roomCode, session.playerToken);
    } catch (err) {
      setError(err instanceof MultiplayerApiError ? err.message : "Couldn't start the game");
    } finally {
      setIsBusy(false);
    }
  }, [session]);

  const leave = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    clearMultiplayerSession();
    setSession(null);
    setLobby(null);
    setError(null);
  }, []);

  const isHost = Boolean(
    session && lobby && lobby.players[0] && lobby.players[0].id === session.playerId
  );

  return { session, lobby, error, isBusy, isHost, create, join, loadPreview, startGame, leave };
}
