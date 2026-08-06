import { ReviewStatusIds } from "@/constants/review-statuses.constants";
import stripeConfig from "@/config/stripe.config";
import {
  MOBILE_TRANSFER_PAYMENT_METHODS,
  PAYMENT_METHOD_GATEWAYS,
  PaymentMethod,
  STOREFRONT_CHECKOUT_PAYMENT_METHODS,
} from "@/constants/payment-methods.constants";
import { successResponse, successResponseWithPagination } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";
import db from "@/db";
import { newsletterSubscribers } from "@/db/models/newsletter-subscribers";
import { BannersService } from "@/modules/banners/banners.service";
import { CategoriesService } from "@/modules/categories/categories.service";
import { CustomersService } from "@/modules/customers/customers.service";
import { DiscountsService } from "@/modules/discounts/discounts.service";
import { FaqsService } from "@/modules/faqs/faqs.service";
import { FiltersService } from "@/modules/filters/filters.service";
import { NewArrivalsService } from "@/modules/new-arrivals/new-arrivals.service";
import { ProductsService } from "@/modules/products/products.service";
import { PaymentMethodService } from "@/modules/payment-methods/payment-methods.service";
import { RetailersService } from "@/modules/retailers/retailers.service";
import { ReviewsService } from "@/modules/reviews/reviews.service";

const bannersService = new BannersService();
const faqsService = new FaqsService();
const filtersService = new FiltersService();
const categoriesService = new CategoriesService();
const newArrivalsService = new NewArrivalsService();
const productsService = new ProductsService();
const discountsService = new DiscountsService();
const reviewsService = new ReviewsService();
const customersService = new CustomersService();
const retailersService = new RetailersService();
const paymentMethodService = new PaymentMethodService();

type ListParams = {
  search?: string;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, any>;
};

const getListParams = (c: any) => {
  const queryParams = c.req.valid("query");
  const filters =
    typeof queryParams.filters === "string"
      ? JSON.parse(queryParams.filters)
      : queryParams.filters;

  return {
    search: queryParams.search,
    page: queryParams.page,
    limit: queryParams.limit,
    sortBy: queryParams.sortBy,
    sortOrder: queryParams.sortOrder,
    filters,
  } satisfies ListParams;
};

const sendPublicList = <T>(
  c: any,
  data: T[],
  total: number,
  searchableFields: string[],
  page: number,
  limit: number,
  message: string,
) =>
  c.json(
    successResponseWithPagination(
      data,
      createPagination(total, page, limit),
      searchableFields,
      message,
    ),
    HttpStatusCodes.OK,
  );

const getVariantImageUrl = (image: any) =>
  typeof image === "string" ? image : image?.imageUrl || null;

const getProductImageUrl = (product: any) => {
  const fromProduct = product.imageUrls?.find(Boolean) || product.imageUrl;
  if (fromProduct) return fromProduct;

  for (const variant of product.variants || []) {
    for (const image of variant.images || []) {
      const url = getVariantImageUrl(image);
      if (url) return url;
    }
  }

  return null;
};

const enrichProductImages = (products: any[]) => {
  const imageByName = new Map<string, string>();

  for (const product of products) {
    const imageUrl = getProductImageUrl(product);
    if (!imageUrl) continue;

    const key = String(product.name || "").trim().toLowerCase();
    if (key && !imageByName.has(key)) {
      imageByName.set(key, imageUrl);
    }
  }

  return products.map((product) => {
    const imageUrl =
      getProductImageUrl(product) ||
      imageByName.get(String(product.name || "").trim().toLowerCase()) ||
      null;

    return imageUrl ? { ...product, imageUrl } : product;
  });
};

const mapPublicProduct = (product: any) => ({
  id: product.id,
  name: product.name,
  price: product.price,
  imageUrl: getProductImageUrl(product),
  imageUrls: product.imageUrls || [],
  shortDescription: product.shortDescription,
  fullDescription: product.fullDescription,
  specifications: product.specifications,
  totalItems: product.totalItems,
  storeId: product.storeId,
  seriesId: product.seriesId,
  categoryIds: getPublicCategories(product).map((category: any) => category.id).filter(Boolean),
  categories: getPublicCategories(product),
  isNewArrival: product.isNewArrival,
  newArrivalId: product.newArrivalId,
  newArrivalStartDate: product.newArrivalStartDate,
  newArrivalEndDate: product.newArrivalEndDate,
  colors: Array.from(
    new Set(
      getPublicVariants(product)
        .map((variant: any) => getVariantColor(variant))
        .filter((color): color is string => Boolean(color)) || [],
    ),
  ),
  sizes: Array.from(
    new Set(
      getPublicVariants(product)
        .map((variant: any) => getVariantSize(variant))
        .filter((size): size is string => Boolean(size)) || [],
    ),
  ),
  variants: getPublicVariants(product).map(mapPublicVariant),
  dropshippingDetails: product.dropshippingDetails || null,
});

const getPublicCategories = (product: any) => product.categories || [];

const getPublicVariants = (product: any) => product.variants || [];

const getVariantColor = (variant: any) =>
  variant.color?.description || variant.color?.name || null;

const getVariantSize = (variant: any) =>
  variant.size?.description || variant.size?.name || null;

const getVariantImages = (variant: any) =>
  (variant.images || [])
    .map((image: any) => image?.imageUrl)
    .filter(Boolean);

const mapPublicVariant = (variant: any) => ({
  id: variant.id,
  variantCode: variant.variantCode,
  quantity: variant.quantity,
  color: getVariantColor(variant),
  size: getVariantSize(variant),
  images: getVariantImages(variant),
});

export const listBanners = async (c: any) => {
  const params = getListParams(c);
  const result = await bannersService.listBanners(params);

  return sendPublicList(
    c,
    result.data,
    result.total,
    result.searchableFields,
    params.page,
    params.limit,
    "Public banners retrieved successfully",
  );
};

export const listFaqs = async (c: any) => {
  const params = getListParams(c);
  const result = await faqsService.listFaqs(params);

  return sendPublicList(
    c,
    result.data,
    result.total,
    result.searchableFields,
    params.page,
    params.limit,
    "Public FAQs retrieved successfully",
  );
};

export const listFilters = async (c: any) => {
  const params = getListParams(c);
  const result = await filtersService.listFilters(params);

  return sendPublicList(
    c,
    result.data,
    result.total,
    result.searchableFields,
    params.page,
    params.limit,
    "Public filters retrieved successfully",
  );
};

export const listCategories = async (c: any) => {
  const params = getListParams(c);
  const result = await categoriesService.listCategories({
    ...params,
    limit: Math.max(params.limit, 100),
  });
  const publicCategories = result.data.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    parentId: category.parentId,
    level: category.level,
  }));

  return sendPublicList(
    c,
    publicCategories,
    result.total,
    result.searchableFields,
    params.page,
    Math.max(params.limit, 100),
    "Public categories retrieved successfully",
  );
};

export const listNewArrivalProducts = async (c: any) => {
  const params = getListParams(c);
  const result = await newArrivalsService.getOnlyNewArrivalProducts(params);
  const publicProducts = enrichProductImages(result.data).map(mapPublicProduct);

  return sendPublicList(
    c,
    publicProducts,
    result.total,
    result.searchableFields,
    params.page,
    params.limit,
    "Public new arrival products retrieved successfully",
  );
};

export const listProducts = async (c: any) => {
  const params = getListParams(c);
  const result = await productsService.listProducts(params);
  const publicProducts = enrichProductImages(result.data).map(mapPublicProduct);

  return sendPublicList(
    c,
    publicProducts,
    result.total,
    result.searchableFields,
    params.page,
    params.limit,
    "Public products retrieved successfully",
  );
};

export const listDiscounts = async (c: any) => {
  const params = getListParams(c);
  const result = await discountsService.listDiscounts({
    ...params,
    filters: { ...params.filters, isActive: true },
  });
  const publicDiscounts = result.data.map((discount) => ({
    id: discount.id,
    seriesId: discount.seriesId,
    discountRate: discount.discountValue,
    name: discount.name,
    description: discount.description,
    isActive: discount.isActive,
    startsAt: discount.startsAt,
    endsAt: discount.endsAt,
    discountValue: discount.discountValue,
  }));

  return sendPublicList(
    c,
    publicDiscounts,
    result.total,
    result.searchableFields,
    params.page,
    params.limit,
    "Public discounts retrieved successfully",
  );
};

export const listReviews = async (c: any) => {
  const params = getListParams(c);
  const result = await reviewsService.listReviews({
    ...params,
    filters: { ...params.filters, statusId: ReviewStatusIds.APPROVED },
  });
  const publicReviews = result.data.map((review) => ({
    id: review.id,
    productId: review.productId,
    rating: review.rating,
    review: review.review,
    reviewDate: review.reviewDate,
    statusId: review.statusId,
    customerName: review.createdBy?.fullName || null,
    imageUrl: review.createdBy?.profilePhotoUrl || null,
  }));

  return sendPublicList(
    c,
    publicReviews,
    result.total,
    result.searchableFields,
    params.page,
    params.limit,
    "Public reviews retrieved successfully",
  );
};

export const listCustomers = async (c: any) => {
  const params = getListParams(c);
  const result = await customersService.listCustomers({
    ...params,
    filters: { ...params.filters, isActive: true },
  });
  const publicCustomers = result.data.map((customer) => ({
    id: customer.id,
    customerCode: customer.customerCode,
    isActive: customer.isActive,
  }));

  return sendPublicList(
    c,
    publicCustomers,
    result.total,
    result.searchableFields,
    params.page,
    params.limit,
    "Public customer summaries retrieved successfully",
  );
};

export const listRetailers = async (c: any) => {
  const params = getListParams(c);
  const result = await retailersService.listRetailers({
    ...params,
    filters: { ...params.filters, status: true },
  });
  const publicRetailers = result.data.map((retailer) => ({
    id: retailer.id,
    retailerCode: retailer.retailerCode,
    shopName: retailer.shopName,
    status: retailer.status,
  }));

  return sendPublicList(
    c,
    publicRetailers,
    result.total,
    result.searchableFields,
    params.page,
    params.limit,
    "Public retailer summaries retrieved successfully",
  );
};

export const listPaymentMethods = async (c: any) => {
  const params = getListParams(c);
  const result = await paymentMethodService.listPaymentMethods({
    ...params,
    limit: Math.max(params.limit, 50),
  });

  const checkoutMethodNames = new Set<string>(STOREFRONT_CHECKOUT_PAYMENT_METHODS);
  const mobileTransferNames = new Set<string>(MOBILE_TRANSFER_PAYMENT_METHODS);
  const gatewayOrder: Record<string, number> = {
    mtn: 0,
    orange: 1,
    stripe: 2,
    paypal: 3,
  };

  const publicMethods = result.data
    .filter((method) => {
      if (
        method.name === PaymentMethod.STRIPE
        || method.name === PaymentMethod.PAYPAL
      ) {
        return stripeConfig.enabled;
      }
      return checkoutMethodNames.has(method.name);
    })
    .map((method) => {
      const gateway =
        PAYMENT_METHOD_GATEWAYS[method.name as PaymentMethod]
        ?? method.name;

      return {
        id: method.id,
        name: method.description ?? method.name,
        description: method.description ?? null,
        gateway,
        isMobileTransfer: mobileTransferNames.has(method.name),
        isStripe: method.name === PaymentMethod.STRIPE,
        isPayPal: method.name === PaymentMethod.PAYPAL,
      };
    })
    .sort(
      (left, right) =>
        (gatewayOrder[left.gateway] ?? 99) - (gatewayOrder[right.gateway] ?? 99),
    );

  return sendPublicList(
    c,
    publicMethods,
    publicMethods.length,
    ["name", "gateway"],
    params.page,
    params.limit,
    "Public payment methods retrieved successfully",
  );
};

export const subscribeNewsletter = async (c: any) => {
  const { email } = c.req.valid("json");
  const normalizedEmail = email.trim().toLowerCase();

  await db
    .insert(newsletterSubscribers)
    .values({ email: normalizedEmail })
    .onConflictDoNothing({ target: newsletterSubscribers.email });

  return c.json(
    successResponse(
      { subscribed: true, email: normalizedEmail },
      "Newsletter subscription saved successfully",
    ),
    HttpStatusCodes.OK,
  );
};

export const createReview = async (c: any) => {
  const body = c.req.valid("json");
  await reviewsService.createGuestReview(body);

  return c.json(
    successResponse(
      {
        submitted: true,
        message: "Review submitted successfully and is pending approval.",
      },
      "Review submitted successfully",
    ),
    HttpStatusCodes.CREATED,
  );
};
