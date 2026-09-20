import type { ScoreboardState } from "../../hooks/useScoreboardState";

interface StreamOverlayHUDProps {
  scoreboard: ScoreboardState;
  roomCode: string;
}

export function StreamOverlayHUD({ scoreboard, roomCode }: StreamOverlayHUDProps) {
  const {
    status,
    activeTeam,
    describerName,
    timeRemaining,
    roundLabel,
    roundScore,
    teams,
    roundLog,
    isPaused,
  } = scoreboard;

  const isUrgent = timeRemaining <= 10 && timeRemaining > 0;
  const latestEvent = roundLog.length > 0 ? roundLog[roundLog.length - 1] : null;

  if (status === "lobby") {
    return (
      <div className="fixed bottom-6 left-6 right-6 flex items-center justify-between p-4 rounded-2xl bg-black/80 border border-white/10 text-white shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div>
            <h1 className="text-sm font-bold m-0 tracking-wide">PHRASE FRENZY STREAM</h1>
            <p className="text-xs text-slate-400 m-0">Join Code: <strong className="text-primary font-mono">{roomCode}</strong></p>
          </div>
        </div>
        <div className="text-xs text-emerald-400 font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>WAITING FOR GAME START</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 right-6 flex items-end justify-between pointer-events-none select-none">
      {/* Lower Third Main Banner */}
      <div className="flex flex-col gap-2 pointer-events-auto">
        {/* Latest Activity Popup Notification */}
        {latestEvent && (
          <div
            className={`self-start px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border animate-bounce ${
              latestEvent.outcome === "correct"
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : "bg-rose-500/30 border-rose-500/50 text-rose-300"
            }`}
          >
            <span>{latestEvent.outcome === "correct" ? "✓" : "🚨 FOUL"}</span>
            <span>{latestEvent.word}</span>
            <span className="font-mono text-[10px] opacity-80">
              ({latestEvent.outcome === "correct" ? "+1 pt" : "-3s penalty"})
            </span>
          </div>
        )}

        <div className="flex items-center gap-6 p-4 rounded-2xl bg-slate-950/85 border border-white/15 text-white shadow-2xl">
          {/* Animated Timer */}
          <div
            className={`flex flex-col items-center justify-center min-w-[90px] py-2 px-3 rounded-xl border ${
              isUrgent
                ? "bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse"
                : "bg-white/5 border-white/10 text-primary"
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Timer</span>
            <span className="text-3xl font-display font-black tracking-tight">{timeRemaining}s</span>
          </div>

          {/* Turn & Describer Info */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {roundLabel || "Live Turn"}
              </span>
              {isPaused && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-black font-bold">
                  PAUSED
                </span>
              )}
            </div>
            <h2 className="text-xl font-display font-black text-white m-0 tracking-tight">
              {activeTeam?.name ?? "Team"}
            </h2>
            {describerName && (
              <p className="text-xs text-accent font-semibold m-0 flex items-center gap-1">
                <span>🗣️</span> <span>{describerName}</span>
              </p>
            )}
          </div>

          <div className="w-px h-10 bg-white/10 mx-1" />

          {/* Turn Score */}
          <div className="flex flex-col items-center text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Turn Score
            </span>
            <span className="text-2xl font-display font-black text-emerald-400">
              +{roundScore}
            </span>
          </div>
        </div>
      </div>

      {/* Right Corner Leaderboard */}
      <div className="flex flex-col gap-1.5 p-3.5 rounded-2xl bg-slate-950/85 border border-white/15 text-white shadow-2xl pointer-events-auto max-w-[240px]">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 flex items-center justify-between">
          <span>Match Standings</span>
          <span className="font-mono text-primary">{roomCode}</span>
        </div>
        {teams.map((team, idx) => {
          const isActive = team.id === activeTeam?.id;
          return (
            <div
              key={team.id ?? idx}
              className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-xs ${
                isActive ? "bg-primary/20 text-white font-bold border border-primary/30" : "text-slate-300"
              }`}
            >
              <span className="truncate max-w-[120px]">{team.name}</span>
              <span className="font-mono font-bold text-primary">{team.totalScore}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
