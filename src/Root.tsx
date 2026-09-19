import { lazy, Suspense, useEffect, useState } from "react";
import App from "./App.tsx";

// Lazy-loaded so admin-only dependencies (the charting library, in
// particular) never ship in the bundle every player downloads to play a
// game — only admins hitting #admin pay for it.
const AdminScreen = lazy(() =>
  import("./components/AdminScreen.tsx").then((m) => ({ default: m.AdminScreen }))
);

// Distributed multiplayer's own dependencies (realtime channel subscriptions)
// only ship to players who actually navigate into it, same reasoning as the
// admin screen above.
const MultiplayerApp = lazy(() => import("./MultiplayerApp.tsx"));

const ROOM_HASH_PREFIX = "#room/";

export function Root() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (hash === "#admin") {
    return (
      <Suspense fallback={null}>
        <AdminScreen />
      </Suspense>
    );
  }

  if (hash === "#multiplayer" || hash.startsWith(ROOM_HASH_PREFIX)) {
    const roomCode = hash.startsWith(ROOM_HASH_PREFIX)
      ? decodeURIComponent(hash.slice(ROOM_HASH_PREFIX.length))
      : undefined;
    return (
      <Suspense fallback={null}>
        <MultiplayerApp initialRoomCode={roomCode} />
      </Suspense>
    );
  }

  return <App />;
}
