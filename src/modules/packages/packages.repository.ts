import type { CommonQueryParams } from "@/lib/openapi/schemas/query-params-schema";
import type { TX } from "@/lib/types";
import { and, count, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { EntryTypeIds } from "@/constants";
import { PackageStatusIds } from "@/constants/package-statuses.constants";
import { NotFoundError } from "@/core/errors";
import db from "@/db";
import {
  entries,
  orderFulfillmentStatuses,
  orderItemFulfillmentStatuses,
  orderItems,
  orders,
  packageItems,
  packageItemsHistory,
  packages,
  packageStatuses,
  shippingLabels,
} from "@/db/models";

import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

// Operation codes for package items history
enum PackageItemOperation {
  INSERT = 1,
  UPDATE = 2,
  DELETE = 3,
}

/**
 * Repository for packages-related database operations
 */
export class PackagesRepository {
  async getAllPackageStatuses() {
    return await db.query.packageStatuses.findMany({
      columns: {
        id: true,
        name: true,
      },
    });
  }

  async getAllShippingPriorityCodes() {
    return await db.query.shippingPriorityCodes.findMany({
      columns: {
        id: true,
        code: true,
        description: true,
      },
    });
  }

  async getAllShippingTypes() {
    return await db.query.shippingTypes.findMany({
      columns: {
        id: true,
        name: true,
        description: true,
      },
    });
  }

  async updatePackageHasShippingLabel(tx: TX, packageId: number, hasShippingLabel: number) {
    await tx.update(packages).set({ hasShippingLabel }).where(eq(packages.id, packageId));
  }

  /**
   * Get the first entry state
   *
   * @returns The entry state object or undefined if not found
   */
  async getEntryState() {
    return await db.query.entryStates.findFirst();
  }

  /**
   * Get the first warehouse
   *
   * @returns The warehouse object or undefined if not found
   */
  async getWarehouse() {
    return await db.query.warehouses.findFirst();
  }

  /**
   * Create a new entry in the database
   * @returns The created entry object
   */
  async createEntry(data: {
    entryTypeId?: number;
    entryStateId?: number;
    warehouseId: number;
    quantity: number;
    weight: string;
    date: string;
    description?: string;
    customerId: number;
  }) {
    const [newEntry] = await db
      .insert(entries)
      .values({
        ...data,
        entryTypeId: data.entryTypeId || EntryTypeIds.PACKAGE,
      })
      .returning();
    return newEntry;
  }

  /**
   * Get package status by name
   *
   * @param name - Package status name
   * @returns The package status object or undefined if not found
   */
  async getPackageStatus(name: string) {
    return await db.query.packageStatuses.findFirst({
      where: eq(packageStatuses.name, name),
    });
  }

  /**
   * Create a new package in the database
   * @returns The created package object
   */
  async createPackage(data: {
    entryId: number;
    packageCode: string;
    packageStatusId: number;
    createdAt: string;
    createdBy: number;
    updatedBy: number;
  }) {
    const [newPackage] = await db.insert(packages).values(data).returning();
    return newPackage;
  }

  /**
   * Find a package by ID
   *
   * @param packageId - Package ID
   * @returns The package object or undefined if not found
   */
  async getPackageById(packageId: number) {
    return await db.query.packages.findFirst({
      where: eq(packages.id, packageId),
    });
  }

  /**
   * Find an entry by ID
   * @param entryId - Entry ID to search for
   * @returns The entry object or undefined if not found
   */
  async getEntryById(entryId: number) {
    return await db.query.entries.findFirst({
      where: eq(entries.id, entryId),
    });
  }

  /**
   * Get entry with full customer info including user and addresses (with country & city)
   * Used to auto-populate shipping label fields from the package's customer
   */
  async getEntryWithCustomerAddress(entryId: number) {
    return await db.query.entries.findFirst({
      where: eq(entries.id, entryId),
      with: {
        customer: {
          with: {
            user: {
              with: {
                addresses: {
                  with: {
                    country: true,
                    city: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Update entry details
   * @param entryId - Entry ID to update
   * @param {object} data - Entry data to update
   * @param {string} [data.weight] - Entry weight to update
   * @param {string} [data.description] - Entry description to update
   * @param {string} [data.address] - Entry delivery address to update
   */
  async updateEntry(
    entryId: number,
    data: { weight?: string; description?: string },
  ) {
    await db.update(entries).set(data).where(eq(entries.id, entryId));
  }

  /**
   * Edit package entry and shipping label
   * @param tx - Database transaction
   * @param entryId - Entry ID to update
   * @param entryData - Entry data to update
   * @param entryData.weight - Optional weight string
   * @param entryData.description - Optional description
   * @param entryData.address - Optional delivery address
   * @param shippingLabelId - Optional shipping label ID to update
   * @param labelData - Shipping label data to update
   * @param labelData.netWeight - Optional net weight
   * @param labelData.additionalNotes - Optional additional notes
   */
  async editPackage(
    tx: TX,
    entryId: number,
    entryData: { weight?: string; description?: string; address?: string },
    shippingLabelId: number | undefined,
    labelData: { netWeight?: string; additionalNotes?: string },
  ) {
    // Update entry
    await tx
      .update(entries)
      .set(entryData)
      .where(eq(entries.id, entryId));
    await tx.update(packages)
      .set({
        address: entryData.address,
      })
      .where(eq(packages.entryId, entryId));
    // Update shipping label if it exists
    if (shippingLabelId) {
      await tx
        .update(shippingLabels)
        .set(labelData)
        .where(eq(shippingLabels.id, shippingLabelId));
    }
  }

  /**
   * Get the first shipping type
   *
   * @returns The shipping type object or undefined if not found
   */
  async getShippingType() {
    return await db.query.shippingTypes.findFirst();
  }

  /**
   * Get the first shipping priority code
   *
   * @returns The shipping priority code object or undefined if not found
   */
  async getShippingPriorityCode() {
    return await db.query.shippingPriorityCodes.findFirst();
  }

  /**
   * Get the first user
   *
   * @returns The user object or undefined if not found
   */
  async getUser() {
    return await db.query.users.findFirst();
  }

  /**
   * Create a new shipping label in the database
   * @returns The created shipping label object
   */
  async createShippingLabel(tx: TX, data: {
    packageId: number;
    shippingTypeId: number;
    shippingPriorityCodeId: number;
    netWeight?: string;
    purchasedBy: number;
    additionalNotes?: string;
    country: string;
    city: string;
    customerFullName: string;
    address: string;
  }) {
    const [label] = await tx.insert(shippingLabels).values(data).returning();
    return label;
  }

  /**
   * Update shipping label details
   * @param shippingLabelId - Shipping label ID to update
   */
  async updateShippingLabel(
    shippingLabelId: number,
    data: { netWeight?: string; address?: string; additionalNotes?: string },
  ) {
    await db
      .update(shippingLabels)
      .set(data)
      .where(eq(shippingLabels.id, shippingLabelId));
  }

  /**
   * Find a shipping label by ID
   *
   * @param shippingLabelId - Shipping label ID
   * @returns The shipping label object or undefined if not found
   */
  async getShippingLabelById(shippingLabelId: number) {
    return await db.query.shippingLabels.findFirst({
      where: eq(shippingLabels.id, shippingLabelId),
    });
  }

  /**
   * Get package management data for warehouse 1
   * Retrieves detailed package information including entry details, customer info, and shipping status
   *
   * @param params - Common query params for search, sort, and pagination
   * @returns Promise containing paginated package management records for warehouse 1
   */
  async getPackageManagementW1(params: CommonQueryParams) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;

    const searchableFields = ["packageCode"];

    const filterCondition = createFilterConditions(packages, filters);
    const searchCondition = createSearchCondition(searchableFields, packages, search);

    const whereConditions = [eq(packages.packageStatusId, PackageStatusIds.PACKED), isNull(packages.receivedAt)];
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause = and(...whereConditions);

    const { limit: limitVal, offset } = getPaginationValues(page, limit);
    const sortCondition = createSortCondition(packages, sortBy, sortOrder);

    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(packages)
      .where(whereClause);

    const data = await db.query.packages.findMany({
      where: whereClause,
      limit: limitVal,
      offset,
      orderBy: sortCondition ? [sortCondition] : [desc(packages.createdAt)],
      with: {
        entry: {
          columns: {
            weight: true,
            warehouseId: true,
            customerId: true,
            description: true,
          },
          with: {
            customer: {
              columns: {
                customerCode: true,
              },
              with: {
                user: {
                  columns: {},
                  with: {
                    addresses: {
                      columns: {
                        streetAddress: true,
                        isDefault: true,
                      },
                      with: {
                        city: { columns: { name: true } },
                        country: { columns: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        packageStatus: {
          columns: {
            name: true,
            description: true,
          },
        },
        packageItems: {
          columns: {},
          with: {
            orderItem: {
              columns: {},
              with: {
                order: {
                  columns: {
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return { data, total: totalCount, searchableFields };
  }

  async getPackageManagementW2(params: CommonQueryParams) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;

    const searchableFields = ["packageCode"];

    const filterCondition = createFilterConditions(packages, filters);
    const searchCondition = createSearchCondition(searchableFields, packages, search);

    const whereConditions = [isNotNull(packages.receivedAt)];
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause = and(...whereConditions);

    const { limit: limitVal, offset } = getPaginationValues(page, limit);
    const sortCondition = createSortCondition(packages, sortBy, sortOrder);

    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(packages)
      .where(whereClause);

    const data = await db.query.packages.findMany({
      where: whereClause,
      limit: limitVal,
      offset,
      orderBy: sortCondition ? [sortCondition] : [desc(packages.createdAt)],
      with: {
        entry: {
          columns: {
            weight: true,
            warehouseId: true,
            customerId: true,
            description: true,
          },
          with: {
            customer: {
              columns: {
                customerCode: true,
              },
              with: {
                user: {
                  columns: {},
                  with: {
                    addresses: {
                      columns: {
                        streetAddress: true,
                        isDefault: true,
                      },
                      with: {
                        city: { columns: { name: true } },
                        country: { columns: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        packageStatus: {
          columns: {
            name: true,
            description: true,
          },
        },
        packageItems: {
          columns: {},
          with: {
            orderItem: {
              columns: {},
              with: {
                order: {
                  columns: {
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return { data, total: totalCount, searchableFields };
  }

  async getPackedPackagesThatAreBeingReceived(params: CommonQueryParams) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;

    const searchableFields = ["packageCode"];

    const filterCondition = createFilterConditions(packages, filters);
    const searchCondition = createSearchCondition(searchableFields, packages, search);

    const entryIdsInW2 = db
      .select({ id: entries.id })
      .from(entries)
      .where(eq(entries.warehouseId, 2));

    // Using packed status because packed means it was created in w1 using the create package screen
    const whereConditions = [eq(packages.packageStatusId, PackageStatusIds.PACKED), inArray(packages.entryId, entryIdsInW2)];
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause = and(...whereConditions);

    const { limit: limitVal, offset } = getPaginationValues(page, limit);
    const sortCondition = createSortCondition(packages, sortBy, sortOrder);

    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(packages)
      .where(whereClause);

    const data = await db.query.packages.findMany({
      where: whereClause,
      limit: limitVal,
      offset,
      orderBy: sortCondition ? [sortCondition] : [desc(packages.createdAt)],
      with: {
        entry: {
          columns: {
            weight: true,
            warehouseId: true,
            customerId: true,
            description: true,
          },
          with: {
            warehouseTransfers: {
              columns: {
                receivedAt: true,
              },
            },
          },
        },
        packageStatus: {
          columns: {
            name: true,
          },
        },
      },
    });

    return { data, total: totalCount, searchableFields };
  }

  /**
   * Get package with full details for shipping label generation
   *
   * @param packageId - Package ID
   * @returns Package with all related data or undefined
   */
  async getPackageForLabel(packageId: number) {
    return await db.query.packages.findFirst({
      where: eq(packages.id, packageId),
      with: {
        entry: {
          with: {
            warehouse: true,
          },
        },
        packageStatus: true,
      },
    });
  }

  /**
   * Get shipping label with all details by package ID
   *
   * @param packageId - Package ID
   * @returns Shipping label with all related data or undefined
   */
  async getShippingLabelByPackageId(packageId: number) {
    return await db.query.shippingLabels.findFirst({
      where: eq(shippingLabels.packageId, packageId),
      with: {
        shippingType: true,
        shippingPriorityCode: true,
      },
    });
  }

  /**
   * Create package with items in a transaction
   * This method handles all database operations atomically
   *
   * @param data - Package and items data
   * @param data.customerId - Customer ID
   * @returns Created package with items and affected orders
   */
  async createPackageWithItemsTransaction(data: {
    customerId: number;
    warehouseId: number;
    packageWeight: number;
    address: string;
    comments?: string;
    orderItems: Array<{
      orderItemId: number;
      quantityToPack: number;
    }>;
    userId: number;
    packageCode: string;
    entryTypeId: number;
    entryStateId: number;
    packageStatusId: number;
  }) {
    const timestamp = new Date().toISOString();
    // Execute everything in a transaction
    return await db.transaction(async (tx) => {
      // 1. Create entry in warehouse
      const [newEntry] = await tx
        .insert(entries)
        .values({
          entryTypeId: data.entryTypeId,
          entryStateId: data.entryStateId,
          warehouseId: data.warehouseId,
          quantity: 1,
          weight: data.packageWeight.toString(),
          date: timestamp.split("T")[0],
          description: data.comments,
          isTransferable: true,
          customerId: data.customerId,
          createdBy: data.userId,
          updatedBy: data.userId,
        })
        .returning();

      // 2. Create package
      const [newPackage] = await tx
        .insert(packages)
        .values({
          entryId: newEntry.id,
          packageCode: data.packageCode,
          packageStatusId: data.packageStatusId,
          lastPackedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
          createdBy: data.userId,
          updatedBy: data.userId,
          address: data.address,
        })
        .returning();

      // 3. Batch insert all package items at once
      const packageItemsToInsert = data.orderItems.map((item) => ({
        packageId: newPackage.id,
        orderItemId: item.orderItemId,
        quantityPacked: item.quantityToPack,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: data.userId,
        updatedBy: data.userId,
      }));

      const createdPackageItems = await tx
        .insert(packageItems)
        .values(packageItemsToInsert)
        .returning();

      // 4. Batch insert all history records
      const historyRecords = createdPackageItems.map((packageItem, index) => ({
        packageItemId: packageItem.id,
        packageId: newPackage.id,
        orderItemId: data.orderItems[index].orderItemId,
        quantityPacked: data.orderItems[index].quantityToPack,
        operation: PackageItemOperation.INSERT,
        version: 1,
        validFrom: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: data.userId,
        updatedBy: data.userId,
      }));

      await tx.insert(packageItemsHistory).values(historyRecords);

      // 5. Get unique order item IDs and their orders in a single query
      const uniqueOrderItemIds = [
        ...new Set(data.orderItems.map((item) => item.orderItemId)),
      ];

      const affectedOrderItemsData = await tx
        .select({
          orderItemId: orderItems.id,
          orderId: orderItems.orderId,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(inArray(orderItems.id, uniqueOrderItemIds));

      const affectedOrderIds = new Set<number>(
        affectedOrderItemsData.map((oi) => oi.orderId),
      );

      // 6. Update all order items with their new packed quantities
      for (const orderItemId of uniqueOrderItemIds) {
        // Calculate total quantity packed for this order item
        const packedSum = await tx
          .select({
            total: sql<number>`COALESCE(SUM(${packageItems.quantityPacked}), 0)`,
          })
          .from(packageItems)
          .where(eq(packageItems.orderItemId, orderItemId));

        const totalPacked = Number(packedSum[0]?.total || 0);

        // Get the order item quantity
        const currentOrderItem = affectedOrderItemsData.find(
          (oi) => oi.orderItemId === orderItemId,
        );

        // Calculate fulfillment status
        let fulfillmentStatusName = "pending";
        if (totalPacked === 0) {
          fulfillmentStatusName = "pending";
        } else if (
          totalPacked < (currentOrderItem?.quantity || 0) &&
          totalPacked > 0
        ) {
          fulfillmentStatusName = "partially_fulfilled";
        } else if (totalPacked >= (currentOrderItem?.quantity || 0)) {
          fulfillmentStatusName = "fully_fulfilled";
        }

        // Get fulfillment status ID
        const fulfillmentStatus =
          await tx.query.orderItemFulfillmentStatuses.findFirst({
            where: eq(orderItemFulfillmentStatuses.name, fulfillmentStatusName),
          });

        // Update order item
        await tx
          .update(orderItems)
          .set({
            quantityPacked: totalPacked,
            fulfillmentStatusId: fulfillmentStatus?.id || 1,
            updatedAt: timestamp,
          })
          .where(eq(orderItems.id, orderItemId));
      }

      // 7. Update order fulfillment statuses
      const affectedOrders = [];
      for (const orderId of affectedOrderIds) {
        // Get all order items for this order
        const allOrderItems = await tx.query.orderItems.findMany({
          where: eq(orderItems.orderId, orderId),
        });

        // Calculate order fulfillment status
        const allPending = allOrderItems.every(
          (oi) => (oi.quantityPacked || 0) === 0,
        );
        const allFulfilled = allOrderItems.every(
          (oi) => (oi.quantityPacked || 0) >= (oi.quantity || 0),
        );

        let orderFulfillmentStatusName = "partially_fulfilled";
        if (allPending) {
          orderFulfillmentStatusName = "pending";
        } else if (allFulfilled) {
          orderFulfillmentStatusName = "fully_fulfilled";
        }

        // Get order fulfillment status ID
        const orderFulfillmentStatus =
          await tx.query.orderFulfillmentStatuses.findFirst({
            where: eq(
              orderFulfillmentStatuses.name,
              orderFulfillmentStatusName,
            ),
          });

        // Update order
        await tx
          .update(orders)
          .set({
            fulfillmentStatusId: orderFulfillmentStatus?.id || 1,
            updatedAt: timestamp,
          })
          .where(eq(orders.id, orderId));

        // Get updated order info
        const updatedOrder = await tx.query.orders.findFirst({
          where: eq(orders.id, orderId),
          with: {
            fulfillmentStatus: true,
          },
        });

        if (updatedOrder) {
          affectedOrders.push({
            orderId: updatedOrder.id,
            orderCode: updatedOrder.orderCode,
            fulfillmentStatusId: updatedOrder.fulfillmentStatusId,
            fulfillmentStatus:
              updatedOrder.fulfillmentStatus?.name || "unknown",
          });
        }
      }

      return {
        package: newPackage,
        packageItems: createdPackageItems,
        affectedOrders,
      };
    });
  }

  async listShippingLabels(params: CommonQueryParams) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;

    const searchableFields = ["customerFullName", "address", "city", "country"];

    const filterCondition = createFilterConditions(shippingLabels, filters);
    const searchCondition = createSearchCondition(searchableFields, shippingLabels, search);

    const whereConditions = [];
    if (filterCondition)
      whereConditions.push(filterCondition);
    if (searchCondition)
      whereConditions.push(searchCondition);

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const { limit: limitVal, offset } = getPaginationValues(page, limit);
    const sortCondition = createSortCondition(shippingLabels, sortBy, sortOrder);

    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(shippingLabels)
      .where(whereClause);

    const data = await db
      .select()
      .from(shippingLabels)
      .where(whereClause)
      .limit(limitVal)
      .offset(offset)
      .orderBy(sortCondition ?? desc(shippingLabels.createdAt));

    return { data, total: totalCount, searchableFields };
  }

  async getFullLabelData(packageId: number) {
    return await db.query.packages.findFirst({
      where: eq(packages.id, packageId),
      with: {
        entry: {
          with: {
            customer: {
              with: {
                user: {
                  with: {
                    addresses: {
                      orderBy: (addresses, { desc }) => [desc(addresses.isDefault)],
                      with: {
                        city: true,
                        country: true,
                      },
                      limit: 1,
                    },
                  },
                },
                // package → entry → customer → orders (for notes)
                orders: {
                  columns: {
                    id: true,

                    notes: true,
                  },
                },
              },
            },
            warehouse: true,
          },
        },
        shippingLabel: {
          with: {
            shippingPriorityCode: true,
            shippingType: true,
          },
        },
      },
    });
  }

  /**
   * Update received package fields for a single package
   *
   * @param tx - Database transaction
   * @param packageId - Package ID to update
   * @param data - Update data
   * @param data.packageWeightAtReceived - Optional weight at time of receipt
   * @param data.binLocationAtReceived - Optional bin location at time of receipt
   * @param data.packageDestinationAtReceived - Optional destination at time of receipt
   */
  async receiveAPackageFromW1(
    tx: TX,
    packageId: number,
    data: {
      packageWeightAtReceived: number;
      binLocationAtReceived: string;
      packageDestinationAtReceived: string;
      receivedAt: string;
    },
  ) {
    await tx
      .update(packages)
      .set({
        receivedAt: data.receivedAt,
        packageWeightAtReceived: data.packageWeightAtReceived.toString(),
        binLocationAtReceived: data.binLocationAtReceived,
        packageDestinationAtReceived: data.packageDestinationAtReceived,
        updatedAt: new Date().toISOString(),
        packageStatusId: PackageStatusIds.READY_TO_DISPATCH,
      })
      .where(eq(packages.id, packageId));
  }

  async updateReceivedPackageStatus(
    tx: TX,
    packageId: number,
    status: number,
  ) {
    const packageStatus = await tx
      .select()
      .from(packageStatuses)
      .where(eq(packageStatuses.id, status))
      .limit(1)
      .then(rows => rows[0]);

    if (!packageStatus) {
      throw new NotFoundError(`Package status "${status}" not found`);
    }

    await tx
      .update(packages)
      .set({
        packageStatusId: packageStatus.id,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(packages.id, packageId));
  }

  /**
   * Edit received package fields for a single package
   *
   * @param tx - Database transaction
   * @param packageId - Package ID to update
   * @param data - Update data
   * @param data.packageWeightAtReceived - Optional updated weight at time of receipt
   * @param data.binLocationAtReceived - Optional updated bin location at time of receipt
   * @param data.packageDestinationAtReceived - Optional updated destination at time of receipt
   */
  async editReceivedPackageFromW1(
    tx: TX,
    packageId: number,
    data: {
      packageWeightAtReceived?: number;
      binLocationAtReceived?: string;
      packageDestinationAtReceived?: string;
    },
  ) {
    await tx
      .update(packages)
      .set({
        binLocationAtReceived: data.binLocationAtReceived,
        packageDestinationAtReceived: data.packageDestinationAtReceived,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(packages.id, packageId));
  }

  async dispatchPackage(
    tx: TX,
    packageId: number,
    data: { packageStatusId: number },
  ) {
    await tx
      .update(packages)
      .set({
        packageStatusId: data.packageStatusId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(packages.id, packageId));
  }

  async getReceivedPackageDispatchManagement() {
    return await db.query.packages.findMany({
      where: eq(packages.packageStatusId, PackageStatusIds.READY_TO_DISPATCH),
      with: {
        entry: {
          columns: {
            weight: true,
          },
          with: {
            customer: {
              columns: {
                id: true,
                customerCode: true,
              },
            },
          },
        },
        packageStatus: {
          columns: {
            name: true,
          },
        },
        packageItems: {
          columns: {
            id: true,
          },
          with: {
            orderItem: {
              columns: {
                orderId: true,
              },
            },
          },
        },
        shippingLabel: {
          columns: {
            id: true,
          },
          with: {
            shippingPriorityCode: {
              columns: {
                code: true,
                description: true,
              },
            },
          },
        },
      },
    });
  }

  async getPackageInfoForShippingLabel(packageId: number) {
    const packageData = await db.query.packages.findFirst({
      where: eq(packages.id, packageId),
      with: {
        shippingLabel: {
          columns: {
            id: true,
          },
        },
        entry: {
          with: {
            customer: {
              with: {
                user: {
                  columns: {
                    password: false,
                  },
                  with: {
                    addresses: {
                      orderBy: (addresses, { desc }) => [desc(addresses.isDefault)],
                      with: {
                        city: true,
                        country: true,
                      },
                      limit: 1,
                    },
                  },
                },
                // package → entry → customer → orders (for notes)
                orders: {
                  columns: {
                    id: true,
                    notes: true,
                  },
                  with: {
                    shippingType: true,
                    shippingPriorityCode: true,
                    shippingAddress: {
                      with: {
                        city: true,
                        country: true,
                      },
                    },
                  },
                },
              },
            },
            warehouse: true,
          },
        },
      },
    });

    return packageData;
  }
}
