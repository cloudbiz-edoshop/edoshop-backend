import { createHash, randomBytes } from "node:crypto";

import { and, asc, count, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import argon2 from "argon2";

import db from "@/db";
import {
  products,
  tvAds,
  tvCatalogSelections,
  tvDeviceRefreshTokens,
  tvDevices,
  tvSettings,
} from "@/db/models";

export class TvAppRepository {
  async getSettings() {
    const [row] = await db.select().from(tvSettings).limit(1);
    return row ?? null;
  }

  async ensureSettings() {
    const existing = await this.getSettings();
    if (existing) return existing;

    const [created] = await db
      .insert(tvSettings)
      .values({ magazineVersion: 1 })
      .returning();
    return created;
  }

  async updateSettings(
    values: Partial<typeof tvSettings.$inferInsert> & { updatedBy?: number },
  ) {
    const current = await this.ensureSettings();
    const [updated] = await db
      .update(tvSettings)
      .set({
        ...values,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tvSettings.id, current.id))
      .returning();
    return updated;
  }

  async bumpMagazineVersion(updatedBy?: number) {
    const current = await this.ensureSettings();
    const [updated] = await db
      .update(tvSettings)
      .set({
        magazineVersion: (current.magazineVersion ?? 1) + 1,
        updatedAt: new Date().toISOString(),
        ...(updatedBy ? { updatedBy } : {}),
      })
      .where(eq(tvSettings.id, current.id))
      .returning();
    return updated;
  }

  async listAds(params: {
    search?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const where = eq(tvAds.isDeleted, false);

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(tvAds)
      .where(where);

    const rows = await db
      .select()
      .from(tvAds)
      .where(where)
      .orderBy(asc(tvAds.displayOrder), desc(tvAds.id))
      .limit(params.limit)
      .offset(offset);

    return { data: rows, total };
  }

  async findAdById(id: number) {
    const [row] = await db
      .select()
      .from(tvAds)
      .where(and(eq(tvAds.id, id), eq(tvAds.isDeleted, false)))
      .limit(1);
    return row ?? null;
  }

  async createAd(values: typeof tvAds.$inferInsert) {
    const [row] = await db.insert(tvAds).values(values).returning();
    return row;
  }

  async updateAd(id: number, values: Partial<typeof tvAds.$inferInsert>) {
    const [row] = await db
      .update(tvAds)
      .set({ ...values, updatedAt: new Date().toISOString() })
      .where(and(eq(tvAds.id, id), eq(tvAds.isDeleted, false)))
      .returning();
    return row ?? null;
  }

  async softDeleteAds(ids: number[], deletedBy: number) {
    const now = new Date().toISOString();
    await db
      .update(tvAds)
      .set({ isDeleted: true, deletedAt: now, deletedBy, updatedAt: now })
      .where(inArray(tvAds.id, ids));
  }

  async listActiveAds(now = new Date().toISOString()) {
    return db
      .select()
      .from(tvAds)
      .where(
        and(
          eq(tvAds.isDeleted, false),
          eq(tvAds.isActive, true),
          or(eq(tvAds.isPermanent, true), isNull(tvAds.startsAt), sql`${tvAds.startsAt} <= ${now}`),
          or(eq(tvAds.isPermanent, true), isNull(tvAds.endsAt), sql`${tvAds.endsAt} >= ${now}`),
        ),
      )
      .orderBy(asc(tvAds.displayOrder), desc(tvAds.id));
  }

  async listDevices(params: { page: number; limit: number }) {
    const offset = (params.page - 1) * params.limit;
    const [{ value: total }] = await db.select({ value: count() }).from(tvDevices);
    const rows = await db
      .select()
      .from(tvDevices)
      .orderBy(desc(tvDevices.id))
      .limit(params.limit)
      .offset(offset);
    return { data: rows, total };
  }

  async findDeviceById(id: number) {
    const [row] = await db.select().from(tvDevices).where(eq(tvDevices.id, id)).limit(1);
    return row ?? null;
  }

  async findDeviceByKey(deviceKey: string) {
    const [row] = await db
      .select()
      .from(tvDevices)
      .where(eq(tvDevices.deviceKey, deviceKey))
      .limit(1);
    return row ?? null;
  }

  async createDevice(values: typeof tvDevices.$inferInsert) {
    const [row] = await db.insert(tvDevices).values(values).returning();
    return row;
  }

  async updateDevice(id: number, values: Partial<typeof tvDevices.$inferInsert>) {
    const [row] = await db
      .update(tvDevices)
      .set({ ...values, updatedAt: new Date().toISOString() })
      .where(eq(tvDevices.id, id))
      .returning();
    return row ?? null;
  }

  async touchDeviceSeen(deviceId: number) {
    await db
      .update(tvDevices)
      .set({ lastSeenAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(tvDevices.id, deviceId));
  }

  async createRefreshToken(values: typeof tvDeviceRefreshTokens.$inferInsert) {
    const [row] = await db.insert(tvDeviceRefreshTokens).values(values).returning();
    return row;
  }

  async findRefreshTokenByHash(tokenHash: string) {
    const [row] = await db
      .select()
      .from(tvDeviceRefreshTokens)
      .where(and(eq(tvDeviceRefreshTokens.tokenHash, tokenHash), isNull(tvDeviceRefreshTokens.revokedAt)))
      .limit(1);
    return row ?? null;
  }

  async revokeRefreshToken(id: number) {
    await db
      .update(tvDeviceRefreshTokens)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(tvDeviceRefreshTokens.id, id));
  }

  async listCatalogSelections() {
    return db
      .select({
        id: tvCatalogSelections.id,
        productId: tvCatalogSelections.productId,
        displayOrder: tvCatalogSelections.displayOrder,
        isActive: tvCatalogSelections.isActive,
        productName: products.name,
        storeId: products.storeId,
      })
      .from(tvCatalogSelections)
      .innerJoin(products, eq(products.id, tvCatalogSelections.productId))
      .where(and(eq(tvCatalogSelections.isActive, true), eq(products.isDeleted, false)))
      .orderBy(asc(tvCatalogSelections.displayOrder), asc(tvCatalogSelections.id));
  }

  async replaceCatalogSelections(
    productIds: number[],
    actorId: number,
  ) {
    await db.delete(tvCatalogSelections);
    if (!productIds.length) return [];

    const now = new Date().toISOString();
    const rows = productIds.map((productId, index) => ({
      productId,
      displayOrder: index + 1,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: now,
      updatedAt: now,
    }));

    return db.insert(tvCatalogSelections).values(rows).returning();
  }

  static hashRefreshToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  static generateDeviceSecret() {
    return randomBytes(32).toString("base64url");
  }

  static generateRefreshToken() {
    return randomBytes(48).toString("base64url");
  }

  static async hashDeviceSecret(secret: string) {
    return argon2.hash(secret);
  }

  static async verifyDeviceSecret(hash: string, secret: string) {
    return argon2.verify(hash, secret);
  }

  generateRefreshToken() {
    return TvAppRepository.generateRefreshToken();
  }

  hashRefreshToken(token: string) {
    return TvAppRepository.hashRefreshToken(token);
  }

  generateDeviceSecret() {
    return TvAppRepository.generateDeviceSecret();
  }

  hashDeviceSecret(secret: string) {
    return TvAppRepository.hashDeviceSecret(secret);
  }

  verifyDeviceSecret(hash: string, secret: string) {
    return TvAppRepository.verifyDeviceSecret(hash, secret);
  }
}

export const tvAppRepository = new TvAppRepository();
