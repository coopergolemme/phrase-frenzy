import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deactivateWords,
  generateWords,
  getCategoryHealth,
  listDeactivatedWords,
  listCategoryWords,
  listFlaggedWords,
  publishWords,
  reactivateWords,
  suggestSimilarWords,
} from "./adminApi";

const PENDING = [
  {
    id: "1",
    categoryId: "food",
    categoryLabel: "Food",
    categoryEmoji: "🍕",
    isNewCategory: false,
    text: "Taco",
  },
];

const FLAGGED = [
  {
    id: "1",
    categoryId: "food",
    categoryLabel: "Food",
    text: "Taco",
    active: true,
    flaggedCount: 3,
  },
];

const DEACTIVATED = [
  {
    id: "1",
    categoryId: "food",
    categoryLabel: "Food",
    text: "Taco",
    flaggedCount: 3,
  },
];

function mockFetch(status: number, jsonBody: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => jsonBody,
  } as Response);
}

describe("adminApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("generateWords sends the action in the body", async () => {
    const fetchMock = mockFetch(200, { candidates: PENDING });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateWords();

    expect(result).toEqual(PENDING);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/functions/v1/admin-words");
    expect(JSON.parse(init.body)).toEqual({ action: "generate" });
  });

  it("generateWords includes instructions and localWords in the body when given", async () => {
    const fetchMock = mockFetch(200, { candidates: PENDING });
    vi.stubGlobal("fetch", fetchMock);

    await generateWords("80s action movies", [
      {
        categoryId: "new:80s-action-movies",
        categoryLabel: "80s Action Movies",
        categoryEmoji: "🎬",
        isNewCategory: true,
        text: "Rambo",
      },
    ]);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      action: "generate",
      instructions: "80s action movies",
      localWords: [
        {
          categoryId: "new:80s-action-movies",
          categoryLabel: "80s Action Movies",
          categoryEmoji: "🎬",
          isNewCategory: true,
          text: "Rambo",
        },
      ],
    });
  });

  it("publishWords sends the approved words and returns the published count", async () => {
    const fetchMock = mockFetch(200, { published: 2 });
    vi.stubGlobal("fetch", fetchMock);

    const words = [
      { categoryId: "food", categoryLabel: "Food", categoryEmoji: "🍕", isNewCategory: false, text: "Taco" },
      { categoryId: "food", categoryLabel: "Food", categoryEmoji: "🍕", isNewCategory: false, text: "Pizza" },
    ];
    const result = await publishWords(words);

    expect(result).toBe(2);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ action: "publish", words });
  });

  it("listFlaggedWords returns flagged words with matches", async () => {
    const fetchMock = mockFetch(200, { flagged: FLAGGED });
    vi.stubGlobal("fetch", fetchMock);

    const result = await listFlaggedWords();

    expect(result).toEqual(FLAGGED);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ action: "list-flagged" });
  });

  it("deactivateWords sends the ids to deactivate", async () => {
    const fetchMock = mockFetch(200, { deactivated: ["1"] });
    vi.stubGlobal("fetch", fetchMock);

    await expect(deactivateWords(["1"])).resolves.toBeUndefined();
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ action: "deactivate", ids: ["1"] });
  });

  it("listDeactivatedWords returns deactivated words", async () => {
    const fetchMock = mockFetch(200, { deactivated: DEACTIVATED });
    vi.stubGlobal("fetch", fetchMock);

    const result = await listDeactivatedWords();

    expect(result).toEqual(DEACTIVATED);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ action: "list-deactivated" });
  });

  it("reactivateWords sends the ids to reactivate", async () => {
    const fetchMock = mockFetch(200, { reactivated: ["1"] });
    vi.stubGlobal("fetch", fetchMock);

    await expect(reactivateWords(["1"])).resolves.toBeUndefined();
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ action: "reactivate", ids: ["1"] });
  });

  it("suggestSimilarWords sends the wordId and returns matching suggestions", async () => {
    const SUGGESTIONS = [{ id: "2", text: "Pizza Slice" }];
    const fetchMock = mockFetch(200, { suggestions: SUGGESTIONS });
    vi.stubGlobal("fetch", fetchMock);

    const result = await suggestSimilarWords("1");

    expect(result).toEqual(SUGGESTIONS);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ action: "suggest-similar", wordId: "1" });
  });

  it("suggestSimilarWords includes the reason in the body when given", async () => {
    const fetchMock = mockFetch(200, { suggestions: [] });
    vi.stubGlobal("fetch", fetchMock);

    await suggestSimilarWords("1", "too obscure");

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      action: "suggest-similar",
      wordId: "1",
      reason: "too obscure",
    });
  });

  it("getCategoryHealth returns per-category stats", async () => {
    const CATEGORIES = [
      {
        categoryId: "food",
        categoryLabel: "Food",
        categoryEmoji: "🍕",
        totalWords: 10,
        activeWords: 9,
        flaggedWords: 1,
        correct: 20,
        skipped: 5,
      },
    ];
    const fetchMock = mockFetch(200, { categories: CATEGORIES });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCategoryHealth();

    expect(result).toEqual(CATEGORIES);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ action: "category-health" });
  });

  it("listCategoryWords sends the categoryId and returns the words in that category", async () => {
    const WORDS = [
      { id: "1", text: "Pizza", active: true },
      { id: "2", text: "Old Pizza Joke", active: false },
    ];
    const fetchMock = mockFetch(200, { words: WORDS });
    vi.stubGlobal("fetch", fetchMock);

    const result = await listCategoryWords("food");

    expect(result).toEqual(WORDS);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ action: "list-category-words", categoryId: "food" });
  });

  it("throws AdminApiError with the response status and server message on failure", async () => {
    vi.stubGlobal("fetch", mockFetch(401, { error: "Server error" }));

    await expect(listFlaggedWords()).rejects.toMatchObject({
      name: "AdminApiError",
      status: 401,
      message: "Server error",
    });
  });
});
