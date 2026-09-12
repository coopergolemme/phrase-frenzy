import { afterEach, describe, expect, it, vi } from "vitest";
import { deactivateWords, generateWords, listFlaggedWords, publishWords } from "./adminApi";

const PENDING = [{ id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco" }];

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

  it("generateWords sends categoryId and count in the body", async () => {
    const fetchMock = mockFetch(200, { candidates: PENDING });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateWords("secret", "food", 20);

    expect(result).toEqual(PENDING);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/functions/v1/admin-words");
    expect(init.headers["x-admin-password"]).toBe("secret");
    expect(JSON.parse(init.body)).toEqual({ action: "generate", categoryId: "food", count: 20 });
  });

  it("generateWords includes instructions and localWords in the body when given", async () => {
    const fetchMock = mockFetch(200, { candidates: PENDING });
    vi.stubGlobal("fetch", fetchMock);

    await generateWords("secret", "food", 20, "lean toward 90s references", [
      { categoryId: "food", text: "Sushi" },
    ]);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      action: "generate",
      categoryId: "food",
      count: 20,
      instructions: "lean toward 90s references",
      localWords: [{ categoryId: "food", text: "Sushi" }],
    });
  });

  it("publishWords sends the approved words and returns the published count", async () => {
    const fetchMock = mockFetch(200, { published: 2 });
    vi.stubGlobal("fetch", fetchMock);

    const words = [
      { categoryId: "food", text: "Taco" },
      { categoryId: "food", text: "Pizza" },
    ];
    const result = await publishWords("secret", words);

    expect(result).toBe(2);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ action: "publish", words });
  });

  it("listFlaggedWords sends the password header and returns flagged words with matches", async () => {
    const fetchMock = mockFetch(200, { flagged: FLAGGED });
    vi.stubGlobal("fetch", fetchMock);

    const result = await listFlaggedWords("secret");

    expect(result).toEqual(FLAGGED);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["x-admin-password"]).toBe("secret");
    expect(JSON.parse(init.body)).toEqual({ action: "list-flagged" });
  });

  it("deactivateWords sends the ids to deactivate", async () => {
    const fetchMock = mockFetch(200, { deactivated: ["1"] });
    vi.stubGlobal("fetch", fetchMock);

    await expect(deactivateWords("secret", ["1"])).resolves.toBeUndefined();
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ action: "deactivate", ids: ["1"] });
  });

  it("throws AdminApiError with the response status and server message on failure", async () => {
    vi.stubGlobal("fetch", mockFetch(401, { error: "Unauthorized" }));

    await expect(listFlaggedWords("wrong")).rejects.toMatchObject({
      name: "AdminApiError",
      status: 401,
      message: "Unauthorized",
    });
  });
});
