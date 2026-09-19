import type { Team } from "../../game/turnLogic";

interface ScoreboardPodiumViewProps {
  teams: Team[];
}

export function ScoreboardPodiumView({ teams }: ScoreboardPodiumViewProps) {
  const standings = [...teams].sort((a, b) => b.totalScore - a.totalScore);
  const winner = standings[0];

  return (
    <div className="scoreboard-screen scoreboard-podium text-center">
      {/* Title */}
      <header className="flex flex-col items-center gap-2 mb-8">
        <span className="text-5xl animate-bounce">👑</span>
        <h1 className="text-4xl lg:text-6xl font-display font-black tracking-tight bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent m-0">
          MATCH CHAMPIONS!
        </h1>
        <p className="text-lg text-text-secondary m-0">Final Tournament Standings</p>
      </header>

      {/* Podium Cards */}
      <main className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl my-auto items-end">
        {/* 2nd Place */}
        {standings[1] && (
          <div className="flex flex-col items-center p-6 rounded-3xl bg-slate-800/80 border border-slate-400/30 shadow-xl backdrop-blur-xl h-[320px] justify-between order-2 md:order-1">
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl">🥈</span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                2nd Place
              </span>
              <h3 className="text-2xl font-bold text-text-primary m-0">{standings[1].name}</h3>
              <p className="text-xs text-text-secondary m-0">{standings[1].members.join(", ")}</p>
            </div>

            <div className="w-full py-4 bg-slate-700/50 rounded-2xl border border-slate-400/20 text-3xl font-display font-black text-slate-200">
              {standings[1].totalScore} pts
            </div>
          </div>
        )}

        {/* 1st Place Champion */}
        {winner && (
          <div className="flex flex-col items-center p-8 rounded-3xl bg-gradient-to-b from-amber-500/30 via-yellow-500/20 to-surface-elevated border-2 border-amber-400 shadow-2xl backdrop-blur-xl h-[380px] justify-between ring-4 ring-amber-400/20 order-1 md:order-2 scale-105">
            <div className="flex flex-col items-center gap-2">
              <span className="text-5xl animate-pulse">🏆</span>
              <span className="text-xs font-black uppercase tracking-widest text-amber-300">
                WINNER!
              </span>
              <h2 className="text-3xl font-display font-black text-amber-200 m-0">{winner.name}</h2>
              <p className="text-sm font-semibold text-text-secondary m-0">{winner.members.join(", ")}</p>
            </div>

            <div className="w-full py-5 bg-amber-500/20 rounded-2xl border border-amber-400/40 text-4xl font-display font-black text-amber-300">
              {winner.totalScore} pts
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {standings[2] && (
          <div className="flex flex-col items-center p-6 rounded-3xl bg-amber-950/40 border border-amber-700/30 shadow-xl backdrop-blur-xl h-[280px] justify-between order-3">
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl">🥉</span>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-500">
                3rd Place
              </span>
              <h3 className="text-xl font-bold text-text-primary m-0">{standings[2].name}</h3>
              <p className="text-xs text-text-secondary m-0">{standings[2].members.join(", ")}</p>
            </div>

            <div className="w-full py-4 bg-amber-900/30 rounded-2xl border border-amber-700/20 text-2xl font-display font-black text-amber-400">
              {standings[2].totalScore} pts
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
