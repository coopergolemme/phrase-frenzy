import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGameStatusHash } from "./useGameStatusHash";
import type { GameStatus } from "./useGameState";

describe("useGameStatusHash", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes the mapped hash for each game status via replaceState", () => {
    const replaceState = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    const cases: [GameStatus, string][] = [
      ["home", ""],
      ["teamSetup", "#teamSetup"],
      ["playing", "#playing"],
      ["roundSummary", "#roundSummary"],
      ["gameOver", "#gameOver"],
    ];

    for (const [status, hash] of cases) {
      const { unmount } = renderHook(() => useGameStatusHash(status));
      const lastCall = replaceState.mock.calls.at(-1);
      expect(lastCall?.[2]).toBe(window.location.pathname + window.location.search + hash);
      unmount();
    }
  });

  it("replaces the URL again when the status changes, without pushing history", () => {
    const replaceState = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    const pushState = vi.spyOn(window.history, "pushState");

    const { rerender } = renderHook(({ status }: { status: GameStatus }) => useGameStatusHash(status), {
      initialProps: { status: "home" as GameStatus },
    });

    rerender({ status: "playing" });

    expect(replaceState).toHaveBeenCalledTimes(2);
    expect(pushState).not.toHaveBeenCalled();
  });
});
