import type {
  CreateBannersRequest,
  CreateBannersResponse,
  UpdateBannersRequest,
} from "./banners.schema";
import { NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";

import db from "@/db";

import { BannersRepository } from "./banners.repository";

export class BannersService {
  private readonly bannersRepository: BannersRepository;

  /**
   * Create a new BannersService
   * Initializes the banners repository for database operations
   */
  constructor() {
    this.bannersRepository = new BannersRepository();
  }

  /**
   * Create a new banners
   *
   * @param bannersData - Banners data
   * @returns The created banners object
   */
  async createBanners(
    bannersData: CreateBannersRequest & {
      createdBy: number;
    },
  ): Promise<CreateBannersResponse> {
    const banners = await db.transaction(async (tx) => {
      // Create banners
      const banners = await this.bannersRepository.create(tx, {
        ...bannersData,
        updatedBy: bannersData.createdBy,
      });

      return banners;
    });

    // fetch banners
    const bannersWithAttributeType = await this.bannersRepository.findById(
      banners.id,
    );
    if (!bannersWithAttributeType) {
      throw new AppError("Banners could not be fetched after creation");
    }
    return bannersWithAttributeType as CreateBannersResponse;
  }

  /**
   * List banners with pagination, filtering, and sorting
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
  async listBanners(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.bannersRepository.list(params);
  }

  /**
   * Get a banners by id
   *
   * @param id - Banners id
   * @returns The banners object
   */
  async getBannersById(id: number) {
    const banners = await this.bannersRepository.findById(id);
    if (!banners) {
      throw new NotFoundError("Banners not found");
    }
    return banners;
  }

  /**
   * Update a banners
   *
   * @param id - Banners id
   * @param bannersData - Banners data
   * @returns The updated banners object
   */
  async updateBanners(
    id: number,
    bannersData: UpdateBannersRequest & {
      updatedBy: number;
    },
  ) {
    const banners = await this.bannersRepository.findById(id);

    if (!banners) {
      throw new NotFoundError("Banners not found");
    }

    await db.transaction(async (tx) => {
      // Update banners
      await this.bannersRepository.update(tx, id, {
        ...bannersData,
        updatedBy: bannersData.updatedBy,
      });
    });
    // fetch banners
    const bannersWithAttributeType = await this.bannersRepository.findById(
      banners.id,
    );
    if (!bannersWithAttributeType) {
      throw new AppError("Banners could not be fetched after update");
    }
    return bannersWithAttributeType as CreateBannersResponse;
  }

  /**
   * Delete multiple banners
   *
   * @param ids - Array of banners IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async deleteBanners(ids: number[], deletedBy: number) {
    const result = await db.transaction(async (tx) => {
      return await this.bannersRepository.softDeleteMany(tx, ids, deletedBy);
    });
    if (!result) {
      throw new AppError("Failed to delete banners");
    }
    return result;
  }
}
