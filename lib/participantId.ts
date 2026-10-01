/** Normalized search key for IDs such as `7`, `007`, or `CBS-LSW-2026-007`. */
export function normalizeParticipantId(value: string): string {
  const digits = value.trim().replace(/\D/g, "");
  return digits ? String(Number.parseInt(digits, 10)) : value.trim().toLowerCase();
}
