import type { CreateUserResponseWithEmailAndPhone } from "../users/users.schema";
import type { CreateSupplierRequest } from "./suppliers.schema";
import { AddressTypeIds } from "@/constants";
import { AppError, ConflictError, NotFoundError } from "@/core/errors";
import { db } from "@/db";
import { usernameSchema } from "@/lib/zod-schemas/common-schemas";
import { SupplierRepository } from "@/modules/suppliers/suppliers.repository";

import { UserRepository } from "@/modules/users/users.repository";
import { UsersService } from "@/modules/users/users.service";

import { AddressService } from "../addresses/addresses.service";

/**
 * Service for supplier management
 */
export class SupplierService {
  private readonly supplierRepository: SupplierRepository;
  private readonly userRepository: UserRepository;
  private readonly usersService: UsersService;
  private readonly addressService: AddressService;

  /**
   * Create a new SupplierService
   */
  constructor() {
    this.supplierRepository = new SupplierRepository();
    this.userRepository = new UserRepository();
    this.usersService = new UsersService();
    this.addressService = new AddressService();
  }

  /**
   * List suppliers with pagination, filtering, and sorting
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
  async listSuppliers(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.supplierRepository.list(params);
  }

  /**
   * Get a supplier by ID
   *
   * @param id - Supplier ID
   * @returns Supplier details
   * @throws NotFoundError if supplier is not found
   */
  async getSupplier(id: number) {
    const supplier = await this.supplierRepository.findById(id);

    if (!supplier) {
      throw new NotFoundError(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  /**
   * Get a supplier by user ID
   *
   * @param userId - User ID
   * @returns Supplier details or null if not found
   */
  async getSupplierByUserId(userId: number) {
    return await this.supplierRepository.findByUserId(userId);
  }

  /**
   * Create a new supplier
   *
   * @param data : CreateSupplierRequest & { createdBy: number }
   * @param data.createdBy - ID of the user who created the supplier
   * @returns Created supplier
   */
  async createSupplier(data: CreateSupplierRequest & { createdBy: number }) {
    const {
      fullName,
      storeName,
      email,
      phoneNumber,
      address,
      countryId,
      paymentMethodId,
      entryTypeId,
      bankAccountName,
      bankAccountNumber,
      profilePhotoUrl,
      createdBy,
    } = data;

    // Check if supplier already exists with this email
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError(`User with email ${email} already exists`);
    }
    // random numbers
    const randomNumbers = Math.random().toString().slice(2, 5);
    // split full name with whitespaces
    const username =
      fullName
        .toLowerCase()
        .split(/\s+/)
        .filter((part) => /^[a-z0-9]+$/i.test(part))
        .join("") + randomNumbers;
    const parsedUsername = usernameSchema.parse(username);
    // check if username already exists
    const existingUsername =
      await this.userRepository.findByUsername(parsedUsername);
    if (existingUsername) {
      throw new ConflictError(`Username ${username} already exists`);
    }

    // check if email already exists
    const userOrNull = await this.userRepository.findByEmail(email);
    let user: CreateUserResponseWithEmailAndPhone | typeof userOrNull;

    // Get Country Code
    const countryCode = await this.addressService.getCountryCode(countryId);
    if (!countryCode) {
      throw new NotFoundError(`Country with ID ${countryId} not found`);
    }

    // generate supplier code with country code and supplier sequence
    const supplierSequence =
      await this.supplierRepository.getNextSupplierCode();

    if (!supplierSequence) {
      throw new AppError("Failed to generate supplier code");
    }

    const supplierCode = `${countryCode}-${supplierSequence}`;

    // Use a transaction to ensure atomicity between user and supplier creation
    const result = await db.transaction(async (tx) => {
      // Create user if it doesn't exist - using transaction
      if (!userOrNull) {
        user =
          await this.usersService.createUserWithEmailAndPhoneNumberInTransaction(
            tx,
            {
              email,
              fullName,
              username,
              profilePhotoUrl,
              phoneNumber,
              createdBy,
            },
          );
      } else {
        user = userOrNull;
      }

      // Create supplier with user - using transaction
      const createdSupplier = await this.supplierRepository.create(tx, {
        userId: user.id,
        storeName,
        entryTypeId,
        paymentMethodId,
        bankAccountName,
        bankAccountNumber,
        supplierCode,
        createdBy,
      });

      // Create address
      await this.addressService.createAddress(tx, {
        userId: user.id,
        addressTypeId: AddressTypeIds.SUPPLIER,
        streetAddress: address,
        countryId,
        createdBy,
        updatedBy: createdBy,
      });

      return createdSupplier;
    });

    // If we reach here, both operations succeeded
    return result;
  }

  /**
   * Update a supplier
   *
   * @param data - Supplier data
   * @param data.id - Supplier ID
   * @param data.updatedBy - Last modified by user ID
   * @param data.storeName - Store name
   * @param data.entryTypeId - Entry type ID
   * @param data.paymentMethodId - Payment method ID
   * @param data.bankAccountName - Bank account name
   * @param data.bankAccountNumber - Bank account number
   * @param data.email - Email address
   * @param data.phoneNumber - Phone number
   * @param data.fullName - Full name
   * @param data.countryId - Country ID
   * @param data.address - Address
   * @returns Updated supplier
   * @throws NotFoundError if supplier is not found
   * @throws ConflictError if supplier already exists with this email
   */
  async updateSupplier(data: {
    id: number;
    updatedBy: number;
    storeName?: string;
    entryTypeId?: number;
    paymentMethodId?: number;
    bankAccountName?: string;
    bankAccountNumber?: string;
    email?: string;
    phoneNumber?: string;
    fullName?: string;
    countryId?: number;
    address?: string;
  }) {
    const {
      id,
      updatedBy,
      storeName,
      entryTypeId,
      paymentMethodId,
      bankAccountName,
      bankAccountNumber,
      email,
      phoneNumber,
      countryId,
      address,
      fullName,
    } = data;

    // Find supplier
    const supplier = await this.supplierRepository.findById(id);
    if (!supplier) {
      throw new NotFoundError(`Supplier with ID ${id} not found`);
    }
    const userData: {
      email?: string;
      phoneNumber?: string;
      fullName?: string;
    } = {
      email: data.email,
      phoneNumber: data.phoneNumber,
      fullName: data.fullName,
    };

    const addressData: {
      streetAddress?: string;
      countryId?: number;
    } = {
      streetAddress: data.address,
      countryId: data.countryId,
    };

    if (email) {
      // Check if email already exists and doesn't belong to this user
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser && existingUser.id !== supplier.userId) {
        throw new ConflictError(`Email ${email} already exists`);
      }
    }

    if (phoneNumber) {
      // Check if phone number already exists and doesn't belong to this user
      const existingUser =
        await this.userRepository.findByPhoneNumber(phoneNumber);
      if (existingUser && existingUser.id !== supplier.userId) {
        throw new ConflictError(`Phone number ${phoneNumber} already exists`);
      }
    }

    // Update supplier record, address and user data in a transaction
    return await db.transaction(async (tx) => {
      // Handle user data updates (email, username, password)
      if (email || phoneNumber || fullName) {
        // Update the user in the transaction
        await this.usersService.updateUserWithEmailInTransaction(
          tx,
          supplier.userId,
          userData,
        );
      }

      // Handle address data updates (address, countryId)
      if (address || countryId) {
        // Update the address in the transaction
        const supplierAddressId = supplier.user.addresses.find(
          (address) => address.addressTypeId === AddressTypeIds.SUPPLIER,
        )?.id;
        if (supplierAddressId) {
          await this.addressService.updateAddress(
            tx,
            supplierAddressId,
            addressData,
          );
        }
      }

      // Update supplier record
      const updatedSupplier = await this.supplierRepository.update(tx, id, {
        updatedBy,
        storeName,
        entryTypeId,
        paymentMethodId,
        bankAccountName,
        bankAccountNumber,
      });

      return updatedSupplier;
    });
  }

  /**
   * Delete a supplier
   *
   * @param id - Supplier ID
   * @param deletedBy - User ID of the person who deleted this record
   * @returns True if deleted successfully
   */
  async deleteSupplier(id: number, deletedBy: number) {
    const supplier = await this.supplierRepository.findById(id);
    if (!supplier) {
      throw new NotFoundError(`Supplier with ID ${id} not found`);
    }

    return await db.transaction(async (tx) => {
      return await this.supplierRepository.softDelete(tx, id, deletedBy);
    });
  }

  /**
   * Delete multiple suppliers
   *
   * @param ids - Array of supplier IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async deleteSuppliers(ids: number[], deletedBy: number) {
    const result = await db.transaction(async (tx) => {
      return await this.supplierRepository.softDeleteMany(tx, ids, deletedBy);
    });
    if (!result) {
      throw new AppError("Failed to delete suppliers");
    }
    return result;
  }

  async getAllSupplierCodes(): Promise<string[]> {
    return this.supplierRepository.getAllSupplierCodes();
  }

  async getAllSupplierIds(): Promise<number[]> {
    return this.supplierRepository.getAllSupplierIds();
  }
}
