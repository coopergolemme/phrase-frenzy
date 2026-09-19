import { useCallback, useEffect, useRef, useState } from "react";
import {
  createRoom as apiCreateRoom,
  joinRoom as apiJoinRoom,
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
import { fetchLobbySnapshot, subscribeToLobby } from "../utils/multiplayerRealtime";
import { getFlaggedWords } from "../utils/flaggedWords";

// Lobby-phase multiplayer state: creating/joining a room, watching the
// roster fill in over realtime, and (host-only) starting the game. Once
// `lobby.status` moves off "lobby", the caller (MultiplayerApp) switches
// to useMultiplayerGame for the same room/session. Reads go straight to
// Postgres (fetchLobbySnapshot/subscribeToLobby) rather than through the
// edge function — see multiplayerRealtime.ts.
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

  // Any change to rooms/room_roster means the lobby snapshot may be stale
  // — re-fetch it rather than trying to keep a locally-patched copy in
  // sync. Cheap and always correct.
  const refreshLobby = useCallback((roomCode: string) => {
    fetchLobbySnapshot(roomCode).then(setLobby).catch(() => {});
  }, []);

  const subscribe = useCallback(
    (roomCode: string) => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = subscribeToLobby(roomCode, () => refreshLobby(roomCode));
    },
    [refreshLobby]
  );

  useEffect(() => {
    return () => unsubscribeRef.current?.();
  }, []);

  const loadPreview = useCallback(
    async (roomCode: string) => {
      setIsBusy(true);
      setError(null);
      try {
        const lobbySnapshot = await fetchLobbySnapshot(roomCode.toUpperCase());
        setLobby(lobbySnapshot);
        subscribe(roomCode.toUpperCase());
      } catch (err) {
        setError(err instanceof MultiplayerApiError ? err.message : "Couldn't find that room");
      } finally {
        setIsBusy(false);
      }
    },
    [subscribe]
  );

  // Resume an in-progress session (e.g. a reloaded tab) by re-fetching the
  // lobby snapshot and resubscribing.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchLobbySnapshot(session.roomCode)
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

  // Load room preview and subscribe when arriving via deep link / QR code without a stored session.
  useEffect(() => {
    if (session || !initialRoomCode) return;
    void loadPreview(initialRoomCode);
  }, [initialRoomCode, session, loadPreview]);

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
        const lobbySnapshot = await fetchLobbySnapshot(result.roomCode);
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
        const lobbySnapshot = await fetchLobbySnapshot(roomCode);
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


  const startGame = useCallback(async () => {
    if (!session) return;
    setIsBusy(true);
    setError(null);
    try {
      await apiStartGame(session.roomCode, session.playerToken, getFlaggedWords());
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
