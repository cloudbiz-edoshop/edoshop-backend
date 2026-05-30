import type {
  CreateWarehouseRequest,
  CreateWarehouseResponse,
  UpdateWarehouseRequest,
} from "./warehouses.schema";
import { AddressTypeIds } from "@/constants";
import { NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";

import db from "@/db";

import { AddressService } from "../addresses/addresses.service";
import { WarehouseRepository } from "./warehouses.repository";

export class WarehousesService {
  private readonly addressService: AddressService;
  private readonly warehouseRepository: WarehouseRepository;

  /**
   * Create a new WarehousesService
   * Initializes the user repository for database operations
   */
  constructor() {
    this.addressService = new AddressService();
    this.warehouseRepository = new WarehouseRepository();
  }

  /**
   * Create a new warehouse
   *
   * @param warehouseData - Warehouse data
   * @returns The created warehouse object
   */
  async createWarehouse(
    warehouseData: CreateWarehouseRequest & {
      createdBy: number;
    },
  ): Promise<CreateWarehouseResponse> {
    const warehouse = await db.transaction(async (tx) => {
      // Create address
      const address = await this.addressService.createAddress(tx, {
        addressTypeId: AddressTypeIds.OTHER,
        streetAddress: warehouseData.address,
        countryId: warehouseData.countryId,
        cityId: warehouseData.cityId,
        postalCode: warehouseData.postalCode,
        createdBy: warehouseData.createdBy,
        updatedBy: warehouseData.createdBy,
      });

      // Create Warehouse with user - using transaction
      const createdWarehouse = await this.warehouseRepository.create(tx, {
        ...warehouseData,
        addressId: address.id,
        createdBy: warehouseData.createdBy,
        updatedBy: warehouseData.createdBy,
      });

      return createdWarehouse;
    });

    // fetch warehouse with addresses
    const warehouseWithAddresses = await this.warehouseRepository.findById(
      warehouse.id,
    );
    if (!warehouseWithAddresses) {
      throw new AppError("Warehouse could not be fetched after creation");
    }
    return warehouseWithAddresses as CreateWarehouseResponse;
  }

  /**
   * List Warehouses with pagination, filtering, and sorting
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
  async listWarehouses(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.warehouseRepository.list(params);
  }

  /**
   * Get a warehouse by id
   *
   * @param id - Warehouse id
   * @returns The warehouse object
   */
  async getWarehouseById(id: number) {
    const warehouse = await this.warehouseRepository.findById(id);
    if (!warehouse) {
      throw new NotFoundError("Warehouse not found");
    }
    return warehouse;
  }

  /**
   * Update a warehouse
   *
   * @param warehouseData - Warehouse data
   * @returns The updated warehouse object
   */
  async updateWarehouse(
    warehouseData: UpdateWarehouseRequest & {
      id: number;
      updatedBy: number;
    },
  ) {
    const warehouse = await this.warehouseRepository.findById(warehouseData.id);

    if (!warehouse) {
      throw new NotFoundError("Warehouse not found");
    }

    const addressData: {
      streetAddress?: string;
      countryId?: number;
      cityId?: number;
      postalCode?: string;
    } = {
      streetAddress: warehouseData.address,
      countryId: warehouseData.countryId,
      cityId: warehouseData.cityId,
      postalCode: warehouseData.postalCode,
    };

    await db.transaction(async (tx) => {
      // Update warehouse
      if (warehouseData.name || warehouseData.description) {
        await this.warehouseRepository.update(tx, warehouseData.id, {
          ...warehouseData,
          updatedBy: warehouseData.updatedBy,
        });
      }

      // Update Address
      if (
        warehouseData.address ||
        warehouseData.countryId ||
        warehouseData.cityId ||
        warehouseData.postalCode
      ) {
        // Update the address in the transaction
        const warehouseAddressId = warehouse.address.id;
        await this.addressService.updateAddress(
          tx,
          warehouseAddressId,
          addressData,
        );
      }
    });
    // fetch warehouse with addresses
    const warehouseWithAddresses = await this.warehouseRepository.findById(
      warehouse.id,
    );
    if (!warehouseWithAddresses) {
      throw new AppError("Warehouse could not be fetched after creation");
    }
    return warehouseWithAddresses as CreateWarehouseResponse;
  }

  /**
   * Delete multiple warehouses
   *
   * @param ids - Array of warehouse IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async deleteWarehouses(ids: number[], deletedBy: number) {
    const result = await db.transaction(async (tx) => {
      return await this.warehouseRepository.softDeleteMany(tx, ids, deletedBy);
    });
    if (!result) {
      throw new AppError("Failed to delete warehouses");
    }
    return result;
  }
}
