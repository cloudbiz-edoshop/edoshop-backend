import type {
  CreateProductRequest,
  CreateProductResponse,
  UpdateProductRequest,
} from "./products.schema";

import { eq, inArray, sql } from "drizzle-orm";
import { StoreIds } from "@/constants/stores.constants";
import { ConflictError, NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";
import db from "@/db";

import {
  categories,
  directOrderProducts,
  dropshippingProducts,
  productCategories,
  products,
  productTags,
  tags,
} from "@/db/models";

import { ProductsRepository } from "./products.repository";

export class ProductsService {
  private readonly productsRepository: ProductsRepository;

  constructor() {
    this.productsRepository = new ProductsRepository();
  }

  async getGroupCriteriaTypes() {
    const groupCriteriaTypes = await db.query.groupCriteriaTypes.findMany();

    return groupCriteriaTypes.map((type) => ({
      id: type.id,
      name: type.name,
      description: type.description,
    }));
  }

  /**
   * Generate dropshipping product code
   * Format: YYX where YY is current year and X is the next yearly sequence.
   */
  private async generateDropshippingProductCode(): Promise<string> {
    const yearPrefix = new Date().getFullYear().toString().slice(-2);
    const result = await db.execute(
      sql`
        SELECT COALESCE(MAX(CAST(SUBSTRING(dropshipping_code FROM 3) AS INTEGER)), 0) + 1 AS next_increment
        FROM dropshipping_products
        WHERE dropshipping_code LIKE ${`${yearPrefix}%`}
      `,
    );
    const nextIncrement = Number(result[0]?.next_increment) || 1;
    return `${yearPrefix}${nextIncrement}`;
  }

  async createProduct(
    productData: CreateProductRequest & { createdBy: number },
  ): Promise<CreateProductResponse> {
    // Validate that categories exist if provided
    if (productData.categoryIds?.length) {
      const categoryRecords = await db.query.categories.findMany({
        where: inArray(categories.id, productData.categoryIds),
      });
      if (categoryRecords.length !== productData.categoryIds.length) {
        throw new AppError("One or more categories not found");
      }
    }

    // Validate that tags exist if provided
    if (productData.tagIds?.length) {
      const tagRecords = await db.query.tags.findMany({
        where: inArray(tags.id, productData.tagIds),
      });
      if (tagRecords.length !== productData.tagIds.length) {
        throw new AppError("One or more tags not found");
      }
    }

    // Generate product codes outside transaction
    let directOrderCode: string | undefined;
    let dropshippingCode: string | undefined;

    if (productData.storeId === StoreIds.direct) {
      directOrderCode = productData.directOrderCode?.trim();
      if (!directOrderCode) {
        throw new AppError("Direct Order Product ID is required");
      }

      const existingDirectOrderProduct =
        await db.query.directOrderProducts.findFirst({
          where: eq(directOrderProducts.directOrderCode, directOrderCode),
          with: {
            product: true,
          },
        });

      if (
        existingDirectOrderProduct?.product &&
        !existingDirectOrderProduct.product.isDeleted
      ) {
        throw new ConflictError(
          `Direct Order Product ID ${directOrderCode} is already used by ${existingDirectOrderProduct.product.name}`,
        );
      }
    } else if (productData.storeId === StoreIds.dropshipping) {
      if (!productData.categoryIds?.length) {
        throw new AppError("Category is required for dropshipping products");
      }
      dropshippingCode = await this.generateDropshippingProductCode();
    }

    const product = await db.transaction(async (tx) => {
      const createdProduct = await this.productsRepository.create(tx, {
        ...productData,
        updatedBy: productData.createdBy,
      } as any);

      switch (productData.storeId) {
        case StoreIds.direct: {
          await this.productsRepository.insertDirectProduct(
            tx,
            createdProduct.id,
            {
              directOrderCode: directOrderCode!,
              totalItems: productData.totalItems ?? null,
              createdBy: productData.createdBy,
            },
          );
          break;
        }

        case StoreIds.dropshipping: {
          if (
            !productData.totalItems ||
            !productData.groupCriteriaId ||
            !productData.completionCriteria
          ) {
            throw new AppError(
              "totalItems, groupCriteriaId, and completionCriteria are required for dropshipping products",
            );
          }

          await this.productsRepository.insertDropshippingProduct(
            tx,
            createdProduct.id,
            {
              dropshippingCode: dropshippingCode!,
              totalItems: productData.totalItems,
              groupCriteriaId: productData.groupCriteriaId,
              completionCriteria: productData.completionCriteria,
              createdBy: productData.createdBy,
            },
          );
          break;
        }
      }

      if (productData.tagIds?.length) {
        await this.productsRepository.insertTags(
          tx,
          createdProduct.id,
          productData.tagIds,
          productData.createdBy,
        );
      }

      if (productData.categoryIds?.length) {
        await this.productsRepository.insertCategories(
          tx,
          createdProduct.id,
          productData.categoryIds,
          productData.createdBy,
        );
      }

      await this.productsRepository.insertHistory(
        tx,
        createdProduct,
        productData.createdBy,
      );

      return createdProduct;
    });

    const productWithRelations = await this.productsRepository.findById(
      product.id,
    );

    if (!productWithRelations) {
      throw new AppError("Product could not be fetched after creation");
    }

    return productWithRelations as CreateProductResponse;
  }

  async listProducts(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.productsRepository.list(params);
  }

  async getProductById(id: number) {
    const product = await this.productsRepository.findById(id);
    if (!product) {
      throw new NotFoundError("Product not found");
    }
    return product;
  }

  async updateProduct(
    id: number,
    productData: UpdateProductRequest & { updatedBy: number },
  ) {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    const productUpdateData = { ...(productData as Record<string, unknown>) };
    delete productUpdateData.directOrderCode;
    delete productUpdateData.dropshippingCode;
    delete productUpdateData.totalItems;
    delete productUpdateData.groupCriteriaId;
    delete productUpdateData.completionCriteria;
    delete productUpdateData.tagIds;
    delete productUpdateData.categoryIds;

    const updatedProduct = await db.transaction(async (tx) => {
      // Update main product
      await tx
        .update(products)
        .set({
          ...(productUpdateData as any),
          updatedBy: productData.updatedBy,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(products.id, id));

      // Update dropshipping details if applicable
      if (product.storeId === StoreIds.dropshipping) {
        if (
          productData.totalItems ||
          productData.groupCriteriaId ||
          productData.completionCriteria
        ) {
          await tx
            .update(dropshippingProducts)
            .set({
              totalItems: productData.totalItems,
              groupCriteriaId: Number(productData.groupCriteriaId),
              completionCriteria: productData.completionCriteria,
              updatedAt: new Date().toISOString(),
              updatedBy: productData.updatedBy,
            })
            .where(eq(dropshippingProducts.productId, id));
        }
      }

      if (
        product.storeId === StoreIds.direct &&
        (productData.directOrderCode?.trim() || productData.totalItems !== undefined)
      ) {
        await tx
          .update(directOrderProducts)
          .set({
            ...(productData.directOrderCode?.trim()
              ? { directOrderCode: productData.directOrderCode.trim() }
              : {}),
            ...(productData.totalItems !== undefined
              ? { totalItems: productData.totalItems }
              : {}),
            updatedAt: new Date().toISOString(),
            updatedBy: productData.updatedBy,
          })
          .where(eq(directOrderProducts.productId, id));
      }

      // Handle tags
      if (productData.tagIds?.length) {
        await tx.delete(productTags).where(eq(productTags.productId, id));

        await this.productsRepository.insertTags(
          tx,
          id,
          productData.tagIds,
          productData.updatedBy,
        );
      }

      // Handle categories
      if (productData.categoryIds?.length) {
        await tx
          .delete(productCategories)
          .where(eq(productCategories.productId, id));

        for (const categoryId of productData.categoryIds) {
          await tx.insert(productCategories).values({
            productId: id,
            categoryId,
            createdAt: new Date().toISOString(),
            createdBy: productData.updatedBy,
          });
        }
      }

      // Insert history
      await this.productsRepository.insertHistory(
        tx,
        { ...product, ...productData },
        productData.updatedBy,
        product.version + 1,
      );

      // Fetch updated product with all relations using the transaction
      const updated = await this.productsRepository.findById(id, tx);
      if (!updated) {
        throw new AppError("Failed to update product");
      }

      return updated;
    });

    return updatedProduct as CreateProductResponse;
  }

  async deleteProducts(ids: number[], deletedBy: number) {
    const result = await db.transaction(async (tx) => {
      return await this.productsRepository.softDeleteMany(tx, ids, deletedBy);
    });
    if (!result) {
      throw new AppError("Failed to delete products");
    }
    return result;
  }

  async getAllProductCodes(): Promise<string[]> {
    return this.productsRepository.getAllProductCodes();
  }

  async getAllProductIds(): Promise<number[]> {
    return this.productsRepository.getAllProductIds();
  }
}
