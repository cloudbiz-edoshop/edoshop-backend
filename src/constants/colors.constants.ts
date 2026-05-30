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
}

/**
 * Provides descriptions for colors
 */
export const COLORS_DESCRIPTIONS: Record<Colors, string> = {
  [Colors.RED]: "Red",
  [Colors.BLUE]: "Blue",
  [Colors.GREEN]: "Green",
  [Colors.YELLOW]: "Yellow",
  [Colors.ORANGE]: "Orange",
  [Colors.PURPLE]: "Purple",
  [Colors.PINK]: "Pink",
  [Colors.BROWN]: "Brown",
  [Colors.BLACK]: "Black",
  [Colors.WHITE]: "White",
};
