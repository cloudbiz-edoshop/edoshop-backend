import type {
  CreateProductRequest,
  CreateProductResponse,
  UpdateProductRequest,
} from "./products.schema";

import { eq, inArray, sql } from "drizzle-orm";
import { StoreIds } from "@/constants/stores.constants";
import { NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";
import db from "@/db";

import {
  categories,
  dropshippingProducts,
  productCategories,
  products,
  productTags,
  series,
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
   * Generate direct order product code
   * Format: DO_PK_A01_B1_P1
   * Where: DO = Direct Order, PK_A01_B1 = Bundle Code, P1 = Incremental
   */
  private async generateDirectOrderProductCode(
    seriesId: number,
  ): Promise<string> {
    // Get the series and its bundle
    const seriesRecord = await db.query.series.findFirst({
      where: eq(series.id, seriesId),
      with: {
        bundle: true,
      },
    });

    if (!seriesRecord || !seriesRecord.bundle) {
      throw new AppError("Series or bundle not found for direct order product");
    }

    const result = await db.execute(
      sql`SELECT next_direct_order_product_code(${seriesRecord.bundle.bundleCode})`,
    );
    return result[0].next_direct_order_product_code as string;
  }

  /**
   * Generate dropshipping product code
   * Format: DS_PK_A01_Category_P1
   * Where: DS = Dropshipping, PK_A01 = Supplier Code, Category = Category Code, P1 = Incremental
   */
  private async generateDropshippingProductCode(
    seriesId: number,
    categoryIds: number[],
  ): Promise<string> {
    // Get the series and its bundle, then get the entry and supplier
    const seriesRecord = await db.query.series.findFirst({
      where: eq(series.id, seriesId),
      with: {
        bundle: {
          with: {
            entry: {
              with: {
                supplier: true,
              },
            },
          },
        },
      },
    });

    if (!seriesRecord?.bundle?.entry?.supplier) {
      throw new AppError(
        "Series, bundle, entry, or supplier not found for dropshipping product",
      );
    }

    // Get the first category (assuming one category per product for code generation)
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, categoryIds[0]),
    });

    if (!category) {
      throw new AppError("Category not found for dropshipping product");
    }

    const result = await db.execute(
      sql`SELECT next_dropshipping_product_code(${seriesRecord.bundle.entry.supplier.supplierCode}, ${category.name})`,
    );
    return result[0].next_dropshipping_product_code as string;
  }

  async createProduct(
    productData: CreateProductRequest & { createdBy: number },
  ): Promise<CreateProductResponse> {
    // Validate that series exists
    const seriesRecord = await db.query.series.findFirst({
      where: eq(series.id, productData.seriesId),
    });
    if (!seriesRecord) {
      throw new AppError("Series not found");
    }

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
      directOrderCode = await this.generateDirectOrderProductCode(
        productData.seriesId,
      );
    } else if (productData.storeId === StoreIds.dropshipping) {
      if (!productData.categoryIds?.length) {
        throw new AppError("Category is required for dropshipping products");
      }
      dropshippingCode = await this.generateDropshippingProductCode(
        productData.seriesId,
        productData.categoryIds,
      );
    }

    const product = await db.transaction(async (tx) => {
      const createdProduct = await this.productsRepository.create(tx, {
        ...productData,
        updatedBy: productData.createdBy,
      });

      switch (productData.storeId) {
        case StoreIds.direct: {
          await this.productsRepository.insertDirectProduct(
            tx,
            createdProduct.id,
            {
              directOrderCode: directOrderCode!,
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

    const updatedProduct = await db.transaction(async (tx) => {
      // Update main product
      await tx
        .update(products)
        .set({
          ...productData,
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
