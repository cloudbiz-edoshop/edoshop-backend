import db from "@/db";
import { storefrontBannerSettings } from "@/db/models/storefront-banner-settings";
import { eq } from "drizzle-orm";

import type { HomeBannerDisplayType } from "./banners.constants";

const normalizeType = (value: string | null | undefined): HomeBannerDisplayType =>
  value === "promo" ? "promo" : "stylish";

export class StorefrontBannerSettingsService {
  private async ensureRow() {
    const [existing] = await db.select().from(storefrontBannerSettings).limit(1);
    if (existing) return existing;

    const [row] = await db
      .insert(storefrontBannerSettings)
      .values({ activeHomeBannerType: "stylish" })
      .returning();

    return row;
  }

  async getActiveHomeBannerType(): Promise<HomeBannerDisplayType> {
    const row = await this.ensureRow();
    return normalizeType(row.activeHomeBannerType);
  }

  async getSettings() {
    const row = await this.ensureRow();
    return {
      activeHomeBannerType: normalizeType(row.activeHomeBannerType),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    };
  }

  async setActiveHomeBannerType(
    activeHomeBannerType: HomeBannerDisplayType,
    updatedBy?: number,
  ) {
    const row = await this.ensureRow();

    const [updated] = await db
      .update(storefrontBannerSettings)
      .set({
        activeHomeBannerType,
        updatedAt: new Date(),
        ...(updatedBy !== undefined ? { updatedBy } : {}),
      })
      .where(eq(storefrontBannerSettings.id, row.id))
      .returning();

    return {
      activeHomeBannerType: normalizeType(updated?.activeHomeBannerType),
      updatedAt: updated?.updatedAt
        ? new Date(updated.updatedAt).toISOString()
        : null,
    };
  }
}

export const storefrontBannerSettingsService =
  new StorefrontBannerSettingsService();
