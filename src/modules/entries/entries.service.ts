import type {
  CreateEntriesRequest,
  CreateEntriesResponse,
  UpdateEntriesRequest,
} from "./entries.schema";
import { toSentenceCase } from "@/common";
import { NotFoundError } from "@/core/errors";

import { AppError } from "@/core/errors/app-error";

import db from "@/db";
import { EntriesRepository } from "./entries.repository";
import { EntryCodeGenerator } from "./services/entry-code-generator";
import { EntryCreationService } from "./services/entry-creation.service";
import { EntryDataResolver } from "./services/entry-data-resolver";
import { EntryUpdateService } from "./services/entry-update.service";
import { EntryValidationService } from "./validation/entry-validation.service";

export class EntriesService {
  private readonly entriesRepository: EntriesRepository;
  private readonly validationService: EntryValidationService;
  private readonly dataResolver: EntryDataResolver;
  private readonly codeGenerator: EntryCodeGenerator;
  private readonly creationService: EntryCreationService;
  private readonly updateService: EntryUpdateService;

  constructor() {
    this.entriesRepository = new EntriesRepository();
    this.validationService = new EntryValidationService();
    this.dataResolver = new EntryDataResolver();
    this.codeGenerator = new EntryCodeGenerator();
    this.creationService = new EntryCreationService(this.entriesRepository);
    this.updateService = new EntryUpdateService();
  }

  async getEntryTypes() {
    const entries = await db.query.entryTypes.findMany();
    if (entries.length === 0) {
      return [];
    }
    const modifiedEntries = entries.map((entry) => ({
      id: entry.id,
      name: toSentenceCase(entry.name),
      description: entry.description,
    }));
    return modifiedEntries;
  }

  async createEntry(
    entryData: CreateEntriesRequest & { createdBy: number },
  ): Promise<CreateEntriesResponse> {
    // Layer 1: Validation
    await this.validationService.validate(entryData);

    // Layer 2: Resolve entity IDs from codes
    const resolvedIds = await this.dataResolver.resolveEntityIds(entryData);

    // Layer 3: Generate required codes
    const generatedCodes = await this.codeGenerator.generateRequiredCodes(
      entryData,
      resolvedIds,
    );

    // Layer 4: Execute entry creation in transaction
    const created = await db.transaction(async (tx) => {
      return this.creationService.executeEntryCreation(
        tx,
        entryData,
        resolvedIds,
        generatedCodes,
      );
    });

    // Layer 5: Fetch and return the complete entry
    const result = await this.entriesRepository.findById(created.id);
    if (!result) {
      throw new AppError("Entry could not be fetched after creation");
    }

    return result as CreateEntriesResponse;
  }

  async list(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return this.entriesRepository.list(params);
  }

  async findById(id: number) {
    const entry = await this.entriesRepository.findById(id);
    if (!entry) {
      throw new NotFoundError("Entry not found");
    }
    return entry;
  }

  async update(id: number, data: UpdateEntriesRequest & { updatedBy: number }) {
    const entry = await this.entriesRepository.findById(id);
    if (!entry) {
      throw new NotFoundError(`Entry not found for ID: ${id}`);
    }

    return await db.transaction(async (tx) => {
      // 1. Update the main entry record
      const updated = await this.entriesRepository.update(tx, id, data);

      // 2. Update type-specific records based on entry type
      if (entry.entryTypeId) {
        await this.updateService.updateTypeSpecificRecords(
          tx,
          id,
          entry.entryTypeId,
          data,
        );
      }

      return updated;
    });
  }

  async delete(id: number, deletedBy: number) {
    const entry = await this.entriesRepository.findById(id);
    if (!entry) {
      throw new NotFoundError("Entry not found");
    }

    // Use softDeleteMany for single entry
    await db.transaction(async (tx) => {
      await this.entriesRepository.softDeleteMany(tx, [id], deletedBy);
    });
  }

  async getAllBundleIds(): Promise<{ id: number; bundleCode: string }[]> {
    return this.entriesRepository.getAllBundleIds();
  }

  async getAllSeriesIds(): Promise<{ id: number; seriesCode: string }[]> {
    return this.entriesRepository.getAllSeriesIds();
  }

  async getAllItemIds(): Promise<{ id: number; itemCode: string }[]> {
    return this.entriesRepository.getAllItemIds();
  }

  async getAllPackageIds(): Promise<{ id: number; packageCode: string }[]> {
    return this.entriesRepository.getAllPackageIds();
  }

  async getUserEntriesByType(
    userId: number,
    entryTypeId: number,
    params: {
      search?: string;
      page: number;
      limit: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      filters?: Record<string, any>;
    },
  ) {
    return this.entriesRepository.list({
      ...params,
      filters: {
        ...params.filters,
        entryTypeId,
        createdBy: userId,
      },
    });
  }

  async getEntriesByType(
    entryTypeId: number,
    params: {
      search?: string;
      page: number;
      limit: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      filters?: Record<string, any>;
    },
  ) {
    return this.entriesRepository.list({
      ...params,
      filters: {
        ...params.filters,
        entryTypeId,
      },
    });
  }

  async getAllEntryStates() {
    return db.query.entryStates.findMany();
  }
}
