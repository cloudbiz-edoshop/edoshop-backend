/** Default product image area background (Figma `--figma-image-bg`). */
export const DEFAULT_PRODUCT_IMAGE_BACKGROUND = "#dbd9d9";

const COLOR_NAME_TO_HEX: Record<string, string> = {
  red: "#EF4444",
  blue: "#4DA3FF",
  green: "#5FD38D",
  yellow: "#FACC15",
  orange: "#FB923C",
  purple: "#8B5CF6",
  pink: "#FF9EB5",
  brown: "#8B5E3C",
  black: "#2B2B2B",
  white: "#F5F5F5",
  gray: "#9CA3AF",
  grey: "#9CA3AF",
  navy: "#1E3A5F",
  beige: "#D4C4A8",
  silver: "#CBD5E1",
};

export const resolveProductImageBackgroundHex = (
  colorName?: string | null,
): string | null => {
  const normalized = String(colorName || "").trim().toLowerCase();
  if (!normalized) return null;
  return COLOR_NAME_TO_HEX[normalized] ?? null;
};
