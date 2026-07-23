import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import db from "@/db";
import {
  bundles,
  employees,
  entities,
  entries,
  entryImages,
  items,
  operations,
  packages,
  permissions,
  roles,
  series,
  users,
  warehouseTicketEvents,
  warehouseTicketItems,
  warehouseTicketSettings,
  warehouseTickets,
} from "@/db/models";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

const ticketWithRelations = {
  requester: true,
  approver: true,
  warehouseTech: true,
  warehouse: true,
  createdByUser: true,
  updatedByUser: true,
  items: true,
  events: {
    with: {
      actor: true,
    },
  },
} as const;

export class WarehouseTicketsRepository {
  async findById(id: number, tx?: TX) {
    const queryBuilder = tx ?? db;

    return queryBuilder.query.warehouseTickets.findFirst({
      where: eq(warehouseTickets.id, id),
      with: ticketWithRelations,
    });
  }

  async findByCode(ticketCode: string, tx?: TX) {
    const queryBuilder = tx ?? db;

    return queryBuilder.query.warehouseTickets.findFirst({
      where: eq(warehouseTickets.ticketCode, ticketCode),
    });
  }

  async countOpenTicketsByRequester(requesterId: number, tx?: TX) {
    const queryBuilder = tx ?? db;
    const openStatuses = [
      "pending_approval",
      "approved",
      "paused",
      "ready_for_pickup",
    ];

    const [{ value }] = await queryBuilder
      .select({ value: count() })
      .from(warehouseTickets)
      .where(
        and(
          eq(warehouseTickets.requesterId, requesterId),
          inArray(warehouseTickets.status, openStatuses),
        ),
      );

    return value;
  }

  async listUserIdsByRoleNames(roleNames: string[]) {
    const rows = await db
      .select({ userId: employees.userId })
      .from(employees)
      .innerJoin(roles, eq(employees.roleId, roles.id))
      .innerJoin(users, eq(employees.userId, users.id))
      .where(
        and(
          eq(employees.isDeleted, false),
          eq(employees.isActive, true),
          inArray(roles.name, roleNames),
        ),
      );

    return [...new Set(rows.map((row) => row.userId))];
  }

  async listUserIdsByPermission(entityName: string, operationName: string) {
    const rows = await db
      .select({ userId: employees.userId })
      .from(employees)
      .innerJoin(roles, eq(employees.roleId, roles.id))
      .innerJoin(permissions, eq(permissions.roleId, roles.id))
      .innerJoin(entities, eq(permissions.entityId, entities.id))
      .innerJoin(operations, eq(permissions.operationId, operations.id))
      .innerJoin(users, eq(employees.userId, users.id))
      .where(
        and(
          eq(employees.isDeleted, false),
          eq(employees.isActive, true),
          eq(entities.name, entityName),
          sql`lower(${operations.name}) = lower(${operationName})`,
        ),
      );

    return [...new Set(rows.map((row) => row.userId))];
  }

  private getEntryProductCodeSql() {
    return sql<string>`COALESCE(
      (SELECT ${bundles.bundleCode} FROM ${bundles} WHERE ${bundles.entryId} = ${entries.id} LIMIT 1),
      (SELECT ${series.seriesCode} FROM ${series} WHERE ${series.entryId} = ${entries.id} LIMIT 1),
      (SELECT ${items.itemCode} FROM ${items} WHERE ${items.entryId} = ${entries.id} LIMIT 1),
      (SELECT ${packages.packageCode} FROM ${packages} WHERE ${packages.entryId} = ${entries.id} LIMIT 1)
    )`;
  }

  async searchEntryOptions(params: {
    warehouseId: number;
    search?: string;
    limit?: number;
  }) {
    const { warehouseId, search, limit = 20 } = params;
    const productCodeSql = this.getEntryProductCodeSql();
    const imageUrlSql = sql<string | null>`(
      SELECT ${entryImages.url}
      FROM ${entryImages}
      WHERE ${entryImages.entryId} = ${entries.id}
      ORDER BY ${entryImages.id}
      LIMIT 1
    )`;

    const whereConditions = [
      eq(entries.warehouseId, warehouseId),
      eq(entries.isDeleted, false),
    ];

    const trimmedSearch = search?.trim();
    if (trimmedSearch) {
      const searchPattern = `%${trimmedSearch}%`;
      whereConditions.push(
        sql`(
          ${productCodeSql} ILIKE ${searchPattern}
          OR CAST(${entries.id} AS TEXT) ILIKE ${searchPattern}
          OR COALESCE(${entries.description}, '') ILIKE ${searchPattern}
        )`,
      );
    }

    const rows = await db
      .select({
        entryId: entries.id,
        productCode: productCodeSql.as("productCode"),
        description: entries.description,
        imageUrl: imageUrlSql.as("imageUrl"),
      })
      .from(entries)
      .where(and(...whereConditions))
      .orderBy(desc(entries.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      entryId: row.entryId,
      productCode: row.productCode ?? `Entry ${row.entryId}`,
      description: row.description,
      imageUrl: row.imageUrl,
      label: row.productCode
        ? `${row.productCode} (Entry ${row.entryId})`
        : `Entry ${row.entryId}`,
    }));
  }

  async findEntriesForTicket(entryIds: number[], warehouseId: number) {
    if (entryIds.length === 0) {
      return [];
    }

    const productCodeSql = this.getEntryProductCodeSql();
    const imageUrlSql = sql<string | null>`(
      SELECT ${entryImages.url}
      FROM ${entryImages}
      WHERE ${entryImages.entryId} = ${entries.id}
      ORDER BY ${entryImages.id}
      LIMIT 1
    )`;

    return db
      .select({
        id: entries.id,
        productCode: productCodeSql.as("productCode"),
        description: entries.description,
        imageUrl: imageUrlSql.as("imageUrl"),
      })
      .from(entries)
      .where(
        and(
          inArray(entries.id, entryIds),
          eq(entries.warehouseId, warehouseId),
          eq(entries.isDeleted, false),
        ),
      );
  }

  async getEntryImagesByIds(entryIds: number[]) {
    if (entryIds.length === 0) {
      return new Map<number, string | null>();
    }

    const imageUrlSql = sql<string | null>`(
      SELECT ${entryImages.url}
      FROM ${entryImages}
      WHERE ${entryImages.entryId} = ${entries.id}
      ORDER BY ${entryImages.id}
      LIMIT 1
    )`;

    const rows = await db
      .select({
        id: entries.id,
        imageUrl: imageUrlSql.as("imageUrl"),
      })
      .from(entries)
      .where(
        and(inArray(entries.id, entryIds), eq(entries.isDeleted, false)),
      );

    return new Map(rows.map((row) => [row.id, row.imageUrl ?? null]));
  }

  async getTicketSettings() {
    const [settings] = await db.select().from(warehouseTicketSettings).limit(1);

    return settings ?? null;
  }

  async upsertTicketSettings(
    data: {
      maxLineItems: number;
      maxTotalQuantity: number;
      maxOpenTicketsPerUser: number;
      returnReminderDays?: number;
      updatedBy: number;
    },
  ) {
    const existing = await this.getTicketSettings();
    const now = new Date().toISOString();

    if (existing) {
      const [settings] = await db
        .update(warehouseTicketSettings)
        .set({
          ...data,
          updatedAt: now,
        })
        .where(eq(warehouseTicketSettings.id, existing.id))
        .returning();

      return settings;
    }

    const [settings] = await db
      .insert(warehouseTicketSettings)
      .values({
        ...data,
        updatedAt: now,
      })
      .returning();

    return settings;
  }

  async list(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: {
      status?: string;
      warehouseId?: number;
      requesterId?: number;
      queue?: "approvals" | "delivery" | "returns";
      warehouseTechWarehouseId?: number;
      [key: string]: unknown;
    };
  }) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;
    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    const searchableFields = ["ticketCode", "reason", "status"];
    const whereConditions = [];

    const { queue, warehouseTechWarehouseId, ...restFilters } = filters ?? {};
    const filterCondition = createFilterConditions(warehouseTickets, restFilters);
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }

    if (queue === "approvals") {
      whereConditions.push(
        inArray(warehouseTickets.status, ["pending_approval", "paused"]),
      );
    }

    if (queue === "delivery") {
      whereConditions.push(eq(warehouseTickets.status, "approved"));
      if (warehouseTechWarehouseId) {
        whereConditions.push(
          eq(warehouseTickets.warehouseId, warehouseTechWarehouseId),
        );
      }
    }

    if (queue === "returns") {
      whereConditions.push(eq(warehouseTickets.status, "completed"));
      whereConditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${warehouseTicketItems} AS return_items
          WHERE return_items.ticket_id = ${warehouseTickets.id}
            AND return_items.transferred_quantity > return_items.returned_quantity
        )`,
      );
      if (warehouseTechWarehouseId) {
        whereConditions.push(
          eq(warehouseTickets.warehouseId, warehouseTechWarehouseId),
        );
      }
    }

    const searchCondition = createSearchCondition(
      searchableFields,
      warehouseTickets,
      search,
    );
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const sortCondition = createSortCondition(
      warehouseTickets,
      sortBy,
      sortOrder,
    );

    return await db.transaction(async (tx) => {
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(warehouseTickets)
        .where(whereClause || sql`TRUE`);

      const data = await tx.query.warehouseTickets.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition
          ? [sortCondition]
          : [desc(warehouseTickets.createdAt)],
        with: {
          requester: true,
          approver: true,
          warehouseTech: true,
          warehouse: true,
          items: true,
        },
      });

      return { data, total: totalCount, searchableFields };
    });
  }

  async createTicket(
    tx: TX,
    data: {
      ticketCode: string;
      warehouseId: number;
      reason: string;
      status: string;
      requesterId: number;
      totalQuantity: number;
      createdBy: number;
      updatedBy: number;
    },
  ) {
    const now = new Date().toISOString();
    const [ticket] = await tx
      .insert(warehouseTickets)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return ticket;
  }

  async replaceItems(
    tx: TX,
    ticketId: number,
    items: Array<{
      entryId?: number | null;
      productLabel: string;
      sku?: string | null;
      quantity: number;
      notes?: string | null;
    }>,
  ) {
    await tx
      .delete(warehouseTicketItems)
      .where(eq(warehouseTicketItems.ticketId, ticketId));

    if (items.length === 0) {
      return [];
    }

    const now = new Date().toISOString();
    return tx
      .insert(warehouseTicketItems)
      .values(
        items.map((item) => ({
          ticketId,
          entryId: item.entryId ?? null,
          productLabel: item.productLabel,
          sku: item.sku ?? null,
          quantity: item.quantity,
          transferredQuantity: 0,
          notes: item.notes ?? null,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .returning();
  }

  async addEvent(
    tx: TX,
    data: {
      ticketId: number;
      actorId: number;
      action: string;
      comment?: string | null;
      previousStatus?: string | null;
      newStatus?: string | null;
    },
  ) {
    const [event] = await tx
      .insert(warehouseTicketEvents)
      .values({
        ...data,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return event;
  }

  async updateTicket(
    tx: TX,
    id: number,
    data: Partial<{
      warehouseId: number;
      reason: string;
      status: string;
      pausedFromStatus: string | null;
      statusComment: string | null;
      approverId: number | null;
      warehouseTechId: number | null;
      approvedAt: string | null;
      pausedAt: string | null;
      rejectedAt: string | null;
      confirmedAt: string | null;
      completedAt: string | null;
      totalQuantity: number;
      updatedBy: number;
    }>,
  ) {
    const [ticket] = await tx
      .update(warehouseTickets)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(warehouseTickets.id, id))
      .returning();

    return ticket;
  }

  async updateItemTransfer(
    tx: TX,
    itemId: number,
    ticketId: number,
    transferredQuantity: number,
  ) {
    const [item] = await tx
      .update(warehouseTicketItems)
      .set({
        transferredQuantity,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(warehouseTicketItems.id, itemId),
          eq(warehouseTicketItems.ticketId, ticketId),
        ),
      )
      .returning();

    return item;
  }

  async deleteTicket(tx: TX, id: number) {
    const [ticket] = await tx
      .delete(warehouseTickets)
      .where(eq(warehouseTickets.id, id))
      .returning();

    return ticket;
  }

  async updateItemReturn(
    tx: TX,
    itemId: number,
    ticketId: number,
    returnedQuantity: number,
  ) {
    const [item] = await tx
      .update(warehouseTicketItems)
      .set({
        returnedQuantity,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(warehouseTicketItems.id, itemId),
          eq(warehouseTicketItems.ticketId, ticketId),
        ),
      )
      .returning();

    return item;
  }

  async listOverdueBorrowTickets() {
    const now = new Date().toISOString();

    return db.query.warehouseTickets.findMany({
      where: and(
        eq(warehouseTickets.status, "completed"),
        sql`${warehouseTickets.borrowDueAt} IS NOT NULL`,
        sql`${warehouseTickets.borrowDueAt} <= ${now}`,
        sql`EXISTS (
          SELECT 1 FROM ${warehouseTicketItems} AS overdue_items
          WHERE overdue_items.ticket_id = ${warehouseTickets.id}
            AND overdue_items.transferred_quantity > overdue_items.returned_quantity
        )`,
      ),
      with: {
        items: true,
        requester: true,
      },
    });
  }

  async getNextTicketSequence() {
    const [{ value }] = await db
      .select({ value: count() })
      .from(warehouseTickets);

    return value + 1;
  }
}
