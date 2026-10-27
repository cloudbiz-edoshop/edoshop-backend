import { createRoute, z } from "@hono/zod-openapi";

import { jwtMiddleware } from "@/core/middlewares";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { jsonContent, jsonContentRequired } from "@/lib/openapi/helpers";
import { createSuccessResponseSchemaWithPagination } from "@/lib/openapi/schemas/create-api-response";
import { createSuccessResponseSchema } from "@/lib/openapi/schemas";
import commonQueryParamsSchema from "@/lib/openapi/schemas/query-params-schema";

import {
  publicBannerSchema,
  publicCategorySchema,
  publicCustomerSchema,
  publicDiscountSchema,
  publicPromoBannerSchema,
  publicHomeBannerDisplaySchema,
  publicPromoCardsSchema,
  publicFaqSchema,
  publicFilterSchema,
  publicNewArrivalProductSchema,
  publicPaymentMethodSchema,
  publicProductSchema,
  publicRetailerSchema,
  publicReviewSchema,
  publicTestimonialSchema,
  subscribeNewsletterRequestSchema,
  subscribeNewsletterResponseSchema,
  publicCreateReviewRequestSchema,
  publicCreateReviewResponseSchema,
  publicAboutUsSchema,
  publicProductReviewsResponseSchema,
  customerReviewEligibilitySchema,
  customerSubmitReviewRequestSchema,
  customerSubmitReviewResponseSchema,
} from "./public-storefront.schema";
import { jwtHeaderSchema } from "@/lib/zod-schemas";

const tags = ["Public Storefront"];

const publicListRoute = (path: string, schema: z.ZodTypeAny, description: string) =>
  createRoute({
    path,
    method: "get",
    tags,
    request: {
      query: commonQueryParamsSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        createSuccessResponseSchemaWithPagination(z.array(schema)),
        description,
      ),
    },
  });

export const listBanners = publicListRoute(
  "/public/banners",
  publicBannerSchema,
  "Public banners",
);

export const listFaqs = publicListRoute(
  "/public/faqs",
  publicFaqSchema,
  "Public FAQs",
);

export const listAboutUs = publicListRoute(
  "/public/about-us",
  publicAboutUsSchema,
  "Public About Us sections",
);

export const listFilters = publicListRoute(
  "/public/filters",
  publicFilterSchema,
  "Public filters",
);

export const listCategories = publicListRoute(
  "/public/categories",
  publicCategorySchema,
  "Public categories",
);

export const listNewArrivalProducts = publicListRoute(
  "/public/new-arrivals/products",
  publicNewArrivalProductSchema,
  "Public new arrival products",
);

export const listProducts = publicListRoute(
  "/public/products",
  publicProductSchema,
  "Public products",
);

export const getProduct = createRoute({
  path: "/public/products/{id}",
  method: "get",
  tags,
  request: {
    params: z.object({
      id: z.coerce.number().openapi({
        param: { name: "id", in: "path" },
        example: 2974,
      }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(publicProductSchema),
      "Public product by ID",
    ),
  },
});

export const getPromoBanner = createRoute({
  path: "/public/promo-banner",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(publicPromoBannerSchema.nullable()),
      "Active promo banner",
    ),
  },
});

export const getPromoCards = createRoute({
  path: "/public/promo-cards",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(publicPromoCardsSchema),
      "Active home promo cards",
    ),
  },
});

export const getHomeBannerDisplay = createRoute({
  path: "/public/home-banner-display",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(publicHomeBannerDisplaySchema),
      "Storefront home banner mode",
    ),
  },
});

export const listDiscounts = publicListRoute(
  "/public/discounts",
  publicDiscountSchema,
  "Public discounts",
);

export const listReviews = publicListRoute(
  "/public/reviews",
  publicReviewSchema,
  "Public reviews",
);

export const listTestimonials = publicListRoute(
  "/public/testimonials",
  publicTestimonialSchema,
  "Public CMS testimonials",
);

export const listCustomers = publicListRoute(
  "/public/customers",
  publicCustomerSchema,
  "Public customer summaries",
);

export const listRetailers = publicListRoute(
  "/public/retailers",
  publicRetailerSchema,
  "Public retailer summaries",
);

export const listPaymentMethods = publicListRoute(
  "/public/payment-methods",
  publicPaymentMethodSchema,
  "Public payment methods",
);

export const subscribeNewsletter = createRoute({
  path: "/public/newsletter/subscribe",
  method: "post",
  tags,
  summary: "Subscribe to the storefront newsletter",
  request: {
    body: jsonContentRequired(
      subscribeNewsletterRequestSchema,
      "Newsletter subscription email",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(subscribeNewsletterResponseSchema),
      "Newsletter subscription saved",
    ),
  },
});

export const createReview = createRoute({
  path: "/public/reviews",
  method: "post",
  tags,
  summary: "Submit a storefront product review",
  request: {
    body: jsonContentRequired(
      publicCreateReviewRequestSchema,
      "Public product review submission",
    ),
  },
  responses: {
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      createSuccessResponseSchema(z.object({ message: z.string() })),
      "Guest reviews are not allowed",
    ),
  },
});

export const getProductReviews = createRoute({
  path: "/public/products/{productId}/reviews",
  method: "get",
  tags,
  summary: "List approved reviews for a product",
  request: {
    params: z.object({
      productId: z.string().regex(/^\d+$/, "productId must be a positive integer"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(publicProductReviewsResponseSchema),
      "Product reviews",
    ),
  },
});

export const getCustomerReviewEligibility = createRoute({
  path: "/public/products/{productId}/review-eligibility",
  method: "get",
  tags,
  summary: "Check whether the signed-in customer can review a product",
  middleware: [jwtMiddleware()] as const,
  request: {
    params: z.object({
      productId: z.string().regex(/^\d+$/, "productId must be a positive integer"),
    }),
    headers: jwtHeaderSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(customerReviewEligibilitySchema),
      "Review eligibility",
    ),
  },
});

export const submitCustomerProductReview = createRoute({
  path: "/public/products/{productId}/reviews",
  method: "post",
  tags,
  summary: "Submit a verified-buyer product review",
  middleware: [jwtMiddleware()] as const,
  request: {
    params: z.object({
      productId: z.string().regex(/^\d+$/, "productId must be a positive integer"),
    }),
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      customerSubmitReviewRequestSchema,
      "Verified buyer review",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      createSuccessResponseSchema(customerSubmitReviewResponseSchema),
      "Review created",
    ),
  },
});

export const updateCustomerProductReview = createRoute({
  path: "/public/products/{productId}/reviews",
  method: "patch",
  tags,
  summary: "Update the signed-in customer's review for a product",
  middleware: [jwtMiddleware()] as const,
  request: {
    params: z.object({
      productId: z.string().regex(/^\d+$/, "productId must be a positive integer"),
    }),
    headers: jwtHeaderSchema,
    body: jsonContentRequired(
      customerSubmitReviewRequestSchema,
      "Verified buyer review update",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(customerSubmitReviewResponseSchema),
      "Review updated",
    ),
  },
});

export type ListBannersRoute = typeof listBanners;
export type ListFaqsRoute = typeof listFaqs;
export type ListFiltersRoute = typeof listFilters;
export type ListCategoriesRoute = typeof listCategories;
export type ListNewArrivalProductsRoute = typeof listNewArrivalProducts;
export type ListProductsRoute = typeof listProducts;
export type GetProductRoute = typeof getProduct;
export type ListDiscountsRoute = typeof listDiscounts;
export type GetPromoBannerRoute = typeof getPromoBanner;
export type ListReviewsRoute = typeof listReviews;
export type ListCustomersRoute = typeof listCustomers;
export type ListRetailersRoute = typeof listRetailers;
export type ListPaymentMethodsRoute = typeof listPaymentMethods;
export type SubscribeNewsletterRoute = typeof subscribeNewsletter;
export type CreateReviewRoute = typeof createReview;
export type GetProductReviewsRoute = typeof getProductReviews;
export type GetCustomerReviewEligibilityRoute = typeof getCustomerReviewEligibility;
export type SubmitCustomerProductReviewRoute = typeof submitCustomerProductReview;
export type UpdateCustomerProductReviewRoute = typeof updateCustomerProductReview;
