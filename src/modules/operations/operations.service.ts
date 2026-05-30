import { NotFoundError } from "@/core/errors";
import { OperationRepository } from "@/modules/operations/operations.repository";

/**
 * Service for operation management operations
 */
export class OperationService {
  private readonly operationRepository: OperationRepository;

  /**
   * Create a new OperationService
   */
  constructor() {
    this.operationRepository = new OperationRepository();
  }

  /**
   * List operations with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of operations and total count
   */
  async listOperations(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.operationRepository.list(params);
  }

  /**
   * Get an operation by ID
   *
   * @param id - Operation ID
   * @returns Operation
   * @throws NotFoundError if operation is not found
   */
  async getOperation(id: number) {
    const operation = await this.operationRepository.findById(id);

    if (!operation) {
      throw new NotFoundError(`Operation with ID ${id} not found`);
    }

    return operation;
  }

  /**
   * Create a new operation
   *
   * @param data - Operation data
   * @param data.name - Operation name
   * @param data.description - Operation description
   * @returns Created operation
   */
  async createOperation(data: { name: string; description?: string }) {
    return await this.operationRepository.create(data);
  }

  /**
   * Update an operation
   *
   * @param id - Operation ID
   * @param data - Operation data to update
   * @param data.name - Operation name
   * @param data.description - Operation description
   * @returns Updated operation
   * @throws NotFoundError if operation is not found
   */
  async updateOperation(
    id: number,
    data: { name?: string; description?: string },
  ) {
    // Check if operation exists
    const existingOperation = await this.operationRepository.findById(id);
    if (!existingOperation) {
      throw new NotFoundError(`Operation with ID ${id} not found`);
    }

    return await this.operationRepository.update(id, data);
  }

  /**
   * Delete an operation
   *
   * @param id - Operation ID
   * @returns Deleted operation ID
   * @throws NotFoundError if operation is not found
   */
  async deleteOperation(id: number) {
    // Check if operation exists
    const existingOperation = await this.operationRepository.findById(id);
    if (!existingOperation) {
      throw new NotFoundError(`Operation with ID ${id} not found`);
    }

    return await this.operationRepository.delete(id);
  }
}
