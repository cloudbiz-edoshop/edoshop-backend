import type {
  AddProductToNewArrivalsRequest,
  CreateNewArrivalRequest,
  CreateNewArrivalResponse,
  RemoveProductFromNewArrivalsRequest,
  UpdateNewArrivalRequest,
} from "./new-arrivals.schema";
import { NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";

import db from "@/db";

import { NewArrivalsRepository } from "./new-arrivals.repository";

export class NewArrivalsService {
  private readonly newArrivalsRepository: NewArrivalsRepository;

  constructor() {
    this.newArrivalsRepository = new NewArrivalsRepository();
  }

  async createNewArrival(
    newArrivalData: CreateNewArrivalRequest & { createdBy: number },
  ): Promise<CreateNewArrivalResponse> {
    const newArrival = await db.transaction(async (tx) => {
      const createdNewArrival = await this.newArrivalsRepository.create(tx, {
        ...newArrivalData,
        updatedBy: newArrivalData.createdBy,
      });

      return createdNewArrival;
    });

    const newArrivalWithRelations = await this.newArrivalsRepository.findById(
      newArrival.id,
    );
    if (!newArrivalWithRelations) {
      throw new AppError("New arrival could not be fetched after creation");
    }
    return newArrivalWithRelations as CreateNewArrivalResponse;
  }

  async listNewArrivals(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.newArrivalsRepository.list(params);
  }

  async getNewArrivalById(id: number) {
    const newArrival = await this.newArrivalsRepository.findById(id);
    if (!newArrival) {
      throw new NotFoundError("New arrival not found");
    }
    return newArrival;
  }

  async updateNewArrival(
    id: number,
    newArrivalData: UpdateNewArrivalRequest & { updatedBy: number },
  ) {
    const newArrival = await this.newArrivalsRepository.findById(id);

    if (!newArrival) {
      throw new NotFoundError("New arrival not found");
    }

    const updatedNewArrival = await db.transaction(async (tx) => {
      await this.newArrivalsRepository.update(tx, id, {
        ...newArrivalData,
        updatedBy: newArrivalData.updatedBy,
      });

      const updated = await this.newArrivalsRepository.findById(id, tx);
      if (!updated) {
        throw new AppError("Failed to update new arrival");
      }

      return updated;
    });

    return updatedNewArrival as CreateNewArrivalResponse;
  }

  async deleteNewArrival(id: number) {
    const newArrival = await this.newArrivalsRepository.findById(id);

    if (!newArrival) {
      throw new NotFoundError("New arrival not found");
    }

    const result = await db.transaction(async (tx) => {
      return await this.newArrivalsRepository.delete(tx, id);
    });

    if (!result) {
      throw new AppError("Failed to delete new arrival");
    }

    return result;
  }

  async addProductsToNewArrivals(
    newArrivalId: number,
    requestData: AddProductToNewArrivalsRequest & { createdBy: number },
  ) {
    const newArrival = await this.newArrivalsRepository.findById(newArrivalId);

    if (!newArrival) {
      throw new NotFoundError("New arrival not found");
    }

    if (!newArrival.startDate || !newArrival.endDate) {
      throw new AppError("New arrival period is not properly configured");
    }

    const now = new Date();
    const startDate = new Date(newArrival.startDate);
    const endDate = new Date(newArrival.endDate);
    if (now < startDate || now > endDate) {
      throw new AppError("Cannot mark products as new arrivals outside the valid period");
    }

    const result = await db.transaction(async (tx) => {
      await this.newArrivalsRepository.addProductsToNewArrivals(
        tx,
        newArrivalId,
        requestData.productIds,
        requestData.createdBy,
      );
      return true;
    });

    if (!result) {
      throw new AppError("Failed to add products to new arrivals");
    }

    return result;
  }

  async removeProductsFromNewArrivals(
    newArrivalId: number,
    requestData: RemoveProductFromNewArrivalsRequest & { updatedBy: number },
  ) {
    const newArrival = await this.newArrivalsRepository.findById(newArrivalId);

    if (!newArrival) {
      throw new NotFoundError("New arrival not found");
    }

    const result = await db.transaction(async (tx) => {
      return await this.newArrivalsRepository.removeProductsFromNewArrivals(
        tx,
        newArrivalId,
        requestData.productIds,
        requestData.updatedBy,
      );
    });

    if (!result) {
      throw new AppError("Some products are not linked to this new arrival or are already removed");
    }

    return result;
  }

  async getOnlyNewArrivalProducts(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.newArrivalsRepository.getOnlyNewArrivalProducts(params);
  }
}
