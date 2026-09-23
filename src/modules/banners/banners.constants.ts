export const FIXED_BANNER_SLIDE_DELAY_MS = 10_000;
export const FIXED_BANNER_SLIDE_DELAY_STRING = String(FIXED_BANNER_SLIDE_DELAY_MS);

export const HOME_BANNER_DISPLAY_TYPES = ["stylish", "promo"] as const;
export type HomeBannerDisplayType = (typeof HOME_BANNER_DISPLAY_TYPES)[number];
