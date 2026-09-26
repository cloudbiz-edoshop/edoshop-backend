import { and, count, desc, eq, inArray, ne, or, sql } from "drizzle-orm";

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

const normalizeRibbonBackground = (value: string | null | undefined) => {
  const raw = String(value || "yellow").trim();
  if (raw === "red" || raw === "yellow") return raw;
  if (/^#[0-9A-Fa-f]{6}$/.test(raw)) return raw;
  return "yellow";
};

const serialize = (row: typeof promoBanners.$inferSelect) => ({
  id: row.id,
  name: row.name,
  text: row.text || "",
  cards: parseCards(row.cards),
  backgroundColor: normalizeRibbonBackground(row.backgroundColor),
  textColor: /^#[0-9A-Fa-f]{6}$/.test(String(row.textColor || ""))
    ? String(row.textColor)
    : "#1a1a1a",
  fontSizePx: Number(row.fontSizePx) > 0 ? Number(row.fontSizePx) : 13,
  textAnimation:
    row.textAnimation === "blinking" || row.textAnimation === "scrolling"
      ? row.textAnimation
      : "fixed",
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

const promoCardCountSql = sql`coalesce(jsonb_array_length(${promoBanners.cards}), 0)`;

const isRibbonRow = (row: typeof promoBanners.$inferSelect) =>
  parseCards(row.cards).length === 0 &&
  String(row.text || "").trim().length > 0;

const isCardSetRow = (row: typeof promoBanners.$inferSelect) =>
  parseCards(row.cards).length > 0;

export class PromoBannersService {
  private async deactivatePeerPromos(
    kind: "ribbon" | "cards",
    exceptId?: number,
  ) {
    const peerFilter =
      kind === "ribbon"
        ? sql`${promoCardCountSql} = 0`
        : sql`${promoCardCountSql} > 0`;
    const whereClause = exceptId
      ? and(peerFilter, ne(promoBanners.id, exceptId))
      : peerFilter;

    await db.update(promoBanners).set({ isActive: false }).where(whereClause);
  }

  private async findActivePromoRow(
    predicate: (row: typeof promoBanners.$inferSelect) => boolean,
    now = new Date(),
  ) {
    const rows = await db
      .select()
      .from(promoBanners)
      .where(eq(promoBanners.isActive, true))
      .orderBy(desc(promoBanners.updatedAt));

    return rows.find(
      (item) => isPubliclyVisible(item, now) && predicate(item),
    );
  }

  private resolvePromoKind(
    data: CreatePromoBannerRequest | UpdatePromoBannerRequest,
    existing?: Awaited<ReturnType<PromoBannersService["getById"]>>,
  ): "ribbon" | "cards" {
    if (isCardSetPayload(data)) {
      return "cards";
    }
    if (existing && existing.cards.length > 0) {
      return "cards";
    }
    return "ribbon";
  }
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
      await this.deactivatePeerPromos(this.resolvePromoKind(data));
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
            ? normalizeRibbonBackground(data.backgroundColor ?? "yellow")
            : "yellow",
        textColor:
          !cardSet && "textColor" in data && data.textColor
            ? data.textColor
            : "#1a1a1a",
        fontSizePx:
          !cardSet && "fontSizePx" in data && data.fontSizePx
            ? data.fontSizePx
            : 13,
        textAnimation:
          !cardSet && "textAnimation" in data && data.textAnimation
            ? data.textAnimation
            : "fixed",
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
    const existing = await this.getById(id);

    if (data.isActive) {
      await this.deactivatePeerPromos(this.resolvePromoKind(data, existing), id);
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
          backgroundColor: normalizeRibbonBackground(data.backgroundColor),
        }),
        ...(data.textColor !== undefined && { textColor: data.textColor }),
        ...(data.fontSizePx !== undefined && { fontSizePx: data.fontSizePx }),
        ...(data.textAnimation !== undefined && {
          textAnimation: data.textAnimation,
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
    const row = await this.findActivePromoRow(isRibbonRow);
    if (!row) return null;
    const serialized = serialize(row);
    if (!serialized.text.trim() || serialized.cards.length) return null;
    return serialized;
  }

  async getActivePublicCards() {
    const row = await this.findActivePromoRow(isCardSetRow);
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
