import type { CommonQueryParams } from "@/lib/openapi/schemas/query-params-schema";

import { ConflictError, NotFoundError } from "@/core/errors";
import db from "@/db";
import { WarehouseRepository } from "../warehouses/warehouses.repository";
import { RayonsRepository } from "./rayons.repository";

export class RayonsService {
  private readonly rayonsRepository: RayonsRepository;
  private readonly warehouseRepository: WarehouseRepository;

  constructor() {
    this.rayonsRepository = new RayonsRepository();
    this.warehouseRepository = new WarehouseRepository();
  }

  private normalizeSearchTerm(value?: string | null) {
    return value?.trim().toLowerCase() ?? "";
  }

  private matchesBinSearch(params: {
    searchTerm: string;
    rayonName?: string | null;
    rayonDescription?: string | null;
    shelfColumnLabel?: string | null;
    shelfDescription?: string | null;
    locationCode?: string | null;
    rowNumber?: number;
    productCodes?: string[];
    productIds?: number[];
  }) {
    if (!params.searchTerm) {
      return true;
    }

    const haystacks = [
      params.rayonName,
      params.rayonDescription,
      params.shelfColumnLabel,
      params.shelfDescription,
      params.locationCode,
      params.rowNumber?.toString(),
      ...(params.productCodes ?? []),
      ...(params.productIds ?? []).map((id) => id.toString()),
    ]
      .filter((value): value is string => Boolean(value))
      .map(value => value.toLowerCase());

    return haystacks.some(value => value.includes(params.searchTerm));
  }

  async getRayonsStatsForAWarehouse(warehouseId: number, params: CommonQueryParams) {
    const { locationCode, ...rayonFilters } =
      (params.filters ?? {}) as Record<string, unknown> & {
        locationCode?: string;
      };

    rayonFilters.warehouseId = warehouseId;

    // Keep nested search/filtering in-memory so a single API can drive a dynamic floor plan UI.
    const repoParams = { ...params, search: "", filters: rayonFilters };
    const normalizedLocationCode = this.normalizeSearchTerm(locationCode);
    const normalizedSearchTerm = this.normalizeSearchTerm(params.search);

    const warehouse = await this.warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse not found, with id: ${warehouseId}`);
    }

    const { data: rayons, total, searchableFields } =
      await this.rayonsRepository.getRayonsStatsForAWarehouse(
        warehouseId,
        repoParams,
      );

    const data = rayons
      .map((rayon) => {
        let totalBins = 0;
        let locationsUsed = 0;
        let totalItemsInRayon = 0;
        let stockTotal = 0;

        const shelves = rayon.shelves
          .map((shelf) => {
            const bins = shelf.bins
              .map((bin) => {
                let totalQuantity = 0;
                let hasUsedItems = false;
                const totalItems = bin.storageItems.length;
                const productCodes = Array.from(
                  new Set(
                    bin.storageItems
                      .map(item => item.entry?.productCode ?? null)
                      .filter((code): code is string => Boolean(code)),
                  ),
                );
                const productIds = Array.from(
                  new Set(
                    bin.storageItems
                      .map((item) => item.entryId ?? null)
                      .filter((id): id is number => typeof id === "number"),
                  ),
                );

                for (const item of bin.storageItems) {
                  totalQuantity += item.quantity;

                  if (item.quantity > 0) {
                    hasUsedItems = true;
                  }
                }

                const matchesLocationFilter = !normalizedLocationCode
                  || this.normalizeSearchTerm(bin.locationCode).includes(
                    normalizedLocationCode,
                  );
                const matchesSearch = this.matchesBinSearch({
                  searchTerm: normalizedSearchTerm,
                  rayonName: rayon.name,
                  rayonDescription: rayon.description,
                  shelfColumnLabel: shelf.columnLabel,
                  shelfDescription: shelf.description,
                  locationCode: bin.locationCode,
                  rowNumber: bin.rowNumber,
                  productCodes,
                  productIds,
                });

                if (!matchesLocationFilter || !matchesSearch) {
                  return null;
                }

                totalBins++;
                totalItemsInRayon += totalItems;
                stockTotal += totalQuantity;

                if (hasUsedItems) {
                  locationsUsed++;
                }

                return {
                  ...bin,
                  storageItems: bin.storageItems.map(storageItem => ({
                    ...storageItem,
                    productCode: storageItem.entry?.productCode ?? null,
                  })),
                  totalItems,
                  totalQuantity,
                  isOccupied: hasUsedItems,
                  productCodes,
                };
              })
              .filter((bin): bin is NonNullable<typeof bin> => Boolean(bin));

            return { ...shelf, bins };
          })
          .filter((shelf) => shelf.bins.length > 0);

        return {
          ...rayon,
          totalBins,
          usedBins: locationsUsed,
          totalItemsInRayon,
          stockTotal,
          shelves,
          totalShelves: shelves.length,
        };
      })
      .filter(
        rayon =>
          rayon.totalBins > 0
          || (!normalizedLocationCode && !normalizedSearchTerm),
      );

    return {
      data,
      total,
      searchableFields: [
        ...new Set([
          ...searchableFields,
          "columnLabel",
          "locationCode",
          "productCode",
          "productId",
          "rowNumber",
        ]),
      ],
    };
  }

  async getRayonsForWarehouse(warehouseId: number, params: CommonQueryParams) {
    const warehouse = await this.warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse not found, with id: ${warehouseId}`);
    }

    return await this.rayonsRepository.getRayonsForWarehouse(
      warehouseId,
      params,
    );
  }

  async createRayonsForWarehouse(
    warehouseId: number,
    name: string,
    description: string,
    createdBy: number,
    updatedBy: number,
  ) {
    const warehouse = await this.warehouseRepository.findById(warehouseId);
    if (!warehouse) {
      throw new NotFoundError(`Warehouse not found, with id: ${warehouseId}`);
    }
    const existingRayon =
      await this.rayonsRepository.findByNameAndWarehouseId(name, warehouseId);

    if (existingRayon) {
      throw new ConflictError(
        `Rayon with name '${name}' already exists in warehouse ${warehouseId}`,
      );
    }

    return await db.transaction(async (tx) => {
      return await this.rayonsRepository.createRayonsForWarehouse(
        tx,
        warehouseId,
        name,
        description,
        createdBy,
        updatedBy,
      );
    });
  }

  async createShelvesForRayon(
    rayonId: number,
    columnLabel: string,
    description: string,
    createdBy: number,
    updatedBy: number,
  ) {
    const rayon = await this.rayonsRepository.findById(rayonId);
    if (!rayon) {
      throw new NotFoundError(`Rayon not found, with id: ${rayonId}`);
    }

    const warehouseId = rayon.warehouseId;

    if (columnLabel !== undefined) {
      const existingShelves =
        await this.rayonsRepository.findShelvesByColumnLabelAndRayonId(
          columnLabel,
          rayonId,
        );
      if (existingShelves) {
        throw new ConflictError(
          `Shelf with column label '${columnLabel}' already exists in rayon ${rayonId}`,
        );
      }
    }

    return await db.transaction(async (tx) => {
      return await this.rayonsRepository.createShelvesForRayon(
        tx,
        rayonId,
        columnLabel,
        warehouseId,
        description,
        createdBy,
        updatedBy,
      );
    });
  }

  async getAllShelvesForRayon(rayonId: number, params: CommonQueryParams) {
    const rayon = await this.rayonsRepository.findById(rayonId);
    if (!rayon) {
      throw new NotFoundError(`Rayon not found, with id: ${rayonId}`);
    }

    return await this.rayonsRepository.getAllShelvesForRayon(rayonId, params);
  }

  async createBinsForShelf(
    shelfId: number,
    rowNumber: number,
    locationCode: string | undefined,
    createdBy: number,
    updatedBy: number,
  ) {
    const shelf = await this.rayonsRepository.findShelfWithRayonById(shelfId);
    if (!shelf) {
      throw new NotFoundError(`Shelf not found, with id: ${shelfId}`);
    }

    const warehouseId = shelf.warehouseId;
    const resolvedLocationCode = (
      locationCode?.trim() || `${shelf.rayon.name}${shelf.columnLabel}${rowNumber}`
    ).toUpperCase();

    const existingBin = await this.rayonsRepository.findBinByShelfAndRowNumber(
      shelfId,
      rowNumber,
    );
    if (existingBin) {
      throw new ConflictError(
        `Bin already exists for shelf ${shelfId} and row number ${rowNumber}`,
      );
    }

    const existingLocationBin =
      await this.rayonsRepository.findBinByLocationCode(resolvedLocationCode);
    if (existingLocationBin) {
      throw new ConflictError(
        `Location code '${resolvedLocationCode}' is already in use by another bin`,
      );
    }

    return await db.transaction(async (tx) => {
      return await this.rayonsRepository.createBinsForShelf(
        tx,
        shelfId,
        rowNumber,
        warehouseId,
        resolvedLocationCode,
        createdBy,
        updatedBy,
      );
    });
  }

  async updateShelvesForRayon(
    shelfId: number,
    columnLabel: string | undefined,
    description: string | undefined,
    updatedBy: number,
  ) {
    const shelf = await this.rayonsRepository.findShelfById(shelfId);
    if (!shelf) {
      throw new NotFoundError(`Shelf not found, with id: ${shelfId}`);
    }

    if (columnLabel !== undefined) {
      const existingShelves =
        await this.rayonsRepository.findShelvesByColumnLabelAndRayonId(
          columnLabel,
          shelf.rayonId,
        );
      if (existingShelves && existingShelves.id !== shelfId) {
        throw new ConflictError(
          `Shelf with column label '${columnLabel}' already exists in rayon ${shelf.rayonId}`,
        );
      }
    }

    return await db.transaction(async (tx) => {
      return await this.rayonsRepository.updateShelvesForRayon(
        tx,
        shelfId,
        columnLabel,
        description,
        updatedBy,
      );
    });
  }

  async updateBinsForShelf(
    binId: number,
    locationCode: string | undefined,
    updatedBy: number,
  ) {
    const bin = await this.rayonsRepository.findBinById(binId);
    if (!bin) {
      throw new NotFoundError(`Bin not found, with id: ${binId}`);
    }

    if (locationCode) {
      const normalizedLocationCode = locationCode.trim().toUpperCase();
      const existingLocationBin =
        await this.rayonsRepository.findBinByLocationCode(normalizedLocationCode);
      if (existingLocationBin && existingLocationBin.id !== binId) {
        throw new ConflictError(
          `Location code '${normalizedLocationCode}' is already in use by another bin`,
        );
      }

      locationCode = normalizedLocationCode;
    }

    return await db.transaction(async (tx) => {
      return await this.rayonsRepository.updateBinsForShelf(
        tx,
        binId,
        locationCode,
        updatedBy,
      );
    });
  }

  async updateRayonForWarehouse(
    rayonId: number,
    name: string | undefined,
    description: string | undefined,
    updatedBy: number,
  ) {
    const rayon = await this.rayonsRepository.findById(rayonId);
    if (!rayon) {
      throw new NotFoundError(`Rayon not found, with id: ${rayonId}`);
    }

    if (name !== undefined) {
      const existingRayon =
        await this.rayonsRepository.findByNameAndWarehouseId(
          name,
          rayon.warehouseId,
        );

      if (existingRayon && existingRayon.id !== rayonId) {
        throw new ConflictError(
          `Rayon with name '${name}' already exists in warehouse ${rayon.warehouseId}`,
        );
      }
    }

    return await db.transaction(async (tx) => {
      return await this.rayonsRepository.updateRayonForWarehouse(
        tx,
        rayonId,
        name,
        description,
        updatedBy,
      );
    });
  }
}
