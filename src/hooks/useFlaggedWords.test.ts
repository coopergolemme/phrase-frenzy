import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const syncFlaggedWordMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../utils/gameSync", () => ({
  syncFlaggedWord: syncFlaggedWordMock,
}));

describe("useFlaggedWords", () => {
  beforeEach(() => {
    syncFlaggedWordMock.mockClear();
    localStorage.clear();
  });

  it("syncs a flagged word to the db immediately, normalized", async () => {
    const { useFlaggedWords } = await import("./useFlaggedWords");
    const { result } = renderHook(() => useFlaggedWords());

    act(() => {
      result.current.flagWord("  Taco  ");
    });

    expect(syncFlaggedWordMock).toHaveBeenCalledWith("taco");
    expect(result.current.isFlagged("taco")).toBe(true);
  });

  it("does not re-sync a word that is already flagged", async () => {
    const { useFlaggedWords } = await import("./useFlaggedWords");
    const { result } = renderHook(() => useFlaggedWords());

    act(() => {
      result.current.flagWord("taco");
      result.current.flagWord("taco");
    });

    expect(syncFlaggedWordMock).toHaveBeenCalledTimes(1);
  });

  it("does not sync on unflag", async () => {
    const { useFlaggedWords } = await import("./useFlaggedWords");
    const { result } = renderHook(() => useFlaggedWords());

    act(() => {
      result.current.flagWord("taco");
    });
    syncFlaggedWordMock.mockClear();

    act(() => {
      result.current.unflagWord("taco");
    });

    expect(syncFlaggedWordMock).not.toHaveBeenCalled();
    expect(result.current.isFlagged("taco")).toBe(false);
  });
});
