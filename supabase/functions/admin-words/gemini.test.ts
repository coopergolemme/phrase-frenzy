import { describe, expect, it, vi } from "vitest";
import { callGeminiForGuidance, callGeminiForSimilarWords, callGeminiForWords } from "./gemini";

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

describe("callGeminiForSimilarWords", () => {
  it("parses a JSON array of strings out of candidates[0].content.parts[0].text", async () => {
    const words = ["Pizza Slice", "Sushi"];
    const fetchImpl = mockFetch({
      jsonBody: { candidates: [{ content: { parts: [{ text: JSON.stringify(words) }] } }] },
    });

    const result = await callGeminiForSimilarWords("prompt text", "test-key", fetchImpl);

    expect(result).toEqual(words);
  });

  it("drops non-string entries from the parsed array", async () => {
    const fetchImpl = mockFetch({
      jsonBody: {
        candidates: [{ content: { parts: [{ text: JSON.stringify(["Sushi", 42, null]) }] } }],
      },
    });

    const result = await callGeminiForSimilarWords("prompt", "key", fetchImpl);

    expect(result).toEqual(["Sushi"]);
  });

  it("throws when the parsed text is not a JSON array", async () => {
    const fetchImpl = mockFetch({
      jsonBody: { candidates: [{ content: { parts: [{ text: JSON.stringify({ not: "an array" }) }] } }] },
    });

    await expect(callGeminiForSimilarWords("prompt", "key", fetchImpl)).rejects.toThrow(/JSON array/i);
  });
});

describe("callGeminiForGuidance", () => {
  it("parses the guidance string out of candidates[0].content.parts[0].text", async () => {
    const fetchImpl = mockFetch({
      jsonBody: {
        candidates: [{ content: { parts: [{ text: JSON.stringify({ guidance: "Prefer concrete nouns." }) }] } }],
      },
    });

    const result = await callGeminiForGuidance("prompt text", "test-key", fetchImpl);

    expect(result).toBe("Prefer concrete nouns.");
  });

  it("throws when the parsed object has no guidance string", async () => {
    const fetchImpl = mockFetch({
      jsonBody: { candidates: [{ content: { parts: [{ text: JSON.stringify({ notGuidance: "x" }) }] } }] },
    });

    await expect(callGeminiForGuidance("prompt", "key", fetchImpl)).rejects.toThrow(/guidance/i);
  });

  it("throws when the parsed text is an array instead of an object", async () => {
    const fetchImpl = mockFetch({
      jsonBody: { candidates: [{ content: { parts: [{ text: JSON.stringify(["not", "an", "object"]) }] } }] },
    });

    await expect(callGeminiForGuidance("prompt", "key", fetchImpl)).rejects.toThrow(/guidance/i);
  });
});
