import type {
  CreateFiltersRequest,
  CreateFiltersResponse,
  UpdateFiltersRequest,
} from "./filters.schema";
import { NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";

import db from "@/db";

import { FiltersRepository } from "./filters.repository";

export class FiltersService {
  private readonly filtersRepository: FiltersRepository;

  /**
   * Create a new FiltersService
   * Initializes the filters repository for database operations
   */
  constructor() {
    this.filtersRepository = new FiltersRepository();
  }

  /**
   * Create a new filters
   *
   * @param filtersData - Filters data
   * @returns The created filters object
   */
  async createFilters(
    filtersData: CreateFiltersRequest & {
      createdBy: number;
    },
  ): Promise<CreateFiltersResponse> {
    const filters = await db.transaction(async (tx) => {
      // Create filters
      const filters = await this.filtersRepository.create(tx, {
        ...filtersData,
        updatedBy: filtersData.createdBy,
      });

      return filters;
    });

    // fetch filters
    const filtersWithAttributeType = await this.filtersRepository.findById(
      filters.id,
    );
    if (!filtersWithAttributeType) {
      throw new AppError("Filters could not be fetched after creation");
    }
    return filtersWithAttributeType as CreateFiltersResponse;
  }

  /**
   * List filters with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters to apply
   * @returns List of suppliers and total count
   */
  async listFilters(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.filtersRepository.list(params);
  }

  /**
   * Get a filters by id
   *
   * @param id - Filters id
   * @returns The filters object
   */
  async getFiltersById(id: number) {
    const filters = await this.filtersRepository.findById(id);
    if (!filters) {
      throw new NotFoundError("Filters not found");
    }
    return filters;
  }

  /**
   * Update a filters
   *
   * @param id - Filters id
   * @param filtersData - Filters data
   * @returns The updated filters object
   */
  async updateFilters(
    id: number,
    filtersData: UpdateFiltersRequest & {
      updatedBy: number;
    },
  ) {
    const filters = await this.filtersRepository.findById(id);

    if (!filters) {
      throw new NotFoundError("Filters not found");
    }

    await db.transaction(async (tx) => {
      // Update filters
      await this.filtersRepository.update(tx, id, {
        ...filtersData,
        updatedBy: filtersData.updatedBy,
      });
    });
    // fetch filters
    const filtersWithAttributeType = await this.filtersRepository.findById(
      filters.id,
    );
    if (!filtersWithAttributeType) {
      throw new AppError("Filters could not be fetched after update");
    }
    return filtersWithAttributeType as CreateFiltersResponse;
  }

  /**
   * Delete multiple filters
   *
   * @param ids - Array of filters IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async deleteFilters(ids: number[], deletedBy: number) {
    const result = await db.transaction(async (tx) => {
      return await this.filtersRepository.softDeleteMany(tx, ids, deletedBy);
    });
    if (!result) {
      throw new AppError("Failed to delete filters");
    }
    return result;
  }
}
