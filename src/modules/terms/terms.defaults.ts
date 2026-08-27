import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { TermsContact, TermsSection } from "@/db/models/terms";

type DefaultTermsLanguage = {
  meta: {
    title: string;
    effectiveDate: string;
    version: string;
    contact: TermsContact;
  };
  acceptanceLabel: string;
  sections: TermsSection[];
};

type DefaultTermsFile = Record<string, DefaultTermsLanguage>;

const defaultsPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "terms.defaults.json",
);

let cachedDefaults: DefaultTermsFile | null = null;

const loadDefaults = (): DefaultTermsFile => {
  if (!cachedDefaults) {
    cachedDefaults = JSON.parse(
      readFileSync(defaultsPath, "utf8"),
    ) as DefaultTermsFile;
  }

  return cachedDefaults;
};

export const SUPPORTED_TERMS_LANGUAGES = ["en", "fr"] as const;

export type SupportedTermsLanguage =
  (typeof SUPPORTED_TERMS_LANGUAGES)[number];

export const normalizeTermsLanguage = (
  languageCode?: string | null,
): SupportedTermsLanguage => {
  const code = String(languageCode || "en").toLowerCase();
  return SUPPORTED_TERMS_LANGUAGES.includes(code as SupportedTermsLanguage)
    ? (code as SupportedTermsLanguage)
    : "en";
};

export const getDefaultTermsForLanguage = (languageCode?: string | null) => {
  const code = normalizeTermsLanguage(languageCode);
  const defaults = loadDefaults()[code] ?? loadDefaults().en;

  return {
    languageCode: code,
    title: defaults.meta.title,
    effectiveDate: defaults.meta.effectiveDate,
    version: defaults.meta.version,
    acceptanceLabel: defaults.acceptanceLabel,
    contact: defaults.meta.contact ?? {},
    sections: defaults.sections ?? [],
  };
};

export const getDefaultTermsDocument = (languageCode?: string | null) => {
  const defaults = getDefaultTermsForLanguage(languageCode);

  return {
    ...defaults,
    meta: {
      title: defaults.title,
      effectiveDate: defaults.effectiveDate,
      version: defaults.version,
      contact: defaults.contact,
    },
  };
};
