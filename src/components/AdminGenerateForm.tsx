import { useEffect, useRef, useState, type FormEvent } from "react";
import { useVoiceInput } from "../hooks/useVoiceInput";

interface AdminGenerateFormProps {
  isGenerating: boolean;
  onGenerate: (instructions?: string) => void;
}

const fieldLabelClass = "text-[0.8rem] font-semibold text-text-secondary";
const fieldControlClass =
  "min-h-touch w-full rounded-button border-[1.5px] border-border-solid bg-surface-solid px-3 py-2 font-[inherit] text-base text-text focus:outline-2 focus:outline-primary focus:outline-offset-1";

const AUTO_SUBMIT_SECONDS = 2;

export function AdminGenerateForm({ isGenerating, onGenerate }: AdminGenerateFormProps) {
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
            onGenerate(spokenInstructions);
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
    onGenerate(instructions.trim() || undefined);
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1">
        <label className={fieldLabelClass} htmlFor="admin-generate-instructions">
          What should these words be about? (optional)
        </label>
        <div className="flex gap-2">
          <textarea
            id="admin-generate-instructions"
            className={`${fieldControlClass} min-h-[3.5rem] resize-none`}
            placeholder="e.g. 80s action movies — leave blank to add to existing categories"
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

      <button type="submit" className="btn btn--primary w-full" disabled={isGenerating}>
        {isGenerating ? "Generating…" : "Generate"}
      </button>
    </form>
  );
}
