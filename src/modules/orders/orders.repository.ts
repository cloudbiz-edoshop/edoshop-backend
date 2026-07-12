import type { OrderDetailsForCustomerToFulfill, OrdersToFulfill } from "./orders.schema";

import type { UpdateOrderItems } from "@/db/models/order-items";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, like, ne, not, or, sql } from "drizzle-orm";
import { OrderStatusTypeIds } from "@/constants";
import { AddressTypeIds } from "@/constants/address-types.constants";
import { OrderItemFulfillmentStatusIds } from "@/constants/order-item-fulfillment-statuses.constants";
import { OrderTypeIds } from "@/constants/order-types.constants";
import { PAYMENT_STATUSES } from "@/constants/payment-statuses.constants";
import db from "@/db";
import {
  addresses,
  cities,
  countries,
  customers,
  bundles as sourceBundles,
  items as inventoryItems,
  orderFulfillmentStatuses,
  orderItemFulfillmentStatuses,
  orderItems,
  orderTypes,
  orders,
  paymentMethods,
  paymentStatuses,
  paymentTransactions,
  shippingPriorityCodes,
  series,
  trackingBundleHistory,
  trackingBundles,
  trackingSteps,
  users,
  variants,
  warehouses,
} from "@/db/models";
import { buildBundleBasedTracking, buildDetailedOrderTracking } from "./order-tracking.util";
import {
  computeDirectOrderShippingFee,
  FulfillmentMethod,
} from "@/constants/fulfillment.constants";
import {
  createFilterConditions,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

const PLACEHOLDER_IMAGE_HOSTS = ["example.com"];

const sanitizeOrderImageUrl = (url?: string | null) => {
  if (!url) return null;
  if (PLACEHOLDER_IMAGE_HOSTS.some((host) => url.includes(host))) {
    return null;
  }
  return url;
};

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
          orderCode: orders.orderCode,
          totalAmount: orders.totalAmount,
          createdAt: orders.createdAt,
          customerId: orders.customerId,
          customerCode: customers.customerCode,
          customerName: users.fullName,
          shippingPriority: shippingPriorityCodes.code,
          orderTypeName: orderTypes.name,
          paymentMethodName: paymentMethods.description,
          paymentMethodRawName: paymentMethods.name,
          paymentStatusName: sql<string | null>`(
            SELECT ${paymentStatuses.name}
            FROM ${paymentTransactions}
            INNER JOIN ${paymentStatuses}
              ON ${paymentTransactions.paymentStatusId} = ${paymentStatuses.id}
            WHERE ${paymentTransactions.orderId} = ${orders.id}
              AND ${paymentTransactions.isDeleted} = false
            ORDER BY ${paymentTransactions.createdAt} DESC
            LIMIT 1
          )`.as("paymentStatusName"),
        })
        .from(orders)
        .innerJoin(customers, eq(orders.customerId, customers.id))
        .innerJoin(users, eq(customers.userId, users.id))
        .leftJoin(
          shippingPriorityCodes,
          eq(orders.shippingPriorityCodeId, shippingPriorityCodes.id),
        )
        .leftJoin(orderTypes, eq(orders.orderTypeId, orderTypes.id))
        .leftJoin(paymentMethods, eq(orders.paymentMethodId, paymentMethods.id))
        .where(whereClause)
        .limit(limitVal)
        .offset(offset)
        .orderBy(sortCondition ?? desc(orders.createdAt));

      const formatOrderType = (value?: string | null) => {
        if (!value) return "Direct Order";
        const labels: Record<string, string> = {
          direct_order: "Direct Order",
          dropshipping: "Dropshipping",
        };
        return labels[value] ?? value;
      };

      const formattedOrders: OrdersToFulfill = ordersData.map((order) => {
        return {
          orderId: order.id,
          orderCode: order.orderCode,
          customerId: order.customerId,
          customerCode: order.customerCode,
          customerName: order.customerName ?? undefined,
          shippingPriority: order.shippingPriority ?? "N/A",
          orderType: formatOrderType(order.orderTypeName),
          totalAmount: order.totalAmount ?? undefined,
          amount: order.totalAmount ?? undefined,
          paymentMethod:
            order.paymentMethodName
            ?? order.paymentMethodRawName
            ?? undefined,
          paymentStatus: order.paymentStatusName ?? "Pending",
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

  async findCustomerByUserId(userId: number) {
    return await db.query.customers.findFirst({
      where: eq(customers.userId, userId),
    });
  }

  async findPaymentMethodById(id: number) {
    return await db.query.paymentMethods.findFirst({
      where: and(eq(paymentMethods.id, id), eq(paymentMethods.isDeleted, false)),
    });
  }

  async findCountryByName(name: string) {
    return await db.query.countries.findFirst({
      where: sql`lower(${countries.name}) = lower(${name})`,
    });
  }

  async resolveVariantForCheckout(params: {
    productId: number;
    variantId?: number;
    color?: string;
    size?: string;
  }) {
    if (params.variantId) {
      const variant = await db.query.variants.findFirst({
        where: and(
          eq(variants.id, params.variantId),
          eq(variants.productId, params.productId),
          eq(variants.isDeleted, false),
        ),
        with: {
          color: true,
          size: true,
          product: true,
        },
      });
      if (variant) return variant;
    }

    const productVariants = await db.query.variants.findMany({
      where: and(
        eq(variants.productId, params.productId),
        eq(variants.isDeleted, false),
      ),
      with: {
        color: true,
        size: true,
        product: true,
      },
    });

    const normalizedColor = String(params.color ?? "").trim().toLowerCase();
    const normalizedSize = String(params.size ?? "").trim().toLowerCase();

    const matched = productVariants.find((variant) => {
      const colorName = String(variant.color?.name ?? "").trim().toLowerCase();
      const sizeName = String(variant.size?.name ?? "").trim().toLowerCase();
      const colorMatches = !normalizedColor || colorName === normalizedColor;
      const sizeMatches = !normalizedSize || sizeName === normalizedSize;
      return colorMatches && sizeMatches;
    });

    return matched ?? productVariants[0] ?? null;
  }

  async createDirectOrderCheckout(params: {
    userId: number;
    customerId: number;
    paymentMethodId: number;
    payOnDelivery: boolean;
    paymentPending?: boolean;
    fulfillmentMethod?: string;
    pickupWarehouseId?: number;
    shippingPriorityCodeId?: number;
    billing: {
      firstName: string;
      lastName: string;
      email: string;
      whatsappNumber: string;
      country: string;
      city: string;
      streetAddress?: string;
      apartmentAddress?: string;
      orderNotes?: string;
      latitude?: string | number;
      longitude?: string | number;
    };
    items: Array<{
      productId: number;
      variantId?: number;
      quantity: number;
      unitPrice: number;
      color?: string;
      size?: string;
    }>;
  }) {
    const fulfillmentMethod =
      params.fulfillmentMethod === FulfillmentMethod.PICKUP
        ? FulfillmentMethod.PICKUP
        : FulfillmentMethod.DELIVERY;

    const country =
      (await this.findCountryByName(params.billing.country))
      ?? (await db.query.countries.findFirst({ where: eq(countries.id, 1) }));

    if (!country) {
      throw new Error("Country not found");
    }

    let pickupWarehouse: Awaited<
      ReturnType<typeof db.query.warehouses.findFirst>
    > = null;

    const mapLatitude = Number(params.billing.latitude);
    const mapLongitude = Number(params.billing.longitude);
    const mapCoordinates =
      Number.isFinite(mapLatitude)
      && Number.isFinite(mapLongitude)
      && (mapLatitude !== 0 || mapLongitude !== 0)
        ? `${mapLatitude}, ${mapLongitude}`
        : null;

    if (fulfillmentMethod === FulfillmentMethod.PICKUP) {
      if (params.pickupWarehouseId) {
        pickupWarehouse = await db.query.warehouses.findFirst({
          where: and(
            eq(warehouses.id, params.pickupWarehouseId),
            eq(warehouses.isActive, true),
            eq(warehouses.isDeleted, false),
          ),
          with: {
            address: {
              with: {
                country: true,
              },
            },
          },
        });
      }

      if (!pickupWarehouse) {
        pickupWarehouse = await db.query.warehouses.findFirst({
          where: and(
            eq(warehouses.isActive, true),
            eq(warehouses.isDeleted, false),
          ),
          with: {
            address: {
              with: {
                country: true,
              },
            },
          },
          orderBy: [warehouses.name],
        });
      }

      if (!pickupWarehouse) {
        throw new Error("Selected pickup location is not available");
      }
    }

    const deliveryStreetAddress = [
      params.billing.streetAddress,
      params.billing.apartmentAddress,
    ]
      .filter(Boolean)
      .join(", ");

    const pickupStreetAddress = mapCoordinates
      ? `Pickup map location (${mapCoordinates})`
      : pickupWarehouse?.address?.streetAddress
        ? [
            pickupWarehouse.name,
            pickupWarehouse.address.streetAddress,
            pickupWarehouse.address.landmark,
          ]
            .filter(Boolean)
            .join(", ")
        : pickupWarehouse?.name ?? "Edoshop Store Pickup";

    const streetAddress =
      fulfillmentMethod === FulfillmentMethod.PICKUP
        ? pickupStreetAddress
        : deliveryStreetAddress || (mapCoordinates ? `Delivery map location (${mapCoordinates})` : "");

    const city =
      fulfillmentMethod === FulfillmentMethod.PICKUP
        ? mapCoordinates
          || pickupWarehouse?.address?.landmark
          || params.billing.city
        : params.billing.city;

    const shippingCountryId =
      fulfillmentMethod === FulfillmentMethod.PICKUP
        ? pickupWarehouse?.address?.countryId ?? country.id
        : country.id;

    const now = new Date().toISOString();
    const orderCode = `ORD-${now.slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const resolvedItems = [];
    for (const item of params.items) {
      const variant = await this.resolveVariantForCheckout(item);
      if (!variant?.product) {
        throw new Error(`Variant not found for product ${item.productId}`);
      }

      const unitPrice = item.unitPrice.toFixed(2);
      const lineSubtotal = (item.unitPrice * item.quantity).toFixed(2);
      resolvedItems.push({
        variant,
        quantity: item.quantity,
        unitPrice,
        lineSubtotal,
      });
    }

    const subtotal = resolvedItems
      .reduce((sum, item) => sum + Number(item.lineSubtotal), 0)
      .toFixed(2);
    const shippingPriorityCodeId =
      fulfillmentMethod === FulfillmentMethod.DELIVERY
        ? params.shippingPriorityCodeId ?? 1
        : null;
    const shippingAmount = computeDirectOrderShippingFee(
      fulfillmentMethod,
      shippingPriorityCodeId,
    ).toFixed(2);
    const totalAmount = (
      Number(subtotal) + Number(shippingAmount)
    ).toFixed(2);

    const orderNotes = [
      params.billing.orderNotes,
      fulfillmentMethod === FulfillmentMethod.PICKUP
        ? mapCoordinates
          ? `Pickup map location: ${mapCoordinates}`
          : `Pickup at ${pickupWarehouse?.name ?? "Edoshop store"}`
        : mapCoordinates
          ? `Delivery map location: ${mapCoordinates}`
          : null,
    ]
      .filter(Boolean)
      .join(" | ");

    return await db.transaction(async (tx) => {
      const [shippingAddress] = await tx
        .insert(addresses)
        .values({
          userId: params.userId,
          addressTypeId: AddressTypeIds.SHIPPING,
          streetAddress,
          countryId: shippingCountryId,
          landmark: city,
          createdBy: params.userId,
          updatedBy: params.userId,
        })
        .returning();

      const [billingAddress] = await tx
        .insert(addresses)
        .values({
          userId: params.userId,
          addressTypeId: AddressTypeIds.BILLING,
          streetAddress:
            fulfillmentMethod === FulfillmentMethod.DELIVERY
              ? deliveryStreetAddress || streetAddress
              : streetAddress,
          countryId: country.id,
          landmark: params.billing.city,
          createdBy: params.userId,
          updatedBy: params.userId,
        })
        .returning();

      const [order] = await tx
        .insert(orders)
        .values({
          customerId: params.customerId,
          orderCode,
          statusId: OrderStatusTypeIds.READY_FOR_FULFILLMENT,
          fulfillmentStatusId: 1,
          orderTypeId: OrderTypeIds.DIRECT_ORDER,
          shippingAddressId: shippingAddress.id,
          shippingPriorityCodeId,
          billingAddressId: billingAddress.id,
          paymentMethodId: params.paymentMethodId,
          fulfillmentMethod,
          pickupWarehouseId:
            fulfillmentMethod === FulfillmentMethod.PICKUP
              ? params.pickupWarehouseId ?? pickupWarehouse?.id ?? null
              : null,
          subtotal,
          taxAmount: "0.00",
          shippingAmount,
          discountAmount: "0.00",
          totalAmount,
          notes: orderNotes || null,
          createdBy: params.userId,
          updatedBy: params.userId,
        })
        .returning();

      for (const item of resolvedItems) {
        const { variant } = item;
        await tx.insert(orderItems).values({
          orderId: order.id,
          productId: variant.productId,
          variantId: variant.id,
          fulfillmentStatusId: OrderItemFulfillmentStatusIds.PENDING,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subTotal: item.lineSubtotal,
          productName: variant.product?.name ?? "Product",
          productCode: variant.variantCode ?? null,
          variantCode: variant.variantCode,
          colorName: variant.color?.name ?? "N/A",
          sizeName: variant.size?.name ?? "N/A",
          productImageUrl: variant.product?.imageUrls?.[0] ?? null,
          createdBy: params.userId,
          updatedBy: params.userId,
        });
      }

      const paymentStatus = await tx.query.paymentStatuses.findFirst({
        where: eq(
          paymentStatuses.name,
          params.payOnDelivery || params.paymentPending
            ? PAYMENT_STATUSES.PENDING
            : PAYMENT_STATUSES.COMPLETED,
        ),
      });

      if (!paymentStatus) {
        throw new Error("Payment status not found");
      }

      const transactionReference = `TXN-${order.orderCode}-${Date.now()}`;

      const [paymentTransaction] = await tx.insert(paymentTransactions).values({
        orderId: order.id,
        amount: totalAmount,
        paymentMethodId: params.paymentMethodId,
        paymentStatusId: paymentStatus.id,
        transactionReference,
        transactionDate: now,
        createdBy: params.userId,
        updatedBy: params.userId,
      }).returning();

      const paymentMethod = await tx.query.paymentMethods.findFirst({
        where: eq(paymentMethods.id, params.paymentMethodId),
      });

      return {
        orderId: order.id,
        orderCode: order.orderCode,
        subtotal,
        shippingAmount,
        fulfillmentMethod,
        totalAmount,
        paymentTransactionId: paymentTransaction.id,
        transactionReference,
        paymentMethod:
          paymentMethod?.description
          ?? paymentMethod?.name
          ?? "N/A",
        paymentStatus: paymentStatus.name,
      };
    });
  }

  async getPickupLocations() {
    const rows = await db.query.warehouses.findMany({
      where: and(eq(warehouses.isActive, true), eq(warehouses.isDeleted, false)),
      with: {
        address: {
          with: {
            country: true,
          },
        },
      },
      orderBy: [warehouses.name],
    });

    return rows.map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.name,
      description: warehouse.description,
      address: [
        warehouse.address?.streetAddress,
        warehouse.address?.landmark,
        warehouse.address?.country?.name,
      ]
        .filter(Boolean)
        .join(", "),
    }));
  }

  async getCustomerOrders(
    userId: number,
    params: { page: number; limit: number; cancelled?: boolean; trackableOnly?: boolean },
  ) {
    const customer = await this.findCustomerByUserId(userId);
    if (!customer) {
      return { data: [], total: 0 };
    }

    const { limit, offset } = getPaginationValues(params.page, params.limit);
    const statusFilter =
      params.cancelled === true
        ? eq(orders.statusId, OrderStatusTypeIds.CANCELLED)
        : params.cancelled === false
          ? ne(orders.statusId, OrderStatusTypeIds.CANCELLED)
          : undefined;

    const terminalStatusIds = [
      OrderStatusTypeIds.DELIVERED,
      OrderStatusTypeIds.CANCELLED,
      OrderStatusTypeIds.REFUNDED,
      OrderStatusTypeIds.RETURNED,
    ];

    let trackableOrderIds: number[] | undefined;
    const bundleByOrderId = new Map<number, { bundleCode: string; currentStepLabel: string | null }>();

    if (params.trackableOnly) {
      const bundleAssignments = await db
        .select({
          orderId: orderItems.orderId,
          bundleCode: trackingBundles.bundleCode,
          currentStepLabel: trackingSteps.label,
        })
        .from(orderItems)
        .innerJoin(variants, eq(orderItems.variantId, variants.id))
        .innerJoin(inventoryItems, eq(variants.itemId, inventoryItems.id))
        .innerJoin(series, eq(inventoryItems.seriesId, series.id))
        .innerJoin(trackingBundles, eq(trackingBundles.sourceBundleId, series.bundleId))
        .innerJoin(
          trackingSteps,
          eq(trackingBundles.currentStepId, trackingSteps.id),
        )
        .where(eq(trackingBundles.status, "active"));

      trackableOrderIds = bundleAssignments.map((row) => row.orderId);
      for (const row of bundleAssignments) {
        bundleByOrderId.set(row.orderId, {
          bundleCode: row.bundleCode,
          currentStepLabel: row.currentStepLabel,
        });
      }

      if (!trackableOrderIds.length) {
        return { data: [], total: 0 };
      }
    }

    const whereClause = and(
      eq(orders.customerId, customer.id),
      eq(orders.isDeleted, false),
      ...(statusFilter ? [statusFilter] : []),
      ...(params.trackableOnly
        ? [
            inArray(orders.id, trackableOrderIds!),
            not(inArray(orders.statusId, terminalStatusIds)),
          ]
        : []),
    );

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(orders)
      .where(whereClause);

    const rows = await db.query.orders.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(orders.createdAt)],
      with: {
        orderStatus: true,
        orderType: true,
        orderItems: true,
        paymentTransactions: {
          with: {
            paymentStatus: true,
          },
        },
      },
    });

    return {
      total,
      data: rows.map((order) => ({
        id: order.id,
        orderCode: order.orderCode,
        orderType: order.orderType?.name,
        fulfillmentMethod: order.fulfillmentMethod ?? FulfillmentMethod.DELIVERY,
        status: order.orderStatus?.name ?? "pending",
        paymentStatus:
          order.paymentTransactions?.[0]?.paymentStatus?.name ?? undefined,
        totalAmount: String(order.totalAmount),
        shippingAmount: String(order.shippingAmount ?? "0"),
        createdAt: order.createdAt,
        itemCount: order.orderItems?.length ?? 0,
        previewImages: (order.orderItems ?? [])
          .map((item) => sanitizeOrderImageUrl(item.productImageUrl))
          .filter((url): url is string => Boolean(url))
          .slice(0, 4),
        bundleCode: bundleByOrderId.get(order.id)?.bundleCode ?? null,
        currentStepLabel: bundleByOrderId.get(order.id)?.currentStepLabel ?? null,
      })),
    };
  }

  async getCustomerOrderTracking(userId: number, orderCode: string) {
    const customer = await this.findCustomerByUserId(userId);
    if (!customer) {
      return null;
    }

    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.orderCode, orderCode),
        eq(orders.customerId, customer.id),
        eq(orders.isDeleted, false),
      ),
      with: {
        orderStatus: true,
        orderType: true,
        orderItems: true,
        paymentMethod: true,
        shippingAddress: {
          with: {
            country: true,
          },
        },
        billingAddress: {
          with: {
            country: true,
          },
        },
        pickupWarehouse: {
          with: {
            address: {
              with: {
                country: true,
              },
            },
          },
        },
        paymentTransactions: {
          with: {
            paymentStatus: true,
          },
        },
      },
    });

    if (!order) {
      return null;
    }

    const formatAddress = (
      address?: {
        streetAddress?: string | null;
        landmark?: string | null;
        country?: { name?: string | null } | null;
      } | null,
    ) => {
      if (!address) return null;
      return [
        address.streetAddress,
        address.landmark,
        address.country?.name,
      ]
        .filter(Boolean)
        .join(", ");
    };

    const pickupLocation =
      order.fulfillmentMethod === FulfillmentMethod.PICKUP
        ? [
            order.pickupWarehouse?.name,
            formatAddress(order.pickupWarehouse?.address ?? null),
          ]
            .filter(Boolean)
            .join(" — ")
        : null;

    const allSteps = await db.query.trackingSteps.findMany({
      orderBy: [trackingSteps.stepOrder],
    });
    const bundlePhaseSteps = allSteps.filter((step) => step.stepOrder <= 6);

    const bundleRows = await db
      .select({
        sourceBundleId: sourceBundles.id,
        bundleCode: sourceBundles.bundleCode,
        bundleCreatedAt: sourceBundles.createdAt,
        trackingBundleId: trackingBundles.id,
        trackingCreatedAt: trackingBundles.createdAt,
        currentStepOrder: trackingSteps.stepOrder,
        currentStepLabel: trackingSteps.label,
        orderItemId: orderItems.id,
      })
      .from(orderItems)
      .innerJoin(variants, eq(orderItems.variantId, variants.id))
      .innerJoin(inventoryItems, eq(variants.itemId, inventoryItems.id))
      .innerJoin(series, eq(inventoryItems.seriesId, series.id))
      .innerJoin(sourceBundles, eq(series.bundleId, sourceBundles.id))
      .leftJoin(trackingBundles, eq(trackingBundles.sourceBundleId, sourceBundles.id))
      .leftJoin(trackingSteps, eq(trackingBundles.currentStepId, trackingSteps.id))
      .where(eq(orderItems.orderId, order.id));

    const bundleBySourceId = new Map<number, {
      sourceBundleId: number;
      bundleCode: string;
      trackingBundleId: number | null;
      createdAt: string;
      currentStepOrder: number;
      currentStepLabel: string | null;
      orderItemIds: number[];
    }>();

    for (const row of bundleRows) {
      const existing = bundleBySourceId.get(row.sourceBundleId) ?? {
        sourceBundleId: row.sourceBundleId,
        bundleCode: row.bundleCode,
        trackingBundleId: row.trackingBundleId,
        createdAt: row.trackingCreatedAt ?? row.bundleCreatedAt,
        currentStepOrder: row.currentStepOrder ?? 3,
        currentStepLabel: row.currentStepLabel ?? "Order Received By Manufacturer",
        orderItemIds: [],
      };
      existing.orderItemIds.push(row.orderItemId);
      bundleBySourceId.set(row.sourceBundleId, existing);
    }

    const bundleGroupsBase = [...bundleBySourceId.values()];
    const trackingBundleIds = bundleGroupsBase
      .map((bundle) => bundle.trackingBundleId)
      .filter((id): id is number => Boolean(id));

    const trackingHistoryRows = trackingBundleIds.length
      ? await db.query.trackingBundleHistory.findMany({
          where: inArray(trackingBundleHistory.bundleId, trackingBundleIds),
          with: {
            step: true,
            createdByUser: true,
          },
          orderBy: [desc(trackingBundleHistory.createdAt)],
        })
      : [];

    const historyByBundleId = new Map<number, typeof trackingHistoryRows>();
    for (const entry of trackingHistoryRows) {
      const entries = historyByBundleId.get(entry.bundleId) ?? [];
      entries.push(entry);
      historyByBundleId.set(entry.bundleId, entries);
    }

    const trackingGroups = bundleGroupsBase.map((bundle) => {
      const history = bundle.trackingBundleId
        ? historyByBundleId.get(bundle.trackingBundleId) ?? []
        : [];
      const details = buildBundleBasedTracking({
        currentStepOrder: bundle.currentStepOrder,
        steps: bundlePhaseSteps.map((step) => ({
          id: step.id,
          stepOrder: step.stepOrder,
          label: step.label,
          leg: step.leg,
          description: step.description,
        })),
        history: history.map((entry) => ({
          stepId: entry.stepId,
          createdAt: entry.createdAt,
        })),
        createdAt: bundle.createdAt,
      });

      return {
        sourceBundleId: bundle.sourceBundleId,
        trackingBundleId: bundle.trackingBundleId,
        bundleCode: bundle.bundleCode,
        currentStepLabel: bundle.currentStepLabel,
        orderItemIds: bundle.orderItemIds,
        trackingHistory: history.map((entry) => ({
          id: entry.id,
          stepLabel: entry.step?.label ?? "",
          notes: entry.notes,
          attachmentUrl: entry.attachmentUrl,
          createdAt: entry.createdAt,
          updatedByName: entry.createdByUser?.fullName ?? null,
        })),
        steps: details.steps,
        manufacturerToStoreSteps: details.manufacturerToStoreSteps,
        storeToCustomerSteps: details.storeToCustomerSteps,
      };
    });

    const slowestBundleTracking = bundleGroupsBase.length
      ? bundleGroupsBase.reduce((slowest, bundle) =>
          bundle.currentStepOrder < slowest.currentStepOrder ? bundle : slowest,
        )
      : null;
    const combinedTrackingHistory = trackingHistoryRows.map((entry) => ({
      id: entry.id,
      stepLabel: entry.step?.label ?? "",
      notes: entry.notes,
      attachmentUrl: entry.attachmentUrl,
      createdAt: entry.createdAt,
      updatedByName: entry.createdByUser?.fullName ?? null,
    }));
    const trackingDetails = slowestBundleTracking
      ? buildBundleBasedTracking({
          currentStepOrder: slowestBundleTracking.currentStepOrder,
          steps: bundlePhaseSteps.map((step) => ({
            id: step.id,
            stepOrder: step.stepOrder,
            label: step.label,
            leg: step.leg,
            description: step.description,
          })),
          history: (trackingHistoryRows ?? []).map((entry) => ({
            stepId: entry.stepId,
            createdAt: entry.createdAt,
          })),
          createdAt: slowestBundleTracking.createdAt ?? order.createdAt,
        })
      : buildDetailedOrderTracking({
          statusId: order.statusId,
          fulfillmentMethod: order.fulfillmentMethod ?? FulfillmentMethod.DELIVERY,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        });

    return {
      orderCode: order.orderCode,
      orderType: order.orderType?.name ?? undefined,
      fulfillmentMethod: order.fulfillmentMethod ?? FulfillmentMethod.DELIVERY,
      status: order.orderStatus?.name ?? "pending",
      paymentStatus:
        order.paymentTransactions?.[0]?.paymentStatus?.name ?? undefined,
      paymentMethod:
        order.paymentMethod?.description
        ?? order.paymentMethod?.name
        ?? undefined,
      placedAt: order.createdAt,
      totalAmount: String(order.totalAmount),
      subtotal: String(order.subtotal),
      shippingAmount: String(order.shippingAmount ?? "0"),
      pickupLocation,
      billingAddress: formatAddress(order.billingAddress),
      shippingAddress: formatAddress(order.shippingAddress),
      bundleCode: null,
      trackingHistory: combinedTrackingHistory,
      items: (order.orderItems ?? []).map((item) => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        subTotal: String(item.subTotal),
        productImageUrl: sanitizeOrderImageUrl(item.productImageUrl),
        sizeName: item.sizeName ?? undefined,
        colorName: item.colorName ?? undefined,
      })),
      steps: trackingDetails.steps,
      manufacturerToStoreSteps: trackingDetails.manufacturerToStoreSteps,
      storeToCustomerSteps: trackingDetails.storeToCustomerSteps,
    };
  }

  async requestPostCheckoutDelivery(params: {
    userId: number;
    orderCode: string;
    streetAddress: string;
    city?: string;
  }) {
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.orderCode, params.orderCode),
        eq(orders.isDeleted, false),
      ),
      with: {
        customer: true,
        billingAddress: true,
        paymentMethod: true,
      },
    });

    if (!order || order.customer?.userId !== params.userId) {
      return null;
    }
    if (order.fulfillmentMethod !== FulfillmentMethod.PICKUP) {
      throw new Error("Delivery can only be requested for pickup orders");
    }
    if (!order.paymentMethodId) {
      throw new Error("Order has no payment method for delivery fee payment");
    }

    const deliveryFee = computeDirectOrderShippingFee(FulfillmentMethod.DELIVERY);
    const currentShipping = Number(order.shippingAmount ?? 0);
    const additionalDeliveryFee = Math.max(deliveryFee - currentShipping, 0);
    if (additionalDeliveryFee <= 0) {
      throw new Error("Delivery fee is already paid for this order");
    }

    const now = new Date().toISOString();
    const paymentStatus = await db.query.paymentStatuses.findFirst({
      where: eq(paymentStatuses.name, PAYMENT_STATUSES.PENDING),
    });
    if (!paymentStatus) {
      throw new Error("Payment status not found");
    }

    return await db.transaction(async (tx) => {
      const [shippingAddress] = await tx
        .insert(addresses)
        .values({
          userId: params.userId,
          addressTypeId: AddressTypeIds.SHIPPING,
          streetAddress: params.streetAddress.trim(),
          countryId: order.billingAddress?.countryId ?? 1,
          cityId: order.billingAddress?.cityId ?? null,
          landmark: params.city?.trim() || order.billingAddress?.landmark || null,
          createdBy: params.userId,
          updatedBy: params.userId,
        })
        .returning();

      const newTotalAmount = (
        Number(order.totalAmount) + additionalDeliveryFee
      ).toFixed(2);
      const newShippingAmount = (
        Number(order.shippingAmount ?? 0) + additionalDeliveryFee
      ).toFixed(2);

      await tx
        .update(orders)
        .set({
          fulfillmentMethod: FulfillmentMethod.DELIVERY,
          pickupWarehouseId: null,
          shippingAddressId: shippingAddress.id,
          shippingAmount: newShippingAmount,
          totalAmount: newTotalAmount,
          notes: [
            order.notes,
            "Customer requested delivery after checkout",
          ].filter(Boolean).join(" | "),
          updatedAt: now,
          updatedBy: params.userId,
        })
        .where(eq(orders.id, order.id));

      const transactionReference = `DELIVERY-${order.orderCode}-${Date.now()}`;
      const [paymentTransaction] = await tx
        .insert(paymentTransactions)
        .values({
          orderId: order.id,
          amount: additionalDeliveryFee.toFixed(2),
          paymentMethodId: order.paymentMethodId,
          paymentStatusId: paymentStatus.id,
          transactionReference,
          transactionDate: now,
          createdBy: params.userId,
          updatedBy: params.userId,
        })
        .returning();

      return {
        orderId: order.id,
        orderCode: order.orderCode,
        fulfillmentMethod: FulfillmentMethod.DELIVERY,
        deliveryFee: additionalDeliveryFee.toFixed(2),
        shippingAmount: newShippingAmount,
        totalAmount: newTotalAmount,
        paymentTransactionId: paymentTransaction.id,
        transactionReference,
        paymentMethod:
          order.paymentMethod?.description
          ?? order.paymentMethod?.name
          ?? "N/A",
        paymentMethodName: order.paymentMethod?.name ?? null,
        paymentStatus: paymentStatus.name,
      };
    });
  }

  async findPaymentMethodByName(name: string) {
    return await db.query.paymentMethods.findFirst({
      where: and(
        eq(paymentMethods.name, name),
        eq(paymentMethods.isDeleted, false),
      ),
    });
  }

  async updatePaymentTransactionReference(
    paymentTransactionId: number,
    transactionReference: string,
    updatedBy: number,
  ) {
    const [result] = await db
      .update(paymentTransactions)
      .set({
        transactionReference,
        updatedBy,
      })
      .where(eq(paymentTransactions.id, paymentTransactionId))
      .returning();
    return result;
  }

  async updatePaymentStatusByTransactionReference(
    transactionReference: string,
    statusName: PAYMENT_STATUSES,
    updatedBy = 1,
  ) {
    const paymentStatus = await db.query.paymentStatuses.findFirst({
      where: eq(paymentStatuses.name, statusName),
    });
    if (!paymentStatus) return null;

    const [result] = await db
      .update(paymentTransactions)
      .set({
        paymentStatusId: paymentStatus.id,
        updatedBy,
      })
      .where(eq(paymentTransactions.transactionReference, transactionReference))
      .returning();
    return result;
  }
}
