import type { ZodError } from "zod";

export function formatZodValidationMessage(error: ZodError): string {
  const messages = error.issues
    .map((issue) => {
      const path = issue.path.filter(Boolean).join(".");
      const detail = issue.message;
      return path ? `${path}: ${detail}` : detail;
    })
    .filter(Boolean);

  if (messages.length === 1) {
    return messages[0];
  }

  return messages.length ? messages.join(". ") : "Validation error";
}
