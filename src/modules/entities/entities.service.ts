import { NotFoundError } from "@/core/errors";
import { EntityRepository } from "@/modules/entities/entities.repository";

/**
 * Service for entity management operations
 */
export class EntityService {
  private readonly entityRepository: EntityRepository;

  /**
   * Create a new EntityService
   */
  constructor() {
    this.entityRepository = new EntityRepository();
  }

  /**
   * List entities with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @returns List of entities and total count
   */
  async listEntities(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.entityRepository.list(params);
  }

  /**
   * Get an entity by ID
   *
   * @param id - Entity ID
   * @returns Entity
   * @throws NotFoundError if entity is not found
   */
  async getEntity(id: number) {
    const entity = await this.entityRepository.findById(id);

    if (!entity) {
      throw new NotFoundError(`Entity with ID ${id} not found`);
    }

    return entity;
  }

  /**
   * Create a new entity
   *
   * @param data - Entity data
   * @param data.name - Entity name
   * @param data.description - Entity description
   * @returns Created entity
   */
  async createEntity(data: { name: string; description?: string }) {
    return await this.entityRepository.create(data);
  }

  /**
   * Update an entity
   *
   * @param id - Entity ID
   * @param data - Entity data to update
   * @param data.name - Entity name
   * @param data.description - Entity description
   * @returns Updated entity
   * @throws NotFoundError if entity is not found
   */
  async updateEntity(
    id: number,
    data: { name?: string; description?: string },
  ) {
    // Check if entity exists
    const existingEntity = await this.entityRepository.findById(id);
    if (!existingEntity) {
      throw new NotFoundError(`Entity with ID ${id} not found`);
    }

    return await this.entityRepository.update(id, data);
  }

  /**
   * Delete an entity
   *
   * @param id - Entity ID
   * @returns Deleted entity ID
   * @throws NotFoundError if entity is not found
   */
  async deleteEntity(id: number) {
    // Check if entity exists
    const existingEntity = await this.entityRepository.findById(id);
    if (!existingEntity) {
      throw new NotFoundError(`Entity with ID ${id} not found`);
    }

    return await this.entityRepository.delete(id);
  }
}
