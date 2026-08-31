/**
 * Normalize database timestamps (UTC wall clock, no timezone suffix) to ISO UTC.
 */
export function toUtcIsoString(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed).toISOString();
  }

  const isoLike = trimmed.includes("T")
    ? trimmed
    : trimmed.replace(" ", "T");

  return new Date(`${isoLike}Z`).toISOString();
}
