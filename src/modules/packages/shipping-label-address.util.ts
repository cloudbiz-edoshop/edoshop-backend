/**
 * Shipping labels should show postal address text only — never map/GPS coordinates.
 */
export function stripGpsCoordinatesFromLabelText(
  value: string | null | undefined,
): string {
  if (value == null) {
    return "";
  }

  let text = String(value).trim();
  if (!text) {
    return "";
  }

  text = text.replace(
    /(?:Delivery|Pickup)\s+map\s+location\s*:?\s*(?:\([^)]*\)|[-+]?\d+(?:\.\d+)?\s*,\s*[-+]?\d+(?:\.\d+)?)/gi,
    "",
  );

  text = text.replace(
    /\(\s*[-+]?\d+(?:\.\d+)?\s*,\s*[-+]?\d+(?:\.\d+)?\s*\)/g,
    "",
  );

  text = text.replace(
    /[-+]?\d{1,3}\.\d{5,}\s*,\s*[-+]?\d{1,3}\.\d{5,}/g,
    "",
  );

  text = text.replace(/[-+]?\d{1,3}\.\d{5,}\s*\)\s*,?\s*/g, "");

  text = text
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/^\s*[,;:\-.)]+/g, "")
    .replace(/[,;:\-.(]+\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return text;
}
