import { describe, expect, it } from "vitest";

import {
  createPromoBannerCardsRequestSchema,
  createPromoBannerStripRequestSchema,
  MAX_PROMO_BANNER_CARDS,
  MIN_PROMO_BANNER_CARDS,
  updatePromoBannerCardsRequestSchema,
} from "./promo-banners.schema";

const validCard = {
  mediaType: "image" as const,
  cardFormat: "rectangle" as const,
  imageUrl: "https://example.com/a.jpg",
  videoUrl: "",
};

const buildCards = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...validCard,
    imageUrl: `https://example.com/${index}.jpg`,
  }));

describe("promo-banners.schema", () => {
  it("loads create and update schemas (Zod v4 safe — no .partial() on refined objects)", () => {
    expect(createPromoBannerCardsRequestSchema).toBeDefined();
    expect(updatePromoBannerCardsRequestSchema).toBeDefined();
  });

  it("requires at least six cards on create", () => {
    const result = createPromoBannerCardsRequestSchema.safeParse({
      name: "March",
      cards: buildCards(MIN_PROMO_BANNER_CARDS - 1),
      isActive: false,
      scheduleType: "permanent",
    });
    expect(result.success).toBe(false);
  });

  it("accepts six cards on create", () => {
    const result = createPromoBannerCardsRequestSchema.safeParse({
      name: "March",
      cards: buildCards(MIN_PROMO_BANNER_CARDS),
      isActive: false,
      scheduleType: "permanent",
    });
    expect(result.success).toBe(true);
  });

  it("enforces card rules when cards are sent on update", () => {
    const result = updatePromoBannerCardsRequestSchema.safeParse({
      cards: buildCards(3),
    });
    expect(result.success).toBe(false);
  });

  it("allows partial update without cards", () => {
    const result = updatePromoBannerCardsRequestSchema.safeParse({
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts ribbon strip customization fields", () => {
    const result = createPromoBannerStripRequestSchema.safeParse({
      text: "Free shipping",
      backgroundColor: "#ffe14a",
      textColor: "#1a1a1a",
      fontSizePx: 15,
      textAnimation: "scrolling",
      isActive: true,
      scheduleType: "permanent",
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than max cards on create", () => {
    const result = createPromoBannerCardsRequestSchema.safeParse({
      name: "Too many",
      cards: buildCards(MAX_PROMO_BANNER_CARDS + 1),
      isActive: false,
      scheduleType: "permanent",
    });
    expect(result.success).toBe(false);
  });
});
