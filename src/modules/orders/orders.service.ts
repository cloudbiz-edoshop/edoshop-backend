import type {
  CheckoutDirectOrderRequest,
  UpdateAvailableQuantityForFulfillmentRequest,
} from "./orders.schema";
import {
  MOBILE_TRANSFER_PAYMENT_METHODS,
} from "@/constants/payment-methods.constants";
import { NotFoundError, ValidationError } from "@/core/errors";
import campayConfig from "@/config/campay.config";
import { campayService } from "@/modules/campay/campay.service";

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

  async checkoutDirectOrder(
    userId: number,
    payload: CheckoutDirectOrderRequest,
  ) {
    const customer = await this.ordersRepository.findCustomerByUserId(userId);
    if (!customer) {
      throw new NotFoundError("Customer profile not found for this account");
    }

    if (!payload.paymentMethodId) {
      throw new ValidationError("Payment method is required");
    }

    const paymentMethod = await this.ordersRepository.findPaymentMethodById(
      payload.paymentMethodId,
    );
    if (!paymentMethod) {
      throw new ValidationError("Selected payment method is not available");
    }

    const isMobileTransfer = (
      MOBILE_TRANSFER_PAYMENT_METHODS as readonly string[]
    ).includes(paymentMethod.name);
    const payOnDelivery = payload.payOnDelivery ?? false;

    const checkout = await this.ordersRepository.createDirectOrderCheckout({
      userId,
      customerId: customer.id,
      paymentMethodId: payload.paymentMethodId,
      payOnDelivery,
      paymentPending: isMobileTransfer && !payOnDelivery && campayConfig.enabled,
      billing: payload.billing,
      items: payload.items,
    });

    if (isMobileTransfer && !payOnDelivery && campayConfig.enabled) {
      const collect = await campayService.initCollect({
        amount: Number(checkout.totalAmount),
        phone: payload.billing.whatsappNumber,
        description: `Edoshop order ${checkout.orderCode}`,
        externalReference: checkout.orderCode,
      });

      if (!collect.reference) {
        throw new ValidationError("Unable to initiate mobile money payment");
      }

      await this.ordersRepository.updatePaymentTransactionReference(
        checkout.paymentTransactionId,
        collect.reference,
        userId,
      );

      return {
        ...checkout,
        transactionReference: collect.reference,
        campayReference: collect.reference,
        campayStatus: String(collect.status || "PENDING").toUpperCase(),
        campayOperator: collect.operator ?? null,
        campayUssdCode: collect.ussd_code ?? null,
      };
    }

    if (isMobileTransfer && !payOnDelivery && !campayConfig.enabled) {
      throw new ValidationError("Mobile money payments are not configured yet");
    }

    return checkout;
  }
}

export const ordersService = new OrdersService();
