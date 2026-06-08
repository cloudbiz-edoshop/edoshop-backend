import type { TX } from "@/lib/types";
import { and, avg, count, desc, eq, sql } from "drizzle-orm";

import { ReviewStatusIds } from "@/constants/review-statuses.constants";
import db from "@/db";
import { reviews } from "@/db/models/reviews";
import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

export class ReviewsRepository {
  async list(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;
    const { limit: limitVal, offset } = getPaginationValues(page, limit);
    const searchableFields = ["review"];

    const whereConditions = [];
    const filterCondition = createFilterConditions(reviews, filters);
    if (filterCondition) whereConditions.push(filterCondition);

    const searchCondition = createSearchCondition(
      searchableFields,
      reviews,
      search,
    );
    if (searchCondition) whereConditions.push(searchCondition);

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const sortCondition = createSortCondition(reviews, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(reviews)
        .where(whereClause || sql`TRUE`);

      const data = await tx.query.reviews.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(reviews.createdAt)],
        with: {
          product: true,
          status: true,
          createdBy: true,
          updatedBy: true,
        },
      });

      return { data, total: totalCount, searchableFields };
    });
  }

  async findById(id: number, tx?: TX) {
    const queryBuilder = tx ?? db;

    const review = await queryBuilder.query.reviews.findFirst({
      where: eq(reviews.id, id),
      with: {
        product: true,
        status: true,
        createdBy: true,
        updatedBy: true,
      },
    });

    return review;
  }

  async findByProductId(productId: number) {
    return await db.query.reviews.findMany({
      where: eq(reviews.productId, productId),
      with: {
        product: true,
        status: true,
        createdBy: true,
        updatedBy: true,
      },
      orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
    });
  }

  async getProductAverageRating(productId: number) {
    const [result] = await db
      .select({
        averageRating: avg(reviews.rating).mapWith(Number),
        totalReviews: count(reviews.id),
      })
      .from(reviews)
      .where(eq(reviews.productId, productId));

    return {
      averageRating: Number((result.averageRating || 0).toFixed(1)),
      totalReviews: result.totalReviews || 0,
    };
  }

  async create(
    tx: TX,
    reviewData: {
      productId: number;
      review: string;
      rating: number;
      statusId: number;
      itemsReceived?: number;
      itemsRejected?: number;
      reviewDate: string;
      createdBy: number;
      updatedBy: number;
    },
  ) {
    const [result] = await tx.insert(reviews).values(reviewData).returning();
    return result;
  }

  async updateStatus(tx: TX, id: number, statusId: number, updatedBy: number) {
    const [result] = await tx
      .update(reviews)
      .set({
        statusId,
        updatedBy,
        updatedAt: new Date().toISOString(),
        ...(statusId === ReviewStatusIds.APPROVED
          ? { approvedDate: new Date().toISOString() }
          : {}),
      })
      .where(eq(reviews.id, id))
      .returning();
    return result;
  }

  async delete(tx: TX, id: number) {
    const [result] = await tx.delete(reviews).where(eq(reviews.id, id)).returning();
    return result;
  }
}
