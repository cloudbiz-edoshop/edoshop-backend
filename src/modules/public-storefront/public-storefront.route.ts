import { createRoute, z } from "@hono/zod-openapi";

import * as HttpStatusCodes from "@/lib/http-status-codes";
import { jsonContent } from "@/lib/openapi/helpers";
import { createSuccessResponseSchemaWithPagination } from "@/lib/openapi/schemas/create-api-response";
import commonQueryParamsSchema from "@/lib/openapi/schemas/query-params-schema";

import {
  publicBannerSchema,
  publicCategorySchema,
  publicCustomerSchema,
  publicDiscountSchema,
  publicFaqSchema,
  publicFilterSchema,
  publicNewArrivalProductSchema,
  publicProductSchema,
  publicRetailerSchema,
  publicReviewSchema,
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
