import { useEffect, useRef, useState } from "react";
import {
  deactivateWords,
  generateWords,
  getCategoryHealth,
  listCategoryWords,
  listDeactivatedWords,
  listFlaggedWords,
  publishWords,
  reactivateWords,
  suggestSimilarWords,
  type CategoryHealth,
  type CategoryWordsState,
  type DeactivatedWord,
  type FlaggedWord,
  type LocalWord,
  type PendingWord,
  type SimilarWord,
  type SimilarWordSuggestions,
} from "../utils/adminApi";
import { AdminGenerateForm } from "./AdminGenerateForm";
import { AdminReviewQueue } from "./AdminReviewQueue";
import { AdminFlaggedWordsQueue } from "./AdminFlaggedWordsQueue";
import { AdminDeactivatedWordsQueue } from "./AdminDeactivatedWordsQueue";
import { AdminCategoryHealth } from "./AdminCategoryHealth";

type AdminTab = "curation" | "flagged" | "deactivated" | "health";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "curation", label: "Word Curation" },
  { id: "flagged", label: "Flagged Words" },
  { id: "deactivated", label: "Deactivated Words" },
  { id: "health", label: "Category Health" },
];

export function AdminScreen() {
  const [activeTab, setActiveTab] = useState<AdminTab>("curation");
  const [pendingWords, setPendingWords] = useState<PendingWord[]>([]);
  const [approvedWords, setApprovedWords] = useState<PendingWord[]>([]);
  // Rejected candidates aren't published, but the model still needs to know
  // about them so it doesn't just suggest the same word back on the next
  // Generate click.
  const [rejectedWords, setRejectedWords] = useState<PendingWord[]>([]);
  const [flaggedWords, setFlaggedWords] = useState<FlaggedWord[]>([]);
  const [deactivatedWords, setDeactivatedWords] = useState<DeactivatedWord[]>([]);
  // Keyed by the id of the flagged word the admin just deactivated — surfaces
  // still-active words in the same category that look similar enough to be
  // worth reviewing too. Purely a UI suggestion; nothing here is persisted.
  const [similarSuggestions, setSimilarSuggestions] = useState<Record<string, SimilarWordSuggestions>>(
    {}
  );
  const [categoryHealth, setCategoryHealth] = useState<CategoryHealth[] | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  // Accordion: only one category's word list is expanded/fetched at a time.
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [categoryWordsById, setCategoryWordsById] = useState<Record<string, CategoryWordsState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Approved words are only reviewed locally — nothing is written to the
  // db until the admin navigates away from this screen. A ref (rather than
  // state) so the unmount cleanup below reads the latest value without
  // re-subscribing the effect on every approve/reject.
  const approvedWordsRef = useRef<PendingWord[]>([]);
  useEffect(() => {
    approvedWordsRef.current = approvedWords;
  }, [approvedWords]);

  useEffect(() => {
    return () => {
      const words = approvedWordsRef.current;
      if (words.length === 0) return;
      const toPublish: LocalWord[] = words.map((w) => ({
        categoryId: w.categoryId,
        categoryLabel: w.categoryLabel,
        categoryEmoji: w.categoryEmoji,
        isNewCategory: w.isNewCategory,
        text: w.text,
      }));
      void publishWords(toPublish);
    };
  }, []);

  useEffect(() => {
    Promise.all([listFlaggedWords(), listDeactivatedWords()])
      .then(([flagged, deactivated]) => {
        setFlaggedWords(flagged);
        setDeactivatedWords(deactivated);
      })
      .catch(() => setError("Couldn't load admin data. Try again."))
      .finally(() => setIsLoading(false));
  }, []);

  // Fetched lazily on first visit to the tab rather than alongside the
  // other startup lists — it aggregates every word and word_stats row, so
  // it's the heaviest of the admin queries and most sessions never open it.
  useEffect(() => {
    if (activeTab !== "health" || categoryHealth !== null) return;
    setIsLoadingHealth(true);
    getCategoryHealth()
      .then(setCategoryHealth)
      .catch(() => setError("Couldn't load category health. Try again."))
      .finally(() => setIsLoadingHealth(false));
  }, [activeTab, categoryHealth]);

  const handleGenerate = async (instructions?: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const localWords: LocalWord[] = [...pendingWords, ...approvedWords, ...rejectedWords].map((w) => ({
        categoryId: w.categoryId,
        categoryLabel: w.categoryLabel,
        categoryEmoji: w.categoryEmoji,
        isNewCategory: w.isNewCategory,
        text: w.text,
      }));
      const candidates = await generateWords(instructions, localWords);
      setPendingWords((current) => [...current, ...candidates]);
    } catch {
      setError("Couldn't generate words. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const isSameWord = (a: PendingWord, b: PendingWord) =>
    a.categoryId === b.categoryId && a.text.trim().toLowerCase() === b.text.trim().toLowerCase();

  const handleApprove = (id: string) => {
    setPendingWords((current) => {
      const word = current.find((w) => w.id === id);
      if (word) {
        setApprovedWords((approved) => [...approved, word]);
        // Clear any earlier rejection of the same text/category — it's
        // approved now, so it shouldn't still count as "previously
        // rejected" if this word is ever regenerated in a later session.
        setRejectedWords((rejected) => rejected.filter((r) => !isSameWord(r, word)));
      }
      return current.filter((w) => w.id !== id);
    });
  };

  const handleReject = (id: string) => {
    setPendingWords((current) => {
      const word = current.find((w) => w.id === id);
      if (word) {
        setRejectedWords((rejected) => [...rejected, word]);
        // Mirror of the above: an earlier approval of the same text/category
        // shouldn't survive a later, explicit rejection of it.
        setApprovedWords((approved) => approved.filter((a) => !isSameWord(a, word)));
      }
      return current.filter((w) => w.id !== id);
    });
  };

  const handleRejectAll = () => {
    setRejectedWords((rejected) => [...rejected, ...pendingWords]);
    setApprovedWords((approved) =>
      approved.filter((a) => !pendingWords.some((word) => isSameWord(a, word)))
    );
    setPendingWords([]);
  };

  const handleEditSave = (id: string, text: string) => {
    setPendingWords((current) => current.map((word) => (word.id === id ? { ...word, text } : word)));
  };

  const handleDeactivate = async (ids: string[], reason?: string) => {
    if (ids.length === 0) return;
    setError(null);
    try {
      await deactivateWords(ids);
      const idSet = new Set(ids);
      setFlaggedWords((current) =>
        current.map((flagged) => (idSet.has(flagged.id) ? { ...flagged, active: false } : flagged))
      );
      setDeactivatedWords((current) => {
        const newlyDeactivated = flaggedWords
          .filter((flagged) => idSet.has(flagged.id))
          .map((flagged) => ({
            id: flagged.id,
            categoryId: flagged.categoryId,
            categoryLabel: flagged.categoryLabel,
            text: flagged.text,
            flaggedCount: flagged.flaggedCount,
          }));
        return [...current, ...newlyDeactivated];
      });
      // Only offer similar-word suggestions off a direct, single-word
      // deactivation from the flagged queue — not off a bulk action, and
      // not recursively off a suggestion the admin just accepted (those are
      // deactivated via handleDeactivateSuggestion instead).
      if (ids.length === 1) {
        const source = flaggedWords.find((flagged) => flagged.id === ids[0]);
        if (source) void fetchSimilarSuggestions(source, reason);
      }
    } catch {
      setError("Couldn't deactivate that word. Try again.");
    }
  };

  const fetchSimilarSuggestions = async (source: FlaggedWord, reason?: string) => {
    setSimilarSuggestions((current) => ({ ...current, [source.id]: { status: "loading", items: [] } }));
    try {
      const items = await suggestSimilarWords(source.id, reason);
      setSimilarSuggestions((current) => ({ ...current, [source.id]: { status: "done", items } }));
    } catch {
      setSimilarSuggestions((current) => ({ ...current, [source.id]: { status: "error", items: [] } }));
    }
  };

  const handleDeactivateSuggestion = async (sourceId: string, suggestion: SimilarWord) => {
    const source = flaggedWords.find((flagged) => flagged.id === sourceId);
    if (!source) return;
    setError(null);
    try {
      await deactivateWords([suggestion.id]);
      setDeactivatedWords((current) => [
        ...current,
        {
          id: suggestion.id,
          categoryId: source.categoryId,
          categoryLabel: source.categoryLabel,
          text: suggestion.text,
          flaggedCount: 0,
        },
      ]);
      setSimilarSuggestions((current) => {
        const entry = current[sourceId];
        if (!entry) return current;
        return {
          ...current,
          [sourceId]: { ...entry, items: entry.items.filter((item) => item.id !== suggestion.id) },
        };
      });
    } catch {
      setError("Couldn't deactivate that word. Try again.");
    }
  };

  const handleDismissSuggestion = (sourceId: string, suggestionId: string) => {
    setSimilarSuggestions((current) => {
      const entry = current[sourceId];
      if (!entry) return current;
      return {
        ...current,
        [sourceId]: { ...entry, items: entry.items.filter((item) => item.id !== suggestionId) },
      };
    });
  };

  const handleReactivate = async (ids: string[]) => {
    if (ids.length === 0) return;
    setError(null);
    try {
      await reactivateWords(ids);
      const idSet = new Set(ids);
      setDeactivatedWords((current) => current.filter((word) => !idSet.has(word.id)));
      setFlaggedWords((current) =>
        current.map((flagged) => (idSet.has(flagged.id) ? { ...flagged, active: true } : flagged))
      );
    } catch {
      setError("Couldn't reactivate that word. Try again.");
    }
  };

  const handleToggleCategory = (categoryId: string) => {
    setExpandedCategoryId((current) => (current === categoryId ? null : categoryId));
    if (!categoryWordsById[categoryId]) {
      void fetchCategoryWords(categoryId);
    }
  };

  const fetchCategoryWords = async (categoryId: string) => {
    setCategoryWordsById((current) => ({ ...current, [categoryId]: { status: "loading", items: [] } }));
    try {
      const items = await listCategoryWords(categoryId);
      setCategoryWordsById((current) => ({ ...current, [categoryId]: { status: "done", items } }));
    } catch {
      setCategoryWordsById((current) => ({ ...current, [categoryId]: { status: "error", items: [] } }));
    }
  };

  const goToGame = () => {
    window.location.hash = "";
  };

  const backLink = (
    <a
      href="#"
      className="btn btn--text self-start min-h-0 py-1"
      onClick={(e) => {
        e.preventDefault();
        goToGame();
      }}
    >
      ← Back to game
    </a>
  );

  if (isLoading) {
    return (
      <div className="app-shell">
        <div className="screen-container flex min-h-0 flex-col gap-3">
          <div className="flex shrink-0 flex-col gap-1">
            {backLink}
            <h1 className="m-0 font-display font-bold text-xl text-yellow">Admin</h1>
          </div>
          <div className="flex justify-center py-10">
            <div
              role="status"
              aria-label="Loading admin data"
              className="h-10 w-10 animate-spin rounded-full border-4 border-border-solid border-t-primary"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="screen-container flex min-h-0 flex-col gap-3">
        <div className="flex shrink-0 flex-col gap-3">
          {backLink}
          <h1 className="m-0 font-display font-bold text-xl text-yellow">Admin</h1>
          <div className="flex gap-1 border-b border-border-solid" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`min-h-touch flex-1 rounded-t-button px-2 py-2 text-[0.85rem] font-bold ${
                  activeTab === tab.id
                    ? "border-b-2 border-yellow text-yellow"
                    : "border-b-2 border-transparent text-text-secondary"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4 [-webkit-overflow-scrolling:touch]">
          {error && <p className="m-0 text-center text-[0.9rem] leading-snug text-danger">{error}</p>}
          {activeTab === "curation" && (
            <>
              <div className="rounded-card border border-outline bg-surface p-4 backdrop-blur-[20px]">
                <h2 className="m-0 mb-3 text-base font-bold">Generate</h2>
                <AdminGenerateForm isGenerating={isGenerating} onGenerate={handleGenerate} />
              </div>
              {approvedWords.length > 0 && (
                <p className="m-0 text-center text-[0.85rem] text-text-secondary">
                  {approvedWords.length} word{approvedWords.length === 1 ? "" : "s"} approved — saved
                  when you leave this screen.
                </p>
              )}
              <AdminReviewQueue
                pendingWords={pendingWords}
                onApprove={handleApprove}
                onReject={handleReject}
                onRejectAll={handleRejectAll}
                onEditSave={handleEditSave}
              />
            </>
          )}
          {activeTab === "flagged" && (
            <AdminFlaggedWordsQueue
              flaggedWords={flaggedWords}
              onDeactivate={handleDeactivate}
              similarSuggestions={similarSuggestions}
              onDeactivateSuggestion={handleDeactivateSuggestion}
              onDismissSuggestion={handleDismissSuggestion}
            />
          )}
          {activeTab === "deactivated" && (
            <AdminDeactivatedWordsQueue
              deactivatedWords={deactivatedWords}
              onReactivate={handleReactivate}
            />
          )}
          {activeTab === "health" && (
            <AdminCategoryHealth
              categories={categoryHealth ?? []}
              isLoading={isLoadingHealth}
              expandedCategoryId={expandedCategoryId}
              categoryWordsById={categoryWordsById}
              onToggleCategory={handleToggleCategory}
            />
          )}
        </div>
      </div>
    </div>
  );
}
