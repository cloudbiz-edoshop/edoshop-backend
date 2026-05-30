import type {
  CreateCategoriesRequest,
  CreateCategoriesResponse,
  UpdateCategoriesRequest,
} from "./categories.schema";
import { NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";

import db from "@/db";

import { CategoriesRepository } from "./categories.repository";

export class CategoriesService {
  private readonly categoriesRepository: CategoriesRepository;

  /**
   * Create a new CategoriesService
   * Initializes the categories repository for database operations
   */
  constructor() {
    this.categoriesRepository = new CategoriesRepository();
  }

  /**
   * Create a new categories
   *
   * @param categoriesData - Categories data
   * @returns The created categories object
   */
  async createCategories(
    categoriesData: CreateCategoriesRequest & {
      createdBy: number;
    },
  ): Promise<CreateCategoriesResponse> {
    const categories = await db.transaction(async (tx) => {
      // Create categories
      const categories = await this.categoriesRepository.create(tx, {
        ...categoriesData,
        updatedBy: categoriesData.createdBy,
      });

      return categories;
    });

    // fetch categories
    const categoriesWithAttributeType =
      await this.categoriesRepository.findById(categories.id);
    if (!categoriesWithAttributeType) {
      throw new AppError("Categories could not be fetched after creation");
    }
    return categoriesWithAttributeType as CreateCategoriesResponse;
  }

  /**
   * List categories with pagination, filtering, and sorting
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
  async listCategories(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.categoriesRepository.list(params);
  }

  /**
   * Get a categories by id
   *
   * @param id - Categories id
   * @returns The categories object
   */
  async getCategoriesById(id: number) {
    const categories = await this.categoriesRepository.findById(id);
    if (!categories) {
      throw new NotFoundError("Categories not found");
    }
    return categories;
  }

  /**
   * Update a categories
   *
   * @param id - Categories id
   * @param categoriesData - Categories data
   * @returns The updated categories object
   */
  async updateCategories(
    id: number,
    categoriesData: UpdateCategoriesRequest & {
      updatedBy: number;
    },
  ) {
    const categories = await this.categoriesRepository.findById(id);

    if (!categories) {
      throw new NotFoundError("Categories not found");
    }

    await db.transaction(async (tx) => {
      // Update categories
      await this.categoriesRepository.update(tx, id, {
        ...categoriesData,
        updatedBy: categoriesData.updatedBy,
      });
    });
    // fetch categories
    const categoriesWithAttributeType =
      await this.categoriesRepository.findById(categories.id);
    if (!categoriesWithAttributeType) {
      throw new AppError("Categories could not be fetched after update");
    }
    return categoriesWithAttributeType as CreateCategoriesResponse;
  }

  /**
   * Delete multiple categories
   *
   * @param ids - Array of categories IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async deleteCategories(ids: number[], deletedBy: number) {
    const result = await db.transaction(async (tx) => {
      return await this.categoriesRepository.softDeleteMany(tx, ids, deletedBy);
    });
    if (!result) {
      throw new AppError("Failed to delete categories");
    }
    return result;
  }
}
