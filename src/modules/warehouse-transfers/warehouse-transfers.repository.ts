import type { NewWarehouseTransfers } from "@/db/models/warehouse-transfers";
import type { CommonQueryParams } from "@/lib/openapi/schemas/query-params-schema";

import type { TX } from "@/lib/types";
import { and, count, eq, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { TransferStatusIds } from "@/constants/transfer-statuses.constants";
import db from "@/db";
import {
  bins,
  bundles,
  customers,
  entries,
  entryTypes,
  items,
  packages,
  series,
  storage,
  transferStatuses,
  users,
  warehouses,
  warehouseTransfers,
} from "@/db/models";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

const creator = alias(users, "creator");
const updater = alias(users, "updater");
const customerUser = alias(users, "customerUser");
const sw = alias(warehouses, "sourceWarehouse");
const dw = alias(warehouses, "destinationWarehouse");

/**
 * Repository for warehouse transfer-related database operations
 */
export class WarehouseTransfersRepository {
  /**
   * List warehouse transfers with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of warehouse transfers and total count
   */
  async list(params: CommonQueryParams) {
    const { search, filters, page, limit, sortBy, sortOrder } = params;

    // Define searchable fields for global search
    const searchableFields = ["notes", "transferCode"];

    // Prepare where conditions
    const filterCondition = createFilterConditions(warehouseTransfers, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      warehouseTransfers,
      search,
    );

    // Combine conditions
    const whereConditions = [];
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get pagination params
    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    // Create sort condition
    const sortCondition = createSortCondition(
      warehouseTransfers,
      sortBy,
      sortOrder,
    );

    const defaultSortSQL = (sortOrder ?? "desc") === "asc"
      ? sql`${warehouseTransfers.createdAt} asc`
      : sql`${warehouseTransfers.createdAt} desc`;
    const getProductCode = sql<string[]>`(
      SELECT COALESCE(
        json_agg(
          sw_hist.name || ' > ' || dw_hist.name
          ORDER BY wt_history."created_at" ASC
        ), '[]'::json
        
      )
      FROM ${warehouseTransfers} wt_history
      JOIN ${warehouses} sw_hist ON sw_hist.id = wt_history."source_warehouse_id"
      JOIN ${warehouses} dw_hist ON dw_hist.id = wt_history."destination_warehouse_id"
      WHERE wt_history."entry_id" = ${warehouseTransfers.entryId}
    )`.as("history");

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(warehouseTransfers)
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting

      const transfersData = await tx
        .select({
          id: warehouseTransfers.id,
          transferCode: warehouseTransfers.transferCode,
          transferDate: warehouseTransfers.transferDate,

          // Optimized productCode query
          productCode: sql<string>`(
      SELECT COALESCE(
        (SELECT "bundle_code" FROM ${bundles} WHERE "entry_id" = ${entries.id} LIMIT 1),
        (SELECT "series_code" FROM ${series} WHERE "entry_id" = ${entries.id} LIMIT 1),
        (SELECT "item_code" FROM ${items} WHERE "entry_id" = ${entries.id} LIMIT 1),
        (SELECT "package_code" FROM ${packages} WHERE "entry_id" = ${entries.id} LIMIT 1)
      )
    )`.as("productCode"),

          productType: entryTypes.name,
          createdByEmail: creator.email,
          updatedByEmail: updater.email,
          // Fixed: Use proper aliases for source warehouse
          sourceWarehouseId: sw.id,
          sourceWarehouseName: sw.name,
          // Fixed: Use proper aliases for destination warehouse
          destinationWarehouseId: dw.id,
          destinationWarehouseName: dw.name,
          // Fixed: History query that generates ["W1>W2", "W2>W1"] format
          history: getProductCode,

          customerCode: customers.customerCode,
          customerName: customerUser.fullName,
          status: transferStatuses.name,
          createdAt: warehouseTransfers.createdAt,
          updatedAt: warehouseTransfers.updatedAt,
          transferCodes: warehouseTransfers.transferCode,
        })
        .from(warehouseTransfers)
        .leftJoin(entries, eq(entries.id, warehouseTransfers.entryId))
        .innerJoin(entryTypes, eq(entryTypes.id, entries.entryTypeId))
        .innerJoin(creator, eq(creator.id, warehouseTransfers.createdBy))
        .leftJoin(updater, eq(updater.id, warehouseTransfers.updatedBy))

        // Fixed: Use source warehouse alias
        .innerJoin(sw, eq(sw.id, warehouseTransfers.sourceWarehouseId))

        // Fixed: Use destination warehouse alias
        .innerJoin(dw, eq(dw.id, warehouseTransfers.destinationWarehouseId))

        .leftJoin(customers, eq(customers.id, entries.customerId))
        .leftJoin(customerUser, eq(customerUser.id, customers.userId))
        .innerJoin(
          transferStatuses,
          eq(transferStatuses.id, warehouseTransfers.statusId),
        )
        .where(whereClause || sql`TRUE`)
        .orderBy(sortCondition ?? defaultSortSQL)
        .limit(limitVal)
        .offset(offset);

      const formattedData = transfersData.map((transfer) => ({
        ...transfer,
        sourceWarehouse: {
          id: transfer.sourceWarehouseId,
          name: transfer.sourceWarehouseName,
        },
        destinationWarehouse: {
          id: transfer.destinationWarehouseId,
          name: transfer.destinationWarehouseName,
        },
        createdByEmail: transfer.createdByEmail || "N/A",
        updatedByEmail: transfer.updatedByEmail || "N/A",
      }));

      return { data: formattedData, total: totalCount, searchableFields };
    });
  }

  async createWarehouseTransferRows(tx: TX, data: NewWarehouseTransfers[]) {
    return await tx.insert(warehouseTransfers).values(data).returning();
  }

  async markWarehouseTransfersAsReversed(
    tx: TX,
    ids: number[],
    updatedBy: number,
    reversedBy: number,
  ) {
    const result = await tx
      .update(warehouseTransfers)
      .set({
        statusId: TransferStatusIds.UNDONE,
        updatedBy,
        reversedBy,
      })
      .where(inArray(warehouseTransfers.id, ids))
      .returning({ updatedId: warehouseTransfers.id });

    return result;
  }

  async getWarehouseTransfersByIds(ids: number[]) {
    return await db
      .select()
      .from(warehouseTransfers)
      .where(inArray(warehouseTransfers.id, ids));
  }

  async getWarehouseTransfersByEntryIdsWhichAreSent(entryIds: number[]) {
    return await db
      .select()
      .from(warehouseTransfers)
      .where(
        and(
          inArray(warehouseTransfers.entryId, entryIds),
          eq(warehouseTransfers.statusId, TransferStatusIds.SENT),
        ),
      );
  }

  async getWarehouseTransfersWhichAreSent() {
    return await db
      .select()
      .from(warehouseTransfers)
      .where(and(eq(warehouseTransfers.statusId, TransferStatusIds.SENT)));
  }

  /**
   * List warehouse transfers with pagination, filtering, and sorting
   *
   * @param warehouseId - Destination warehouse id
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of warehouse transfers and total count
   */
  async getAllTransfersForAWarehouse(warehouseId: number, params: CommonQueryParams) {
    const { search, filters, page, limit, sortBy, sortOrder } = params;

    // Define searchable fields for global search
    const searchableFields = ["transferCode", "productCode", "customerCode", "customerName", "locationCode"];

    // Product code
    const getProductCodeSql = sql<string>`(
        SELECT COALESCE(
          (SELECT "bundle_code" FROM ${bundles} WHERE "entry_id" = ${entries.id} LIMIT 1),
          (SELECT "series_code" FROM ${series} WHERE "entry_id" = ${entries.id} LIMIT 1),
          (SELECT "item_code" FROM ${items} WHERE "entry_id" = ${entries.id} LIMIT 1),
          (SELECT "package_code" FROM ${packages} WHERE "entry_id" = ${entries.id} LIMIT 1)
        )
      )`;

    // Prepare where conditions
    const filterCondition = createFilterConditions(warehouseTransfers, filters);
    // const searchCondition = createSearchCondition(
    //   searchableFields,
    //   warehouseTransfers,
    //   search,
    // );
    // Custom search condition for product_code and customer_code
    const searchPattern = `%${search}%`;
    const searchCondition = search
      ? or(
          sql`${getProductCodeSql} ILIKE ${searchPattern}`,
          sql`${warehouseTransfers.transferCode} ILIKE ${searchPattern}`,
          sql`${customers.customerCode} ILIKE ${searchPattern}`,
          sql`${customerUser.fullName} ILIKE ${searchPattern}`,
          sql`${bins.locationCode} ILIKE ${searchPattern}`,
        )
      : undefined;

    // Combine conditions
    const whereConditions = [];

    const warehouseCondition = sql`(${warehouseTransfers.destinationWarehouseId} = ${warehouseId} )`;
    whereConditions.push(warehouseCondition);

    if (filterCondition) {
      whereConditions.push(filterCondition);
    }
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get pagination params
    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    // Create sort condition
    const sortCondition = createSortCondition(
      warehouseTransfers,
      sortBy,
      sortOrder,
    );

    const getHistorySQL = sql<string[]>`(
      SELECT COALESCE(
        json_agg(
          sw_hist.name || ' > ' || dw_hist.name
          ORDER BY wt_history."created_at" ASC
        ), '[]'::json

      )
      FROM ${warehouseTransfers} wt_history
      JOIN ${warehouses} sw_hist ON sw_hist.id = wt_history."source_warehouse_id"
      JOIN ${warehouses} dw_hist ON dw_hist.id = wt_history."destination_warehouse_id"
      WHERE wt_history."entry_id" = ${warehouseTransfers.entryId}
    )`.as("history");

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(warehouseTransfers)
        .leftJoin(entries, eq(warehouseTransfers.entryId, entries.id))
        .leftJoin(customers, eq(customers.id, entries.customerId))
        .leftJoin(customerUser, eq(customerUser.id, customers.userId))
        .leftJoin(bins, eq(bins.id, warehouseTransfers.binId))
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting

      const transfersData = await tx
        .select({
          id: warehouseTransfers.id,
          transferCode: warehouseTransfers.transferCode,
          transferDate: warehouseTransfers.transferDate,

          // Optimized productCode query
          productCode: getProductCodeSql.as("productCode"),

          productType: entryTypes.name,
          createdByEmail: creator.email,
          updatedByEmail: updater.email,
          // Fixed: Use proper aliases for source warehouse
          sourceWarehouseId: sw.id,
          sourceWarehouseName: sw.name,
          // Fixed: Use proper aliases for destination warehouse
          destinationWarehouseId: dw.id,
          destinationWarehouseName: dw.name,
          binId: warehouseTransfers.binId, // Include binId in the selection
          locationCode: bins.locationCode,
          // Fixed: History query that generates ["W1>W2", "W2>W1"] format
          history: getHistorySQL,

          customerCode: customers.customerCode,
          customerName: customerUser.fullName,
          statusId: warehouseTransfers.statusId,
          status: transferStatuses.name,
          createdAt: warehouseTransfers.createdAt,
          updatedAt: warehouseTransfers.updatedAt,
        })
        .from(warehouseTransfers)
        .leftJoin(entries, eq(entries.id, warehouseTransfers.entryId))
        .innerJoin(entryTypes, eq(entryTypes.id, entries.entryTypeId))
        .innerJoin(creator, eq(creator.id, warehouseTransfers.createdBy))
        .leftJoin(updater, eq(updater.id, warehouseTransfers.updatedBy))

        // Fixed: Use source warehouse alias
        .innerJoin(sw, eq(sw.id, warehouseTransfers.sourceWarehouseId))

        // Fixed: Use destination warehouse alias
        .innerJoin(dw, eq(dw.id, warehouseTransfers.destinationWarehouseId))

        .leftJoin(customers, eq(customers.id, entries.customerId))
        .leftJoin(customerUser, eq(customerUser.id, customers.userId))
        .innerJoin(
          transferStatuses,
          eq(transferStatuses.id, warehouseTransfers.statusId),
        )
        .leftJoin(bins, eq(bins.id, warehouseTransfers.binId)) // Join bins to get location code
        .where(whereClause || sql`TRUE`)
        .orderBy(
          sortCondition ??
          ((sortOrder ?? "desc") === "asc"
            ? sql`${warehouseTransfers.createdAt} asc`
            : sql`${warehouseTransfers.createdAt} desc`),
        )
        .limit(limitVal)
        .offset(offset);

      const formattedData = transfersData.map(
        (transfer) => ({
          ...transfer,
          sourceWarehouse: {
            id: transfer.sourceWarehouseId,
            name: transfer.sourceWarehouseName,
          },
          destinationWarehouse: {
            id: transfer.destinationWarehouseId,
            name: transfer.destinationWarehouseName,
          },
          createdByEmail: transfer.createdByEmail || "N/A",
          updatedByEmail: transfer.updatedByEmail || "N/A",
        }),
      );

      return { data: formattedData, total: totalCount, searchableFields };
    });
  }

  async getAllBinLocationsForWarehouse(
    warehouseId: number,
    params: CommonQueryParams,
  ) {
    const { search, filters, page, limit, sortBy, sortOrder } = params;
    const searchableFields = ["locationCode"];

    const filterCondition = createFilterConditions(bins, filters);
    const searchCondition = createSearchCondition(searchableFields, bins, search);

    const whereConditions = [
      eq(bins.warehouseId, warehouseId),

    ];

    if (filterCondition)
      whereConditions.push(filterCondition);
    if (searchCondition)
      whereConditions.push(searchCondition);

    const finalWhere = and(...whereConditions);

    const { limit: limitVal, offset } = getPaginationValues(page, limit);
    const sortCondition = createSortCondition(bins, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      const [{ value: totalCount }] = await tx
        .select({ value: sql<number>`COUNT(DISTINCT ${bins.id})` })
        .from(bins)
        .leftJoin(storage, eq(storage.binId, bins.id))
        .where(finalWhere);

      const availableBins = await tx
        .selectDistinct({
          id: bins.id,
          shelfId: bins.shelfId,
          rowNumber: bins.rowNumber,
          locationCode: bins.locationCode,
          warehouseId: bins.warehouseId,

          createdAt: bins.createdAt,
          updatedAt: sql<string>`COALESCE(${bins.updatedAt}, ${bins.createdAt})`.as("updatedAt"),
          createdBy: bins.createdBy,
          updatedBy: bins.updatedBy,
        })
        .from(bins)
        .leftJoin(storage, eq(storage.binId, bins.id))
        .where(finalWhere)
        .orderBy(sortCondition ?? sql`${bins.locationCode} asc`)
        .limit(limitVal)
        .offset(offset);

      return { data: availableBins, total: totalCount, searchableFields };
    });
  }

  async getTransfersByIdsAndWarehouse(transferIds: number, warehouseId: number) {
    const result = await this.getAllTransfersForAWarehouse(warehouseId, {
      page: 1,
      limit: 1000,
      filters: {
        id: transferIds,
      },
    });
    return result.data;
  }

  /**
   * Fetch bins by ids for a specific warehouse (used for validation)
   */
  async getBinsByIdsAndWarehouse(binIds: number[], warehouseId: number) {
    return await db
      .select()
      .from(bins)
      .where(and(inArray(bins.id, binIds), eq(bins.warehouseId, warehouseId)));
  }

  async updateTransferBin(transferId: number, binId: number, userId: number) {
    return await db.transaction(async (tx) => {
      const [transfer] = await tx
        .select({
          id: warehouseTransfers.id,
          entryId: warehouseTransfers.entryId,
          currentBinId: warehouseTransfers.binId,
          statusId: warehouseTransfers.statusId,
          quantity: entries.quantity,
        })
        .from(warehouseTransfers)
        .innerJoin(entries, eq(entries.id, warehouseTransfers.entryId))
        .where(eq(warehouseTransfers.id, transferId))
        .limit(1);

      if (!transfer) {
        return undefined;
      }

      const timestamp = new Date().toISOString();

      if (transfer.currentBinId && transfer.currentBinId !== binId) {
        await tx.insert(storage).values({
          binId: transfer.currentBinId,
          entryId: transfer.entryId,
          quantity: transfer.quantity,
          action: false,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: userId,
          updatedBy: userId,
        });
      }

      if (
        transfer.currentBinId !== binId
        || transfer.statusId !== TransferStatusIds.BIN_LOCATION_ASSIGNED
      ) {
        await tx.insert(storage).values({
          binId,
          entryId: transfer.entryId,
          quantity: transfer.quantity,
          action: true,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: userId,
          updatedBy: userId,
        });
      }

      const [updatedTransfer] = await tx
        .update(warehouseTransfers)
        .set({
          binId,
          statusId: TransferStatusIds.BIN_LOCATION_ASSIGNED,
          updatedBy: userId,
          updatedAt: timestamp,
        })
        .where(eq(warehouseTransfers.id, transferId))
        .returning();

      const [selectedBin] = await tx
        .select({
          locationCode: bins.locationCode,
        })
        .from(bins)
        .where(eq(bins.id, binId))
        .limit(1);

      return {
        ...updatedTransfer,
        locationCode: selectedBin?.locationCode ?? null,
      };
    });
  }

  async assignEntryToBin(entryId: number, binId: number, userId: number) {
    return await db.transaction(async (tx) => {
      const [entry] = await tx
        .select({
          id: entries.id,
          quantity: entries.quantity,
        })
        .from(entries)
        .where(eq(entries.id, entryId))
        .limit(1);

      const [bin] = await tx
        .select({
          id: bins.id,
          locationCode: bins.locationCode,
        })
        .from(bins)
        .where(eq(bins.id, binId))
        .limit(1);

      if (!entry || !bin) {
        return undefined;
      }

      const timestamp = new Date().toISOString();
      const quantity = Number(entry.quantity) || 1;
      const [existingStorage] = await tx
        .select({ id: storage.id })
        .from(storage)
        .where(and(eq(storage.entryId, entryId), eq(storage.action, true)))
        .orderBy(sql`${storage.createdAt} desc`)
        .limit(1);

      if (existingStorage) {
        await tx
          .update(storage)
          .set({
            binId,
            quantity,
            updatedAt: timestamp,
            updatedBy: userId,
          })
          .where(eq(storage.id, existingStorage.id));
      } else {
        await tx.insert(storage).values({
          binId,
          entryId,
          quantity,
          action: true,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: userId,
          updatedBy: userId,
        });
      }

      return {
        entryId,
        binId,
        locationCode: bin.locationCode,
        quantity,
        updatedAt: timestamp,
      };
    });
  }

  async unassignEntryFromBin(entryId: number, userId: number) {
    return await db.transaction(async (tx) => {
      const [existingStorage] = await tx
        .select({
          id: storage.id,
          binId: storage.binId,
          locationCode: bins.locationCode,
        })
        .from(storage)
        .innerJoin(bins, eq(bins.id, storage.binId))
        .where(and(eq(storage.entryId, entryId), eq(storage.action, true)))
        .orderBy(sql`${storage.createdAt} desc`)
        .limit(1);

      if (!existingStorage) {
        return undefined;
      }

      await tx
        .delete(storage)
        .where(eq(storage.id, existingStorage.id));

      return {
        entryId,
        binId: existingStorage.binId,
        locationCode: existingStorage.locationCode,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      };
    });
  }

  async getRayonsStatsForAWarehouse(warehouseId: number) {
    return await db.query.rayons.findMany({
      where: (rayons, { eq }) =>
        eq(rayons.warehouseId, warehouseId),
      with: {
        shelves: {
          with: {
            bins: {
              with: {
                storageItems: true,
              },
            },
          },
        },
      },
    });
  }

  async getMovementsForWarehouse(
    warehouseId: number,
    params: CommonQueryParams,
  ) {
    const { search, filters, page, limit, sortBy, sortOrder } = params;

    // We search on the entry description (used as movement notes)
    const searchableFields = ["description"];

    const filterCondition = createFilterConditions(entries, {
      ...filters,
      warehouseId,
    });

    const searchCondition = createSearchCondition(
      searchableFields,
      entries,
      search,
    );

    const whereClause = and(
      eq(entries.warehouseId, warehouseId),
      filterCondition,
      searchCondition,
    );

    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    const sortCondition = createSortCondition(entries, sortBy, sortOrder);

    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(entries)
      .where(whereClause);

    const data = await db
      .select({
        id: entries.id,
        date: entries.createdAt,
        // All entries represent items entering the warehouse (quantity is always >= 1)
        type: sql<"ENTRANCE" | "EXIT">`'ENTRANCE'`,
        // Resolve product code from related bundle/series/item/package
        productCode: sql<string>`(
          SELECT COALESCE(
            (SELECT "bundle_code" FROM ${bundles} WHERE "entry_id" = ${entries.id} LIMIT 1),
            (SELECT "series_code" FROM ${series} WHERE "entry_id" = ${entries.id} LIMIT 1),
            (SELECT "item_code" FROM ${items} WHERE "entry_id" = ${entries.id} LIMIT 1),
            (SELECT "package_code" FROM ${packages} WHERE "entry_id" = ${entries.id} LIMIT 1),
            'N/A'
          )
        )`.as("productCode"),
        productType: entryTypes.name,
        quantity: entries.quantity,
        // Use description as movement notes
        notes: entries.description,
        operatorName: sql<string>`COALESCE(${users.fullName}, 'N/A')`.as("operatorName"),
      })
      .from(entries)
      .leftJoin(users, eq(users.id, entries.createdBy))
      .innerJoin(entryTypes, eq(entryTypes.id, entries.entryTypeId))
      .where(whereClause)
      .orderBy(sortCondition ?? sql`${entries.createdAt} desc`)
      .limit(limitVal)
      .offset(offset);

    return { data, total: totalCount, searchableFields };
  }

  async getMovementStats(warehouseId: number) {
    // Get stats from storage table based on action field: TRUE = PLACE (entrance), FALSE = PICK (exit)
    const [totals] = await db
      .select({
        totalEntrances: sql<number>`SUM(CASE WHEN ${storage.action} = TRUE THEN 1 ELSE 0 END)`,
        totalExits: sql<number>`SUM(CASE WHEN ${storage.action} = FALSE THEN 1 ELSE 0 END)`,
        totalMovements: count(),
      })
      .from(storage)
      .innerJoin(bins, eq(storage.binId, bins.id))
      .where(eq(bins.warehouseId, warehouseId));

    return {
      totalEntrances: totals.totalEntrances || 0,
      totalExits: totals.totalExits || 0,
      totalMovements: totals.totalMovements || 0,
    };
  }

  /**
   * Fetches movement history across all bins in a warehouse, showing what was entered or removed.
   */
  async getStockView(
    warehouseId: number,
    params: CommonQueryParams,
  ) {
    const { search, filters = {}, page, limit, sortBy, sortOrder } = params;
    const { binId, locationCode, customerId, packageId, ...restFilters } =
      filters as {
      binId?: number;
      locationCode?: string;
      customerId?: number;
      packageId?: number;
    } & Record<string, unknown>;
    const { limit: limitVal, offset } = getPaginationValues(page, limit);
    const searchableFields = [
      "locationCode",
      "productCode",
      "customerCode",
      "customerName",
      "customerId",
      "packageId",
    ];
    const getProductCodeSql = sql<string>`(
      SELECT COALESCE(
        (SELECT "bundle_code" FROM ${bundles} WHERE "entry_id" = ${entries.id} LIMIT 1),
        (SELECT "series_code" FROM ${series} WHERE "entry_id" = ${entries.id} LIMIT 1),
        (SELECT "item_code" FROM ${items} WHERE "entry_id" = ${entries.id} LIMIT 1),
        (SELECT "package_code" FROM ${packages} WHERE "entry_id" = ${entries.id} LIMIT 1),
        'N/A'
      )
    )`;

    const filterCondition = createFilterConditions(storage, restFilters);
    const searchPattern = `%${search}%`;
    const searchCondition = search
      ? or(
          sql`${bins.locationCode} ILIKE ${searchPattern}`,
          sql`${getProductCodeSql} ILIKE ${searchPattern}`,
          sql`${customers.customerCode} ILIKE ${searchPattern}`,
          sql`${customerUser.fullName} ILIKE ${searchPattern}`,
          sql`CAST(${entries.customerId} AS TEXT) ILIKE ${searchPattern}`,
          sql`CAST(${packages.id} AS TEXT) ILIKE ${searchPattern}`,
        )
      : undefined;

    const whereConditions = [eq(bins.warehouseId, warehouseId)];
      if (binId !== undefined && binId !== null) {
        whereConditions.push(eq(storage.binId, Number(binId)));
      }
      if (locationCode !== undefined && locationCode !== null) {
        whereConditions.push(eq(bins.locationCode, String(locationCode)));
      }
      if (customerId !== undefined && customerId !== null) {
        whereConditions.push(eq(entries.customerId, Number(customerId)));
      }
      if (packageId !== undefined && packageId !== null) {
        whereConditions.push(eq(packages.id, Number(packageId)));
      }
      if (filterCondition) {
        whereConditions.push(filterCondition);
      }
      if (searchCondition) {
        whereConditions.push(searchCondition);
    }

    const whereClause = and(...whereConditions);

    const data = await db
        .select({
          id: storage.id,
          binId: storage.binId,
          locationCode: bins.locationCode,
          entryId: storage.entryId,
          quantity: storage.quantity,
          action: sql<"PLACE" | "PICK">`CASE WHEN ${storage.action} = TRUE THEN 'PLACE' ELSE 'PICK' END`,
          packageId: packages.id,
          customerId: entries.customerId,
          customerCode: customers.customerCode,
          customerName: customerUser.fullName,
          productCode: getProductCodeSql.as("productCode"),
          productType: entryTypes.name,
          productDescription: entries.description,
          warehouseName: warehouses.name,
          createdAt: storage.createdAt,
          operatorName: sql<string>`COALESCE(${users.fullName}, 'N/A')`,
      })
      .from(storage)
        .innerJoin(bins, eq(storage.binId, bins.id))
        .innerJoin(entries, eq(entries.id, storage.entryId))
        .leftJoin(packages, eq(packages.entryId, entries.id))
        .leftJoin(customers, eq(customers.id, entries.customerId))
        .leftJoin(customerUser, eq(customerUser.id, customers.userId))
        .innerJoin(warehouses, eq(warehouses.id, bins.warehouseId))
        .innerJoin(entryTypes, eq(entryTypes.id, entries.entryTypeId))
        .leftJoin(users, eq(users.id, storage.createdBy))
        .where(whereClause)
        .orderBy(createSortCondition(storage, sortBy, sortOrder) ?? sql`${storage.createdAt} desc`)
      .limit(limitVal)
      .offset(offset);

    const [totals] = await db
      .select({
        totalEntrances: sql<number>`
      SUM(CASE WHEN ${storage.action} = TRUE THEN 1 ELSE 0 END)
    `,
        totalExits: sql<number>`
      SUM(CASE WHEN ${storage.action} = FALSE THEN 1 ELSE 0 END)
    `,
        })
        .from(storage)
        .innerJoin(bins, eq(storage.binId, bins.id))
        .innerJoin(entries, eq(entries.id, storage.entryId))
        .leftJoin(packages, eq(packages.entryId, entries.id))
        .leftJoin(customers, eq(customers.id, entries.customerId))
        .leftJoin(customerUser, eq(customerUser.id, customers.userId))
        .where(whereClause);

      // Get total count of all matching records for pagination
      const [totalCount] = await db
        .select({
        count: count(),
      })
        .from(storage)
        .innerJoin(bins, eq(storage.binId, bins.id))
        .innerJoin(entries, eq(entries.id, storage.entryId))
        .leftJoin(packages, eq(packages.entryId, entries.id))
        .leftJoin(customers, eq(customers.id, entries.customerId))
        .leftJoin(customerUser, eq(customerUser.id, customers.userId))
        .innerJoin(warehouses, eq(warehouses.id, bins.warehouseId))
        .innerJoin(entryTypes, eq(entryTypes.id, entries.entryTypeId))
        .leftJoin(users, eq(users.id, storage.createdBy))
        .where(whereClause);

    // Get overall stock statistics (not paginated)
    const MODERATE_STOCK_THRESHOLD = 8;

    const allStockData = await db
        .select({
          quantity: storage.quantity,
        })
        .from(storage)
        .innerJoin(bins, eq(storage.binId, bins.id))
        .innerJoin(entries, eq(entries.id, storage.entryId))
        .leftJoin(packages, eq(packages.entryId, entries.id))
        .leftJoin(customers, eq(customers.id, entries.customerId))
        .leftJoin(customerUser, eq(customerUser.id, customers.userId))
        .where(whereClause);

    const overallStats = allStockData.reduce((acc, item) => {
      const quantity = item.quantity ?? 0;
      acc.totalProducts++;
      if (quantity < MODERATE_STOCK_THRESHOLD) {
        acc.lowStock++;
      }
      return acc;
    }, { totalProducts: 0, lowStock: 0 });

    const overallSufficientStock = overallStats.totalProducts - overallStats.lowStock;

      return {
        data,
        searchableFields,
        total: Number(totalCount.count) || 0,
        overallTotalProducts: overallStats.totalProducts,
        overallSufficientStock,
        overallLowStock: overallStats.lowStock,
        ...totals,
    };
  }

  async getAllBinsMovementHistory(
    warehouseId: number,
    params: CommonQueryParams,
  ) {
    const { search, filters = {}, page, limit, sortBy, sortOrder } = params;
    const { binId, ...restFilters } = filters as { binId?: number | string } &
      Record<string, unknown>;
    const { limit: limitVal, offset } = getPaginationValues(page, limit);
    const searchableFields = ["locationCode"];
    const filterCondition = createFilterConditions(storage, restFilters);
    const searchCondition = createSearchCondition(searchableFields, bins, search);

    const whereConditions = [eq(bins.warehouseId, warehouseId)];
    if (binId !== undefined && binId !== null) {
      whereConditions.push(eq(storage.binId, Number(binId)));
    }
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause = and(...whereConditions);

    const data = await db
      .select({
        id: storage.id,
        binId: storage.binId,
        locationCode: bins.locationCode,
        entryId: storage.entryId,
        quantity: storage.quantity,
        action: sql<"PLACE" | "PICK">`CASE WHEN ${storage.action} = TRUE THEN 'PLACE' ELSE 'PICK' END`,

        productCode: sql<string>`(
      SELECT COALESCE(
        (SELECT "bundle_code" FROM ${bundles} WHERE "entry_id" = ${entries.id} LIMIT 1),
        (SELECT "series_code" FROM ${series} WHERE "entry_id" = ${entries.id} LIMIT 1),
        (SELECT "item_code" FROM ${items} WHERE "entry_id" = ${entries.id} LIMIT 1),
        (SELECT "package_code" FROM ${packages} WHERE "entry_id" = ${entries.id} LIMIT 1), 'N/A'
      )
    )`.as("productCode"),
        productType: entryTypes.name,
        productDescription: entries.description,
        warehouseName: warehouses.name,
        createdAt: storage.createdAt,
        operatorName: sql<string>`COALESCE(${users.fullName}, 'N/A')`,
      })
      .from(storage)
      .innerJoin(bins, eq(storage.binId, bins.id))
      .innerJoin(entries, eq(entries.id, storage.entryId))
      .innerJoin(warehouses, eq(warehouses.id, bins.warehouseId))
      .innerJoin(entryTypes, eq(entryTypes.id, entries.entryTypeId))
      .leftJoin(users, eq(users.id, storage.createdBy))
      .where(whereClause)
      .orderBy(createSortCondition(storage, sortBy, sortOrder) ?? sql`${storage.createdAt} desc`)
      .limit(limitVal)
      .offset(offset);

    const [totals] = await db
      .select({
        totalMovements: count(),
        totalEntrances: sql<number>`
      SUM(CASE WHEN ${storage.action} = TRUE THEN 1 ELSE 0 END)
    `,
        totalExits: sql<number>`
      SUM(CASE WHEN ${storage.action} = FALSE THEN 1 ELSE 0 END)
    `,
      })
      .from(storage)
      .innerJoin(bins, eq(storage.binId, bins.id))
      .innerJoin(entries, eq(entries.id, storage.entryId))
      .where(whereClause);

    return {
      data,
      searchableFields,
      totalEntrances: Number(totals.totalEntrances) || 0,
      totalExits: Number(totals.totalExits) || 0,

    };
  }
}
