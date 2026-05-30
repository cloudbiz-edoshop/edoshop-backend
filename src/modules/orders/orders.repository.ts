import type { OrderDetailsForCustomerToFulfill, OrdersToFulfill } from "./orders.schema";

import type { UpdateOrderItems } from "@/db/models/order-items";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, like, not, or, sql } from "drizzle-orm";
import { OrderStatusTypeIds } from "@/constants";
import { OrderItemFulfillmentStatusIds } from "@/constants/order-item-fulfillment-statuses.constants";
import db from "@/db";
import {
  addresses,
  cities,
  countries,
  customers,
  orderFulfillmentStatuses,
  orderItemFulfillmentStatuses,
  orderItems,
  orders,
  shippingPriorityCodes,
} from "@/db/models";
import {
  createFilterConditions,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for orders-related database operations
 */
export class OrdersRepository {
  /**
   * Get orders to fulfill with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of orders to fulfill and total count
   * @returns {{ data: OrdersToFulfill[], total: number, searchableFields: string[] }} - List of orders to fulfill and total count
   */
  async getOrdersToFulfill(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, unknown>;
  }) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;

    // Define searchable fields for global search
    const searchableFields = ["customerCode"];

    // Prepare where conditions
    const filterCondition = createFilterConditions(orders, filters);

    // Custom search condition to handle joined tables
    const searchConditions = [];
    if (search) {
      // Search in orders table and customers table
      searchConditions.push(
        like(customers.customerCode, `%${search}%`),
      );
    }

    const searchCondition =
      searchConditions.length > 0 ? or(...searchConditions) : undefined;

    // Combine conditions
    const whereConditions = [];
    // push order status filter to include only orders that are "Ready for Fulfillment"
    whereConditions.push(eq(orders.statusId, OrderStatusTypeIds.READY_FOR_FULFILLMENT));
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get pagination params
    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    // Create sort condition
    // sorting based on customerCode from customers table
    const sortCondition = createSortCondition(customers, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total records
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(whereClause || sql`TRUE`);

      // Fetch data with filtering, pagination and sorting
      const ordersData = await tx
        .select({
          id: orders.id,
          createdAt: orders.createdAt,
          customerId: orders.customerId,
          customerCode: customers.customerCode,
          shippingPriority: shippingPriorityCodes.code,
        })
        .from(orders)
        .innerJoin(customers, eq(orders.customerId, customers.id))
        .leftJoin(
          shippingPriorityCodes,
          eq(orders.shippingPriorityCodeId, shippingPriorityCodes.id),
        )
        .where(whereClause)
        .limit(limitVal)
        .offset(offset)
        .orderBy(sortCondition ?? desc(orders.createdAt));

      const formattedOrders: OrdersToFulfill = ordersData.map((order) => {
        return {
          orderId: order.id,
          customerId: order.customerId,
          customerCode: order.customerCode,
          shippingPriority: order.shippingPriority ?? "N/A",
          createdAt: order.createdAt,
        };
      });

      return { data: formattedOrders, total: totalCount, searchableFields };
    });
  }

  /**
   * Get customer order details with product variants and pricing
   * Retrieves detailed information about all orders for a specific customer
   *
   * @param customerId - Customer ID
   * @param params - Search parameters
   * @param params.search - Search term
   * @param params.page - Page number
   * @param params.limit - Items per page
   * @param params.sortBy - Sort field
   * @param params.sortOrder - Sort order
   * @param params.filters - Additional filters
   * @returns Promise containing array of order items with product and variant details
   */
  async getOrderDetailsForACustomerToFulfil(
    customerId: number,
    params: {
      search?: string;
      page: number;
      limit: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      filters?: Record<string, unknown>;
    },
  ) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;

    // Define searchable fields
    const searchableFields = ["productCode", "variantCode", "variantColor", "variantSize", "orderCode"];

    // Prepare where conditions
    const whereConditions = [eq(orders.customerId, customerId), not(eq(orderItems.fulfillmentStatusId, OrderItemFulfillmentStatusIds.FULLY_FULFILLED))]; // Only include orders that are not fully fulfilled

    // Add other filters if needed
    const filterCondition = createFilterConditions(orders, filters);
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }

    // Search condition - using snapshot fields from order_items
    const searchConditions = [];
    if (search) {
      searchConditions.push(
        like(orderItems.variantCode, `%${search}%`),
        like(orderItems.productCode, `%${search}%`),
        like(orderItems.colorName, `%${search}%`),
        like(orderItems.sizeName, `%${search}%`),
        like(orders.orderCode, `%${search}%`),
      );
    }

    const searchCondition =
      searchConditions.length > 0 ? or(...searchConditions) : undefined;
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause = and(...whereConditions);

    // Pagination
    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    // Sorting - using snapshot fields from order_items
    const sortFieldMap = {
      productCode: { table: orderItems, field: "productCode" },
      variantCode: { table: orderItems, field: "variantCode" },
      variantColor: { table: orderItems, field: "colorName" },
      variantSize: { table: orderItems, field: "sizeName" },
      price: { table: orderItems, field: "unitPrice" },
      orderCode: { table: orders, field: "orderCode" },
    };

    const sortConfig = sortBy && sortFieldMap[sortBy as keyof typeof sortFieldMap];
    const sortCondition = sortConfig
      ? createSortCondition(sortConfig.table, sortConfig.field, sortOrder)
      : createSortCondition(orders, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      // Count total
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(whereClause || sql`TRUE`);

      // Fetch data - using snapshot fields from order_items instead of joins
      const data = await tx
        .select({
          id: orderItems.id,
          productId: orderItems.productId,
          variantId: orderItems.variantId,
          orderId: orders.id,
          orderCode: orders.orderCode,
          price: orderItems.unitPrice,
          quantityAsked: orderItems.quantity,
          quantityPacked: orderItems.quantityPacked,
          quantityAvailable: orderItems.quantityAvailable,
          deliveryAddress: sql<string>`concat_ws(', ',
            CASE WHEN ${addresses.streetAddress} IS NOT NULL THEN ${addresses.streetAddress} || '' END,
            CASE WHEN ${addresses.landmark} IS NOT NULL THEN ${addresses.landmark} || '' END
          )`,
          notes: orderItems.notes,
          // Using snapshot fields captured at order time
          productCode: orderItems.productCode,
          variantCode: orderItems.variantCode,
          variantColor: orderItems.colorName,
          variantSize: orderItems.sizeName,
          imageUrl: orderItems.productImageUrl,
          productName: orderItems.productName,
          createdAt: orders.createdAt,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .innerJoin(addresses, eq(orders.shippingAddressId, addresses.id))
        .leftJoin(countries, eq(addresses.countryId, countries.id))
        .leftJoin(cities, eq(addresses.cityId, cities.id))
        .where(whereClause)
        .limit(limitVal)
        .offset(offset)
        .orderBy(sortCondition ?? desc(orders.createdAt));

      // Map to schema
      const formattedData: OrderDetailsForCustomerToFulfill = data.map((item) => {
        // calculate fulfillment time as difference between order createdAt and current time
        const createdAt = new Date(item.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - createdAt.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          id: item.id,
          productId: item.productId,
          productCode: item.productCode ?? "N/A",
          variantId: item.variantId,
          variantCode: item.variantCode,
          orderId: item.orderId,
          orderCode: item.orderCode,
          image: item.imageUrl,
          price: item.price,
          variantSize: item.variantSize,
          variantColor: item.variantColor,
          quantityAsked: item.quantityAsked,
          quantityPacked: item.quantityPacked,
          quantityAvailable: item.quantityAvailable,
          fulfillmentTime: `${diffDays} day(s)`,
          deliveryAddress: item.deliveryAddress,
          note: item.notes as string,
          createdAt: item.createdAt,
        };
      });

      return { data: formattedData, total: totalCount, searchableFields };
    });
  }

  /**
   * Find an order by code
   *
   * @param code - Order code
   * @returns The order object or null if not found
   */
  async findByCode(code: string) {
    const result = await db.query.orders.findFirst({
      where: eq(orders.orderCode, code),
    });

    return result;
  }

  /**
   * Find an order Item by ID
   *
   * @param id - Order Item ID
   * @returns The order item object or null if not found
   */
  async findOrderItemById(id: number) {
    const result = await db.query.orderItems.findFirst({
      where: eq(orderItems.id, id),
    });

    return result;
  }

  /**
   * Get order items by their IDs
   *
   * @param orderItemIds - Array of order item IDs
   * @returns Array of order items with order and customer information
   */
  async getOrderItemsByIds(orderItemIds: number[]) {
    const orderItemsWithCustomer = await db.query.orderItems.findMany({
      where: inArray(orderItems.id, orderItemIds),
      with: {
        order: {
          columns: {
            id: true,
            customerId: true,
            orderCode: true,
            fulfillmentStatusId: true,
          },
        },
        fulfillmentStatus: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });
    return orderItemsWithCustomer;
  }

  /**
   * Get all order items for specific orders
   *
   * @param orderIds - Array of order IDs
   * @returns Array of order items for those orders
   */
  async getOrderItemsByOrderIds(orderIds: number[]) {
    return await db.query.orderItems.findMany({
      where: inArray(orderItems.orderId, orderIds),
    });
  }

  /**
   * Get orders by IDs
   *
   * @param orderIds - Array of order IDs
   * @returns Array of orders with fulfillment status
   */
  async getOrdersByIds(orderIds: number[]) {
    return await db.query.orders.findMany({
      where: inArray(orders.id, orderIds),
      with: {
        fulfillmentStatus: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get fulfillment status by name
   *
   * @param name - Status name
   * @returns Fulfillment status object
   */
  async getOrderFulfillmentStatusByName(name: string) {
    return await db.query.orderFulfillmentStatuses.findFirst({
      where: eq(orderFulfillmentStatuses.name, name),
    });
  }

  /**
   * Get order item fulfillment status by name
   *
   * @param name - Status name
   * @returns Order item fulfillment status object
   */
  async getOrderItemFulfillmentStatusByName(name: string) {
    return await db.query.orderItemFulfillmentStatuses.findFirst({
      where: eq(orderItemFulfillmentStatuses.name, name),
    });
  }

  /**
   * Find an order Item by order, product, and variant IDs
   *
   * @param orderData - Order Data
   * @param orderData.orderId - Order ID
   * @param orderData.productId - Product ID
   * @param orderData.variantId - Variant ID
   * @returns The order item object or null if not found
   */
  async findOrderItemByIds({ orderId, productId, variantId }: { orderId: number; productId: number; variantId: number }) {
    const result = await db.query.orderItems.findFirst({
      where: and(
        eq(orderItems.orderId, orderId),
        eq(orderItems.productId, productId),
        eq(orderItems.variantId, variantId),
      ),
    });

    return result;
  }

  /**
   *  Update an order item
   *
   * @param tx - Transaction
   * @param id - order ID to update
   * @param orderItemData - Order item data
   * @returns The updated order item object
   */
  async updateOrderItem(tx: TX, id: number, orderItemData: UpdateOrderItems & { updatedBy: number }) {
    const [result] = await tx
      .update(orderItems)
      .set({
        ...orderItemData,
        updatedBy: orderItemData.updatedBy,
      })
      .where(eq(orderItems.id, id))
      .returning();
    return result;
  }
}
