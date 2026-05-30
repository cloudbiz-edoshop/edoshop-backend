import { appConfig } from "@/config";
import { authRateLimiter, rateLimiter } from "@/core/middlewares";
import configureOpenAPI from "@/lib/configure-open-api";
import createApp from "@/lib/create-app";
import aboutUs from "@/modules/about-us/about-us.index";
import addresses from "@/modules/addresses/addresses.index";
import attributes from "@/modules/attributes/attributes.index";
import banners from "@/modules/banners/banners.index";
import categories from "@/modules/categories/categories.index";
import colors from "@/modules/colors/colors.index";
import customers from "@/modules/customers/customers.index";
import discounts from "@/modules/discounts/discounts.index";
import employees from "@/modules/employees/employees.index";
import entities from "@/modules/entities/entities.index";
import entries from "@/modules/entries/entries.index";
import entryImages from "@/modules/entry-images/entry-images.index";
import faqs from "@/modules/faqs/faqs.index";
import filters from "@/modules/filters/filters.index";
import index from "@/modules/index.route";
import mobileUpload from "@/modules/mobile-upload/mobile-upload.index";
import newArrivals from "@/modules/new-arrivals/new-arrivals.index";
import notifications from "@/modules/notifications/notifications.index";
import ongoingGroups from "@/modules/ongoing-groups/ongoing-groups.index";
import operations from "@/modules/operations/operations.index";
import orders from "@/modules/orders/orders.index";
import packages from "@/modules/packages/packages.index";
import paymentMethods from "@/modules/payment-methods/payment-methods.index";
import products from "@/modules/products/products.index";
import rayons from "@/modules/rayons/rayons.index";
import retailers from "@/modules/retailers/retailers.index";
import reviews from "@/modules/reviews/reviews.index";
import roles from "@/modules/roles/roles.index";
import sizes from "@/modules/sizes/sizes.index";
import stores from "@/modules/stores/stores.index";
import suppliers from "@/modules/suppliers/suppliers.index";
import tags from "@/modules/tags/tags.index";
import testimonials from "@/modules/testimonials/testimonials.index";
import uploadTokens from "@/modules/upload-tokens/upload-tokens.index";
import uploads from "@/modules/uploads/uploads.index";
import users from "@/modules/users/users.index";
import variants from "@/modules/variants/variants.index";
import warehouseTransfers from "@/modules/warehouse-transfers/warehouse-transfers.index";
import warehouses from "@/modules/warehouses/warehouses.index";

const app = createApp();

configureOpenAPI(app);

// Apply rate limiting in all environments for security, but with different settings
if (appConfig.isProduction) {
  app.use(
    "*",
    rateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 120, // 120 requests per minute
      standardHeaders: true,
      message: "Too many requests, please try again later",
    }),
  );
  // Apply more strict authentication-specific rate limiting for sensitive routes
  app.use("/login", authRateLimiter);
  app.use("/forgot-password", authRateLimiter);
  app.use("/verify-otp", authRateLimiter);
  app.use("/reset-password", authRateLimiter);
  app.use("/refresh-token", authRateLimiter);
} else {
  // Less strict for development environment
  app.use(
    "*",
    rateLimiter({
      windowMs: 60 * 1000,
      max: 500,
      standardHeaders: true,
    }),
  );
}

// Do not apply CSRF protection for all environments - Not needed for now
// app.use("*", csrfProtection);

const routes = [
  users,
  employees,
  suppliers,
  customers,
  retailers,
  roles,
  operations,
  entities,
  paymentMethods,
  addresses,
  entries,
  entryImages,
  uploadTokens,
  mobileUpload,
  warehouseTransfers,
  warehouses,
  rayons,
  attributes,
  colors,
  sizes,
  stores,
  faqs,
  filters,
  testimonials,
  aboutUs,
  banners,
  tags,
  categories,
  notifications,
  products,
  variants,
  reviews,
  discounts,
  newArrivals,
  ongoingGroups,
  orders,
  packages,
  uploads,
] as const;
// Register the index route
app.route("/", index);
// Register all other routes
for (const route of routes) {
  app.route("/v1", route);
}

export type AppType = (typeof routes)[number];

export default app;
