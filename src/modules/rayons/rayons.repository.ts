import type { CommonQueryParams } from "@/lib/openapi/schemas/query-params-schema";
import type { TX } from "@/lib/types";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import db from "@/db";
import { bins, rayons, shelves, storage, warehouseTransfers } from "@/db/models";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

export class RayonsRepository {
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

  async getRayonsForWarehouse(warehouseId: number, params: CommonQueryParams) {
    const { search, filters, page, limit, sortBy, sortOrder } = params;

    // Define searchable fields for global search
    const searchableFields = ["notes", "rayonName"];

    // Prepare where conditions
    const filterCondition = createFilterConditions(rayons, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      rayons,
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
      rayons,
      sortBy,
      sortOrder,
    );

    return await db.transaction(async (tx) => {
      // Count total records matching the warehouse + search/filter conditions
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(rayons)
        .where(and(sql`${rayons.warehouseId} = ${warehouseId}`, whereClause || sql`TRUE`));

      // Fetch paginated data
      const data = await tx.query.rayons.findMany({
        where: (rayons, { eq }) =>
          and(eq(rayons.warehouseId, warehouseId), whereClause),
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(rayons.createdAt)],
      });

      return { data, total: totalCount, searchableFields };
    });
  }

  async getRayonsStatsForAWarehouse(warehouseId: number, params: CommonQueryParams) {
    const { search, filters, page, limit, sortBy, sortOrder } = params;

    const searchableFields = ["notes", "rayonName"];

    const filterCondition = createFilterConditions(rayons, filters);
    const searchCondition = createSearchCondition(searchableFields, rayons, search);

    const whereConditions = [];
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const { limit: limitVal, offset } = getPaginationValues(page, limit);
    const sortCondition = createSortCondition(rayons, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(rayons)
        .where(whereClause || sql`TRUE`);

      const data = await tx.query.rayons.findMany({
        where: (whereClause || sql`TRUE`),
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(rayons.createdAt)],
        with: {
          shelves: {
            with: {
              bins: {
                with: {
                  storageItems: {
                    with: {
                      entry: {
                        with: {
                          series: {
                            columns: { seriesCode: true },
                          },
                          bundles: {
                            columns: { bundleCode: true },
                          },
                          packages: { columns: { packageCode: true } },
                          items: { columns: { itemCode: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Post-process to add productCode
      const dataWithProductCode = data.map(rayon => ({
        ...rayon,
        shelves: rayon.shelves.map(shelf => ({
          ...shelf,
          bins: shelf.bins.map(bin => ({
            ...bin,
            storageItems: bin.storageItems.map(storageItem => ({
              ...storageItem,
              entry: storageItem.entry
                ? {
                    ...storageItem.entry,
                    productCode:
                storageItem.entry.bundles?.[0]?.bundleCode ||
                storageItem.entry.series?.[0]?.seriesCode ||
                storageItem.entry.items?.[0]?.itemCode ||
                storageItem.entry.packages?.[0]?.packageCode ||
                null,
                  }
                : null,
            })),
          })),
        })),
      }));

      return { data: dataWithProductCode, total: totalCount, searchableFields };
    });
  }

  async findByNameAndWarehouseId(name: string, warehouseId: number) {
    return db.query.rayons.findFirst({
      where: (rayons, { eq, and }) =>
        and(
          eq(rayons.name, name),
          eq(rayons.warehouseId, warehouseId),
        ),
    });
  }

  async findShelvesByColumnLabelAndRayonId(columnLabel: string, rayonId: number) {
    return db.query.shelves.findFirst({
      where: (shelves, { eq, and }) =>
        and(
          eq(shelves.columnLabel, columnLabel),
          eq(shelves.rayonId, rayonId),
        ),
    });
  }

  async findById(id: number) {
    return db.query.rayons.findFirst({
      where: (rayons, { eq }) => eq(rayons.id, id),
    });
  }

  async findShelfById(id: number) {
    return db.query.shelves.findFirst({
      where: (shelves, { eq }) => eq(shelves.id, id),
    });
  }

  async findShelfWithRayonById(id: number) {
    return db.query.shelves.findFirst({
      where: (shelves, { eq }) => eq(shelves.id, id),
      with: {
        rayon: true,
      },
    });
  }

  async findBinById(id: number) {
    return db.query.bins.findFirst({
      where: (bins, { eq }) => eq(bins.id, id),
    });
  }

  async findBinByShelfAndRowNumber(shelfId: number, rowNumber: number) {
    return db.query.bins.findFirst({
      where: (bins, { eq, and }) =>
        and(
          eq(bins.shelfId, shelfId),
          eq(bins.rowNumber, rowNumber),
        ),
    });
  }

  async findBinByLocationCode(locationCode: string, warehouseId?: number) {
    return db.query.bins.findFirst({
      where: (bins, { eq, and }) =>
        warehouseId
          ? and(
              eq(bins.locationCode, locationCode),
              eq(bins.warehouseId, warehouseId),
            )
          : eq(bins.locationCode, locationCode),
    });
  }

  async createShelvesForRayon(tx: TX, rayonId: number, columnLabel: string, warehouseId: number, description: string, createdBy: number, updatedBy: number) {
    const [newShelf] = await tx.insert(shelves).values({
      rayonId,
      columnLabel,
      warehouseId,
      description,
      createdAt: new Date().toISOString(),
      createdBy,
      updatedBy,
    }).returning();

    return newShelf;
  }

  async getAllShelvesForRayon(rayonId: number, params: CommonQueryParams) {
    const { search, filters, page, limit, sortBy, sortOrder } = params;

    const searchableFields = ["description", "columnLabel"];

    const filterCondition = createFilterConditions(shelves, filters);
    const searchCondition = createSearchCondition(searchableFields, shelves, search);

    const whereConditions = [];
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const { limit: limitVal, offset } = getPaginationValues(page, limit);
    const sortCondition = createSortCondition(shelves, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(shelves)
        .where(and(sql`${shelves.rayonId} = ${rayonId}`, whereClause || sql`TRUE`));

      const data = await tx.query.shelves.findMany({
        where: (shelves, { eq }) => and(eq(shelves.rayonId, rayonId), whereClause),
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(shelves.createdAt)],
      });

      return { data, total: totalCount, searchableFields };
    });
  }

  async createBinsForShelf(tx: TX, shelfId: number, rowNumber: number, warehouseId: number, locationCode: string, createdBy: number, updatedBy: number) {
    const [newBin] = await tx.insert(bins).values({
      shelfId,
      rowNumber,
      warehouseId,
      locationCode,
      createdBy,
      updatedBy,
      createdAt: new Date().toISOString(),
    }).returning();

    return newBin;
  }

  async updateRayonForWarehouse(tx: TX, id: number, name: string | undefined, description: string | undefined, updatedBy: number) {
    const updateData: Partial<{
      name: string;
      description: string;
      updatedBy: number;
      updatedAt: string;
    }> = {
      updatedBy,
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) {
      updateData.name = name;
    }
    if (description !== undefined) {
      updateData.description = description;
    }

    const [updatedRayon] = await tx.update(rayons).set(updateData).where(
      eq(rayons.id, id),
    ).returning();

    return updatedRayon;
  }

  async updateShelvesForRayon(tx: TX, id: number, columnLabel: string | undefined, description: string | undefined, updatedBy: number) {
    const updateData: Partial<{
      columnLabel: string;
      description: string;
      updatedBy: number;
      updatedAt: string;
    }> = {
      updatedBy,
      updatedAt: new Date().toISOString(),
    };

    if (columnLabel !== undefined) {
      updateData.columnLabel = columnLabel;
    }
    if (description !== undefined) {
      updateData.description = description;
    }

    const [updatedShelf] = await tx.update(shelves).set(updateData).where(
      eq(shelves.id, id),
    ).returning();

    return updatedShelf;
  }

  async updateBinsForShelf(tx: TX, id: number, locationCode: string | undefined, updatedBy: number) {
    const updateData: Partial<{
      locationCode: string;
      updatedBy: number;
      updatedAt: string;
    }> = {
      updatedBy,
      updatedAt: new Date().toISOString(),
    };

    if (locationCode !== undefined) {
      updateData.locationCode = locationCode;
    }

    const [updatedBin] = await tx.update(bins).set(updateData).where(
      eq(bins.id, id),
    ).returning();

    return updatedBin;
  }

  async getRayonDeletionUsage(rayonId: number) {
    const rayon = await db.query.rayons.findFirst({
      where: (rayons, { eq }) => eq(rayons.id, rayonId),
      with: {
        shelves: {
          with: {
            bins: true,
          },
        },
      },
    });

    if (!rayon) {
      return null;
    }

    const binIds = rayon.shelves.flatMap(shelf => shelf.bins.map(bin => bin.id));

    if (binIds.length === 0) {
      return {
        rayon,
        binIds,
        storageCount: 0,
        transferCount: 0,
      };
    }

    const [{ value: storageCount }] = await db
      .select({ value: count() })
      .from(storage)
      .where(inArray(storage.binId, binIds));

    const [{ value: transferCount }] = await db
      .select({ value: count() })
      .from(warehouseTransfers)
      .where(inArray(warehouseTransfers.binId, binIds));

    return {
      rayon,
      binIds,
      storageCount,
      transferCount,
    };
  }

  async deleteRayonForWarehouse(tx: TX, rayonId: number) {
    const shelfRows = await tx
      .select({ id: shelves.id })
      .from(shelves)
      .where(eq(shelves.rayonId, rayonId));
    const shelfIds = shelfRows.map(shelf => shelf.id);

    if (shelfIds.length > 0) {
      await tx.delete(bins).where(inArray(bins.shelfId, shelfIds));
      await tx.delete(shelves).where(inArray(shelves.id, shelfIds));
    }

    const [deletedRayon] = await tx
      .delete(rayons)
      .where(eq(rayons.id, rayonId))
      .returning();

    return deletedRayon;
  }

  async createRayonsForWarehouse(tx: TX, warehouseId: number, name: string, description: string, createdBy: number, updatedBy: number) {
    const [newRayon] = await tx.insert(rayons).values({
      warehouseId,
      name,
      description,
      createdBy,
      updatedBy,
      createdAt: new Date().toISOString(),
    }).returning();

    return newRayon;
  }
}
