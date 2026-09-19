import { useState } from "react";
import type { ScoreboardState } from "../../hooks/useScoreboardState";

interface ScoreboardPlayingViewProps {
  scoreboard: ScoreboardState;
  roomCode: string;
}

export function ScoreboardPlayingView({ scoreboard, roomCode }: ScoreboardPlayingViewProps) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const {
    activeTeam,
    describerName,
    timeRemaining,
    roundLabel,
    roundScore,
    teams,
    roundLog,
    turnQueue,
    isPaused,
  } = scoreboard;

  const isUrgent = timeRemaining <= 10 && timeRemaining > 0;

  return (
    <div className="scoreboard-screen scoreboard-playing">
      {/* Top Bar / Header */}
      <header className="flex items-center justify-between w-full px-8 py-3 bg-surface/40 border-b border-white/10 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <span className="text-2xl">🔥</span>
          <div>
            <h1 className="text-xl font-display font-extrabold tracking-tight text-text-primary m-0">
              PHRASE FRENZY
            </h1>
            <p className="text-xs text-text-secondary m-0">{roundLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold text-text-secondary transition-colors cursor-pointer border border-white/10"
            title="Toggle TV Audio Cues"
          >
            <span>{audioEnabled ? "🔔 Sound ON" : "🔕 Sound OFF"}</span>
          </button>
          <div className="px-3 py-1 rounded-full bg-surface-elevated text-xs font-mono text-primary font-bold border border-white/10">
            ROOM: {roomCode}
          </div>
        </div>
      </header>

      {/* Paused Banner */}
      {isPaused && (
        <div className="w-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold px-6 py-2.5 rounded-xl text-center backdrop-blur-md animate-pulse">
          ⏸️ TURN PAUSED BY HOST
        </div>
      )}

      {/* Main Grid Layout */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch my-auto">
        {/* Left: Active Turn Spotlight & Timer */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6 p-8 bg-surface-elevated/70 rounded-3xl border border-white/15 shadow-2xl backdrop-blur-xl">
          {/* Active Describer Banner */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Active Turn
            </span>
            <h2 className="text-3xl lg:text-4xl font-display font-extrabold text-text-primary m-0">
              {activeTeam?.name ?? "Team"}
            </h2>
            {describerName && (
              <p className="text-lg font-semibold text-accent m-0 flex items-center gap-2">
                <span>🗣️</span> <span>{describerName} describing</span>
              </p>
            )}
          </div>

          {/* Giant Timer Display */}
          <div className="flex flex-col items-center justify-center my-4 py-8 px-6 bg-surface/60 rounded-3xl border border-white/10 relative overflow-hidden">
            <span className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">
              Time Remaining
            </span>

            <div
              className={`text-7xl lg:text-9xl font-display font-black tracking-tighter ${
                isUrgent ? "text-rose-500 animate-pulse scale-105" : "text-primary"
              } transition-all duration-300`}
            >
              {timeRemaining}s
            </div>

            {/* Current Round Words Guessed Counter */}
            <div className="mt-4 px-5 py-2 rounded-full bg-primary/20 border border-primary/30 text-primary font-bold text-sm">
              Current Turn Score: +{roundScore} pts
            </div>
          </div>

          {/* Up Next Queue Marquee */}
          {turnQueue.length > 0 && (
            <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
              <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                Up Next
              </span>
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {turnQueue.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface/50 border border-white/5 text-xs text-text-secondary whitespace-nowrap"
                  >
                    <span className="font-bold text-text-primary">{item.teamName}</span>
                    <span>•</span>
                    <span>{item.describerName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Team Scores Leaderboard & Live Turn Log */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Team Scores Leaderboard */}
          <div className="p-6 bg-surface-elevated/70 rounded-3xl border border-white/15 shadow-xl backdrop-blur-xl flex flex-col gap-4">
            <h3 className="text-lg font-display font-bold text-text-primary m-0 flex items-center gap-2">
              <span>🏆</span> Team Scores
            </h3>

            <div className="flex flex-col gap-3">
              {teams.map((team, idx) => {
                const isActive = team.id === activeTeam?.id;
                return (
                  <div
                    key={team.id ?? idx}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      isActive
                        ? "bg-primary/15 border-primary/40 shadow-lg ring-2 ring-primary/30"
                        : "bg-surface/40 border-white/5"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-text-primary m-0">{team.name}</h4>
                        {isActive && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-primary text-black">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary m-0">
                        {team.members.join(", ") || "No players"}
                      </p>
                    </div>

                    <div className="text-2xl font-display font-black text-primary">
                      {team.totalScore}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Solved Words Ticker */}
          <div className="p-6 bg-surface-elevated/70 rounded-3xl border border-white/15 shadow-xl backdrop-blur-xl flex flex-col gap-3 flex-1 min-h-[180px]">
            <h3 className="text-sm font-display font-bold text-text-primary m-0 flex items-center gap-2">
              <span>✅</span> Solved This Turn ({roundLog.length})
            </h3>

            {roundLog.length === 0 ? (
              <div className="flex items-center justify-center flex-1 text-xs text-text-secondary italic">
                Words solved will appear here live...
              </div>
            ) : (
              <ul className="list-none p-0 m-0 space-y-2 overflow-y-auto max-h-[220px]">
                {roundLog.map((entry, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 font-bold text-sm"
                  >
                    <span className="tracking-wide">✓ {entry.word}</span>
                    <span className="text-xs font-mono text-emerald-400/80">+1 pt</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
