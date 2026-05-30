import type { NewReviews } from "@/db/models/reviews";

import type { TX } from "@/lib/types";
import { avg, count, eq } from "drizzle-orm";

import { ReviewStatusIds } from "@/constants/review-statuses.constants";
import db from "@/db";
import { reviews } from "@/db/models/reviews";

export class ReviewsRepository {
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

  async create(tx: TX, reviewData: NewReviews) {
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
}
