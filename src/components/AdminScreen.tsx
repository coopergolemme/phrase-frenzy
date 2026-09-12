import { useEffect, useState, type FormEvent } from "react";
import type { WordCategory } from "../data/wordCategory";
import { fetchWordCategories } from "../data/wordDatabase";
import {
  approveWords,
  editWord,
  generateWords,
  listPendingWords,
  rejectWords,
  type PendingWord,
} from "../utils/adminApi";
import { AdminGenerateForm } from "./AdminGenerateForm";
import { AdminReviewQueue } from "./AdminReviewQueue";

export function AdminScreen() {
  const [categories, setCategories] = useState<WordCategory[]>([]);
  const [password, setPassword] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [pendingWords, setPendingWords] = useState<PendingWord[]>([]);
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
      const pending = await listPendingWords(passwordInput);
      setPendingWords(pending);
      setPassword(passwordInput);
      setIsUnlocked(true);
    } catch {
      setError("Incorrect password.");
    } finally {
      setIsCheckingPassword(false);
    }
  };

  const handleGenerate = async (categoryId: string | undefined, count: number) => {
    setIsGenerating(true);
    setError(null);
    try {
      const inserted = await generateWords(password, categoryId, count);
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

  const goToGame = () => {
    window.location.hash = "";
  };

  const backLink = (
    <a
      href="#"
      className="btn btn--text admin__back-link"
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
        <div className="screen-container admin">
          <div className="admin__header">
            {backLink}
            <h1 className="admin__title">Admin</h1>
          </div>
          <div className="admin__body">
            <form className="admin-card admin-password-form" onSubmit={handleUnlock}>
              <div className="admin-field">
                <label className="admin-field__label" htmlFor="admin-password">
                  Password
                </label>
                <input
                  id="admin-password"
                  className="admin-input"
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
              {error && <p className="home__error">{error}</p>}
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="screen-container admin">
        <div className="admin__header">
          {backLink}
          <h1 className="admin__title">Word Curation</h1>
        </div>
        <div className="admin__body">
          {error && <p className="home__error">{error}</p>}
          <div className="admin-card">
            <h2 className="admin-card__title">Generate</h2>
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
        </div>
      </div>
    </div>
  );
}
