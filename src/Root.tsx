import { useEffect, useState } from "react";
import App from "./App.tsx";
import { AdminScreen } from "./components/AdminScreen.tsx";

export function Root() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return hash === "#admin" ? <AdminScreen /> : <App />;
}
