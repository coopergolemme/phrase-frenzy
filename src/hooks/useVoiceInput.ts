import { useCallback, useEffect, useRef, useState } from "react";

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

// One-utterance voice capture for the admin generate form — press to
// listen, speak a sentence, recognition ends itself on silence. Not a
// dictation tool, so continuous mode stays off.
export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported = getSpeechRecognitionConstructor() !== undefined;

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      setError("Speech recognition isn't supported in this browser.");
      return;
    }

    setError(null);
    setTranscript("");

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let combined = "";
      for (let i = 0; i < event.results.length; i += 1) {
        combined += event.results[i][0].transcript;
      }
      setTranscript(combined);
    };

    recognition.onerror = (event) => {
      setError(event.error === "not-allowed" ? "Microphone access was denied." : "Couldn't hear you — try again.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { isSupported, isListening, transcript, error, start, stop };
}
