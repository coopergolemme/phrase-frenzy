/** Joins names as "A", "A & B", or "A, B & C". */
export function formatNameList(names: string[]): string {
  if (names.length <= 2) return names.join(" & ");
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}
