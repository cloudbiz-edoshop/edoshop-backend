/**
 * Check if a string is empty or just whitespace
 *
 * @param str - String to check
 * @returns True if string is empty or just whitespace
 */
export function isEmptyString(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

/**
 * Truncate a string to a maximum length
 *
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add if truncated (default: "...")
 * @returns Truncated string
 */
export function truncate(
  str: string,
  maxLength: number,
  suffix = "...",
): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Format a string to title case
 *
 * @param str - String to format
 * @returns Title cased string
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Convert a string to sentence case
 *
 * @param str - String to convert
 * @returns Sentence cased string
 */
export function toSentenceCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word, index) =>
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
    )
    .join(" ");
}

/**
 * Convert a string to camel case
 *
 * @param str - String to convert
 * @returns Camel cased string
 */
export function toCamelCase(str: string): string {
  const regex = /^\w|[A-Z]|\b\w/g;
  return str
    .replace(regex, (letter, index) =>
      index === 0 ? letter.toLowerCase() : letter.toUpperCase())
    .replace(/\s+/g, "");
}

/**
 * Generate a random string of specified length
 *
 * @param length - Length of random string
 * @returns Random string
 */
export function randomString(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a username from a full name
 *
 * @param fullName - Full name
 * @returns Username
 */
export function generateUsername(fullName: string): string {
  return `${fullName.toLowerCase().replace(/\s+/g, "-")}-${randomString(4)}`.replace(
    /[^a-z0-9-]/g,
    "",
  );
}
