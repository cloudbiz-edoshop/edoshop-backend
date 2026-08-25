export const AboutUsImagePosition = {
  LEFT: "left",
  RIGHT: "right",
} as const;

export type AboutUsImagePositionValue =
  (typeof AboutUsImagePosition)[keyof typeof AboutUsImagePosition];

export const AboutUsImageDisplayStyle = {
  SINGLE: "single",
  COLLAGE: "collage",
  GALLERY: "gallery",
} as const;

export type AboutUsImageDisplayStyleValue =
  (typeof AboutUsImageDisplayStyle)[keyof typeof AboutUsImageDisplayStyle];

export type AboutUsImageItem = {
  imageUrl: string;
  displayStyle: AboutUsImageDisplayStyleValue;
  sortOrder: number;
};
