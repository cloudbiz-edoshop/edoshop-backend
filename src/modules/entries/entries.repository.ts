import type {
  UpdateEntriesDBRequest,
  UpdateEntriesRequest,
} from "./entries.schema";

import type { NewEntry } from "@/db/models/entries";
import type { CommonQueryParams } from "@/lib/openapi/schemas/query-params-schema";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { EntryTypeIds } from "@/constants";
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
  users,
  warehouseTransfers,
} from "@/db/models";

import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

const customerUser = alias(users, "customerUser");

const getCustomerCodeSql = sql<string>`COALESCE(
  ${customers.customerCode},
  (
    SELECT c.customer_code
    FROM ${series} current_series
    JOIN ${items} child_item ON child_item.series_id = current_series.id
    JOIN ${entries} child_entry ON child_entry.id = child_item.entry_id
    JOIN ${customers} c ON c.id = child_entry.customer_id
    WHERE current_series.entry_id = ${entries.id}
    LIMIT 1
  ),
  (
    SELECT c.customer_code
    FROM ${bundles} current_bundle
    JOIN ${series} child_series ON child_series.bundle_id = current_bundle.id
    JOIN ${entries} child_entry ON child_entry.id = child_series.entry_id
    JOIN ${customers} c ON c.id = child_entry.customer_id
    WHERE current_bundle.entry_id = ${entries.id}
    LIMIT 1
  ),
  (
    SELECT c.customer_code
    FROM ${bundles} current_bundle
    JOIN ${series} child_series ON child_series.bundle_id = current_bundle.id
    JOIN ${items} child_item ON child_item.series_id = child_series.id
    JOIN ${entries} child_entry ON child_entry.id = child_item.entry_id
    JOIN ${customers} c ON c.id = child_entry.customer_id
    WHERE current_bundle.entry_id = ${entries.id}
    LIMIT 1
  ),
  (
    SELECT c.customer_code
    FROM ${items} current_item
    JOIN ${series} parent_series ON parent_series.id = current_item.series_id
    JOIN ${entries} parent_entry ON parent_entry.id = parent_series.entry_id
    JOIN ${customers} c ON c.id = parent_entry.customer_id
    WHERE current_item.entry_id = ${entries.id}
    LIMIT 1
  ),
  (
    SELECT c.customer_code
    FROM ${items} current_item
    JOIN ${series} parent_series ON parent_series.id = current_item.series_id
    JOIN ${bundles} parent_bundle ON parent_bundle.id = parent_series.bundle_id
    JOIN ${entries} parent_entry ON parent_entry.id = parent_bundle.entry_id
    JOIN ${customers} c ON c.id = parent_entry.customer_id
    WHERE current_item.entry_id = ${entries.id}
    LIMIT 1
  ),
  (
    SELECT c.customer_code
    FROM ${series} current_series
    JOIN ${bundles} parent_bundle ON parent_bundle.id = current_series.bundle_id
    JOIN ${entries} parent_entry ON parent_entry.id = parent_bundle.entry_id
    JOIN ${customers} c ON c.id = parent_entry.customer_id
    WHERE current_series.entry_id = ${entries.id}
    LIMIT 1
  )
)`;

const getCustomerNameSql = sql<string>`COALESCE(
  ${customerUser.fullName},
  (
    SELECT u.full_name
    FROM ${series} current_series
    JOIN ${items} child_item ON child_item.series_id = current_series.id
    JOIN ${entries} child_entry ON child_entry.id = child_item.entry_id
    JOIN ${customers} c ON c.id = child_entry.customer_id
    JOIN ${users} u ON u.id = c.user_id
    WHERE current_series.entry_id = ${entries.id}
    LIMIT 1
  ),
  (
    SELECT u.full_name
    FROM ${bundles} current_bundle
    JOIN ${series} child_series ON child_series.bundle_id = current_bundle.id
    JOIN ${entries} child_entry ON child_entry.id = child_series.entry_id
    JOIN ${customers} c ON c.id = child_entry.customer_id
    JOIN ${users} u ON u.id = c.user_id
    WHERE current_bundle.entry_id = ${entries.id}
    LIMIT 1
  ),
  (
    SELECT u.full_name
    FROM ${bundles} current_bundle
    JOIN ${series} child_series ON child_series.bundle_id = current_bundle.id
    JOIN ${items} child_item ON child_item.series_id = child_series.id
    JOIN ${entries} child_entry ON child_entry.id = child_item.entry_id
    JOIN ${customers} c ON c.id = child_entry.customer_id
    JOIN ${users} u ON u.id = c.user_id
    WHERE current_bundle.entry_id = ${entries.id}
    LIMIT 1
  ),
  (
    SELECT u.full_name
    FROM ${items} current_item
    JOIN ${series} parent_series ON parent_series.id = current_item.series_id
    JOIN ${entries} parent_entry ON parent_entry.id = parent_series.entry_id
    JOIN ${customers} c ON c.id = parent_entry.customer_id
    JOIN ${users} u ON u.id = c.user_id
    WHERE current_item.entry_id = ${entries.id}
    LIMIT 1
  ),
  (
    SELECT u.full_name
    FROM ${items} current_item
    JOIN ${series} parent_series ON parent_series.id = current_item.series_id
    JOIN ${bundles} parent_bundle ON parent_bundle.id = parent_series.bundle_id
    JOIN ${entries} parent_entry ON parent_entry.id = parent_bundle.entry_id
    JOIN ${customers} c ON c.id = parent_entry.customer_id
    JOIN ${users} u ON u.id = c.user_id
    WHERE current_item.entry_id = ${entries.id}
    LIMIT 1
  ),
  (
    SELECT u.full_name
    FROM ${series} current_series
    JOIN ${bundles} parent_bundle ON parent_bundle.id = current_series.bundle_id
    JOIN ${entries} parent_entry ON parent_entry.id = parent_bundle.entry_id
    JOIN ${customers} c ON c.id = parent_entry.customer_id
    JOIN ${users} u ON u.id = c.user_id
    WHERE current_series.entry_id = ${entries.id}
    LIMIT 1
  )
)`;

/**
 * Repository for entries-related database operations
 */
export class EntriesRepository {
  /**
   * Get the first entry type
   *
   * @returns The entry type object or undefined if not found
   */
  async getEntryType(name: string) {
    const entryType = await db.query.entryTypes.findFirst({
      where: eq(entryTypes.name, name),
    });
    return entryType;
  }

  /**
   * Get the first entry type of name package
   *
   * @returns The entry type object or undefined if not found
   */
  async getPackageEntryType() {
    const entryType = await db.query.entryTypes.findFirst({
      where: eq(entryTypes.id, EntryTypeIds.PACKAGE),
    });
    return entryType;
  }

  async findById(id: number) {
    return await db.query.entries.findFirst({
      where: and(eq(entries.id, id), eq(entries.isDeleted, false)),
      with: {
        entryType: true,
        entryState: true,
        warehouse: true,
        supplier: true,
        customer: true,
        bundles: true,
        series: {
          with: {
            color: true,
            bundle: true,
          },
        },
        items: {
          with: {
            size: true,
            series: {
              with: {
                color: true,
                bundle: true,
              },
            },
          },
        },
        packages: true,
        entryProducts: {
          with: {
            product: true,
          },
        },
        returnsAsOriginalEntry: true,
        returnsAsReturnEntry: true,
      },
    });
  }

  async list(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;

    const searchableFields = ["title", "description", "entry_type_id"];

    const filterCondition = createFilterConditions(entries, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      entries,
      search,
    );

    const whereConditions = [];
    whereConditions.push(eq(entries.isDeleted, false));
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause = whereConditions.length
      ? and(...whereConditions)
      : undefined;

    const { limit: limitVal, offset } = getPaginationValues(page, limit);
    const sortCondition = createSortCondition(entries, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(entries)
        .where(whereClause ?? sql`TRUE`);

      const result = await tx.query.entries.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(entries.createdAt)],
        with: {
          entryType: true,
          entryState: true,
          warehouse: true,
          supplier: true,
          customer: true,
          bundles: true,
          series: {
            with: {
              color: true,
              bundle: true,
            },
          },
          items: {
            with: {
              size: true,
              series: {
                with: {
                  color: true,
                  bundle: true,
                },
              },
            },
          },
          packages: true,
          entryProducts: {
            with: {
              product: true,
            },
          },
          returnsAsOriginalEntry: true,
          returnsAsReturnEntry: true,
        },
      });

      return { data: result, total: totalCount, searchableFields };
    });
  }

  async create(tx: TX, entryData: NewEntry) {
    const [created] = await tx.insert(entries).values(entryData).returning();
    return created;
  }

  async update(
    tx: TX,
    id: number,
    entryData: UpdateEntriesRequest & { updatedBy: number },
  ) {
    const updatedData: UpdateEntriesDBRequest = {
      ...entryData,
      weight:
        entryData.weight !== undefined
          ? entryData.weight.toFixed(2) // convert number → string
          : undefined,
    };

    const [updated] = await tx
      .update(entries)
      .set(updatedData)
      .where(eq(entries.id, id))
      .returning();

    return updated;
  }

  async markEntriesAsSent(tx: TX, ids: number[], updatedBy: number) {
    const updatedData = {
      isTransferable: false,
      isSent: true,
      updatedBy,
    };

    const result = await tx
      .update(entries)
      .set(updatedData)
      .where(inArray(entries.id, ids))
      .returning();

    return result;
  }

  async markEntriesAsUnsent(tx: TX, ids: number[], updatedBy: number) {
    const updatedData = {
      isTransferable: true,
      isSent: false,
      updatedBy,
    };

    const result = await tx
      .update(entries)
      .set(updatedData)
      .where(inArray(entries.id, ids))
      .returning();

    return result;
  }

  async markEntriesAsReceived(tx: TX, ids: number[], updatedBy: number, warehouseId: number) {
    const updatedData = {
      isTransferable: false, // Received entries should not be transferable for now.
      isSent: false,
      updatedBy,
      warehouseId,
    };

    const result = await tx
      .update(entries)
      .set(updatedData)
      .where(inArray(entries.id, ids))
      .returning();

    return result;
  }

  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(entries)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(entries.id, ids))
      .returning();

    return result.length > 0;
  }

  async getAllBundleIds(): Promise<{ id: number; bundleCode: string }[]> {
    const result = await db
      .select({
        id: bundles.id,
        bundleCode: bundles.bundleCode,
      })
      .from(bundles);
    return result;
  }

  async getAllSeriesIds(): Promise<{ id: number; seriesCode: string }[]> {
    const result = await db
      .select({
        id: series.id,
        seriesCode: series.seriesCode,
      })
      .from(series);
    return result;
  }

  async getAllItemIds(): Promise<{ id: number; itemCode: string }[]> {
    const result = await db
      .select({
        id: items.id,
        itemCode: items.itemCode,
      })
      .from(items);
    return result;
  }

  async getAllPackageIds(): Promise<{ id: number; packageCode: string }[]> {
    const result = await db
      .select({
        id: packages.id,
        packageCode: packages.packageCode,
      })
      .from(packages);
    return result;
  }

  /**
   * List warehouse transfers with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of warehouse transfers and total count
   */

  async getTransferRelatedEntriesList(params: CommonQueryParams) {
    const { search, filters, page, limit, sortBy, sortOrder } = params;

    // Define searchable fields for documentation/metadata
    const searchableFields = ["product_code", "customer_code"];

    // Product code
    const getProductCodeSql = sql<string>`(
    SELECT COALESCE(
      (SELECT "bundle_code" FROM ${bundles} WHERE "entry_id" = ${entries.id} LIMIT 1),
      (SELECT "series_code" FROM ${series} WHERE "entry_id" = ${entries.id} LIMIT 1),
      (SELECT "item_code" FROM ${items} WHERE "entry_id" = ${entries.id} LIMIT 1),
      (SELECT "package_code" FROM ${packages} WHERE "entry_id" = ${entries.id} LIMIT 1)
    )
  )`;

    // Build conditions
    const filterCondition = createFilterConditions(entries, filters);
    const filterForWarehouseTransfers = createFilterConditions(
      warehouseTransfers,
      filters,
    );

    // Custom search condition for product_code and customer_code
    const searchPattern = `%${search}%`;
    const searchCondition = search
      ? or(
          sql`${getProductCodeSql} ILIKE ${searchPattern}`,
          sql`${getCustomerCodeSql} ILIKE ${searchPattern}`,
          sql`${getCustomerNameSql} ILIKE ${searchPattern}`,
        )
      : undefined;

    const whereConditionsForWarehouseTransfers = [];

    if (filterCondition) {
      whereConditionsForWarehouseTransfers.push(filterCondition);
    }

    if (searchCondition) {
      whereConditionsForWarehouseTransfers.push(searchCondition);
    }

    if (filterForWarehouseTransfers) {
      whereConditionsForWarehouseTransfers.push(filterForWarehouseTransfers);
    }
    const whereClauseForWarehouseTransfers =
      whereConditionsForWarehouseTransfers.length > 0
        ? and(...whereConditionsForWarehouseTransfers)
        : undefined;

    // Pagination
    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    // Sorting
    const sortCondition = createSortCondition(entries, sortBy, sortOrder);
    const defaultSortSQL = (sortOrder ?? "desc") === "asc"
      ? sql`${entries.createdAt} asc`
      : sql`${entries.createdAt} desc`;

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: total }] = await tx
        .select({ value: count() })
        .from(entries)
        .leftJoin(customers, eq(customers.id, entries.customerId))
        .where(whereClauseForWarehouseTransfers ?? sql`TRUE`);
      // Fetch data
      const data = await tx
        .select({
          id: entries.id,
          entryTypeId: entries.entryTypeId,
          productCode: getProductCodeSql.as("productCode"),
          customerCode: getCustomerCodeSql.as("customerCode"),
          customerName: getCustomerNameSql.as("customerName"),
          warehouseId: entries.warehouseId, // Maps to warehouse_id in your DB
          isSent: entries.isSent, // Maps to is_sent in your DB
          isTransferable: entries.isTransferable,
          transferCode: warehouseTransfers.transferCode,
          transferId: warehouseTransfers.id,
          transferStatusId: warehouseTransfers.statusId,
          binId: warehouseTransfers.binId,
          locationCode: bins.locationCode,
        })
        .from(entries)
        .leftJoin(
          warehouseTransfers,
          eq(warehouseTransfers.entryId, entries.id),
        )
        .leftJoin(bins, eq(bins.id, warehouseTransfers.binId))
        .leftJoin(customers, eq(customers.id, entries.customerId))
        .leftJoin(customerUser, eq(customerUser.id, customers.userId))
        .where(whereClauseForWarehouseTransfers ?? sql`TRUE`)
        .orderBy(sortCondition ?? defaultSortSQL)
        .limit(limitVal === Infinity ? total : limitVal)
        .offset(offset);

      return {
        data,
        total,
        searchableFields,
      };
    });
  }

  async getReversibleEntriesList(params: CommonQueryParams) {
    const { search, filters, page, limit, sortBy, sortOrder } = params;

    // Define searchable fields for documentation/metadata
    const searchableFields = ["product_code", "customer_code"];

    // Product code resolver (moved up to use in search)
    const getProductCodeSql = sql<string>`(
    SELECT COALESCE(
      (SELECT "bundle_code" FROM ${bundles} WHERE "entry_id" = ${entries.id} LIMIT 1),
      (SELECT "series_code" FROM ${series} WHERE "entry_id" = ${entries.id} LIMIT 1),
      (SELECT "item_code" FROM ${items} WHERE "entry_id" = ${entries.id} LIMIT 1),
      (SELECT "package_code" FROM ${packages} WHERE "entry_id" = ${entries.id} LIMIT 1)
    )
  )`;

    // Build conditions
    const filterCondition = createFilterConditions(entries, filters);
    const filterForWarehouseTransfers = createFilterConditions(
      warehouseTransfers,
      filters,
    );

    // Custom search condition for product_code and customer_code
    const searchPattern = `%${search}%`;
    const searchCondition = search
      ? or(
          sql`${getProductCodeSql} ILIKE ${searchPattern}`,
          sql`${getCustomerCodeSql} ILIKE ${searchPattern}`,
          sql`${getCustomerNameSql} ILIKE ${searchPattern}`,
        )
      : undefined;

    const whereConditionsForWarehouseTransfers = [];

    if (filterCondition) {
      whereConditionsForWarehouseTransfers.push(filterCondition);
    }

    if (searchCondition) {
      whereConditionsForWarehouseTransfers.push(searchCondition);
    }

    if (filterForWarehouseTransfers) {
      whereConditionsForWarehouseTransfers.push(filterForWarehouseTransfers);
    }
    const whereClauseForWarehouseTransfers =
      whereConditionsForWarehouseTransfers.length > 0
        ? and(...whereConditionsForWarehouseTransfers)
        : undefined;

    // Pagination
    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    // Sorting
    const sortCondition = createSortCondition(entries, sortBy, sortOrder);
    const defaultSortSQL = (sortOrder ?? "desc") === "asc"
      ? sql`${entries.createdAt} asc`
      : sql`${entries.createdAt} desc`;

    const result = await db.transaction(async (tx) => {
      // Count total records
      // Count total records (must match the data query conditions)
      const [{ value: total }] = await tx
        .select({ value: count() })
        .from(entries)
        .innerJoin(
          warehouseTransfers,
          eq(warehouseTransfers.entryId, entries.id),
        )
        .leftJoin(customers, eq(customers.id, entries.customerId))
        .where(whereClauseForWarehouseTransfers ?? sql`TRUE`);

      // Fetch data
      const data = await tx
        .select({
          id: entries.id,
          entryTypeId: entries.entryTypeId,
          productCode: getProductCodeSql.as("productCode"),
          customerCode: getCustomerCodeSql.as("customerCode"),
          customerName: getCustomerNameSql.as("customerName"),
          warehouseId: entries.warehouseId,
          isSent: entries.isSent,
          isTransferable: entries.isTransferable,
          transferCode: warehouseTransfers.transferCode,
          transferId: warehouseTransfers.id,
          transferStatusId: warehouseTransfers.statusId,
          binId: warehouseTransfers.binId,
          locationCode: bins.locationCode,
        })
        .from(entries)
        .innerJoin(
          warehouseTransfers,
          eq(warehouseTransfers.entryId, entries.id),
        )
        .leftJoin(bins, eq(bins.id, warehouseTransfers.binId))
        .leftJoin(customers, eq(customers.id, entries.customerId))
        .leftJoin(customerUser, eq(customerUser.id, customers.userId))
        .where(whereClauseForWarehouseTransfers ?? sql`TRUE`)
        .orderBy(sortCondition ?? defaultSortSQL)
        .limit(limitVal === Infinity ? total : limitVal)
        .offset(offset);

      return {
        data,
        total,
        searchableFields,
      };
    });

    return result;
  }
}
