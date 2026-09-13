import { lazy, Suspense, useEffect, useState } from "react";
import App from "./App.tsx";

// Lazy-loaded so admin-only dependencies (the charting library, in
// particular) never ship in the bundle every player downloads to play a
// game — only admins hitting #admin pay for it.
const AdminScreen = lazy(() =>
  import("./components/AdminScreen.tsx").then((m) => ({ default: m.AdminScreen }))
);

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

  return <App />;
}
