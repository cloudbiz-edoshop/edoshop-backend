import type {
  CreateTestimonialsRequest,
  CreateTestimonialsResponse,
  UpdateTestimonialsRequest,
} from "./testimonials.schema";
import { ConflictError, NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";

import db from "@/db";

import { TestimonialsRepository } from "./testimonials.repository";

export class TestimonialsService {
  private readonly testimonialsRepository: TestimonialsRepository;

  /**
   * Create a new TestimonialsService
   * Initializes the testimonials repository for database operations
   */
  constructor() {
    this.testimonialsRepository = new TestimonialsRepository();
  }

  /**
   * Create a new testimonials
   *
   * @param testimonialsData - Testimonials data
   * @returns The created testimonials object
   */
  async createTestimonials(
    testimonialsData: CreateTestimonialsRequest & {
      createdBy: number;
    },
  ): Promise<CreateTestimonialsResponse> {
    // check if the order is unique
    const existingTestimonials = await this.testimonialsRepository.findByOrder(
      testimonialsData.order,
    );
    if (existingTestimonials) {
      throw new ConflictError("Testimonials order must be unique");
    }
    const testimonials = await db.transaction(async (tx) => {
      // Create testimonials
      const testimonials = await this.testimonialsRepository.create(tx, {
        ...testimonialsData,
        updatedBy: testimonialsData.createdBy,
      });

      return testimonials;
    });

    // fetch testimonials
    const testimonialsWithAttributeType =
      await this.testimonialsRepository.findById(testimonials.id);
    if (!testimonialsWithAttributeType) {
      throw new AppError("Testimonials could not be fetched after creation");
    }
    return testimonialsWithAttributeType as CreateTestimonialsResponse;
  }

  /**
   * List testimonials with pagination, filtering, and sorting
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
  async listTestimonials(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.testimonialsRepository.list(params);
  }

  /**
   * Get a testimonials by id
   *
   * @param id - Testimonials id
   * @returns The testimonials object
   */
  async getTestimonialsById(id: number) {
    const testimonials = await this.testimonialsRepository.findById(id);
    if (!testimonials) {
      throw new NotFoundError("Testimonials not found");
    }
    return testimonials;
  }

  /**
   * Update a testimonials
   *
   * @param id - Testimonials id
   * @param testimonialsData - Testimonials data
   * @returns The updated testimonials object
   */
  async updateTestimonials(
    id: number,
    testimonialsData: UpdateTestimonialsRequest & {
      updatedBy: number;
    },
  ) {
    const testimonials = await this.testimonialsRepository.findById(id);

    if (!testimonials) {
      throw new NotFoundError("Testimonials not found");
    }

    if (testimonialsData.order) {
      const existingTestimonials = await this.testimonialsRepository.findByOrder(
        testimonialsData.order,
      );
      if (existingTestimonials && existingTestimonials.id !== id) {
        throw new ConflictError("Testimonials order must be unique");
      }
    }

    await db.transaction(async (tx) => {
      // Update testimonials
      await this.testimonialsRepository.update(tx, id, {
        ...testimonialsData,
        updatedBy: testimonialsData.updatedBy,
      });
    });
    // fetch testimonials
    const testimonialsWithAttributeType =
      await this.testimonialsRepository.findById(testimonials.id);
    if (!testimonialsWithAttributeType) {
      throw new AppError("Testimonials could not be fetched after update");
    }
    return testimonialsWithAttributeType;
  }

  /**
   * Delete multiple testimonials
   *
   * @param ids - Array of testimonials IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async deleteTestimonials(ids: number[], deletedBy: number) {
    const result = await db.transaction(async (tx) => {
      return await this.testimonialsRepository.softDeleteMany(
        tx,
        ids,
        deletedBy,
      );
    });
    if (!result) {
      throw new AppError("Failed to delete testimonials");
    }
    return result;
  }
}
