import { afterEach, describe, expect, it, vi } from "vitest";
import {
  approveWords,
  deactivateWords,
  generateWords,
  listFlaggedWords,
  listPendingWords,
} from "./adminApi";

const PENDING = [{ id: "1", categoryId: "food", categoryLabel: "Food", text: "Taco" }];

const FLAGGED = [
  {
    word: "taco",
    flaggedAt: "2026-01-01T00:00:00.000Z",
    matches: [{ id: "1", categoryId: "food", categoryLabel: "Food", active: true }],
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

  it("listPendingWords sends the password header and returns pending words", async () => {
    const fetchMock = mockFetch(200, { pending: PENDING });
    vi.stubGlobal("fetch", fetchMock);

    const result = await listPendingWords("secret");

    expect(result).toEqual(PENDING);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/functions/v1/admin-words");
    expect(init.headers["x-admin-password"]).toBe("secret");
    expect(JSON.parse(init.body)).toEqual({ action: "list-pending" });
  });

  it("generateWords sends categoryId and count in the body", async () => {
    const fetchMock = mockFetch(200, { inserted: PENDING });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateWords("secret", "food", 20);

    expect(result).toEqual(PENDING);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ action: "generate", categoryId: "food", count: 20 });
  });

  it("approveWords resolves with no value on success", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { approved: ["1"] }));

    await expect(approveWords("secret", ["1"])).resolves.toBeUndefined();
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

    await expect(listPendingWords("wrong")).rejects.toMatchObject({
      name: "AdminApiError",
      status: 401,
      message: "Unauthorized",
    });
  });
});
