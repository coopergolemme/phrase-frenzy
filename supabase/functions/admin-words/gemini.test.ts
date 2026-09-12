import { describe, expect, it, vi } from "vitest";
import { callGeminiForWords } from "./gemini";

function mockFetch(response: Partial<Response> & { jsonBody?: unknown }) {
  return vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => response.jsonBody,
    text: async () => JSON.stringify(response.jsonBody),
  } as Response);
}

describe("callGeminiForWords", () => {
  it("parses the JSON array out of candidates[0].content.parts[0].text", async () => {
    const batches = [{ categoryId: "food", words: ["Pizza"] }];
    const fetchImpl = mockFetch({
      jsonBody: { candidates: [{ content: { parts: [{ text: JSON.stringify(batches) }] } }] },
    });

    const result = await callGeminiForWords("prompt text", "test-key", fetchImpl);

    expect(result).toEqual(batches);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("generateContent"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-goog-api-key": "test-key" }),
      })
    );
  });

  it("throws when the response is not ok", async () => {
    const fetchImpl = mockFetch({ ok: false, status: 500, jsonBody: { error: "boom" } });

    await expect(callGeminiForWords("prompt", "key", fetchImpl)).rejects.toThrow(/500/);
  });

  it("throws when the response has no text content", async () => {
    const fetchImpl = mockFetch({ jsonBody: { candidates: [] } });

    await expect(callGeminiForWords("prompt", "key", fetchImpl)).rejects.toThrow(/no text/i);
  });

  it("throws when the parsed text is not a JSON array", async () => {
    const fetchImpl = mockFetch({
      jsonBody: { candidates: [{ content: { parts: [{ text: JSON.stringify({ not: "an array" }) }] } }] },
    });

    await expect(callGeminiForWords("prompt", "key", fetchImpl)).rejects.toThrow(/JSON array/i);
  });
});
