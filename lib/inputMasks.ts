export function formatRegistrationNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length < 4) return digits;
  return `${digits.slice(0, 4)}-uam-${digits.slice(4)}`;
}
