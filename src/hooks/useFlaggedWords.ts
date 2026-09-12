import { useCallback, useMemo, useRef, useState } from "react";
import { getFlaggedWords, normalizeWord, saveFlaggedWords } from "../utils/flaggedWords";
import { syncFlaggedWord } from "../utils/gameSync";

export function useFlaggedWords() {
  const [flaggedWords, setFlaggedWords] = useState<string[]>(() => getFlaggedWords());
  const flaggedSet = useMemo(() => new Set(flaggedWords), [flaggedWords]);
  // Tracks which words have already been synced to the db, checked
  // synchronously so two flagWord calls in the same tick (e.g. React state
  // batching, StrictMode double-invocation) don't double-sync.
  const syncedRef = useRef<Set<string>>(new Set(flaggedWords));

  const isFlagged = useCallback(
    (word: string) => flaggedSet.has(normalizeWord(word)),
    [flaggedSet]
  );

  const flagWord = useCallback((word: string) => {
    const normalized = normalizeWord(word);
    setFlaggedWords((prev) => {
      if (prev.includes(normalized)) return prev;
      const next = [...prev, normalized];
      saveFlaggedWords(next);
      return next;
    });
    if (!syncedRef.current.has(normalized)) {
      syncedRef.current.add(normalized);
      void syncFlaggedWord(normalized);
    }
  }, []);

  const unflagWord = useCallback((word: string) => {
    const normalized = normalizeWord(word);
    setFlaggedWords((prev) => {
      const next = prev.filter((w) => w !== normalized);
      saveFlaggedWords(next);
      return next;
    });
    syncedRef.current.delete(normalized);
  }, []);

  return { flaggedWords, isFlagged, flagWord, unflagWord };
}
