import { useEffect, useRef, useState, type FormEvent } from "react";
import type { WordCategory } from "../data/wordCategory";
import { useVoiceInput } from "../hooks/useVoiceInput";

interface AdminGenerateFormProps {
  categories: WordCategory[];
  isGenerating: boolean;
  onGenerate: (categoryId: string | undefined, count: number, instructions?: string) => void;
}

const fieldLabelClass = "text-[0.8rem] font-semibold text-text-secondary";
const fieldControlClass =
  "min-h-touch w-full rounded-button border-[1.5px] border-border-solid bg-surface-solid px-3 py-2 font-[inherit] text-base text-text focus:outline-2 focus:outline-primary focus:outline-offset-1";

const AUTO_SUBMIT_SECONDS = 2;

export function AdminGenerateForm({ categories, isGenerating, onGenerate }: AdminGenerateFormProps) {
  const [categoryId, setCategoryId] = useState("");
  const [count, setCount] = useState(20);
  const [instructions, setInstructions] = useState("");
  const [autoSubmitSecondsLeft, setAutoSubmitSecondsLeft] = useState<number | null>(null);
  const { isSupported, isListening, transcript, error: voiceError, start, stop } = useVoiceInput();
  const autoSubmitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasListeningRef = useRef(false);

  useEffect(() => {
    if (isListening) setInstructions(transcript);
  }, [isListening, transcript]);

  const cancelAutoSubmit = () => {
    if (autoSubmitTimerRef.current) {
      clearInterval(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }
    setAutoSubmitSecondsLeft(null);
  };

  useEffect(() => {
    // Recognition just stopped (silence detected) with something heard —
    // start the cancellable auto-submit countdown rather than firing a
    // paid generation call blind on a possible mis-transcription.
    if (wasListeningRef.current && !isListening && transcript.trim()) {
      const spokenInstructions = transcript.trim();
      setAutoSubmitSecondsLeft(AUTO_SUBMIT_SECONDS);
      autoSubmitTimerRef.current = setInterval(() => {
        setAutoSubmitSecondsLeft((secondsLeft) => {
          if (secondsLeft === null || secondsLeft <= 1) {
            cancelAutoSubmit();
            onGenerate(categoryId || undefined, count, spokenInstructions);
            return null;
          }
          return secondsLeft - 1;
        });
      }, 1000);
    }
    wasListeningRef.current = isListening;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  useEffect(() => {
    return () => cancelAutoSubmit();
  }, []);

  const handleMicClick = () => {
    if (isListening) {
      stop();
    } else {
      cancelAutoSubmit();
      start();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    cancelAutoSubmit();
    onGenerate(categoryId || undefined, count, instructions.trim() || undefined);
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label className={fieldLabelClass} htmlFor="admin-generate-category">
            Category
          </label>
          <select
            id="admin-generate-category"
            className={fieldControlClass}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.emoji} {category.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-none basis-[5.5rem] flex-col gap-1">
          <label className={fieldLabelClass} htmlFor="admin-generate-count">
            Count
          </label>
          <input
            id="admin-generate-count"
            className={fieldControlClass}
            type="number"
            min={1}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className={fieldLabelClass} htmlFor="admin-generate-instructions">
          Instructions (optional)
        </label>
        <div className="flex gap-2">
          <textarea
            id="admin-generate-instructions"
            className={`${fieldControlClass} min-h-[3.5rem] resize-none`}
            placeholder="e.g. lean toward 90s references"
            value={instructions}
            onChange={(e) => {
              cancelAutoSubmit();
              setInstructions(e.target.value);
            }}
          />
          {isSupported && (
            <button
              type="button"
              className={`btn btn--small ${isListening ? "btn--primary" : "btn--outline"} flex-none self-start`}
              onClick={handleMicClick}
              aria-pressed={isListening}
              aria-label={isListening ? "Stop listening" : "Speak instructions"}
            >
              {isListening ? "● Listening…" : "🎤"}
            </button>
          )}
        </div>
        {voiceError && <p className="m-0 text-[0.8rem] text-danger">{voiceError}</p>}
        {autoSubmitSecondsLeft !== null && (
          <p className="m-0 flex items-center gap-2 text-[0.8rem] text-text-secondary">
            Generating in {autoSubmitSecondsLeft}s…
            <button
              type="button"
              className="btn btn--text min-h-0 py-0 text-[0.8rem]"
              onClick={cancelAutoSubmit}
            >
              Cancel
            </button>
          </p>
        )}
      </div>

      <button type="submit" className="btn btn--primary" disabled={isGenerating}>
        {isGenerating ? "Generating…" : "Generate"}
      </button>
    </form>
  );
}
