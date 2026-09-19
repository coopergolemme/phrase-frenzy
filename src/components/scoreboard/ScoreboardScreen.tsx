import { useScoreboardState } from "../../hooks/useScoreboardState";
import { ScoreboardLobbyView } from "./ScoreboardLobbyView";
import { ScoreboardPlayingView } from "./ScoreboardPlayingView";
import { ScoreboardSummaryView } from "./ScoreboardSummaryView";
import { ScoreboardPodiumView } from "./ScoreboardPodiumView";
import { StreamOverlayHUD } from "./StreamOverlayHUD";

interface ScoreboardScreenProps {
  roomCode: string;
  isOverlayMode?: boolean;
}

export function ScoreboardScreen({ roomCode, isOverlayMode }: ScoreboardScreenProps) {
  const scoreboard = useScoreboardState(roomCode);

  // Check URL query parameters if not explicitly passed as prop
  const searchParams = new URLSearchParams(window.location.search);
  const isOverlay = isOverlayMode || searchParams.get("mode") === "overlay";

  if (scoreboard.isLoading) {
    return (
      <div className="scoreboard-container flex items-center justify-center min-h-screen text-center p-8 bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-lg font-bold text-text-secondary">Connecting to Room {roomCode}…</p>
        </div>
      </div>
    );
  }

  if (scoreboard.error) {
    return (
      <div className="scoreboard-container flex items-center justify-center min-h-screen text-center p-8 bg-slate-950 text-white">
        <div className="max-w-md p-8 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex flex-col items-center gap-4">
          <span className="text-4xl">⚠️</span>
          <h2 className="text-xl font-bold text-rose-300 m-0">Room Not Found</h2>
          <p className="text-sm text-text-secondary m-0">{scoreboard.error}</p>
          <a
            href="#"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors text-decoration-none mt-2"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  if (isOverlay) {
    return <StreamOverlayHUD scoreboard={scoreboard} roomCode={roomCode} />;
  }

  return (
    <div className="scoreboard-container min-h-screen w-full bg-slate-950 text-white flex flex-col p-6 lg:p-10 select-none overflow-hidden font-sans">
      {scoreboard.status === "lobby" && (
        <ScoreboardLobbyView roomCode={roomCode} lobby={scoreboard.lobby} />
      )}
      {scoreboard.status === "playing" && (
        <ScoreboardPlayingView scoreboard={scoreboard} roomCode={roomCode} />
      )}
      {scoreboard.status === "roundSummary" && (
        <ScoreboardSummaryView scoreboard={scoreboard} />
      )}
      {scoreboard.status === "gameOver" && (
        <ScoreboardPodiumView teams={scoreboard.teams} />
      )}
    </div>
  );
}

export default ScoreboardScreen;
