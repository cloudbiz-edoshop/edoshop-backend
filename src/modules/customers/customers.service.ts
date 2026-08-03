import type {
  CreateCustomerRequest,
  CreateCustomerResponse,
  PublicCustomerSignupRequest,
  UpdateCustomerRequest,
} from "./customers.schema";

import type { NewCustomer } from "@/db/models/customers";
import { generateUsername } from "@/common";
import { AddressTypeIds } from "@/constants";
import { NotFoundError, ValidationError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";
import { Country } from "country-state-city";
import { eq } from "drizzle-orm";
import argon2 from "argon2";

import db from "@/db";
import { countries } from "@/db/models";

import { AddressService } from "../addresses/addresses.service";
import { notificationDeliveryService } from "../notifications/notification-delivery.service";
import { RetailersService } from "../retailers/retailers.service";
import { UserRepository } from "../users/users.repository";
import { UsersService } from "../users/users.service";
import { CustomersRepository } from "./customers.repository";

export class CustomersService {
  private readonly userRepository: UserRepository;
  private readonly addressService: AddressService;
  private readonly customerRepository: CustomersRepository;
  private readonly usersService: UsersService;
  private readonly retailersService: RetailersService;

  /**
   * Create a new CustomersService
   * Initializes the user repository for database operations
   */
  constructor() {
    this.userRepository = new UserRepository();
    this.usersService = new UsersService();
    this.retailersService = new RetailersService();
    this.addressService = new AddressService();
    this.customerRepository = new CustomersRepository();
  }

  private async assertUniqueCustomerIdentity(params: {
    fullName?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
    excludeUserId?: number;
  }) {
    const duplicate = await this.userRepository.findDuplicateIdentity(params);
    if (!duplicate) return;

    if (
      params.fullName?.trim() &&
      duplicate.fullName.trim().toLowerCase() ===
        params.fullName.trim().toLowerCase()
    ) {
      throw new ValidationError("Full name is already used by another account");
    }

    if (
      params.email?.trim() &&
      duplicate.email?.trim().toLowerCase() ===
        params.email.trim().toLowerCase()
    ) {
      throw new ValidationError("Email is already taken");
    }

    if (
      params.phoneNumber?.trim() &&
      duplicate.phoneNumber === params.phoneNumber.trim()
    ) {
      throw new ValidationError("Phone number is already taken");
    }

    throw new ValidationError(
      "Full name, email, or phone number is already used by another account",
    );
  }

  private async findOrCreateCountryByIsoCode(countryCode: string) {
    const normalizedCountryCode = countryCode.trim().toUpperCase();
    const existingCountry = await db.query.countries.findFirst({
      where: eq(countries.isoCode, normalizedCountryCode),
    });
    if (existingCountry) return existingCountry;

    const countryData = Country.getCountryByCode(normalizedCountryCode);
    if (!countryData) {
      throw new NotFoundError(
        `Country with code ${normalizedCountryCode} not found`,
      );
    }

    const [createdCountry] = await db
      .insert(countries)
      .values({
        name: countryData.name,
        isoCode: countryData.isoCode,
        flag: countryData.flag || countryData.isoCode,
        phonecode: countryData.phonecode || "",
        currency: countryData.currency || "",
        latitude: countryData.latitude || "0",
        longitude: countryData.longitude || "0",
      })
      .onConflictDoNothing()
      .returning();

    if (createdCountry) return createdCountry;

    const country = await db.query.countries.findFirst({
      where: eq(countries.isoCode, normalizedCountryCode),
    });
    if (!country) {
      throw new NotFoundError(
        `Country with code ${normalizedCountryCode} not found`,
      );
    }
    return country;
  }

  /**
   * Create a new customer
   *
   * @param customerData - Customer data
   * @returns The created customer object
   */
  async createCustomer(
    customerData: CreateCustomerRequest & {
      createdBy: number;
    },
  ): Promise<CreateCustomerResponse> {
    const username = generateUsername(customerData.fullName);

    await this.assertUniqueCustomerIdentity({
      fullName: customerData.fullName,
      email: customerData.email,
      phoneNumber: customerData.phoneNumber,
    });

    // Check if username is already taken
    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new ValidationError("Username is already taken");
    }

    // Check if email is already taken
    if (customerData.email) {
      const existingEmail = await this.userRepository.findByEmail(
        customerData.email,
      );
      if (existingEmail) {
        throw new ValidationError("Email is already taken");
      }
    }

    // Check if phone number is already taken
    const existingPhoneNumber = await this.userRepository.findByPhoneNumber(
      customerData.phoneNumber,
    );
    if (existingPhoneNumber) {
      throw new ValidationError("Phone number is already taken");
    }
    const countryCode = await this.addressService.getCountryCode(
      customerData.countryId,
    );
    if (!countryCode) {
      throw new NotFoundError(
        `Country with ID ${customerData.countryId} not found`,
      );
    }

    const customerCode =
      await this.customerRepository.generateUniqueCustomerCode(countryCode);

    const customer = await db.transaction(async (tx) => {
      const user = await this.userRepository.createWithPhoneNumber(tx, {
        fullName: customerData.fullName,
        email: customerData.email,
        phoneNumber: customerData.phoneNumber,
        username,
        createdBy: customerData.createdBy,
      } as any);

      const customer: NewCustomer = {
        userId: user.id,
        customerCode,
        createdBy: customerData.createdBy,
        updatedBy: customerData.createdBy,
      };

      // Create Customer with user - using transaction
      const createdCustomer = await this.customerRepository.create(
        tx,
        customer,
      );

      // Create address
      await this.addressService.createAddress(tx, {
        userId: user.id,
        addressTypeId: AddressTypeIds.CUSTOMER,
        streetAddress: customerData.address,
        countryId: customerData.countryId,
        createdBy: customerData.createdBy,
        updatedBy: customerData.createdBy,
      } as any);

      return createdCustomer;
    });

    // fetch customer with addresses
    const customerWithAddresses = await this.customerRepository.findById(
      customer.id,
    );
    if (!customerWithAddresses) {
      throw new AppError("Customer could not be fetched after creation");
    }
    if (customerData.accountType === "retailer") {
      await this.retailersService.becomeRetailer(customer.userId);
    }
    await notificationDeliveryService.initializeUserPreferences(customer.userId);
    return customerWithAddresses as CreateCustomerResponse;
  }

  async createPublicCustomerSignup(customerData: PublicCustomerSignupRequest) {
    const username = generateUsername(customerData.fullName);

    await this.assertUniqueCustomerIdentity({
      fullName: customerData.fullName,
      email: customerData.email,
      phoneNumber: customerData.phoneNumber,
    });

    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new ValidationError("Username is already taken");
    }

    if (customerData.email) {
      const existingEmail = await this.userRepository.findByEmail(
        customerData.email,
      );
      if (existingEmail) {
        throw new ValidationError("Email is already taken");
      }
    }

    const existingPhoneNumber = await this.userRepository.findByPhoneNumber(
      customerData.phoneNumber,
    );
    if (existingPhoneNumber) {
      throw new ValidationError("Phone number is already taken");
    }

    const country = await this.findOrCreateCountryByIsoCode(customerData.countryCode);

    const customerCode =
      await this.customerRepository.generateUniqueCustomerCode(country.isoCode);
    const hashedPassword = await argon2.hash(customerData.password);

    const customer = await db.transaction(async (tx) => {
      const user = await this.userRepository.createWithPhoneNumber(tx, {
        fullName: customerData.fullName,
        username,
        email: customerData.email || undefined,
        phoneNumber: customerData.phoneNumber,
        password: hashedPassword,
      } as any);

      const createdCustomer = await this.customerRepository.create(tx, {
        userId: user.id,
        customerCode,
        createdBy: user.id,
        updatedBy: user.id,
      });

      await this.addressService.createAddress(tx, {
        userId: user.id,
        addressTypeId: AddressTypeIds.CUSTOMER,
        streetAddress: customerData.address,
        countryId: country.id,
        createdBy: user.id,
        updatedBy: user.id,
      } as any);

      return createdCustomer;
    });

    if (customerData.accountType === "retailer") {
      await this.retailersService.becomeRetailer(customer.userId);
    }

    await notificationDeliveryService.initializeUserPreferences(customer.userId);

    return {
      id: customer.id,
      customerCode: customer.customerCode,
      userId: customer.userId,
      ...(await this.usersService.login({
        phoneNumber: customerData.phoneNumber,
        password: customerData.password,
      })),
    };
  }

  /**
   * List Customers with pagination, filtering, and sorting
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
  async listCustomers(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.customerRepository.list(params);
  }

  /**
   * Get a customer by id
   *
   * @param id - Customer id
   * @returns The customer object
   */
  async getCustomerById(id: number) {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }
    return customer;
  }

  /**
   * Update a customer
   *
   * @param customerData - Customer data
   * @returns The updated customer object
   */
  async updateCustomer(
    customerData: UpdateCustomerRequest & {
      id: number;
      updatedBy: number;
    },
  ) {
    const customer = await this.customerRepository.findById(customerData.id);

    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    const user = await this.userRepository.findById(customer.userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    await this.assertUniqueCustomerIdentity({
      fullName: customerData.fullName,
      email: customerData.email,
      phoneNumber: customerData.phoneNumber,
      excludeUserId: user.id,
    });

    if (customerData.email && customerData.email !== user.email) {
      const existingEmail = await this.userRepository.findByEmail(
        customerData.email,
      );
      if (existingEmail) {
        throw new ValidationError("Email is already taken");
      }
    }

    if (
      customerData.phoneNumber &&
      customerData.phoneNumber !== user.phoneNumber
    ) {
      const existingPhoneNumber = await this.userRepository.findByPhoneNumber(
        customerData.phoneNumber,
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
      email: customerData.email,
      phoneNumber: customerData.phoneNumber,
      fullName: customerData.fullName,
    };

    const addressData: {
      streetAddress?: string;
      countryId?: number;
    } = {
      streetAddress: customerData.address,
      countryId: customerData.countryId,
    };

    await db.transaction(async (tx) => {
      if (
        customerData.email ||
        customerData.phoneNumber ||
        customerData.fullName
      ) {
        await this.usersService.updateUserWithEmailInTransaction(
          tx,
          customer.userId,
          userData as any,
        );
      }

      // Update Address
      // Handle address data updates (address, countryId)
      if (customerData.address || customerData.countryId) {
        // Update the address in the transaction
        const customerAddressId = customer.user.addresses.find(
          (address) => address.addressTypeId === AddressTypeIds.CUSTOMER,
        )?.id;
        if (customerAddressId) {
          await this.addressService.updateAddress(
            tx,
            customerAddressId,
            addressData as any,
          );
        }
      }
    });
    // fetch customer with addresses
    const customerWithAddresses = await this.customerRepository.findById(
      customer.id,
    );
    if (!customerWithAddresses) {
      throw new AppError("Customer could not be fetched after creation");
    }
    return customerWithAddresses;
  }

  /**
   * Delete a customer
   *
   * @param id - Customer ID
   * @param deletedBy - User ID of the person who deleted this record
   * @returns True if deleted successfully
   */
  async deleteCustomer(id: number, deletedBy: number) {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundError(`Customer with ID ${id} not found`);
    }

    return await db.transaction(async (tx) => {
      const deleted = await this.customerRepository.softDeleteMany(
        tx,
        [id],
        deletedBy,
      );
      if (!deleted) return false;

      await this.userRepository.softDelete(tx, customer.userId, deletedBy);
      return true;
    });
  }

  /**
   * Delete multiple customers
   *
   * @param ids - Array of customer IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async deleteCustomers(ids: number[], deletedBy: number) {
    const customersToDelete = await Promise.all(
      ids.map((id) => this.customerRepository.findById(id)),
    );
    const userIds = customersToDelete
      .map((customer) => customer?.userId)
      .filter((userId): userId is number => Boolean(userId));

    const result = await db.transaction(async (tx) => {
      const deleted = await this.customerRepository.softDeleteMany(
        tx,
        ids,
        deletedBy,
      );

      if (deleted) {
        for (const userId of userIds) {
          await this.userRepository.softDelete(tx, userId, deletedBy);
        }
      }

      return deleted;
    });
    if (!result) {
      throw new AppError("Failed to delete customers");
    }
    return result;
  }

  async getAllCustomerCodes(): Promise<string[]> {
    return this.customerRepository.getAllCustomerCodes();
  }

  async getAllCustomerIds(): Promise<number[]> {
    return this.customerRepository.getAllCustomerIds();
  }

  async getAllCustomerNames(): Promise<string[]> {
    return this.customerRepository.getAllCustomerNames();
  }

  /**
   * Reset a customer's password (admin-initiated)
   *
   * @param customerId - Customer ID
   * @param password - New plain-text password
   * @returns Success confirmation
   */
  async resetCustomerPassword(
    customerId: number,
    password: string,
  ): Promise<{ success: true }> {
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundError(`Customer with ID ${customerId} not found`);
    }

    const user = await this.userRepository.findById(customer.userId);
    if (!user) {
      throw new NotFoundError(`User for customer ${customerId} not found`);
    }

    const passwordHash = await argon2.hash(password);
    await db.transaction(async (tx) => {
      await this.userRepository.updatePassword(tx, customer.userId, passwordHash);
    });

    return { success: true };
  }
}
