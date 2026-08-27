import type { UpdateTermsRequest } from "./terms.schema";

import type { NewTerms } from "@/db/models/terms";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import db from "@/db";
import { terms } from "@/db/models";

import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

export class TermsRepository {
  async findById(id: number) {
    return db.query.terms.findFirst({
      where: and(eq(terms.id, id), eq(terms.isDeleted, false)),
    });
  }

  async findByLanguageCode(languageCode: string) {
    return db.query.terms.findFirst({
      where: and(
        eq(terms.languageCode, languageCode),
        eq(terms.isDeleted, false),
      ),
    });
  }

  async list(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;
    const searchableFields = ["title", "languageCode", "version"];
    const filterCondition = createFilterConditions(terms, filters);
    const searchCondition = createSearchCondition(
      searchableFields,
      terms,
      search,
    );

    const whereConditions = [eq(terms.isDeleted, false)];
    if (filterCondition) whereConditions.push(filterCondition);
    if (searchCondition) whereConditions.push(searchCondition);

    const whereClause = and(...whereConditions);
    const { limit: limitVal, offset } = getPaginationValues(page, limit);
    const sortCondition = createSortCondition(terms, sortBy, sortOrder);

    return db.transaction(async (tx) => {
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(terms)
        .where(whereClause || sql`TRUE`);

      const data = await tx.query.terms.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(terms.updatedAt)],
      });

      return { data, total: totalCount, searchableFields };
    });
  }

  async create(tx: TX, termsData: NewTerms) {
    const [result] = await tx.insert(terms).values(termsData).returning();
    return result;
  }

  async update(
    tx: TX,
    id: number,
    termsData: UpdateTermsRequest & { updatedBy: number },
  ) {
    const [result] = await tx
      .update(terms)
      .set({
        ...termsData,
        updatedAt: new Date().toISOString(),
        updatedBy: termsData.updatedBy,
      })
      .where(eq(terms.id, id))
      .returning();

    return result;
  }

  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(terms)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(terms.id, ids))
      .returning();

    return result.length > 0;
  }
}
