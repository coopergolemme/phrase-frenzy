import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useVoiceInput } from "./useVoiceInput";

class FakeSpeechRecognition implements SpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;

  static instances: FakeSpeechRecognition[] = [];

  constructor() {
    FakeSpeechRecognition.instances.push(this);
  }

  start = vi.fn();
  stop = vi.fn(() => {
    this.onend?.();
  });

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true;
  }

  emitResult(transcript: string, isFinal = true) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal, 0: { transcript }, length: 1 } as unknown as SpeechRecognitionResult],
    } as unknown as SpeechRecognitionEvent);
  }

  emitError(error: string) {
    this.onerror?.({ error } as unknown as SpeechRecognitionErrorEvent);
  }
}

describe("useVoiceInput", () => {
  afterEach(() => {
    FakeSpeechRecognition.instances = [];
    vi.unstubAllGlobals();
  });

  it("reports unsupported when SpeechRecognition is unavailable", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);

    const { result } = renderHook(() => useVoiceInput());

    expect(result.current.isSupported).toBe(false);
  });

  it("starts listening and streams interim transcript into state", () => {
    vi.stubGlobal("SpeechRecognition", FakeSpeechRecognition);

    const { result } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.start();
    });

    expect(result.current.isListening).toBe(true);
    const instance = FakeSpeechRecognition.instances[0];
    expect(instance.start).toHaveBeenCalled();

    act(() => {
      instance.emitResult("ninety minute movies");
    });

    expect(result.current.transcript).toBe("ninety minute movies");
  });

  it("stops listening when recognition ends", () => {
    vi.stubGlobal("SpeechRecognition", FakeSpeechRecognition);

    const { result } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.start();
    });
    const instance = FakeSpeechRecognition.instances[0];

    act(() => {
      instance.onend?.();
    });

    expect(result.current.isListening).toBe(false);
  });

  it("surfaces a friendly error when the microphone is denied", () => {
    vi.stubGlobal("SpeechRecognition", FakeSpeechRecognition);

    const { result } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.start();
    });
    const instance = FakeSpeechRecognition.instances[0];

    act(() => {
      instance.emitError("not-allowed");
    });

    expect(result.current.error).toMatch(/microphone access/i);
    expect(result.current.isListening).toBe(false);
  });
});
