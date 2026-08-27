import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { AboutUsImageInput } from "./about-us.schema";

export type DefaultAboutUsSection = {
  key: string;
  title: string;
  heading: string;
  text: string;
  primaryButtonText: string;
  delay: number;
  date: string;
  imagePosition: "left" | "right";
  images: AboutUsImageInput[];
};

const defaultsPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "about-us.defaults.json",
);

let cachedDefaults: DefaultAboutUsSection[] | null = null;

const loadDefaults = (): DefaultAboutUsSection[] => {
  if (!cachedDefaults) {
    cachedDefaults = JSON.parse(
      readFileSync(defaultsPath, "utf8"),
    ) as DefaultAboutUsSection[];
  }

  return cachedDefaults;
};

export const DEFAULT_ABOUT_US_SECTION_KEYS = loadDefaults().map(
  (section) => section.key,
);

export type DefaultAboutUsSectionKey =
  (typeof DEFAULT_ABOUT_US_SECTION_KEYS)[number];

export const normalizeAboutUsSectionKey = (
  key?: string | null,
): DefaultAboutUsSectionKey | null => {
  const normalized = String(key || "").trim().toLowerCase();
  return DEFAULT_ABOUT_US_SECTION_KEYS.includes(
    normalized as DefaultAboutUsSectionKey,
  )
    ? (normalized as DefaultAboutUsSectionKey)
    : null;
};

export const getDefaultAboutUsSections = () =>
  loadDefaults().map((section) => ({
    title: section.title,
    heading: section.heading,
    text: section.text,
    primaryButtonText: section.primaryButtonText,
    delay: section.delay,
    date: section.date,
    imagePosition: section.imagePosition,
    images: section.images,
  }));

export const getDefaultAboutUsSection = (key?: string | null) => {
  const normalizedKey = normalizeAboutUsSectionKey(key);
  if (!normalizedKey) {
    return null;
  }

  const section = loadDefaults().find((item) => item.key === normalizedKey);
  if (!section) {
    return null;
  }

  return {
    key: section.key,
    title: section.title,
    heading: section.heading,
    text: section.text,
    primaryButtonText: section.primaryButtonText,
    delay: section.delay,
    date: section.date,
    imagePosition: section.imagePosition,
    images: section.images,
  };
};

export const getDefaultAboutUsSectionByIndex = (index: number) => {
  const sections = loadDefaults();
  const section = sections[index];
  if (!section) {
    return null;
  }

  return getDefaultAboutUsSection(section.key);
};
