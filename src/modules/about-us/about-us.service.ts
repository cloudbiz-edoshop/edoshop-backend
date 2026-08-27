import type {
  CreateAboutUsRequest,
  CreateAboutUsResponse,
  UpdateAboutUsRequest,
} from "./about-us.schema";
import { ConflictError, NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";

import db from "@/db";

import { AboutUsRepository } from "./about-us.repository";
import {
  getDefaultAboutUsSection,
  getDefaultAboutUsSections,
} from "./about-us.defaults";
import { normalizeAboutUsPayload, serializeAboutUsRecord } from "./about-us.util";

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
    const normalizedData = normalizeAboutUsPayload(aboutUsData);

    const aboutUs = await db.transaction(async (tx) => {
      const aboutUs = await this.aboutUsRepository.create(tx, {
        ...normalizedData,
        updatedBy: aboutUsData.createdBy,
      });

      return aboutUs;
    });

    const aboutUsWithAttributeType = await this.aboutUsRepository.findById(
      aboutUs.id,
    );
    if (!aboutUsWithAttributeType) {
      throw new AppError("AboutUs could not be fetched after creation");
    }
    return serializeAboutUsRecord(
      aboutUsWithAttributeType,
    ) as CreateAboutUsResponse;
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
    const result = await this.aboutUsRepository.list(params);
    return {
      data: result.data.map((item) => serializeAboutUsRecord(item)),
      total: result.total,
      searchableFields: result.searchableFields,
    };
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
    return serializeAboutUsRecord(aboutUs);
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

    const normalizedData = normalizeAboutUsPayload({
      ...aboutUsData,
      imageUrl: aboutUsData.imageUrl ?? aboutUs.imageUrl ?? undefined,
      imagePosition:
        aboutUsData.imagePosition ?? aboutUs.imagePosition ?? undefined,
      images:
        aboutUsData.images ??
        (Array.isArray(aboutUs.images) ? aboutUs.images : undefined),
    });

    await db.transaction(async (tx) => {
      await this.aboutUsRepository.update(tx, id, {
        ...normalizedData,
        updatedBy: aboutUsData.updatedBy,
      });
    });
    const aboutUsWithAttributeType = await this.aboutUsRepository.findById(
      aboutUs.id,
    );
    if (!aboutUsWithAttributeType) {
      throw new AppError("AboutUs could not be fetched after update");
    }
    return serializeAboutUsRecord(
      aboutUsWithAttributeType,
    ) as CreateAboutUsResponse;
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

  getAboutUsDefaults(sectionKey?: string | null) {
    if (sectionKey) {
      const section = getDefaultAboutUsSection(sectionKey);
      if (!section) {
        throw new NotFoundError("About Us default section not found");
      }

      return section;
    }

    return getDefaultAboutUsSections();
  }

  async seedDefaultAboutUsSections(createdBy: number) {
    const existing = await this.aboutUsRepository.list({
      page: 1,
      limit: 1,
    });

    if (existing.total > 0) {
      throw new ConflictError(
        "About Us sections already exist. Edit them individually or delete them before importing defaults.",
      );
    }

    const defaults = getDefaultAboutUsSections();
    const createdSections: CreateAboutUsResponse[] = [];

    for (const section of defaults) {
      const created = await this.createAboutUs({
        ...section,
        createdBy,
      });
      createdSections.push(created);
    }

    return createdSections;
  }
}
