import type {
  CreateReviewRequest,
  UpdateReviewStatusRequest,
} from "./reviews.schema";

import { and, eq } from "drizzle-orm";
import { ReviewStatusIds } from "@/constants/review-statuses.constants";
import { ConflictError, ForbiddenError, NotFoundError } from "@/core/errors";
import db from "@/db";

import { reviews } from "@/db/models";

import { ReviewsRepository } from "./reviews.repository";

const todayDate = () => new Date().toISOString().slice(0, 10);

export class ReviewsService {
  private readonly reviewsRepository: ReviewsRepository;

  constructor() {
    this.reviewsRepository = new ReviewsRepository();
  }

  async createReview(reviewData: CreateReviewRequest & { createdBy: number }) {
    // Check if user already reviewed this product
    const existingReview = await db.query.reviews.findFirst({
      where: and(
        eq(reviews.productId, reviewData.productId),
        eq(reviews.createdBy, reviewData.createdBy),
      ),
    });

    if (existingReview) {
      throw new ConflictError("You have already reviewed this product");
    }

    // Ensure rating is within bounds
    const rating = Math.min(Math.max(reviewData.rating ?? 0, 0), 5);
    // Admin/staff creates are trusted content; storefront guests use createGuestReview (pending).
    const statusId = ReviewStatusIds.APPROVED;

    const review = await db.transaction(async (tx) => {
      const createdReview = await this.reviewsRepository.create(tx, {
        ...reviewData,
        rating,
        statusId,
        itemsReceived: null,
        itemsRejected: null,
        reviewDate: todayDate(),
        approvedDate: todayDate(),
        updatedBy: reviewData.createdBy,
      });

      return createdReview;
    });

    const reviewWithRelations = await this.reviewsRepository.findById(
      review.id,
    );
    if (!reviewWithRelations) {
      throw new NotFoundError("Review not found after creation");
    }

    return reviewWithRelations;
  }

  async getCustomerReviewEligibility(userId: number, productId: number) {
    const purchased = await this.reviewsRepository.customerPurchasedProduct(
      userId,
      productId,
    );
    const existingReview = await this.reviewsRepository.findByProductAndUser(
      productId,
      userId,
    );

    if (!purchased) {
      return {
        canReview: false,
        reason: "not_purchased",
        existingReview: existingReview
          ? {
              id: existingReview.id,
              rating: existingReview.rating,
              review: existingReview.review,
              statusId: existingReview.statusId,
            }
          : null,
      };
    }

    return {
      canReview: true,
      reason: existingReview ? "edit_existing" : "create_new",
      existingReview: existingReview
        ? {
            id: existingReview.id,
            rating: existingReview.rating,
            review: existingReview.review,
            statusId: existingReview.statusId,
          }
        : null,
    };
  }

  async createCustomerProductReview(
    userId: number,
    data: { productId: number; review: string; rating: number },
  ) {
    const purchased = await this.reviewsRepository.customerPurchasedProduct(
      userId,
      data.productId,
    );
    if (!purchased) {
      throw new ForbiddenError(
        "Only customers who purchased this product can submit a review.",
      );
    }

    const existingReview = await this.reviewsRepository.findByProductAndUser(
      data.productId,
      userId,
    );
    if (existingReview) {
      throw new ConflictError(
        "You have already reviewed this product. Edit your existing review instead.",
      );
    }

    const rating = Math.min(Math.max(data.rating ?? 0, 1), 5);
    const reviewText = data.review.trim().slice(0, 1000);

    const review = await db.transaction(async (tx) => {
      return this.reviewsRepository.create(tx, {
        productId: data.productId,
        review: reviewText,
        rating,
        statusId: ReviewStatusIds.APPROVED,
        reviewDate: todayDate(),
        approvedDate: todayDate(),
        createdBy: userId,
        updatedBy: userId,
      });
    });

    const reviewWithRelations = await this.reviewsRepository.findById(review.id);
    if (!reviewWithRelations) {
      throw new NotFoundError("Review not found after creation");
    }

    return reviewWithRelations;
  }

  async updateCustomerProductReview(
    userId: number,
    productId: number,
    data: { review: string; rating: number },
  ) {
    const existingReview = await this.reviewsRepository.findByProductAndUser(
      productId,
      userId,
    );
    if (!existingReview) {
      throw new NotFoundError("Review not found for this product");
    }

    const purchased = await this.reviewsRepository.customerPurchasedProduct(
      userId,
      productId,
    );
    if (!purchased) {
      throw new ForbiddenError(
        "Only customers who purchased this product can update a review.",
      );
    }

    const rating = Math.min(Math.max(data.rating ?? 0, 1), 5);
    const reviewText = data.review.trim().slice(0, 1000);

    await db.transaction(async (tx) => {
      await this.reviewsRepository.updateContent(tx, existingReview.id, {
        review: reviewText,
        rating,
        updatedBy: userId,
      });
    });

    const updated = await this.reviewsRepository.findById(existingReview.id);
    if (!updated) {
      throw new NotFoundError("Review not found after update");
    }

    return updated;
  }

  async createGuestReview(data: {
    productId: number;
    review: string;
    rating: number;
    fullName: string;
    email: string;
  }) {
    const rating = Math.min(Math.max(data.rating ?? 0, 1), 5);
    const attribution = `— ${data.fullName} (${data.email})`;
    const reviewText = `${data.review.trim()}\n\n${attribution}`.slice(0, 1000);

    const review = await db.transaction(async (tx) => {
      return this.reviewsRepository.create(tx, {
        productId: data.productId,
        review: reviewText,
        rating,
        statusId: ReviewStatusIds.PENDING,
        reviewDate: todayDate(),
        createdBy: null,
        updatedBy: null,
      });
    });

    return review;
  }

  async listReviews(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.reviewsRepository.list(params);
  }

  async getReviewById(id: number) {
    const review = await this.reviewsRepository.findById(id);
    if (!review) {
      throw new NotFoundError("Review not found");
    }
    return review;
  }

  async getReviewsByProductId(productId: number) {
    const reviews = await this.reviewsRepository.findByProductId(productId);

    // Calculate average rating
    const totalRating = reviews.reduce(
      (sum, review) => sum + (review.rating || 0),
      0,
    );
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    return {
      reviews,
      averageRating: Number(averageRating.toFixed(1)),
      totalReviews: reviews.length,
    };
  }

  async updateReviewStatus(
    id: number,
    data: UpdateReviewStatusRequest & { updatedBy: number },
  ) {
    const review = await this.reviewsRepository.findById(id);
    if (!review) {
      throw new NotFoundError("Review not found");
    }

    const updatedReview = await db.transaction(async (tx) => {
      await this.reviewsRepository.updateStatus(
        tx,
        id,
        data.statusId,
        data.updatedBy,
      );

      const updated = await this.reviewsRepository.findById(id, tx);
      if (!updated) {
        throw new NotFoundError("Review not found after update");
      }

      return updated;
    });

    return updatedReview;
  }

  async deleteReview(id: number) {
    const review = await this.reviewsRepository.findById(id);
    if (!review) {
      throw new NotFoundError("Review not found");
    }

    await db.transaction(async (tx) => {
      await this.reviewsRepository.delete(tx, id);
    });
  }
}
