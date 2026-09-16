import { count, desc, eq, inArray, sql } from "drizzle-orm";

import db from "@/db";
import { promoBanners } from "@/db/models";
import { NotFoundError } from "@/core/errors";

import type {
  CreatePromoBannerRequest,
  UpdatePromoBannerRequest,
} from "./promo-banners.schema";

const toIso = (value?: Date | string | null) =>
  value ? new Date(value).toISOString() : null;

const hoursToMs = (hours: number) => hours * 60 * 60 * 1000;

const resolveSchedule = (data: {
  startsAt?: string | null;
  endsAt?: string | null;
  displayDurationHours?: number | null;
}) => {
  const startsAt = data.startsAt ? new Date(data.startsAt) : null;
  if (data.endsAt) {
    return { startsAt, endsAt: new Date(data.endsAt) };
  }

  if (data.displayDurationHours) {
    const start = startsAt || new Date();
    return {
      startsAt: startsAt || start,
      endsAt: new Date(start.getTime() + hoursToMs(data.displayDurationHours)),
    };
  }

  return { startsAt, endsAt: null };
};

const isPubliclyVisible = (
  row: typeof promoBanners.$inferSelect,
  now = new Date(),
) => {
  if (!row.isActive) return false;

  const startsAt = row.startsAt ? new Date(row.startsAt) : null;
  if (startsAt && startsAt > now) return false;

  const endsAt =
    row.endsAt
      ? new Date(row.endsAt)
      : row.displayDurationHours
        ? new Date(
            (startsAt || row.createdAt || now).getTime() +
              hoursToMs(row.displayDurationHours),
          )
        : null;

  if (endsAt && endsAt < now) return false;
  return true;
};

const serialize = (row: typeof promoBanners.$inferSelect) => ({
  id: row.id,
  text: row.text,
  backgroundColor: (row.backgroundColor === "red" ? "red" : "yellow") as
    | "yellow"
    | "red",
  isActive: row.isActive,
  startsAt: toIso(row.startsAt),
  endsAt: toIso(row.endsAt),
  displayDurationHours: row.displayDurationHours,
  createdAt: toIso(row.createdAt),
  updatedAt: toIso(row.updatedAt),
});

export class PromoBannersService {
  async list(params: { page: number; limit: number; search?: string }) {
    const offset = (params.page - 1) * params.limit;
    const where = params.search?.trim()
      ? sql`${promoBanners.text} ILIKE ${`%${params.search.trim()}%`}`
      : undefined;

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(promoBanners)
      .where(where || sql`TRUE`);

    const rows = await db
      .select()
      .from(promoBanners)
      .where(where || sql`TRUE`)
      .orderBy(desc(promoBanners.updatedAt))
      .limit(params.limit)
      .offset(offset);

    return {
      data: rows.map(serialize),
      total: Number(total || 0),
    };
  }

  async getById(id: number) {
    const [row] = await db
      .select()
      .from(promoBanners)
      .where(eq(promoBanners.id, id))
      .limit(1);
    if (!row) throw new NotFoundError("Promo banner not found");
    return serialize(row);
  }

  async create(data: CreatePromoBannerRequest & { createdBy: number }) {
    if (data.isActive) {
      await db.update(promoBanners).set({ isActive: false });
    }

    const schedule = resolveSchedule(data);
    const [row] = await db
      .insert(promoBanners)
      .values({
        text: data.text,
        backgroundColor: data.backgroundColor,
        isActive: data.isActive ?? false,
        startsAt: schedule.startsAt,
        endsAt: schedule.endsAt,
        displayDurationHours: data.displayDurationHours ?? null,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      })
      .returning();

    return serialize(row);
  }

  async update(
    id: number,
    data: UpdatePromoBannerRequest & { updatedBy: number },
  ) {
    await this.getById(id);

    if (data.isActive) {
      await db.update(promoBanners).set({ isActive: false });
    }

    const shouldReschedule =
      data.startsAt !== undefined ||
      data.endsAt !== undefined ||
      data.displayDurationHours !== undefined;
    const schedule = shouldReschedule ? resolveSchedule(data) : null;

    const [row] = await db
      .update(promoBanners)
      .set({
        ...(data.text !== undefined && { text: data.text }),
        ...(data.backgroundColor !== undefined && {
          backgroundColor: data.backgroundColor,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(schedule && {
          startsAt: schedule.startsAt,
          endsAt: schedule.endsAt,
        }),
        ...(data.displayDurationHours !== undefined && {
          displayDurationHours: data.displayDurationHours,
        }),
        updatedBy: data.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(promoBanners.id, id))
      .returning();

    return serialize(row);
  }

  async remove(ids: number[]) {
    if (!ids.length) return;
    await db.delete(promoBanners).where(inArray(promoBanners.id, ids));
  }

  async getActivePublic() {
    const now = new Date();
    const rows = await db
      .select()
      .from(promoBanners)
      .where(eq(promoBanners.isActive, true))
      .orderBy(desc(promoBanners.updatedAt));

    const row = rows.find((item) => isPubliclyVisible(item, now));
    return row ? serialize(row) : null;
  }
}

export const promoBannersService = new PromoBannersService();
