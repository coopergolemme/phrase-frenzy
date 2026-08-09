import { useCallback, useMemo, useState } from "react";
import { getFlaggedWords, normalizeWord, saveFlaggedWords } from "../utils/flaggedWords";

export function useFlaggedWords() {
  const [flaggedWords, setFlaggedWords] = useState<string[]>(() => getFlaggedWords());
  const flaggedSet = useMemo(() => new Set(flaggedWords), [flaggedWords]);

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
  }, []);

  const unflagWord = useCallback((word: string) => {
    const normalized = normalizeWord(word);
    setFlaggedWords((prev) => {
      const next = prev.filter((w) => w !== normalized);
      saveFlaggedWords(next);
      return next;
    });
  }, []);

  return { flaggedWords, isFlagged, flagWord, unflagWord };
}
