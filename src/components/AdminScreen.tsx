import { useEffect, useState, type FormEvent } from "react";
import type { WordCategory } from "../data/wordCategory";
import { fetchWordCategories } from "../data/wordDatabase";
import {
  approveWords,
  deactivateWords,
  editWord,
  generateWords,
  listFlaggedWords,
  listPendingWords,
  rejectWords,
  type FlaggedWord,
  type PendingWord,
} from "../utils/adminApi";
import { AdminGenerateForm } from "./AdminGenerateForm";
import { AdminReviewQueue } from "./AdminReviewQueue";
import { AdminFlaggedWordsQueue } from "./AdminFlaggedWordsQueue";

export function AdminScreen() {
  const [categories, setCategories] = useState<WordCategory[]>([]);
  const [password, setPassword] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [pendingWords, setPendingWords] = useState<PendingWord[]>([]);
  const [flaggedWords, setFlaggedWords] = useState<FlaggedWord[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingPassword, setIsCheckingPassword] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWordCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCheckingPassword(true);
    setError(null);
    try {
      const [pending, flagged] = await Promise.all([
        listPendingWords(passwordInput),
        listFlaggedWords(passwordInput),
      ]);
      setPendingWords(pending);
      setFlaggedWords(flagged);
      setPassword(passwordInput);
      setIsUnlocked(true);
    } catch {
      setError("Incorrect password.");
    } finally {
      setIsCheckingPassword(false);
    }
  };

  const handleGenerate = async (
    categoryId: string | undefined,
    count: number,
    instructions?: string
  ) => {
    setIsGenerating(true);
    setError(null);
    try {
      const inserted = await generateWords(password, categoryId, count, instructions);
      setPendingWords((current) => [...current, ...inserted]);
    } catch {
      setError("Couldn't generate words. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (id: string) => {
    setError(null);
    try {
      await approveWords(password, [id]);
      setPendingWords((current) => current.filter((word) => word.id !== id));
    } catch {
      setError("Couldn't approve that word. Try again.");
    }
  };

  const handleReject = async (id: string) => {
    setError(null);
    try {
      await rejectWords(password, [id]);
      setPendingWords((current) => current.filter((word) => word.id !== id));
    } catch {
      setError("Couldn't reject that word. Try again.");
    }
  };

  const handleEditSave = async (id: string, text: string) => {
    setError(null);
    try {
      await editWord(password, id, text);
      setPendingWords((current) =>
        current.map((word) => (word.id === id ? { ...word, text } : word))
      );
    } catch {
      setError("Couldn't save that edit. Try again.");
    }
  };

  const handleDeactivate = async (ids: string[]) => {
    if (ids.length === 0) return;
    setError(null);
    try {
      await deactivateWords(password, ids);
      const idSet = new Set(ids);
      setFlaggedWords((current) =>
        current.map((flagged) => ({
          ...flagged,
          matches: flagged.matches.map((match) =>
            idSet.has(match.id) ? { ...match, active: false } : match
          ),
        }))
      );
    } catch {
      setError("Couldn't deactivate that word. Try again.");
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

  if (!isUnlocked) {
    return (
      <div className="app-shell">
        <div className="screen-container flex min-h-0 flex-col gap-3">
          <div className="flex shrink-0 flex-col gap-1">
            {backLink}
            <h1 className="m-0 font-display text-xl text-yellow">Admin</h1>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4 [-webkit-overflow-scrolling:touch]">
            <form
              className="mx-auto mt-6 flex w-full max-w-[22rem] flex-col gap-3 rounded-card border border-outline bg-surface p-4 backdrop-blur-[20px]"
              onSubmit={handleUnlock}
            >
              <div className="flex flex-col gap-1">
                <label
                  className="text-[0.8rem] font-semibold text-text-secondary"
                  htmlFor="admin-password"
                >
                  Password
                </label>
                <input
                  id="admin-password"
                  className="min-h-touch w-full rounded-button border-[1.5px] border-border-solid bg-surface-solid px-3 py-2 font-[inherit] text-base text-text focus:outline-2 focus:outline-primary focus:outline-offset-1"
                  type="password"
                  aria-label="Admin password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn--primary" disabled={isCheckingPassword}>
                {isCheckingPassword ? "Checking…" : "Unlock"}
              </button>
              {error && <p className="m-0 text-center text-[0.9rem] leading-snug text-danger">{error}</p>}
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="screen-container flex min-h-0 flex-col gap-3">
        <div className="flex shrink-0 flex-col gap-1">
          {backLink}
          <h1 className="m-0 font-display text-xl text-yellow">Word Curation</h1>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4 [-webkit-overflow-scrolling:touch]">
          {error && <p className="m-0 text-center text-[0.9rem] leading-snug text-danger">{error}</p>}
          <div className="rounded-card border border-outline bg-surface p-4 backdrop-blur-[20px]">
            <h2 className="m-0 mb-3 text-base font-bold">Generate</h2>
            <AdminGenerateForm
              categories={categories}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
            />
          </div>
          <AdminReviewQueue
            pendingWords={pendingWords}
            onApprove={handleApprove}
            onReject={handleReject}
            onEditSave={handleEditSave}
          />
          <div>
            <h2 className="m-0 mb-3 text-base font-bold">Flagged Words</h2>
            <AdminFlaggedWordsQueue flaggedWords={flaggedWords} onDeactivate={handleDeactivate} />
          </div>
        </div>
      </div>
    </div>
  );
}
