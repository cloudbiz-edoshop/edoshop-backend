import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import db from "@/db";
import {
  bundles,
  employees,
  entities,
  directOrderProducts,
  dropshippingProducts,
  entries,
  entryImages,
  entryProducts,
  items,
  operations,
  packages,
  permissions,
  products,
  roles,
  series,
  users,
  variants,
  warehouseTicketEvents,
  warehouseTicketItems,
  warehouseTicketSettings,
  warehouseTickets,
} from "@/db/models";
import {
  WAREHOUSE_TICKET_BORROWED_STATUSES,
  WAREHOUSE_TICKET_DELIVERY_STATUSES,
  WAREHOUSE_TICKET_OPEN_STATUSES,
} from "@/constants/warehouse-tickets.constants";
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
    const openStatuses = [...WAREHOUSE_TICKET_OPEN_STATUSES];

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

  async listWarehouseReceiverUserIds(
    warehouseId: number,
    excludeUserIds: number[] = [],
  ) {
    const warehouseEntity = warehouseId === 1 ? "warehouse_1" : "warehouse_2";
    const [ticketingReceivers, warehouseReceivers] = await Promise.all([
      this.listUserIdsByPermission("ticketing", "update"),
      this.listUserIdsByPermission(warehouseEntity, "update"),
    ]);

    const warehouseSet = new Set(warehouseReceivers);
    const excludeSet = new Set(excludeUserIds);

    return ticketingReceivers.filter(
      (userId) => warehouseSet.has(userId) && !excludeSet.has(userId),
    );
  }

  async findTicketNotificationContextByIds(ticketIds: number[]) {
    if (!ticketIds.length) {
      return new Map<number, { requesterId: number; warehouseId: number }>();
    }

    const rows = await db
      .select({
        id: warehouseTickets.id,
        requesterId: warehouseTickets.requesterId,
        warehouseId: warehouseTickets.warehouseId,
      })
      .from(warehouseTickets)
      .where(inArray(warehouseTickets.id, ticketIds));

    return new Map(
      rows.map((row) => [
        row.id,
        { requesterId: row.requesterId, warehouseId: row.warehouseId },
      ]),
    );
  }

  private async resolveCatalogProductsByEntryIds(entryIds: number[]) {
    if (entryIds.length === 0) {
      return new Map<number, { productId: number; productName: string }>();
    }

    const rows = await db.execute(sql`
      SELECT
        e.id AS entry_id,
        COALESCE(
          (
            SELECT p.id
            FROM ${entryProducts} ep
            INNER JOIN ${products} p ON p.id = ep.product_id
            WHERE ep.entry_id = e.id
            ORDER BY ep.id
            LIMIT 1
          ),
          (
            SELECT p.id
            FROM ${directOrderProducts} dop
            INNER JOIN ${products} p ON p.id = dop.product_id
            INNER JOIN ${series} s ON s.id = dop.series_id
            WHERE s.entry_id = e.id
            ORDER BY dop.id
            LIMIT 1
          ),
          (
            SELECT p.id
            FROM ${items} i
            INNER JOIN ${variants} v ON v.item_id = i.id AND v.is_deleted = false
            INNER JOIN ${products} p ON p.id = v.product_id
            WHERE i.entry_id = e.id
            ORDER BY v.id
            LIMIT 1
          )
        ) AS product_id,
        COALESCE(
          (
            SELECT p.name
            FROM ${entryProducts} ep
            INNER JOIN ${products} p ON p.id = ep.product_id
            WHERE ep.entry_id = e.id
            ORDER BY ep.id
            LIMIT 1
          ),
          (
            SELECT p.name
            FROM ${directOrderProducts} dop
            INNER JOIN ${products} p ON p.id = dop.product_id
            INNER JOIN ${series} s ON s.id = dop.series_id
            WHERE s.entry_id = e.id
            ORDER BY dop.id
            LIMIT 1
          ),
          (
            SELECT p.name
            FROM ${items} i
            INNER JOIN ${variants} v ON v.item_id = i.id AND v.is_deleted = false
            INNER JOIN ${products} p ON p.id = v.product_id
            WHERE i.entry_id = e.id
            ORDER BY v.id
            LIMIT 1
          )
        ) AS product_name
      FROM ${entries} e
      WHERE e.id IN (${sql.join(entryIds.map((id) => sql`${id}`), sql`, `)})
    `);

    const catalogMap = new Map<number, { productId: number; productName: string }>();

    for (const row of rows) {
      const record = row as {
        entry_id: number;
        product_id: number | null;
        product_name: string | null;
      };

      if (record.product_id && record.product_name) {
        catalogMap.set(record.entry_id, {
          productId: record.product_id,
          productName: record.product_name,
        });
      }
    }

    return catalogMap;
  }

  private getEntryProductCodeSql() {
    return sql<string>`COALESCE(
      (SELECT ${bundles.bundleCode} FROM ${bundles} WHERE ${bundles.entryId} = ${entries.id} LIMIT 1),
      (SELECT ${series.seriesCode} FROM ${series} WHERE ${series.entryId} = ${entries.id} LIMIT 1),
      (SELECT ${items.itemCode} FROM ${items} WHERE ${items.entryId} = ${entries.id} LIMIT 1),
      (SELECT ${packages.packageCode} FROM ${packages} WHERE ${packages.entryId} = ${entries.id} LIMIT 1)
    )`;
  }

  async findEntryIdForProductInWarehouse(
    productId: number,
    warehouseId: number,
  ): Promise<number | null> {
    const [row] = await db.execute(sql`
      SELECT entry_id
      FROM (
        SELECT ep.entry_id, 1 AS priority, ep.id AS sort_order
        FROM ${entryProducts} ep
        INNER JOIN ${entries} e ON e.id = ep.entry_id
        WHERE ep.product_id = ${productId}
          AND e.warehouse_id = ${warehouseId}
          AND e.is_deleted = false
        UNION ALL
        SELECT i.entry_id, 2 AS priority, v.id AS sort_order
        FROM ${items} i
        INNER JOIN ${variants} v ON v.item_id = i.id AND v.is_deleted = false
        INNER JOIN ${entries} e ON e.id = i.entry_id
        WHERE v.product_id = ${productId}
          AND e.warehouse_id = ${warehouseId}
          AND e.is_deleted = false
        UNION ALL
        SELECT s.entry_id, 3 AS priority, dop.id AS sort_order
        FROM ${series} s
        INNER JOIN ${directOrderProducts} dop ON dop.series_id = s.id
        INNER JOIN ${entries} e ON e.id = s.entry_id
        WHERE dop.product_id = ${productId}
          AND e.warehouse_id = ${warehouseId}
          AND e.is_deleted = false
      ) AS matches
      ORDER BY priority, sort_order
      LIMIT 1
    `);

    const record = row as { entry_id?: number | null } | undefined;
    return record?.entry_id ?? null;
  }

  async searchCatalogProducts(params: {
    warehouseId?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { warehouseId, search, page = 1, limit = 50 } = params;
    const whereConditions = [eq(products.isDeleted, false)];

    const trimmedSearch = search?.trim();
    if (trimmedSearch) {
      const searchPattern = `%${trimmedSearch}%`;
      whereConditions.push(
        sql`(
          ${products.name} ILIKE ${searchPattern}
          OR COALESCE(${products.shortDescription}, '') ILIKE ${searchPattern}
          OR CAST(${products.id} AS TEXT) ILIKE ${searchPattern}
        )`,
      );
    }

    const whereClause = and(...whereConditions);
    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(products)
      .where(whereClause);

    const directOrderCodeSql = sql<string | null>`(
      SELECT ${directOrderProducts.directOrderCode}
      FROM ${directOrderProducts}
      WHERE ${directOrderProducts.productId} = ${products.id}
      ORDER BY ${directOrderProducts.id}
      LIMIT 1
    )`;

    const dropshippingCodeSql = sql<string | null>`(
      SELECT ${dropshippingProducts.dropshippingCode}
      FROM ${dropshippingProducts}
      WHERE ${dropshippingProducts.productId} = ${products.id}
      ORDER BY ${dropshippingProducts.id}
      LIMIT 1
    )`;

    const rows = await db
      .select({
        productId: products.id,
        name: products.name,
        shortDescription: products.shortDescription,
        imageUrls: products.imageUrls,
        directOrderCode: directOrderCodeSql.as("directOrderCode"),
        dropshippingCode: dropshippingCodeSql.as("dropshippingCode"),
      })
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.id))
      .limit(limitVal)
      .offset(offset);

    const catalogRows = await Promise.all(
      rows.map(async (row) => {
        const imageUrls = Array.isArray(row.imageUrls)
          ? row.imageUrls.filter((url): url is string => typeof url === "string")
          : [];
        const entryId =
          warehouseId != null
            ? await this.findEntryIdForProductInWarehouse(row.productId, warehouseId)
            : null;

        return {
          productId: row.productId,
          name: row.name,
          shortDescription: row.shortDescription,
          productCode: row.directOrderCode ?? row.dropshippingCode ?? null,
          imageUrl: imageUrls[0] ?? null,
          entryId,
          label: row.name,
        };
      }),
    );

    return {
      data: catalogRows,
      total,
      page,
      limit: limitVal,
    };
  }

  async searchEntryOptions(params: {
    warehouseId: number;
    search?: string;
    limit?: number;
  }) {
    const { warehouseId, search, limit = 100 } = params;
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
          OR EXISTS (
            SELECT 1
            FROM ${entryProducts} ep
            INNER JOIN ${products} p ON p.id = ep.product_id
            WHERE ep.entry_id = ${entries.id}
              AND (
                p.name ILIKE ${searchPattern}
                OR CAST(p.id AS TEXT) ILIKE ${searchPattern}
              )
          )
          OR EXISTS (
            SELECT 1
            FROM ${items} i
            INNER JOIN ${variants} v ON v.item_id = i.id AND v.is_deleted = false
            INNER JOIN ${products} p ON p.id = v.product_id
            WHERE i.entry_id = ${entries.id}
              AND (
                p.name ILIKE ${searchPattern}
                OR CAST(p.id AS TEXT) ILIKE ${searchPattern}
              )
          )
          OR EXISTS (
            SELECT 1
            FROM ${series} s
            INNER JOIN ${directOrderProducts} dop ON dop.series_id = s.id
            INNER JOIN ${products} p ON p.id = dop.product_id
            WHERE s.entry_id = ${entries.id}
              AND (
                p.name ILIKE ${searchPattern}
                OR CAST(p.id AS TEXT) ILIKE ${searchPattern}
              )
          )
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

    const catalogMap = await this.resolveCatalogProductsByEntryIds(
      rows.map((row) => row.entryId),
    );

    return rows.map((row) => {
      const catalog = catalogMap.get(row.entryId);
      const productCode = row.productCode ?? `Entry ${row.entryId}`;
      const productName = catalog?.productName?.trim() || null;
      const storeProductId = catalog?.productId ?? null;
      const displayName = productName || row.description?.trim() || productCode;

      return {
        entryId: row.entryId,
        productCode,
        productName,
        storeProductId,
        description: row.description,
        imageUrl: row.imageUrl,
        label: displayName,
        searchText: [
          productName,
          storeProductId ? String(storeProductId) : null,
          productCode,
          row.description,
          String(row.entryId),
        ]
          .filter(Boolean)
          .join(" "),
      };
    });
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

  async getEntryAvailableQuantity(entryId: number, warehouseId: number) {
    const entry = await db.query.entries.findFirst({
      where: and(
        eq(entries.id, entryId),
        eq(entries.warehouseId, warehouseId),
        eq(entries.isDeleted, false),
      ),
      columns: { id: true },
    });

    if (!entry) {
      return 0;
    }

    const [itemCount] = await db
      .select({ value: count() })
      .from(items)
      .where(eq(items.entryId, entryId));

    if (itemCount.value > 0) {
      return itemCount.value;
    }

    const [seriesCount] = await db
      .select({ value: count() })
      .from(series)
      .where(eq(series.entryId, entryId));

    if (seriesCount.value > 0) {
      return seriesCount.value;
    }

    const [bundleCount] = await db
      .select({ value: count() })
      .from(bundles)
      .where(eq(bundles.entryId, entryId));

    if (bundleCount.value > 0) {
      return bundleCount.value;
    }

    const [packageCount] = await db
      .select({ value: count() })
      .from(packages)
      .where(eq(packages.entryId, entryId));

    return packageCount.value > 0 ? packageCount.value : 0;
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
      queue?: "approvals" | "approvals_history" | "delivery" | "returns" | "borrowed";
      warehouseTechWarehouseId?: number;
      [key: string]: unknown;
    };
  }) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;
    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    const searchableFields = ["ticketCode", "reason", "status"];
    const whereConditions = [];

    const { queue, warehouseTechWarehouseId, approverId, ...restFilters } =
      filters ?? {};
    const filterCondition = createFilterConditions(warehouseTickets, restFilters);
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }

    if (queue === "approvals") {
      whereConditions.push(
        eq(warehouseTickets.status, "pending_approval"),
      );
    }

    if (queue === "approvals_history") {
      whereConditions.push(
        sql`${warehouseTickets.approverId} IS NOT NULL`,
      );
      if (approverId) {
        whereConditions.push(eq(warehouseTickets.approverId, Number(approverId)));
      }
      whereConditions.push(
        inArray(warehouseTickets.status, [
          "approved",
          "being_prepared",
          "ready_for_pickup",
          "received_borrowed",
          "return_pending",
          "partially_returned",
          "closed",
          "completed",
          "rejected",
          "cancelled",
        ]),
      );
    }

    if (queue === "delivery") {
      whereConditions.push(
        inArray(warehouseTickets.status, [...WAREHOUSE_TICKET_DELIVERY_STATUSES]),
      );
      if (warehouseTechWarehouseId) {
        whereConditions.push(
          eq(warehouseTickets.warehouseId, warehouseTechWarehouseId),
        );
      }
    }

    if (queue === "returns") {
      whereConditions.push(
        sql`(
          ${warehouseTickets.status} = 'return_pending'
          OR EXISTS (
            SELECT 1 FROM ${warehouseTicketItems} AS return_items
            WHERE return_items.ticket_id = ${warehouseTickets.id}
              AND return_items.pending_return_quantity > 0
          )
        )`,
      );
      if (warehouseTechWarehouseId) {
        whereConditions.push(
          eq(warehouseTickets.warehouseId, warehouseTechWarehouseId),
        );
      }
    }

    if (queue === "borrowed") {
      whereConditions.push(
        inArray(warehouseTickets.status, [...WAREHOUSE_TICKET_BORROWED_STATUSES]),
      );
      whereConditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${warehouseTicketItems} AS borrow_items
          WHERE borrow_items.ticket_id = ${warehouseTickets.id}
            AND borrow_items.transferred_quantity > borrow_items.returned_quantity
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

  async lockTicketItem(tx: TX, itemId: number, ticketId: number) {
    const [item] = await tx
      .select()
      .from(warehouseTicketItems)
      .where(
        and(
          eq(warehouseTicketItems.id, itemId),
          eq(warehouseTicketItems.ticketId, ticketId),
        ),
      )
      .for("update");

    return item;
  }

  async hasReturnIdempotencyKey(
    tx: TX,
    ticketId: number,
    idempotencyKey: string,
    actions: string[] = ["item_returned", "return_initiated", "return_confirmed"],
  ) {
    const marker = `[idempotency:${idempotencyKey}]`;
    const [event] = await tx
      .select({ id: warehouseTicketEvents.id })
      .from(warehouseTicketEvents)
      .where(
        and(
          eq(warehouseTicketEvents.ticketId, ticketId),
          inArray(warehouseTicketEvents.action, actions),
          sql`${warehouseTicketEvents.comment} LIKE ${`%${marker}%`}`,
        ),
      )
      .limit(1);

    return Boolean(event);
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
      preparedAt: string | null;
      preparedById: number | null;
      releasedAt: string | null;
      closedAt: string | null;
      borrowDueAt: string | null;
      lastReturnReminderAt: string | null;
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

  async updateItemPrepared(
    tx: TX,
    itemId: number,
    ticketId: number,
    data: {
      preparedQuantity: number;
      shortageReason?: string | null;
    },
  ) {
    const [item] = await tx
      .update(warehouseTicketItems)
      .set({
        preparedQuantity: data.preparedQuantity,
        shortageReason: data.shortageReason ?? null,
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

  async updateItemReceived(
    tx: TX,
    itemId: number,
    ticketId: number,
    receivedQuantity: number,
  ) {
    const [item] = await tx
      .update(warehouseTicketItems)
      .set({
        transferredQuantity: receivedQuantity,
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

  async incrementItemPendingReturn(
    tx: TX,
    itemId: number,
    ticketId: number,
    increment: number,
  ) {
    const [item] = await tx
      .update(warehouseTicketItems)
      .set({
        pendingReturnQuantity: sql`${warehouseTicketItems.pendingReturnQuantity} + ${increment}`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(warehouseTicketItems.id, itemId),
          eq(warehouseTicketItems.ticketId, ticketId),
          sql`${warehouseTicketItems.pendingReturnQuantity} + ${increment} <= ${warehouseTicketItems.transferredQuantity} - ${warehouseTicketItems.returnedQuantity}`,
        ),
      )
      .returning();

    return item;
  }

  async confirmItemPendingReturn(
    tx: TX,
    itemId: number,
    ticketId: number,
    confirmedQuantity: number,
  ) {
    const [item] = await tx
      .update(warehouseTicketItems)
      .set({
        pendingReturnQuantity: sql`${warehouseTicketItems.pendingReturnQuantity} - ${confirmedQuantity}`,
        returnedQuantity: sql`${warehouseTicketItems.returnedQuantity} + ${confirmedQuantity}`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(warehouseTicketItems.id, itemId),
          eq(warehouseTicketItems.ticketId, ticketId),
          sql`${warehouseTicketItems.pendingReturnQuantity} >= ${confirmedQuantity}`,
          sql`${warehouseTicketItems.returnedQuantity} + ${confirmedQuantity} <= ${warehouseTicketItems.transferredQuantity}`,
        ),
      )
      .returning();

    return item;
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

  async incrementItemReturn(
    tx: TX,
    itemId: number,
    ticketId: number,
    increment: number,
  ) {
    const [item] = await tx
      .update(warehouseTicketItems)
      .set({
        returnedQuantity: sql`${warehouseTicketItems.returnedQuantity} + ${increment}`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(warehouseTicketItems.id, itemId),
          eq(warehouseTicketItems.ticketId, ticketId),
          sql`${warehouseTicketItems.returnedQuantity} + ${increment} <= ${warehouseTicketItems.transferredQuantity}`,
        ),
      )
      .returning();

    return item;
  }

  async listOverdueBorrowTickets() {
    const now = new Date().toISOString();
    const borrowStatuses = [...WAREHOUSE_TICKET_BORROWED_STATUSES];

    return db.query.warehouseTickets.findMany({
      where: and(
        inArray(warehouseTickets.status, borrowStatuses),
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

  async markReturnReminderSent(ticketId: number) {
    const now = new Date().toISOString();
    await db
      .update(warehouseTickets)
      .set({
        lastReturnReminderAt: now,
        updatedAt: now,
      })
      .where(eq(warehouseTickets.id, ticketId));
  }

  async getNextTicketSequence() {
    const [{ value }] = await db
      .select({ value: count() })
      .from(warehouseTickets);

    return value + 1;
  }
}
