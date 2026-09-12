import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const useVoiceInputMock = vi.fn();

vi.mock("../hooks/useVoiceInput", () => ({
  useVoiceInput: () => useVoiceInputMock(),
}));

function baseVoiceInput(overrides: Partial<ReturnType<typeof useVoiceInputMock>> = {}) {
  return {
    isSupported: true,
    isListening: false,
    transcript: "",
    error: null,
    start: vi.fn(),
    stop: vi.fn(),
    ...overrides,
  };
}

describe("AdminGenerateForm", () => {
  beforeEach(() => {
    useVoiceInputMock.mockReset();
    useVoiceInputMock.mockReturnValue(baseVoiceInput());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hides the mic button when voice input isn't supported", async () => {
    useVoiceInputMock.mockReturnValue(baseVoiceInput({ isSupported: false }));
    const { AdminGenerateForm } = await import("./AdminGenerateForm");

    render(<AdminGenerateForm isGenerating={false} onGenerate={vi.fn()} />);

    expect(screen.queryByLabelText(/speak instructions/i)).not.toBeInTheDocument();
  });

  it("starts listening when the mic button is clicked", async () => {
    const start = vi.fn();
    useVoiceInputMock.mockReturnValue(baseVoiceInput({ start }));
    const { AdminGenerateForm } = await import("./AdminGenerateForm");

    render(<AdminGenerateForm isGenerating={false} onGenerate={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/speak instructions/i));

    expect(start).toHaveBeenCalled();
  });

  it("submits typed instructions on manual submit", async () => {
    const onGenerate = vi.fn();
    const { AdminGenerateForm } = await import("./AdminGenerateForm");

    render(<AdminGenerateForm isGenerating={false} onGenerate={onGenerate} />);
    fireEvent.change(screen.getByRole("textbox", { name: /what should these words be about/i }), {
      target: { value: "80s action movies" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^generate$/i }));

    expect(onGenerate).toHaveBeenCalledWith(20, "80s action movies");
  });

  it("submits with no instructions when the field is left blank", async () => {
    const onGenerate = vi.fn();
    const { AdminGenerateForm } = await import("./AdminGenerateForm");

    render(<AdminGenerateForm isGenerating={false} onGenerate={onGenerate} />);
    fireEvent.click(screen.getByRole("button", { name: /^generate$/i }));

    expect(onGenerate).toHaveBeenCalledWith(20, undefined);
  });

  it("streams the live transcript into the instructions field while listening", async () => {
    useVoiceInputMock.mockReturnValue(
      baseVoiceInput({ isListening: true, transcript: "90s movies" })
    );
    const { AdminGenerateForm } = await import("./AdminGenerateForm");

    render(<AdminGenerateForm isGenerating={false} onGenerate={vi.fn()} />);

    expect(screen.getByRole("textbox", { name: /what should these words be about/i })).toHaveValue(
      "90s movies"
    );
  });

  it("auto-submits after the countdown once recognition stops, unless cancelled", async () => {
    vi.useFakeTimers();
    const onGenerate = vi.fn();
    const { AdminGenerateForm } = await import("./AdminGenerateForm");

    useVoiceInputMock.mockReturnValue(
      baseVoiceInput({ isListening: true, transcript: "90s movies" })
    );
    const { rerender } = render(<AdminGenerateForm isGenerating={false} onGenerate={onGenerate} />);

    useVoiceInputMock.mockReturnValue(
      baseVoiceInput({ isListening: false, transcript: "90s movies" })
    );
    rerender(<AdminGenerateForm isGenerating={false} onGenerate={onGenerate} />);

    expect(screen.getByText(/generating in/i)).toBeInTheDocument();
    expect(onGenerate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onGenerate).toHaveBeenCalledWith(20, "90s movies");
  });

  it("cancels the auto-submit countdown when Cancel is clicked", async () => {
    vi.useFakeTimers();
    const onGenerate = vi.fn();
    const { AdminGenerateForm } = await import("./AdminGenerateForm");

    useVoiceInputMock.mockReturnValue(
      baseVoiceInput({ isListening: true, transcript: "90s movies" })
    );
    const { rerender } = render(<AdminGenerateForm isGenerating={false} onGenerate={onGenerate} />);

    useVoiceInputMock.mockReturnValue(
      baseVoiceInput({ isListening: false, transcript: "90s movies" })
    );
    rerender(<AdminGenerateForm isGenerating={false} onGenerate={onGenerate} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    vi.advanceTimersByTime(2000);

    expect(onGenerate).not.toHaveBeenCalled();
    expect(screen.queryByText(/generating in/i)).not.toBeInTheDocument();
  });
});
