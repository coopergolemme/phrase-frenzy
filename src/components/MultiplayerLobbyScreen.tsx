import { useState } from "react";
import type { Lobby } from "../utils/multiplayerApi";
import type { MultiplayerSession } from "../utils/multiplayerSession";
import { RoomQrCode } from "./RoomQrCode";

interface MultiplayerLobbyScreenProps {
  roomCode: string;
  lobby: Lobby | null;
  session: MultiplayerSession | null;
  isHost: boolean;
  isBusy: boolean;
  error: string | null;
  onJoin: (name: string, teamIndex: number) => void;
  onStart: () => void;
  onLeave: () => void;
}

export function MultiplayerLobbyScreen({
  roomCode,
  lobby,
  session,
  isHost,
  isBusy,
  error,
  onJoin,
  onStart,
  onLeave,
}: MultiplayerLobbyScreenProps) {
  const [name, setName] = useState("");
  const [teamIndex, setTeamIndex] = useState(0);

  if (!lobby) {
    return (
      <div className="screen justify-center items-center gap-4 text-center">
        <p className="m-0 text-text-secondary">Looking for room {roomCode}…</p>
        {error && <p className="m-0 text-[0.9rem] text-danger">{error}</p>}
        <button className="btn btn--outline" onClick={onLeave}>
          Cancel
        </button>
      </div>
    );
  }

  // Not yet joined this room from this device — collect a name and team.
  if (!session) {
    return (
      <div className="screen justify-center items-center gap-4 text-center">
        <h1 className="m-0 font-display font-bold text-[1.5rem] text-yellow">
          Join Room <span className="tracking-wider">{roomCode}</span>
        </h1>
        <div className="flex w-full flex-col gap-1 text-left">
          <label className="text-[0.8rem] font-bold uppercase tracking-wider text-text-secondary">
            Your Display Name
          </label>
          <input
            className="min-h-touch w-full rounded-button border-2 border-outline bg-surface px-4 py-3 font-[inherit] text-[1.05rem] text-text outline-none focus:border-primary placeholder:text-text-secondary"
            type="text"
            placeholder="Enter your name"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex w-full flex-col gap-2 text-left">
          <label className="text-[0.8rem] font-bold uppercase tracking-wider text-text-secondary">
            Select Your Team
          </label>
          {lobby.teamNames.map((teamName, index) => {
            const isSelected = teamIndex === index;
            const teamPlayerCount = lobby.players.filter((p) => p.teamIndex === index).length;
            return (
              <button
                type="button"
                key={index}
                className={`btn w-full justify-between text-left ${
                  isSelected ? "btn--primary" : "btn--outline"
                }`}
                onClick={() => setTeamIndex(index)}
              >
                <span className="font-bold">{teamName}</span>
                <span className="flex items-center gap-2 text-[0.85rem]">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[0.75rem] font-bold ${
                      isSelected
                        ? "bg-[#0e1f15]/15 text-[#0e1f15]"
                        : "bg-disabled text-text-secondary"
                    }`}
                  >
                    {teamPlayerCount === 1 ? "1 player" : `${teamPlayerCount} players`}
                  </span>
                  {isSelected && <span className="font-bold text-[1.1rem]">✓</span>}
                </span>
              </button>
            );
          })}
        </div>
        {error && <p className="m-0 text-[0.9rem] text-danger">{error}</p>}
        <button
          className="btn btn--primary btn--large w-full mt-1"
          onClick={() => onJoin(name.trim(), teamIndex)}
          disabled={name.trim().length === 0 || isBusy}
        >
          {isBusy ? "Joining…" : "Join Room"}
        </button>
        <button className="btn btn--text" onClick={onLeave}>
          Cancel
        </button>
      </div>
    );
  }

  const playersByTeam = lobby.teamNames.map((teamName, index) => ({
    teamName,
    members: lobby.players.filter((p) => p.teamIndex === index),
  }));
  const canStart = playersByTeam.filter((t) => t.members.length > 0).length >= 2;

  return (
    <div className="screen justify-center items-center gap-4 text-center">
      <h1 className="m-0 font-display font-bold text-[1.5rem] text-yellow">Room Code</h1>
      <p className="m-0 font-display text-[2.5rem] font-bold tracking-[0.3em] text-primary">
        {roomCode}
      </p>
      <p className="m-0 text-text-secondary">Share this code so others can join.</p>

      {isHost && (
        <RoomQrCode
          url={`${window.location.origin}${window.location.pathname}#room/${encodeURIComponent(roomCode)}`}
        />
      )}

      <div className="standings w-full">
        {playersByTeam.map(({ teamName, members }) => (
          <div key={teamName} className="standings__row flex-col items-start gap-1">
            <span className="standings__name">{teamName}</span>
            <span className="text-[0.9rem] text-text-secondary">
              {members.length > 0 ? members.map((m) => m.name).join(", ") : "No players yet"}
            </span>
          </div>
        ))}
      </div>

      {error && <p className="m-0 text-[0.9rem] text-danger">{error}</p>}

      {isHost ? (
        <button
          className="btn btn--primary btn--large w-full"
          onClick={onStart}
          disabled={!canStart || isBusy}
        >
          {isBusy ? "Starting…" : "Start Game"}
        </button>
      ) : (
        <p className="m-0 text-text-secondary">Waiting for the host to start the game…</p>
      )}

      <div className="flex w-full gap-2 mt-2">
        <a
          href={`#scoreboard/${encodeURIComponent(roomCode)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--outline w-full flex items-center justify-center gap-2 text-decoration-none"
        >
          <span>📺</span> <span>TV / Stream View</span>
        </a>
      </div>

      <button className="btn btn--text" onClick={onLeave}>
        Leave
      </button>
    </div>
  );
}
