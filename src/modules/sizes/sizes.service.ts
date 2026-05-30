import type {
  CreateSizesRequest,
  CreateSizesResponse,
  UpdateSizesRequest,
} from "./sizes.schema";
import { NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";

import db from "@/db";

import { SizesRepository } from "./sizes.repository";

export class SizesService {
  private readonly sizesRepository: SizesRepository;

  /**
   * Create a new SizesService
   * Initializes the Sizes repository for database operations
   */
  constructor() {
    this.sizesRepository = new SizesRepository();
  }

  /**
   * Create a new sizes
   *
   * @param sizesData - Sizes data
   * @returns The created sizes object
   */
  async createSizes(
    sizesData: CreateSizesRequest & {
      createdBy: number;
    },
  ): Promise<CreateSizesResponse> {
    const sizes = await db.transaction(async (tx) => {
      // Create sizes
      const sizes = await this.sizesRepository.create(tx, {
        ...sizesData,
        updatedBy: sizesData.createdBy,
      });

      return sizes;
    });

    // fetch sizes
    const sizesWithAttributeType = await this.sizesRepository.findById(
      sizes.id,
    );
    if (!sizesWithAttributeType) {
      throw new AppError("Sizes could not be fetched after creation");
    }
    return sizesWithAttributeType as CreateSizesResponse;
  }

  /**
   * List sizes with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters to apply
   * @returns List of sizes and total count
   */
  async listSizes(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.sizesRepository.list(params);
  }

  /**
   * Get a sizes by id
   *
   * @param id - Sizes id
   * @returns The sizes object
   */
  async getSizesById(id: number) {
    const sizes = await this.sizesRepository.findById(id);
    if (!sizes) {
      throw new NotFoundError("Sizes not found");
    }
    return sizes;
  }

  /**
   * Update a sizes
   *
   * @param id - Sizes id
   * @param sizesData - Sizes data
   * @returns The updated sizes object
   */
  async updateSizes(
    id: number,
    sizesData: UpdateSizesRequest & {
      updatedBy: number;
    },
  ) {
    const sizes = await this.sizesRepository.findById(id);

    if (!sizes) {
      throw new NotFoundError("Sizes not found");
    }

    await db.transaction(async (tx) => {
      // Update sizes
      await this.sizesRepository.update(tx, id, {
        ...sizesData,
        updatedBy: sizesData.updatedBy,
      });
    });
    // fetch sizes
    const sizesWithAttributeType = await this.sizesRepository.findById(
      sizes.id,
    );
    if (!sizesWithAttributeType) {
      throw new AppError("Sizes could not be fetched after update");
    }
    return sizesWithAttributeType as CreateSizesResponse;
  }

  /**
   * Delete multiple sizes
   *
   * @param ids - Array of sizes IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async deleteSizes(ids: number[], deletedBy: number) {
    const result = await db.transaction(async (tx) => {
      return await this.sizesRepository.softDeleteMany(tx, ids, deletedBy);
    });
    if (!result) {
      throw new AppError("Failed to delete sizes");
    }
    return result;
  }
}
