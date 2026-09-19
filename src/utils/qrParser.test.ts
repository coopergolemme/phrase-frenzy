import { describe, expect, it } from "vitest";
import { extractRoomCodeFromQr } from "./qrParser";

describe("extractRoomCodeFromQr", () => {
  it("extracts code from hash room URL", () => {
    expect(extractRoomCodeFromQr("http://localhost:5173/#room/XY7Z9K")).toBe("XY7Z9K");
    expect(extractRoomCodeFromQr("https://phrasefrenzy.app/#room/abc123")).toBe("ABC123");
  });

  it("extracts code from query parameters", () => {
    expect(extractRoomCodeFromQr("https://example.com/?room=ROOM99")).toBe("ROOM99");
    expect(extractRoomCodeFromQr("https://example.com/?code=xyz456")).toBe("XYZ456");
  });

  it("extracts code from URL path", () => {
    expect(extractRoomCodeFromQr("https://example.com/room/FE1234")).toBe("FE1234");
  });

  it("handles direct alphanumeric codes", () => {
    expect(extractRoomCodeFromQr("ABCD")).toBe("ABCD");
    expect(extractRoomCodeFromQr("  k9m3p2  ")).toBe("K9M3P2");
  });

  it("returns null for invalid inputs", () => {
    expect(extractRoomCodeFromQr("")).toBeNull();
    expect(extractRoomCodeFromQr("   ")).toBeNull();
    expect(extractRoomCodeFromQr("too-short-or-invalid-!!@#$%")).toBeNull();
  });
});
