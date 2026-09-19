import type { ScoreboardState } from "../../hooks/useScoreboardState";

interface ScoreboardSummaryViewProps {
  scoreboard: ScoreboardState;
}

export function ScoreboardSummaryView({ scoreboard }: ScoreboardSummaryViewProps) {
  const { activeTeam, roundScore, teams, roundLog, roundLabel, turnQueue } = scoreboard;

  const nextUp = turnQueue[0];

  return (
    <div className="scoreboard-screen scoreboard-summary">
      <header className="flex items-center justify-between w-full px-8 py-4 bg-surface/40 border-b border-white/10 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⏱️</span>
          <div>
            <h1 className="text-2xl font-display font-extrabold text-text-primary m-0">
              TURN RECAP
            </h1>
            <p className="text-xs text-text-secondary m-0">{roundLabel}</p>
          </div>
        </div>

        {nextUp && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/20 border border-accent/40 text-accent text-sm font-bold">
            <span>UP NEXT:</span>
            <span>{nextUp.teamName} ({nextUp.describerName})</span>
          </div>
        )}
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-stretch my-auto">
        {/* Turn Performance Card */}
        <div className="lg:col-span-6 flex flex-col justify-between p-8 bg-surface-elevated/80 rounded-3xl border border-white/15 shadow-2xl backdrop-blur-xl">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">
              Turn Result
            </span>
            <h2 className="text-3xl font-display font-extrabold text-primary m-0 mt-1">
              {activeTeam?.name ?? "Team"}
            </h2>

            <div className="my-6 p-6 bg-surface/60 rounded-2xl border border-white/10 text-center">
              <span className="text-sm font-semibold text-text-secondary block">Words Solved</span>
              <span className="text-6xl font-display font-black text-emerald-400 block my-1">
                +{roundScore}
              </span>
              <span className="text-xs text-text-secondary">Points added to team total</span>
            </div>

            <h3 className="text-sm font-bold text-text-primary mb-3">Round Word Breakdown</h3>
            {roundLog.length === 0 ? (
              <p className="text-xs italic text-text-secondary">No words solved this turn</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto">
                {roundLog.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between ${
                      entry.outcome === "correct"
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                        : "bg-rose-500/15 text-rose-300 border border-rose-500/20 opacity-70"
                    }`}
                  >
                    <span>{entry.word}</span>
                    <span className="text-[10px] font-mono uppercase font-bold">
                      {entry.outcome}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/10 text-center text-sm font-semibold text-text-secondary animate-pulse">
            Waiting for host to launch the next turn…
          </div>
        </div>

        {/* Current Leaderboard Standings */}
        <div className="lg:col-span-6 p-8 bg-surface-elevated/80 rounded-3xl border border-white/15 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-display font-bold text-text-primary m-0 mb-6 flex items-center gap-2">
              <span>📊</span> Current Leaderboard
            </h3>

            <div className="flex flex-col gap-4">
              {[...teams]
                .sort((a, b) => b.totalScore - a.totalScore)
                .map((team, rank) => (
                  <div
                    key={team.id ?? rank}
                    className="flex items-center justify-between p-5 rounded-2xl bg-surface/50 border border-white/10"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                          rank === 0
                            ? "bg-amber-400 text-black"
                            : rank === 1
                            ? "bg-slate-300 text-black"
                            : rank === 2
                            ? "bg-amber-700 text-white"
                            : "bg-white/10 text-white"
                        }`}
                      >
                        {rank + 1}
                      </span>
                      <div>
                        <h4 className="text-lg font-bold text-text-primary m-0">{team.name}</h4>
                        <p className="text-xs text-text-secondary m-0">
                          {team.members.join(", ")}
                        </p>
                      </div>
                    </div>

                    <div className="text-3xl font-display font-black text-primary">
                      {team.totalScore}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
