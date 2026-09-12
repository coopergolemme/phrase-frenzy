import { describe, expect, it, vi } from "vitest";
import type { MatchRecord } from "./matchHistory";

const MATCH: MatchRecord = {
  id: "match-1",
  playedAt: "2026-01-01T00:00:00.000Z",
  roundsPerTeam: 3,
  teams: [{ name: "Red", score: 10 }],
  winnerNames: ["Red"],
};

function mockClient(rpcResult: { error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  return { client: { rpc }, rpc };
}

describe("syncGameResults", () => {
  it("calls the sync_game_results RPC with the match, deltas, and flagged words", async () => {
    const { client, rpc } = mockClient({ error: null });
    vi.doMock("./supabaseClient", () => ({ getSupabaseClient: () => client }));

    const { syncGameResults } = await import("./gameSync");
    await syncGameResults(MATCH, [{ word: "pizza", correct: 1, skipped: 0 }], ["taco"]);

    expect(rpc).toHaveBeenCalledWith("sync_game_results", {
      p_match: MATCH,
      p_word_deltas: [{ word: "pizza", correct: 1, skipped: 0 }],
      p_flagged_words: ["taco"],
    });
    vi.doUnmock("./supabaseClient");
    vi.resetModules();
  });

  it("swallows RPC errors so a failed sync never throws", async () => {
    const { client } = mockClient({ error: new Error("network down") });
    vi.doMock("./supabaseClient", () => ({ getSupabaseClient: () => client }));

    const { syncGameResults } = await import("./gameSync");
    await expect(syncGameResults(MATCH, [], [])).resolves.toBeUndefined();
    vi.doUnmock("./supabaseClient");
    vi.resetModules();
  });
});
