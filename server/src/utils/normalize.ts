export function normalizeEmail(value: string | undefined | null): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = value.trim().toLowerCase();
  return s === "" ? undefined : s;
}

export function normalizePhone(value: string | number | undefined | null): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = typeof value === "number" ? String(value).trim() : value.trim();
  const digits = s.replace(/\s+/g, "");
  return digits === "" ? undefined : digits;
}
