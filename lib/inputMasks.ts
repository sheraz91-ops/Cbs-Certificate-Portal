export function formatRegistrationNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length < 4) return digits;
  return `${digits.slice(0, 4)}-uam-${digits.slice(4)}`;
}

export function formatCnic(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}
