/**
 * Extracts a room code from a scanned QR code string.
 * Supports full room URLs (e.g. `https://domain.com/#room/ABCDEF`),
 * query parameters (e.g. `https://domain.com/?room=ABCDEF`),
 * and raw room codes (e.g. `ABCDEF`).
 */
export function extractRoomCodeFromQr(scannedText: string): string | null {
  if (!scannedText) return null;
  const trimmed = scannedText.trim();
  if (!trimmed) return null;

  // 1. Check for standard hash fragment: #room/CODE
  const hashMatch = trimmed.match(/#room\/([A-Za-z0-9]{4,8})/i);
  if (hashMatch) {
    return hashMatch[1].toUpperCase();
  }

  // 2. Check for URL query param or key-value pair: room=CODE or code=CODE
  const queryMatch = trimmed.match(/(?:[?&]|(?:^|\b))(?:room|code)=([A-Za-z0-9]{4,8})/i);
  if (queryMatch) {
    return queryMatch[1].toUpperCase();
  }

  // 3. Check for URL path: /room/CODE
  const pathMatch = trimmed.match(/\/room\/([A-Za-z0-9]{4,8})/i);
  if (pathMatch) {
    return pathMatch[1].toUpperCase();
  }

  // 4. Direct match for a 4 to 8 alphanumeric character room code with no extra surrounding words
  if (/^[A-Za-z0-9]{4,8}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return null;
}
