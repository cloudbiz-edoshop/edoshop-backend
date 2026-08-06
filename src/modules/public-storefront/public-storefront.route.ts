import { createRoute, z } from "@hono/zod-openapi";

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
  publicFaqSchema,
  publicFilterSchema,
  publicNewArrivalProductSchema,
  publicPaymentMethodSchema,
  publicProductSchema,
  publicRetailerSchema,
  publicReviewSchema,
  subscribeNewsletterRequestSchema,
  subscribeNewsletterResponseSchema,
  publicCreateReviewRequestSchema,
  publicCreateReviewResponseSchema,
} from "./public-storefront.schema";

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
    [HttpStatusCodes.CREATED]: jsonContent(
      createSuccessResponseSchema(publicCreateReviewResponseSchema),
      "Review submitted for approval",
    ),
  },
});

export type ListBannersRoute = typeof listBanners;
export type ListFaqsRoute = typeof listFaqs;
export type ListFiltersRoute = typeof listFilters;
export type ListCategoriesRoute = typeof listCategories;
export type ListNewArrivalProductsRoute = typeof listNewArrivalProducts;
export type ListProductsRoute = typeof listProducts;
export type ListDiscountsRoute = typeof listDiscounts;
export type ListReviewsRoute = typeof listReviews;
export type ListCustomersRoute = typeof listCustomers;
export type ListRetailersRoute = typeof listRetailers;
export type ListPaymentMethodsRoute = typeof listPaymentMethods;
export type SubscribeNewsletterRoute = typeof subscribeNewsletter;
export type CreateReviewRoute = typeof createReview;
