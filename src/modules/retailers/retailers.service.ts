import type {
  CreateRetailerRequest,
  CreateRetailerResponse,
  UpdateRetailerRequest,
} from "./retailers.schema";

import type { NewRetailer } from "@/db/models/retailers";
import { generateUsername } from "@/common";
import { AddressTypeIds } from "@/constants";
import { NotFoundError, ValidationError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";

import db from "@/db";

import { AddressService } from "../addresses/addresses.service";
import { UserRepository } from "../users/users.repository";
import { UsersService } from "../users/users.service";
import { RetailerRepository } from "./retailers.repository";

export class RetailersService {
  private readonly userRepository: UserRepository;
  private readonly addressService: AddressService;
  private readonly retailerRepository: RetailerRepository;
  private readonly usersService: UsersService;

  /**
   * Create a new RetailersService
   * Initializes the user repository for database operations
   */
  constructor() {
    this.userRepository = new UserRepository();
    this.usersService = new UsersService();
    this.addressService = new AddressService();
    this.retailerRepository = new RetailerRepository();
  }

  /**
   * Create a new retailer
   *
   * @param retailerData - Retailer data
   * @returns The created retailer object
   */
  async createRetailer(
    retailerData: CreateRetailerRequest & {
      createdBy: number;
    },
  ): Promise<CreateRetailerResponse> {
    const username = generateUsername(retailerData.fullName);

    // Check if username is already taken
    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new ValidationError("Username is already taken");
    }

    // Check if email is already taken
    if (retailerData.email) {
      const existingEmail = await this.userRepository.findByEmail(
        retailerData.email,
      );
      if (existingEmail) {
        throw new ValidationError("Email is already taken");
      }
    }

    // Check if phone number is already taken
    const existingPhoneNumber = await this.userRepository.findByPhoneNumber(
      retailerData.phone,
    );
    if (existingPhoneNumber) {
      throw new ValidationError("Phone number is already taken");
    }

    // generate retailer code with country code and retailer sequence
    const retailerSequence =
      await this.retailerRepository.getNextRetailerCode();

    if (!retailerSequence) {
      throw new AppError("Failed to generate retailer code");
    }

    // Get Country Code
    const countryCode = await this.addressService.getCountryCode(
      retailerData.countryId,
    );
    if (!countryCode) {
      throw new NotFoundError(
        `Country with ID ${retailerData.countryId} not found`,
      );
    }

    const retailerCode = `R${countryCode}-${retailerSequence}`;

    const retailer = await db.transaction(async (tx) => {
      const user = await this.userRepository.createWithPhoneNumber(tx, {
        fullName: retailerData.fullName,
        email: retailerData.email,
        phoneNumber: retailerData.phone,
        username,
        createdBy: retailerData.createdBy,
      });

      const retailer: NewRetailer = {
        userId: user.id,
        shopName: retailerData.shop,
        retailerCode,
        status: retailerData.status,
        createdBy: retailerData.createdBy,
        updatedBy: retailerData.createdBy,
      };

      // Create Retailer with user - using transaction
      const createdRetailer = await this.retailerRepository.create(
        tx,
        retailer,
      );

      // Create address
      await this.addressService.createAddress(tx, {
        userId: user.id,
        addressTypeId: AddressTypeIds.RETAILER,
        streetAddress: retailerData.address,
        countryId: retailerData.countryId,
        cityId: retailerData.cityId,
        createdBy: retailerData.createdBy,
        updatedBy: retailerData.createdBy,
      });

      return createdRetailer;
    });

    // fetch retailer with addresses
    const retailerWithAddresses = await this.retailerRepository.findById(
      retailer.id,
    );
    if (!retailerWithAddresses) {
      throw new AppError("Retailer could not be fetched after creation");
    }
    return retailerWithAddresses as CreateRetailerResponse;
  }

  /**
   * List Retailers with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters to apply
   * @returns List of retailers and total count
   */
  async listRetailers(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.retailerRepository.list(params);
  }

  /**
   * Get a retailer by id
   *
   * @param id - Retailer id
   * @returns The retailer object
   */
  async getRetailerById(id: number) {
    const retailer = await this.retailerRepository.findById(id);
    if (!retailer) {
      throw new NotFoundError("Retailer not found");
    }
    return retailer;
  }

  /**
   * Update a retailer
   *
   * @param retailerData - Retailer data
   * @returns The updated retailer object
   */
  async updateRetailer(
    retailerData: UpdateRetailerRequest & {
      id: number;
      updatedBy: number;
    },
  ) {
    const retailer = await this.retailerRepository.findById(retailerData.id);

    if (!retailer) {
      throw new NotFoundError("Retailer not found");
    }

    const user = await this.userRepository.findById(retailer.userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (retailerData.email && retailerData.email !== user.email) {
      const existingEmail = await this.userRepository.findByEmail(
        retailerData.email,
      );
      if (existingEmail) {
        throw new ValidationError("Email is already taken");
      }
    }

    if (retailerData.phone && retailerData.phone !== user.phoneNumber) {
      const existingPhoneNumber = await this.userRepository.findByPhoneNumber(
        retailerData.phone,
      );
      if (existingPhoneNumber) {
        throw new ValidationError("Phone number is already taken");
      }
    }

    const userData: {
      email?: string;
      phoneNumber?: string;
      fullName?: string;
    } = {
      email: retailerData.email,
      phoneNumber: retailerData.phone,
      fullName: retailerData.fullName,
    };

    const addressData: {
      streetAddress?: string;
      countryId?: number;
      cityId?: number;
    } = {
      streetAddress: retailerData.address,
      countryId: retailerData.countryId,
      cityId: retailerData.cityId,
    };

    const result = await db.transaction(async (tx) => {
      // Update the user record
      if (retailerData.fullName || retailerData.email || retailerData.phone) {
        await this.userRepository.updateUser(tx, user.id, {
          ...userData,
          updatedBy: retailerData.updatedBy,
        });
      }

      // Handle address data updates (address, countryId)
      if (
        retailerData.address ||
        retailerData.countryId ||
        retailerData.cityId
      ) {
        // Update the address in the transaction
        const retailerAddressId = retailer.user.addresses.find(
          (address) => address.addressTypeId === AddressTypeIds.RETAILER,
        )?.id;
        if (retailerAddressId) {
          await this.addressService.updateAddress(
            tx,
            retailerAddressId,
            addressData,
          );
        }
      }

      // Update retailer record
      if (
        retailerData.shop !== undefined ||
        retailerData.status !== undefined
      ) {
        await this.retailerRepository.update(tx, retailer.id, {
          shopName: retailerData.shop,
          status: retailerData.status,
          updatedAt: new Date().toISOString(),
          updatedBy: retailerData.updatedBy,
        });
      }

      return retailer;
    });
    // Fetch the updated retailer with its relations
    const updatedRetailer = await this.retailerRepository.findById(result.id);

    if (!updatedRetailer) {
      throw new AppError("Could not fetch updated retailer");
    }

    return updatedRetailer;
  }

  /**
   * Delete multiple retailers
   *
   * @param ids - Array of retailer IDs to delete
   * @param deletedBy - User ID who is performing the deletion
   * @returns True if successful
   */
  async deleteRetailers(ids: number[], deletedBy: number) {
    // Verify that all retailers exist
    for (const id of ids) {
      const retailer = await this.retailerRepository.findById(id);
      if (!retailer) {
        throw new NotFoundError(`Retailer with ID ${id} not found`);
      }
    }

    return await db.transaction(async (tx) => {
      const result = await this.retailerRepository.softDeleteMany(
        tx,
        ids,
        deletedBy,
      );
      return result;
    });
  }
}
