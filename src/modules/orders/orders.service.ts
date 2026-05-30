import type { UpdateAvailableQuantityForFulfillmentRequest } from "./orders.schema";
import { NotFoundError, ValidationError } from "@/core/errors";

import { db } from "@/db";
import { OrdersRepository } from "./orders.repository";

export class OrdersService {
  private readonly ordersRepository: OrdersRepository;

  constructor() {
    this.ordersRepository = new OrdersRepository();
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
  async getOrdersToFulfill(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.ordersRepository.getOrdersToFulfill(params);
  }

  async getOrderDetailsForACustomer(
    customerId: number,
    params: {
      search?: string;
      page: number;
      limit: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      filters?: Record<string, any>;
    },
  ) {
    return await this.ordersRepository.getOrderDetailsForACustomerToFulfil(
      customerId,
      params,
    );
  }

  /**
   * Update available quantity for a variant
   *
   * @param orderItemData - Available quantity data
   * @returns The updated available quantity object
   */
  async updateOrderItemQuantityForFulfillment(
    orderItemData: UpdateAvailableQuantityForFulfillmentRequest & { updatedBy: number },
  ) {
    // Check if the order item exists
    const existingOrderItem =
      await this.ordersRepository.findOrderItemByIds(
        orderItemData,
      );

    if (!existingOrderItem) {
      throw new NotFoundError("Order Item not found");
    }
    // If the Quantity Available is less than Quantity Asked then Notes is required field
    if (
      orderItemData.quantityAvailable < existingOrderItem.quantity &&
      !orderItemData.notes
    ) {
      throw new ValidationError(
        `Notes is required when Quantity Available(${orderItemData.quantityAvailable}) is less than Quantity Asked(${existingOrderItem.quantity})`,
      );
    }
    // Update the order item
    const updatedData = await db.transaction(async (tx) => {
      return await this.ordersRepository.updateOrderItem(
        tx,
        existingOrderItem.id,
        orderItemData,
      );
    });
    return updatedData;
  }
}

export const ordersService = new OrdersService();
