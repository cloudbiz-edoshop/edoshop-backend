import type {
  CreateTermsRequest,
  CreateTermsResponse,
  PublicTermsResponse,
  UpdateTermsRequest,
} from "./terms.schema";

import { ConflictError, NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";
import db from "@/db";

import {
  getDefaultTermsDocument,
  getDefaultTermsForLanguage,
  normalizeTermsLanguage,
} from "./terms.defaults";
import { TermsRepository } from "./terms.repository";

const mapTermsToPublic = (record: {
  languageCode: string;
  title: string;
  effectiveDate: string;
  version: string;
  acceptanceLabel: string;
  contact: PublicTermsResponse["contact"];
  sections: PublicTermsResponse["sections"];
}): PublicTermsResponse => ({
  languageCode: normalizeTermsLanguage(record.languageCode),
  title: record.title,
  effectiveDate: record.effectiveDate,
  version: record.version,
  acceptanceLabel: record.acceptanceLabel,
  contact: record.contact ?? {},
  sections: record.sections ?? [],
  meta: {
    title: record.title,
    effectiveDate: record.effectiveDate,
    version: record.version,
    contact: record.contact ?? {},
  },
});

export class TermsService {
  private readonly termsRepository = new TermsRepository();

  async listTerms(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return this.termsRepository.list(params);
  }

  async getTermsById(id: number) {
    const record = await this.termsRepository.findById(id);
    if (!record) {
      throw new NotFoundError("Terms not found");
    }
    return record;
  }

  async getTermsDefaults(languageCode?: string | null) {
    return getDefaultTermsForLanguage(languageCode);
  }

  async getPublicTerms(languageCode?: string | null): Promise<PublicTermsResponse> {
    const code = normalizeTermsLanguage(languageCode);
    const record = await this.termsRepository.findByLanguageCode(code);

    if (record) {
      return mapTermsToPublic(record);
    }

    return mapTermsToPublic(getDefaultTermsDocument(code));
  }

  async createTerms(
    termsData: CreateTermsRequest & { createdBy: number },
  ): Promise<CreateTermsResponse> {
    const existing = await this.termsRepository.findByLanguageCode(
      termsData.languageCode,
    );

    if (existing) {
      throw new ConflictError(
        `Terms already exist for language "${termsData.languageCode}"`,
      );
    }

    const record = await db.transaction(async (tx) =>
      this.termsRepository.create(tx, {
        ...termsData,
        updatedBy: termsData.createdBy,
      }),
    );

    const created = await this.termsRepository.findById(record.id);
    if (!created) {
      throw new AppError("Terms could not be fetched after creation");
    }

    return created;
  }

  async updateTerms(
    id: number,
    termsData: UpdateTermsRequest & { updatedBy: number },
  ) {
    const existing = await this.termsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Terms not found");
    }

    if (
      termsData.languageCode &&
      termsData.languageCode !== existing.languageCode
    ) {
      const duplicate = await this.termsRepository.findByLanguageCode(
        termsData.languageCode,
      );
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError(
          `Terms already exist for language "${termsData.languageCode}"`,
        );
      }
    }

    await db.transaction(async (tx) => {
      await this.termsRepository.update(tx, id, termsData);
    });

    const updated = await this.termsRepository.findById(id);
    if (!updated) {
      throw new AppError("Terms could not be fetched after update");
    }

    return updated;
  }

  async deleteTerms(ids: number[], deletedBy: number) {
    const result = await db.transaction(async (tx) =>
      this.termsRepository.softDeleteMany(tx, ids, deletedBy),
    );

    if (!result) {
      throw new AppError("Failed to delete terms");
    }

    return result;
  }
}
