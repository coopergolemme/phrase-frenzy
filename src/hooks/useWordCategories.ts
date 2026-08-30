import { useCallback, useEffect, useState } from "react";
import type { WordCategory } from "../data/wordCategory";
import { fetchWordCategories } from "../data/wordDatabase";
import { SEED_WORD_CATEGORIES } from "../data/seedWords";
import { getCachedWordCategories, saveCachedWordCategories } from "../utils/wordCategoryCache";

export function useWordCategories() {
  const [categories, setCategories] = useState<WordCategory[]>(
    () => getCachedWordCategories() ?? []
  );
  const [isLoading, setIsLoading] = useState(categories.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchWordCategories()
      .then((fetched) => {
        if (cancelled) return;
        setCategories(fetched);
        saveCachedWordCategories(fetched);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCategories((current) => (current.length > 0 ? current : SEED_WORD_CATEGORIES));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const fetched = await fetchWordCategories();
      setCategories(fetched);
      saveCachedWordCategories(fetched);
    } catch {
      setRefreshError("Couldn't reach the word database. Try again later.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return { categories, isLoading, refresh, isRefreshing, refreshError };
}
