import type {
  CreateTagsRequest,
  CreateTagsResponse,
  UpdateTagsRequest,
} from "./tags.schema";
import { NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";

import db from "@/db";

import { TagsRepository } from "./tags.repository";

export class TagsService {
  private readonly tagsRepository: TagsRepository;

  /**
   * Create a new TagsService
   * Initializes the tags repository for database operations
   */
  constructor() {
    this.tagsRepository = new TagsRepository();
  }

  /**
   * Create a new tags
   *
   * @param tagsData - Tags data
   * @returns The created tags object
   */
  async createTags(
    tagsData: CreateTagsRequest & {
      createdBy: number;
    },
  ): Promise<CreateTagsResponse> {
    const tags = await db.transaction(async (tx) => {
      // Create tags
      const tags = await this.tagsRepository.create(tx, {
        ...tagsData,
        updatedBy: tagsData.createdBy,
      });

      return tags;
    });

    // fetch tags
    const tagsWithAttributeType = await this.tagsRepository.findById(tags.id);
    if (!tagsWithAttributeType) {
      throw new AppError("Tags could not be fetched after creation");
    }
    return tagsWithAttributeType as CreateTagsResponse;
  }

  /**
   * List tags with pagination, filtering, and sorting
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
  async listTags(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.tagsRepository.list(params);
  }

  /**
   * Get a tags by id
   *
   * @param id - Tags id
   * @returns The tags object
   */
  async getTagsById(id: number) {
    const tags = await this.tagsRepository.findById(id);
    if (!tags) {
      throw new NotFoundError("Tags not found");
    }
    return tags;
  }

  /**
   * Update a tags
   *
   * @param id - Tags id
   * @param tagsData - Tags data
   * @returns The updated tags object
   */
  async updateTags(
    id: number,
    tagsData: UpdateTagsRequest & {
      updatedBy: number;
    },
  ) {
    const tags = await this.tagsRepository.findById(id);

    if (!tags) {
      throw new NotFoundError("Tags not found");
    }

    await db.transaction(async (tx) => {
      // Update tags
      await this.tagsRepository.update(tx, id, {
        ...tagsData,
        updatedBy: tagsData.updatedBy,
      });
    });
    // fetch tags
    const tagsWithAttributeType = await this.tagsRepository.findById(tags.id);
    if (!tagsWithAttributeType) {
      throw new AppError("Tags could not be fetched after update");
    }
    return tagsWithAttributeType as CreateTagsResponse;
  }

  /**
   * Delete multiple tags
   *
   * @param ids - Array of tags IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async deleteTags(ids: number[], deletedBy: number) {
    const result = await db.transaction(async (tx) => {
      return await this.tagsRepository.softDeleteMany(tx, ids, deletedBy);
    });
    if (!result) {
      throw new AppError("Failed to delete tags");
    }
    return result;
  }
}
