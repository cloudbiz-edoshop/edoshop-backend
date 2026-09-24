export const DEFAULT_BANNER_SLIDE_DELAY_MS = 10_000;
export const DEFAULT_BANNER_SLIDE_DELAY_STRING = String(
  DEFAULT_BANNER_SLIDE_DELAY_MS,
);

export const MIN_BANNER_SLIDE_DELAY_MS = 3_000;
export const MAX_BANNER_SLIDE_DELAY_MS = 120_000;

export function normalizeBannerSlideDelay(delay?: string): string {
  const numericDelay = Number(
    String(delay ?? "").replace(/[^\d.]/g, ""),
  );

  if (!Number.isFinite(numericDelay) || numericDelay <= 0) {
    return DEFAULT_BANNER_SLIDE_DELAY_STRING;
  }

  const clamped = Math.min(
    MAX_BANNER_SLIDE_DELAY_MS,
    Math.max(MIN_BANNER_SLIDE_DELAY_MS, numericDelay),
  );

  return String(Math.round(clamped));
}

export const HOME_BANNER_DISPLAY_TYPES = ["stylish", "promo"] as const;
export type HomeBannerDisplayType = (typeof HOME_BANNER_DISPLAY_TYPES)[number];
