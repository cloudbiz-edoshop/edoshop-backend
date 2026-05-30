import type {
  CreateFaqsRequest,
  CreateFaqsResponse,
  UpdateFaqsRequest,
} from "./faqs.schema";
import { NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";

import db from "@/db";

import { FaqsRepository } from "./faqs.repository";

export class FaqsService {
  private readonly faqsRepository: FaqsRepository;

  /**
   * Create a new FaqsService
   * Initializes the faqs repository for database operations
   */
  constructor() {
    this.faqsRepository = new FaqsRepository();
  }

  /**
   * Create a new faqs
   *
   * @param faqsData - Faqs data
   * @returns The created faqs object
   */
  async createFaqs(
    faqsData: CreateFaqsRequest & {
      createdBy: number;
    },
  ): Promise<CreateFaqsResponse> {
    const faqs = await db.transaction(async (tx) => {
      // Create faqs
      const faqs = await this.faqsRepository.create(tx, {
        ...faqsData,
        updatedBy: faqsData.createdBy,
      });

      return faqs;
    });

    // fetch faqs
    const faqsWithAttributeType = await this.faqsRepository.findById(faqs.id);
    if (!faqsWithAttributeType) {
      throw new AppError("Faqs could not be fetched after creation");
    }
    return faqsWithAttributeType as CreateFaqsResponse;
  }

  /**
   * List faqs with pagination, filtering, and sorting
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
  async listFaqs(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.faqsRepository.list(params);
  }

  /**
   * Get a faqs by id
   *
   * @param id - Faqs id
   * @returns The faqs object
   */
  async getFaqsById(id: number) {
    const faqs = await this.faqsRepository.findById(id);
    if (!faqs) {
      throw new NotFoundError("Faqs not found");
    }
    return faqs;
  }

  /**
   * Update a faqs
   *
   * @param id - Faqs id
   * @param faqsData - Faqs data
   * @returns The updated faqs object
   */
  async updateFaqs(
    id: number,
    faqsData: UpdateFaqsRequest & {
      updatedBy: number;
    },
  ) {
    const faqs = await this.faqsRepository.findById(id);

    if (!faqs) {
      throw new NotFoundError("Faqs not found");
    }

    await db.transaction(async (tx) => {
      // Update faqs
      await this.faqsRepository.update(tx, id, {
        ...faqsData,
        updatedBy: faqsData.updatedBy,
      });
    });
    // fetch faqs
    const faqsWithAttributeType = await this.faqsRepository.findById(faqs.id);
    if (!faqsWithAttributeType) {
      throw new AppError("Faqs could not be fetched after update");
    }
    return faqsWithAttributeType as CreateFaqsResponse;
  }

  /**
   * Delete multiple faqs
   *
   * @param ids - Array of faqs IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async deleteFaqs(ids: number[], deletedBy: number) {
    const result = await db.transaction(async (tx) => {
      return await this.faqsRepository.softDeleteMany(tx, ids, deletedBy);
    });
    if (!result) {
      throw new AppError("Failed to delete faqs");
    }
    return result;
  }
}
