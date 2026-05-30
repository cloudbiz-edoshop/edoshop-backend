import type {
  CreateCustomerRequest,
  CreateCustomerResponse,
  UpdateCustomerRequest,
} from "./customers.schema";

import type { NewCustomer } from "@/db/models/customers";
import { generateUsername } from "@/common";
import { AddressTypeIds } from "@/constants";
import { NotFoundError, ValidationError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";

import db from "@/db";

import { AddressService } from "../addresses/addresses.service";
import { UserRepository } from "../users/users.repository";
import { UsersService } from "../users/users.service";
import { CustomersRepository } from "./customers.repository";

export class CustomersService {
  private readonly userRepository: UserRepository;
  private readonly addressService: AddressService;
  private readonly customerRepository: CustomersRepository;
  private readonly usersService: UsersService;

  /**
   * Create a new CustomersService
   * Initializes the user repository for database operations
   */
  constructor() {
    this.userRepository = new UserRepository();
    this.usersService = new UsersService();
    this.addressService = new AddressService();
    this.customerRepository = new CustomersRepository();
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
    // generate customer code with country code and customer sequence
    const customerSequence =
      await this.customerRepository.getNextCustomerCode();

    if (!customerSequence) {
      throw new AppError("Failed to generate customer code");
    }

    // Get Country Code
    const countryCode = await this.addressService.getCountryCode(
      customerData.countryId,
    );
    if (!countryCode) {
      throw new NotFoundError(
        `Country with ID ${customerData.countryId} not found`,
      );
    }

    const customerCode = `C${countryCode}-${customerSequence}`;

    const customer = await db.transaction(async (tx) => {
      const user = await this.userRepository.createWithPhoneNumber(tx, {
        ...customerData,
        username,
        createdBy: customerData.createdBy,
      });

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
      });

      return createdCustomer;
    });

    // fetch customer with addresses
    const customerWithAddresses = await this.customerRepository.findById(
      customer.id,
    );
    if (!customerWithAddresses) {
      throw new AppError("Customer could not be fetched after creation");
    }
    return customerWithAddresses as CreateCustomerResponse;
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
          userData,
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
            addressData,
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
      return await this.customerRepository.softDeleteMany(tx, [id], deletedBy);
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
    const result = await db.transaction(async (tx) => {
      return await this.customerRepository.softDeleteMany(tx, ids, deletedBy);
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
}
