/**
 * Colors methods available in the application
 * Using enum for better type safety and autocompletion
 */
export enum Colors {
  RED = "red",
  BLUE = "blue",
  GREEN = "green",
  YELLOW = "yellow",
  ORANGE = "orange",
  PURPLE = "purple",
  PINK = "pink",
  BROWN = "brown",
  BLACK = "black",
  WHITE = "white",
  GRAY = "gray",
  NAVY = "navy",
  BEIGE = "beige",
}

/**
 * Provides descriptions for colors
 */
export const COLORS_DESCRIPTIONS: Record<Colors, string> = {
  [Colors.RED]: "#FF0000",
  [Colors.BLUE]: "#0000FF",
  [Colors.GREEN]: "#008000",
  [Colors.YELLOW]: "#FFFF00",
  [Colors.ORANGE]: "#FFA500",
  [Colors.PURPLE]: "#800080",
  [Colors.PINK]: "#FFC0CB",
  [Colors.BROWN]: "#8B4513",
  [Colors.BLACK]: "#000000",
  [Colors.WHITE]: "#FFFFFF",
  [Colors.GRAY]: "#808080",
  [Colors.NAVY]: "#000080",
  [Colors.BEIGE]: "#F5F5DC",
};
