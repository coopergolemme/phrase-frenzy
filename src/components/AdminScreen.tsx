import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  deactivateWords,
  generateWords,
  listDeactivatedWords,
  listFlaggedWords,
  publishWords,
  reactivateWords,
  type DeactivatedWord,
  type FlaggedWord,
  type LocalWord,
  type PendingWord,
} from "../utils/adminApi";
import { AdminGenerateForm } from "./AdminGenerateForm";
import { AdminReviewQueue } from "./AdminReviewQueue";
import { AdminFlaggedWordsQueue } from "./AdminFlaggedWordsQueue";
import { AdminDeactivatedWordsQueue } from "./AdminDeactivatedWordsQueue";

type AdminTab = "curation" | "flagged" | "deactivated";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "curation", label: "Word Curation" },
  { id: "flagged", label: "Flagged Words" },
  { id: "deactivated", label: "Deactivated Words" },
];

export function AdminScreen() {
  const [password, setPassword] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("curation");
  const [pendingWords, setPendingWords] = useState<PendingWord[]>([]);
  const [approvedWords, setApprovedWords] = useState<PendingWord[]>([]);
  // Rejected candidates aren't published, but the model still needs to know
  // about them so it doesn't just suggest the same word back on the next
  // Generate click.
  const [rejectedWords, setRejectedWords] = useState<PendingWord[]>([]);
  const [flaggedWords, setFlaggedWords] = useState<FlaggedWord[]>([]);
  const [deactivatedWords, setDeactivatedWords] = useState<DeactivatedWord[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingPassword, setIsCheckingPassword] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Approved words are only reviewed locally — nothing is written to the
  // db until the admin navigates away from this screen. Refs (rather than
  // state) so the unmount cleanup below reads the latest values without
  // re-subscribing the effect on every approve/reject.
  const approvedWordsRef = useRef<PendingWord[]>([]);
  const passwordRef = useRef("");
  useEffect(() => {
    approvedWordsRef.current = approvedWords;
  }, [approvedWords]);
  useEffect(() => {
    passwordRef.current = password;
  }, [password]);

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
      void publishWords(passwordRef.current, toPublish);
    };
  }, []);

  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCheckingPassword(true);
    setError(null);
    try {
      const [flagged, deactivated] = await Promise.all([
        listFlaggedWords(passwordInput),
        listDeactivatedWords(passwordInput),
      ]);
      setFlaggedWords(flagged);
      setDeactivatedWords(deactivated);
      setPassword(passwordInput);
      setIsUnlocked(true);
    } catch {
      setError("Incorrect password.");
    } finally {
      setIsCheckingPassword(false);
    }
  };

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
      const candidates = await generateWords(password, instructions, localWords);
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

  const handleDeactivate = async (ids: string[]) => {
    if (ids.length === 0) return;
    setError(null);
    try {
      await deactivateWords(password, ids);
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
    } catch {
      setError("Couldn't deactivate that word. Try again.");
    }
  };

  const handleReactivate = async (ids: string[]) => {
    if (ids.length === 0) return;
    setError(null);
    try {
      await reactivateWords(password, ids);
      const idSet = new Set(ids);
      setDeactivatedWords((current) => current.filter((word) => !idSet.has(word.id)));
      setFlaggedWords((current) =>
        current.map((flagged) => (idSet.has(flagged.id) ? { ...flagged, active: true } : flagged))
      );
    } catch {
      setError("Couldn't reactivate that word. Try again.");
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
            <h1 className="m-0 font-display font-bold text-xl text-yellow">Admin</h1>
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
            <AdminFlaggedWordsQueue flaggedWords={flaggedWords} onDeactivate={handleDeactivate} />
          )}
          {activeTab === "deactivated" && (
            <AdminDeactivatedWordsQueue
              deactivatedWords={deactivatedWords}
              onReactivate={handleReactivate}
            />
          )}
        </div>
      </div>
    </div>
  );
}
