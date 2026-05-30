import type {
  CreateAttributesRequest,
  CreateAttributesResponse,
  UpdateAttributesRequest,
} from "./attributes.schema";
import { NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";

import db from "@/db";

import { AttributesRepository } from "./attributes.repository";

export class AttributesService {
  private readonly attributesRepository: AttributesRepository;

  /**
   * Create a new AttributesService
   * Initializes the attributes repository for database operations
   */
  constructor() {
    this.attributesRepository = new AttributesRepository();
  }

  /**
   * Create a new attributes
   *
   * @param attributesData - Attributes data
   * @returns The created attributes object
   */
  async createAttributes(
    attributesData: CreateAttributesRequest & {
      createdBy: number;
    },
  ): Promise<CreateAttributesResponse> {
    const attributes = await db.transaction(async (tx) => {
      // Create attributes
      const attributes = await this.attributesRepository.create(tx, {
        ...attributesData,
        createdBy: attributesData.createdBy,
        updatedBy: attributesData.createdBy,
      });

      return attributes;
    });

    // fetch attributes
    const attributesWithAttributeType =
      await this.attributesRepository.findById(attributes.id);
    if (!attributesWithAttributeType) {
      throw new AppError("Attributes could not be fetched after creation");
    }
    return attributesWithAttributeType as CreateAttributesResponse;
  }

  /**
   * List attributes with pagination, filtering, and sorting
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
  async listAttributes(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.attributesRepository.list(params);
  }

  /**
   * List attribute types
   *
   * @returns List of attribute types
   */
  async getAttributeTypes() {
    return await this.attributesRepository.getTypes();
  }

  /**
   * Get a attributes by id
   *
   * @param id - Attributes id
   * @returns The attributes object
   */
  async getAttributesById(id: number) {
    const attributes = await this.attributesRepository.findById(id);
    if (!attributes) {
      throw new NotFoundError("Attributes not found");
    }
    return attributes;
  }

  /**
   * Update a attributes
   *
   * @param id - Attributes id
   * @param attributesData - Attributes data
   * @returns The updated attributes object
   */
  async updateAttributes(
    id: number,
    attributesData: UpdateAttributesRequest & {
      updatedBy: number;
    },
  ) {
    const attributes = await this.attributesRepository.findById(id);

    if (!attributes) {
      throw new NotFoundError("Attributes not found");
    }

    await db.transaction(async (tx) => {
      // Update attributes
      await this.attributesRepository.update(tx, id, {
        ...attributesData,
        updatedBy: attributesData.updatedBy,
      });
    });
    // fetch attributes
    const attributesWithAttributeType =
      await this.attributesRepository.findById(attributes.id);
    if (!attributesWithAttributeType) {
      throw new AppError("Attributes could not be fetched after update");
    }
    return attributesWithAttributeType as CreateAttributesResponse;
  }

  /**
   * Delete multiple attributes
   *
   * @param ids - Array of attributes IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async deleteAttributes(ids: number[], deletedBy: number) {
    const result = await db.transaction(async (tx) => {
      return await this.attributesRepository.softDeleteMany(tx, ids, deletedBy);
    });
    if (!result) {
      throw new AppError("Failed to delete attributes");
    }
    return result;
  }
}
