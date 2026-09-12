import { useEffect, useState } from "react";
import { fetchKnownPlayerNames } from "../utils/playerDirectory";

// Best-effort autocomplete source for team setup — purely additive, so a
// failed or slow fetch just leaves the suggestion list empty.
export function useKnownPlayerNames(): string[] {
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchKnownPlayerNames()
      .then((fetched) => {
        if (!cancelled) setNames(fetched);
      })
      .catch(() => {
        // offline or db unavailable — no suggestions, not an error
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return names;
}
