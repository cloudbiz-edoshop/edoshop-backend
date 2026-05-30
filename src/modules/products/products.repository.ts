import type {
  GetProductResponse,
  UpdateProductRequest,
} from "./products.schema";

import type { NewProducts } from "@/db/models/products";
import type { TX } from "@/lib/types";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import db from "@/db";
import {
  categories,
  directOrderProducts,
  dropshippingProducts,
  products,
  productsHistory,
  productTags,
  tags,
  variants,
} from "@/db/models";
import { productCategories } from "@/db/models/product-categories";
import { reviews } from "@/db/models/reviews";

import {
  createFilterConditions,
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

/**
 * Repository for products-related database operations
 */
export class ProductsRepository {
  /**
   * Find a product by ID
   *
   * @param id - Product ID
   * @param tx - Optional transaction object
   * @returns The product object or null if not found
   */
  async findById(id: number, tx?: TX) {
    const queryBuilder = tx ?? db;

    const product = await queryBuilder.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.isDeleted, false)),
      with: {
        store: true,
        series: true,
      },
    });

    if (!product) {
      return null;
    }

    // Tags
    const productTagRecords = await queryBuilder
      .select({
        id: productTags.tagId,
        name: tags.name,
      })
      .from(productTags)
      .leftJoin(tags, eq(productTags.tagId, tags.id))
      .where(eq(productTags.productId, id));

    // Categories
    const productCategoryRecords = await queryBuilder
      .select({
        id: productCategories.categoryId,
        name: categories.name,
      })
      .from(productCategories)
      .leftJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(eq(productCategories.productId, id));

    // Direct product
    const directProduct =
      await queryBuilder.query.directOrderProducts.findFirst({
        where: eq(directOrderProducts.productId, id),
      });

    // Dropshipping product
    const dropshippingProduct =
      await queryBuilder.query.dropshippingProducts.findFirst({
        where: eq(dropshippingProducts.productId, id),
      });

    const productReviews = await queryBuilder.query.reviews.findMany({
      where: eq(reviews.productId, id),
      with: {
        status: true,
        createdBy: true,
      },
      orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
    });

    // Variants
    const productVariants = await queryBuilder.query.variants.findMany({
      where: and(eq(variants.productId, id), eq(variants.isDeleted, false)),
      with: {
        color: true,
        size: true,
        materialType: true,
        designPattern: true,
        createdBy: true,
        updatedBy: true,
      },
      orderBy: desc(variants.createdAt),
    });

    return {
      ...product,
      tags: productTagRecords,
      categories: productCategoryRecords,
      directOrderCode: directProduct?.directOrderCode ?? null,
      dropshippingDetails: dropshippingProduct
        ? {
            dropshippingCode: dropshippingProduct.dropshippingCode,
            totalItems: dropshippingProduct.totalItems,
            groupCriteriaId: dropshippingProduct.groupCriteriaId,
            completionCriteria: dropshippingProduct.completionCriteria,
          }
        : null,
      reviews: productReviews,
      variants: productVariants,
    };
  }

  /**
   * List products with pagination, filtering, and sorting
   *
   * @param params - Search parameters
   * @param params.search - Search query
   * @param params.page - Page number
   * @param params.limit - Number of items per page
   * @param params.sortBy - Field to sort by
   * @param params.sortOrder - Sort order
   * @param params.filters - Filters
   * @param params.filters.categoryIds - Category IDs to filter by
   * @param params.filters.tagIds - Tag IDs to filter by
   * @returns List of products and total count
   */
  async list(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: {
      categoryIds?: number[];
      tagIds?: number[];
      [key: string]: any;
    };
  }) {
    const { search, page, limit, sortBy, sortOrder, filters } = params;

    const searchableFields = ["name", "shortDescription", "fullDescription"];

    const whereConditions = [];
    whereConditions.push(eq(products.isDeleted, false));

    // Handle category and tag filters
    if (filters?.categoryIds?.length || filters?.tagIds?.length) {
      const productIds = new Set<number>();

      if (filters.categoryIds?.length) {
        const productsWithCategories = await db
          .select({ productId: productCategories.productId })
          .from(productCategories)
          .where(inArray(productCategories.categoryId, filters.categoryIds));

        productsWithCategories.forEach((p) => {
          if (p.productId !== null) {
            productIds.add(p.productId);
          }
        });
      }

      if (filters.tagIds?.length) {
        const productsWithTags = await db
          .select({ productId: productTags.productId })
          .from(productTags)
          .where(inArray(productTags.tagId, filters.tagIds));

        const tagProductIds = productsWithTags
          .map((p) => p.productId)
          .filter((id): id is number => id !== null);

        if (productIds.size === 0) {
          // If no category filter was applied, use all tag product IDs
          tagProductIds.forEach((id) => productIds.add(id));
        } else {
          // If category filter was applied, only keep products that have both category and tag
          const filteredIds = tagProductIds.filter((id) => productIds.has(id));
          productIds.clear();
          filteredIds.forEach((id) => productIds.add(id));
        }
      }

      if (productIds.size > 0) {
        whereConditions.push(inArray(products.id, Array.from(productIds)));
      } else {
        // If no products match the filters, return empty result
        return { data: [], total: 0, searchableFields };
      }
    }

    // Add other filters
    const otherFilters = { ...filters };
    delete otherFilters.categoryIds;
    delete otherFilters.tagIds;

    const filterCondition = createFilterConditions(products, otherFilters);
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }

    const searchCondition = createSearchCondition(
      searchableFields,
      products,
      search,
    );
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const { limit: limitVal, offset } = getPaginationValues(page, limit);

    const sortCondition = createSortCondition(products, sortBy, sortOrder);

    return await db.transaction(async (tx) => {
      const [{ value: totalCount }] = await tx
        .select({ value: count() })
        .from(products)
        .where(whereClause || sql`TRUE`);

      const productsData = await tx.query.products.findMany({
        where: whereClause,
        limit: limitVal,
        offset,
        orderBy: sortCondition ? [sortCondition] : [desc(products.createdAt)],
        with: {
          store: true,
          series: true,
        },
      });

      const productsWithRelations = await Promise.all(
        productsData.map(async (product) => {
          // Get tags
          const productTagRecords = await tx
            .select({
              id: productTags.tagId,
              name: tags.name,
            })
            .from(productTags)
            .leftJoin(tags, eq(productTags.tagId, tags.id))
            .where(eq(productTags.productId, product.id));

          // Get categories
          const productCategoryRecords = await tx
            .select({
              id: productCategories.categoryId,
              name: categories.name,
            })
            .from(productCategories)
            .leftJoin(
              categories,
              eq(productCategories.categoryId, categories.id),
            )
            .where(eq(productCategories.productId, product.id));

          // Get direct product
          const directProduct = await tx.query.directOrderProducts.findFirst({
            where: eq(directOrderProducts.productId, product.id),
          });

          // Get dropshipping product
          const dropshippingProduct =
            await tx.query.dropshippingProducts.findFirst({
              where: eq(dropshippingProducts.productId, product.id),
            });

          // Get reviews
          const productReviews = await tx.query.reviews.findMany({
            where: eq(reviews.productId, product.id),
            with: {
              status: true,
              createdBy: true,
            },
            orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
          });

          // Get variants
          const productVariants = await tx.query.variants.findMany({
            where: and(
              eq(variants.productId, product.id),
              eq(variants.isDeleted, false),
            ),
            with: {
              color: true,
              size: true,
              materialType: true,
              designPattern: true,
              createdBy: true,
              updatedBy: true,
            },
            orderBy: desc(variants.createdAt),
          });

          return {
            ...product,
            tags: productTagRecords,
            categories: productCategoryRecords,
            directOrderCode: directProduct?.directOrderCode ?? null,
            dropshippingDetails: dropshippingProduct
              ? {
                  dropshippingCode: dropshippingProduct.dropshippingCode,
                  totalItems: dropshippingProduct.totalItems,
                  groupCriteriaId: dropshippingProduct.groupCriteriaId,
                  completionCriteria: dropshippingProduct.completionCriteria,
                }
              : null,
            reviews: productReviews,
            variants: productVariants,
          };
        }),
      );

      return {
        data: productsWithRelations,
        total: totalCount,
        searchableFields,
      };
    });
  }

  /**
   * Create a new product
   *
   * @param tx - Transaction
   * @param productData - Product data
   * @returns The created product object
   */
  async create(tx: TX, productData: NewProducts) {
    const [result] = await tx
      .insert(products)
      .values({
        ...productData,
      })
      .returning();
    return result;
  }

  /**
   * Insert a direct product entry
   *
   * @param tx - Transaction
   * @param productId - ID of the product
   * @param data - Direct product data
   * @param data.directOrderCode - Direct order code
   * @param data.createdBy - User ID who created the record
   */
  async insertDirectProduct(
    tx: TX,
    productId: number,
    data: { directOrderCode: string; createdBy: number },
  ) {
    await tx.insert(directOrderProducts).values({
      productId,
      directOrderCode: data.directOrderCode,
      createdAt: new Date().toISOString(),
      createdBy: data.createdBy,
    });
  }

  /**
   * Insert a dropshipping product entry
   *
   * @param tx - Transaction
   * @param productId - ID of the product
   * @param data - Dropshipping product data
   * @param data.dropshippingCode - Dropshipping code
   * @param data.totalItems - Total number of items
   * @param data.groupCriteriaId - Group criteria
   * @param data.completionCriteria - Completion criteria
   * @param data.createdBy - User ID who created the record
   */
  async insertDropshippingProduct(
    tx: TX,
    productId: number,
    data: {
      dropshippingCode: string;
      totalItems: number;
      groupCriteriaId: number;
      completionCriteria: string;
      createdBy: number;
    },
  ) {
    await tx.insert(dropshippingProducts).values({
      productId,
      dropshippingCode: data.dropshippingCode,
      totalItems: data.totalItems,
      groupCriteriaId: Number(data.groupCriteriaId),
      completionCriteria: data.completionCriteria,
      createdAt: new Date().toISOString(),
      createdBy: data.createdBy,
    });
  }

  /**
   * Update a product
   *
   * @param tx - Transaction
   * @param id - Product ID to update
   * @param productData - Product data
   * @returns The updated product object
   */
  async update(
    tx: TX,
    id: number,
    productData: UpdateProductRequest & { updatedBy: number },
  ) {
    const [result] = await tx
      .update(products)
      .set({
        ...productData,
        updatedBy: productData.updatedBy,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(products.id, id))
      .returning();
    return result;
  }

  /**
   * Soft delete multiple products by setting isDeleted flag
   *
   * @param tx - Transaction object
   * @param ids - Array of product IDs to delete
   * @param deletedBy - User ID of the person who deleted these records
   * @returns True if all deletions were successful
   */
  async softDeleteMany(tx: TX, ids: number[], deletedBy: number) {
    const result = await tx
      .update(products)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
      })
      .where(inArray(products.id, ids))
      .returning();

    return result.length > 0;
  }

  /**
   * Insert product tags
   *
   * @param tx - Transaction
   * @param productId - Product ID
   * @param tagIds - List of tag IDs
   * @param createdBy - User ID who created the tags
   */
  async insertTags(
    tx: TX,
    productId: number,
    tagIds: number[],
    createdBy: number,
  ) {
    const tagData = tagIds.map((tagId) => ({
      productId,
      tagId,
      createdAt: new Date().toISOString(),
      createdBy,
    }));
    await tx.insert(productTags).values(tagData);
  }

  /**
   * Insert product categories
   *
   * @param tx - Transaction
   * @param productId - Product ID
   * @param categoryIds - List of category IDs
   * @param createdBy - User ID who created the categories
   */
  async insertCategories(
    tx: TX,
    productId: number,
    categoryIds: number[],
    createdBy: number,
  ) {
    const categoryData = categoryIds.map((categoryId) => ({
      productId,
      categoryId,
      createdAt: new Date().toISOString(),
      createdBy,
    }));
    await tx.insert(productCategories).values(categoryData);
  }

  /**
   * Insert a product history entry
   *
   * @param tx - Transaction
   * @param product - Product object
   * @param createdBy - User ID who triggered the operation
   * @param version - Version number (default: 1)
   */
  async insertHistory(
    tx: TX,
    product: GetProductResponse,
    createdBy: number,
    version = 1,
  ) {
    await tx.insert(productsHistory).values({
      productId: product.id,
      version,
      name: product.name,
      price: product.price,
      storeId: product.storeId,
      shortDescription: product.shortDescription,
      fullDescription: product.fullDescription,
      specifications: product.specifications,
      operation: "CREATE",
      validFrom: new Date().toISOString(),
      changedBy: createdBy,
    });
  }

  async getAllProductIds(): Promise<number[]> {
    const result = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.isDeleted, false));
    return result.map((r) => r.id);
  }

  async getAllProductCodes(): Promise<string[]> {
    // Get direct order codes
    const directCodes = await db
      .select({ code: directOrderProducts.directOrderCode })
      .from(directOrderProducts)
      .innerJoin(products, eq(directOrderProducts.productId, products.id))
      .where(eq(products.isDeleted, false));
    // Get dropshipping codes
    const dropshipCodes = await db
      .select({ code: dropshippingProducts.dropshippingCode })
      .from(dropshippingProducts)
      .innerJoin(products, eq(dropshippingProducts.productId, products.id))
      .where(eq(products.isDeleted, false));
    // Combine and filter out nulls
    return [
      ...directCodes
        .map((r) => r.code)
        .filter((code): code is string => code != null),
      ...dropshipCodes
        .map((r) => r.code)
        .filter((code): code is string => code != null),
    ];
  }

  /**
   * Find product ID by product code
   * Searches in both direct order products and dropshipping products
   *
   * @param productCode - The product code to search for
   * @returns Product ID if found, null otherwise
   */
  async findProductIdByCode(productCode: string): Promise<number | null> {
    // First try direct order products
    const directProduct = await db
      .select({ productId: directOrderProducts.productId })
      .from(directOrderProducts)
      .innerJoin(products, eq(directOrderProducts.productId, products.id))
      .where(
        and(
          eq(directOrderProducts.directOrderCode, productCode),
          eq(products.isDeleted, false),
        ),
      )
      .limit(1);

    if (directProduct.length > 0 && directProduct[0].productId) {
      return directProduct[0].productId;
    }

    // If not found, try dropshipping products
    const dropshipProduct = await db
      .select({ productId: dropshippingProducts.productId })
      .from(dropshippingProducts)
      .innerJoin(products, eq(dropshippingProducts.productId, products.id))
      .where(
        and(
          eq(dropshippingProducts.dropshippingCode, productCode),
          eq(products.isDeleted, false),
        ),
      )
      .limit(1);

    if (dropshipProduct.length > 0 && dropshipProduct[0].productId) {
      return dropshipProduct[0].productId;
    }

    return null;
  }
}
