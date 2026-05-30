import type {
  CreateAboutUsRequest,
  CreateAboutUsResponse,
  UpdateAboutUsRequest,
} from "./about-us.schema";
import { NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";

import db from "@/db";

import { AboutUsRepository } from "./about-us.repository";

export class AboutUsService {
  private readonly aboutUsRepository: AboutUsRepository;

  /**
   * Create a new AboutUsService
   * Initializes the aboutUs repository for database operations
   */
  constructor() {
    this.aboutUsRepository = new AboutUsRepository();
  }

  /**
   * Create a new aboutUs
   *
   * @param aboutUsData - AboutUs data
   * @returns The created aboutUs object
   */
  async createAboutUs(
    aboutUsData: CreateAboutUsRequest & {
      createdBy: number;
    },
  ): Promise<CreateAboutUsResponse> {
    const aboutUs = await db.transaction(async (tx) => {
      // Create aboutUs
      const aboutUs = await this.aboutUsRepository.create(tx, {
        ...aboutUsData,
        updatedBy: aboutUsData.createdBy,
      });

      return aboutUs;
    });

    // fetch aboutUs
    const aboutUsWithAttributeType = await this.aboutUsRepository.findById(
      aboutUs.id,
    );
    if (!aboutUsWithAttributeType) {
      throw new AppError("AboutUs could not be fetched after creation");
    }
    return aboutUsWithAttributeType as CreateAboutUsResponse;
  }

  /**
   * List aboutUs with pagination, filtering, and sorting
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
  async listAboutUs(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.aboutUsRepository.list(params);
  }

  /**
   * Get a aboutUs by id
   *
   * @param id - AboutUs id
   * @returns The aboutUs object
   */
  async getAboutUsById(id: number) {
    const aboutUs = await this.aboutUsRepository.findById(id);
    if (!aboutUs) {
      throw new NotFoundError("AboutUs not found");
    }
    return aboutUs;
  }

  /**
   * Update a aboutUs
   *
   * @param id - AboutUs id
   * @param aboutUsData - AboutUs data
   * @returns The updated aboutUs object
   */
  async updateAboutUs(
    id: number,
    aboutUsData: UpdateAboutUsRequest & {
      updatedBy: number;
    },
  ) {
    const aboutUs = await this.aboutUsRepository.findById(id);

    if (!aboutUs) {
      throw new NotFoundError("AboutUs not found");
    }

    await db.transaction(async (tx) => {
      // Update aboutUs
      await this.aboutUsRepository.update(tx, id, {
        ...aboutUsData,
        updatedBy: aboutUsData.updatedBy,
      });
    });
    // fetch aboutUs
    const aboutUsWithAttributeType = await this.aboutUsRepository.findById(
      aboutUs.id,
    );
    if (!aboutUsWithAttributeType) {
      throw new AppError("AboutUs could not be fetched after update");
    }
    return aboutUsWithAttributeType as CreateAboutUsResponse;
  }

  /**
   * Delete multiple aboutUs
   *
   * @param ids - Array of aboutUs IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async deleteAboutUs(ids: number[], deletedBy: number) {
    const result = await db.transaction(async (tx) => {
      return await this.aboutUsRepository.softDeleteMany(tx, ids, deletedBy);
    });
    if (!result) {
      throw new AppError("Failed to delete aboutUs");
    }
    return result;
  }
}
