/**
 * Sizes methods available in the application
 * Using enum for better type safety and autocompletion
 */
export enum Sizes {
  XS = "xs",
  S = "s",
  M = "m",
  L = "l",
  XL = "xl",
  XXL = "xxl",
}

/**
 * Provides descriptions for sizes
 */
export const SIZES_DESCRIPTIONS: Record<Sizes, string> = {
  [Sizes.XS]: "Extra Small",
  [Sizes.S]: "Small",
  [Sizes.M]: "Medium",
  [Sizes.L]: "Large",
  [Sizes.XL]: "Extra Large",
  [Sizes.XXL]: "Extra Extra Large",
};
