import { RoomQrCode } from "../RoomQrCode";
import type { Lobby } from "../../utils/multiplayerApi";

interface ScoreboardLobbyViewProps {
  roomCode: string;
  lobby: Lobby | null;
}

export function ScoreboardLobbyView({ roomCode, lobby }: ScoreboardLobbyViewProps) {
  const joinUrl = `${window.location.origin}${window.location.pathname}#room/${roomCode}`;
  const teamNames = lobby?.teamNames ?? ["Team 1", "Team 2"];

  return (
    <div className="scoreboard-screen scoreboard-lobby">
      {/* Header Banner */}
      <header className="scoreboard-header flex items-center justify-between w-full px-8 py-4 bg-surface/50 border-b border-white/10 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔥</span>
          <h1 className="text-2xl font-display font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent m-0">
            PHRASE FRENZY
          </h1>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-text-secondary text-sm font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>LIVE ROOM SCOREBOARD</span>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-start my-auto">
        {/* Left: Join Information Card */}
        <div className="lg:col-span-5 flex flex-col items-center text-center p-8 bg-surface-elevated/80 rounded-3xl border border-white/15 shadow-2xl backdrop-blur-xl">
          <span className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">
            Join on your phone
          </span>
          <h2 className="text-4xl lg:text-5xl font-display font-black tracking-widest text-primary m-0 mb-6 select-all">
            {roomCode}
          </h2>

          <div className="p-4 bg-white rounded-2xl shadow-lg border border-white/20 mb-6">
            <RoomQrCode url={joinUrl} />
          </div>

          <p className="text-sm text-text-secondary m-0 max-w-xs leading-relaxed">
            Scan the QR code or go to <span className="font-mono font-bold text-text-primary">{window.location.hostname}</span> and enter code <strong className="text-primary">{roomCode}</strong>
          </p>

          {lobby && (
            <div className="flex items-center gap-6 mt-6 pt-6 border-t border-white/10 text-xs font-semibold text-text-secondary">
              <div>
                <span className="block text-lg font-bold text-text-primary">{lobby.roundsPerTeam}</span>
                <span>Rounds / Team</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <span className="block text-lg font-bold text-text-primary">{lobby.roundDurationSec}s</span>
                <span>Turn Timer</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Team Rosters */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-display font-bold text-text-primary m-0 flex items-center gap-2">
              <span>👥</span> Teams & Players ({lobby?.players.length ?? 0})
            </h3>
            <div className="text-sm text-emerald-400 font-semibold flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Waiting for Host to start…</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamNames.map((teamName, teamIdx) => {
              const teamPlayers = lobby?.players.filter((p) => p.teamIndex === teamIdx) ?? [];
              const colors = [
                "from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400",
                "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400",
                "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400",
                "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400",
              ];
              const colorStyle = colors[teamIdx % colors.length];

              return (
                <div
                  key={teamIdx}
                  className={`p-6 rounded-2xl border bg-gradient-to-br ${colorStyle} backdrop-blur-md shadow-lg flex flex-col justify-between min-h-[220px]`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold m-0 text-text-primary">{teamName}</h4>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 font-mono font-bold">
                        {teamPlayers.length} {teamPlayers.length === 1 ? "player" : "players"}
                      </span>
                    </div>

                    {teamPlayers.length === 0 ? (
                      <p className="text-sm italic text-text-secondary m-0">No players joined yet</p>
                    ) : (
                      <ul className="list-none p-0 m-0 space-y-2">
                        {teamPlayers.map((player) => (
                          <li
                            key={player.id}
                            className="flex items-center gap-2 text-sm font-semibold text-text-primary bg-surface/40 px-3 py-1.5 rounded-lg border border-white/5"
                          >
                            <span className="text-xs">🎮</span>
                            <span>{player.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
