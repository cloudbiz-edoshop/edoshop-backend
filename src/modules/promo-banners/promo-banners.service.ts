import { count, desc, eq, inArray, or, sql } from "drizzle-orm";

import db from "@/db";
import type { PromoBannerCard } from "@/db/models/promo-banners";
import { promoBanners } from "@/db/models";
import { NotFoundError } from "@/core/errors";

import type {
  CreatePromoBannerRequest,
  UpdatePromoBannerRequest,
} from "./promo-banners.schema";

const toIso = (value?: Date | string | null) =>
  value ? new Date(value).toISOString() : null;

const hoursToMs = (hours: number) => hours * 60 * 60 * 1000;

const parseCards = (value: unknown): PromoBannerCard[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((card) => card && typeof card === "object") as PromoBannerCard[];
};

const inferScheduleType = (row: typeof promoBanners.$inferSelect) => {
  if (row.startsAt || row.endsAt) return "temporary" as const;
  return "permanent" as const;
};

const resolveSchedule = (data: {
  scheduleType?: "permanent" | "temporary";
  startsAt?: string | null;
  endsAt?: string | null;
  displayDurationHours?: number | null;
}) => {
  if (data.scheduleType === "permanent") {
    return { startsAt: null, endsAt: null };
  }

  if (data.scheduleType === "temporary") {
    return {
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
    };
  }

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
  name: row.name,
  text: row.text || "",
  cards: parseCards(row.cards),
  backgroundColor: (row.backgroundColor === "red" ? "red" : "yellow") as
    | "yellow"
    | "red",
  isActive: row.isActive,
  scheduleType: inferScheduleType(row),
  startsAt: toIso(row.startsAt),
  endsAt: toIso(row.endsAt),
  displayDurationHours: row.displayDurationHours,
  createdAt: toIso(row.createdAt),
  updatedAt: toIso(row.updatedAt),
});

const isCardSetPayload = (
  data: CreatePromoBannerRequest | UpdatePromoBannerRequest,
) => "cards" in data && Array.isArray(data.cards);

export class PromoBannersService {
  async list(params: { page: number; limit: number; search?: string }) {
    const offset = (params.page - 1) * params.limit;
    const search = params.search?.trim();
    const where = search
      ? or(
          sql`${promoBanners.text} ILIKE ${`%${search}%`}`,
          sql`${promoBanners.name} ILIKE ${`%${search}%`}`,
        )
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
    const cardSet = isCardSetPayload(data);

    const [row] = await db
      .insert(promoBanners)
      .values({
        name: cardSet && "name" in data ? data.name : null,
        text: cardSet ? "" : "text" in data ? data.text : "",
        cards: cardSet && "cards" in data ? data.cards : [],
        backgroundColor:
          cardSet ? "yellow" : "backgroundColor" in data
            ? (data.backgroundColor ?? "yellow")
            : "yellow",
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
      data.scheduleType !== undefined ||
      data.startsAt !== undefined ||
      data.endsAt !== undefined ||
      data.displayDurationHours !== undefined;
    const schedule = shouldReschedule ? resolveSchedule(data) : null;
    const cardSet = isCardSetPayload(data);

    const [row] = await db
      .update(promoBanners)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.text !== undefined && { text: data.text }),
        ...(cardSet && {
          cards: data.cards,
          text: "",
        }),
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

  private findActiveVisible(now = new Date()) {
    return db
      .select()
      .from(promoBanners)
      .where(eq(promoBanners.isActive, true))
      .orderBy(desc(promoBanners.updatedAt))
      .then((rows) => rows.find((item) => isPubliclyVisible(item, now)));
  }

  async getActivePublic() {
    const row = await this.findActiveVisible();
    if (!row) return null;
    const serialized = serialize(row);
    if (!serialized.text.trim() || serialized.cards.length) return null;
    return serialized;
  }

  async getActivePublicCards() {
    const row = await this.findActiveVisible();
    if (!row) return null;
    const serialized = serialize(row);
    if (!serialized.cards.length) return null;
    return {
      id: serialized.id,
      name: serialized.name,
      cards: serialized.cards,
    };
  }
}

export const promoBannersService = new PromoBannersService();
