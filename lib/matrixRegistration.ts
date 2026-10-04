import type { RegistrationField } from "@/types/workshop";

export function parseMatrixSelection(value: string): Record<string, string[]> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: Record<string, string[]> = {};
    for (const [row, columns] of Object.entries(parsed)) {
      if (Array.isArray(columns) && columns.every((column) => typeof column === "string")) result[row] = columns;
    }
    return result;
  } catch {
    return {};
  }
}

export function validateMatrixSelection(field: RegistrationField, value: string): string | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value || "{}");
  } catch {
    return `${field.label} has an invalid selection`;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return `${field.label} has an invalid selection`;
  const selected = parsed as Record<string, unknown>;
  const rows = field.rows ?? [];
  const columns = field.choices ?? [];
  const validRows = new Set(rows);
  const validColumns = new Set(columns);
  if (Object.keys(selected).some((row) => !validRows.has(row))) return `${field.label} has an invalid row`;
  for (const [row, selections] of Object.entries(selected)) {
    if (!Array.isArray(selections) || selections.some((column) => typeof column !== "string" || !validColumns.has(column)) || new Set(selections).size !== selections.length) return `${field.label} has an invalid selection`;
    if (field.selectionMode === "single" && selections.length > 1) return `${field.label} allows one selection per row`;
  }
  if (field.required && rows.some((row) => !Array.isArray(selected[row]) || (selected[row] as unknown[]).length === 0)) return `${field.label} requires an answer for every row`;
  return undefined;
}
