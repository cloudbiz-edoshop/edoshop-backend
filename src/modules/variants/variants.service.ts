import type {
  CreateVariantRequest,
  CreateVariantResponse,
  UpdateVariantRequest,
} from "./variants.schema";

import { eq, sql } from "drizzle-orm";
import { StoreIds } from "@/constants/stores.constants";
import { NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";
import db from "@/db";

import {
  colors,
  designPatterns,
  items,
  materialTypes,
  products,
  sizes,
} from "@/db/models";

import { VariantsRepository } from "./variants.repository";

export class VariantsService {
  private readonly variantsRepository: VariantsRepository;

  constructor() {
    this.variantsRepository = new VariantsRepository();
  }

  /**
   * Generate direct order variant code
   * Format: ProductCode_ColorCode_SizeCode
   * Example: DO_PK_A01_B1_P1_RED_ME
   */
  private async generateDirectOrderVariantCode(
    productId: number,
    colorName: string,
    sizeName: string,
  ): Promise<string> {
    // Get the product and its direct order code
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
      with: {
        directOrderProduct: true,
      },
    });

    if (!product) {
      throw new AppError(`Product with ID ${productId} not found`);
    }

    if (!product.directOrderProduct) {
      throw new AppError(`Product with ID ${productId} is not a direct order product`);
    }

    if (!product.directOrderProduct.directOrderCode) {
      throw new AppError(`Direct order product with ID ${productId} has no direct order code`);
    }

    const result = await db.execute(
      sql`SELECT next_direct_order_variant_code(${product.directOrderProduct.directOrderCode}, ${colorName}, ${sizeName})`,
    );
    return result[0].next_direct_order_variant_code as string;
  }

  /**
   * Generate dropshipping variant code
   * Format: ProductCode_ColorCode_SizeCode
   * Example: DS_PK_A01_MEN_P1_BLU_LA
   */
  private async generateDropshippingVariantCode(
    productId: number,
    colorName: string,
    sizeName: string,
  ): Promise<string> {
    // Get the product and its dropshipping code
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
      with: {
        dropshippingProduct: true,
      },
    });

    if (!product) {
      throw new AppError(`Product with ID ${productId} not found`);
    }

    if (!product.dropshippingProduct) {
      throw new AppError(`Product with ID ${productId} is not a dropshipping product`);
    }

    if (!product.dropshippingProduct.dropshippingCode) {
      throw new AppError(`Dropshipping product with ID ${productId} has no dropshipping code`);
    }

    const result = await db.execute(
      sql`SELECT next_dropshipping_variant_code(${product.dropshippingProduct.dropshippingCode}, ${colorName}, ${sizeName})`,
    );
    return result[0].next_dropshipping_variant_code as string;
  }

  async createVariant(
    variantData: CreateVariantRequest & {
      createdBy: number;
    },
  ): Promise<CreateVariantResponse> {
    // Validate that product exists
    const product = await db.query.products.findFirst({
      where: eq(products.id, variantData.productId),
    });
    if (!product) {
      throw new AppError("Product not found");
    }

    // Validate that color exists
    const color = await db.query.colors.findFirst({
      where: eq(colors.id, variantData.colorId),
    });
    if (!color) {
      throw new AppError("Color not found");
    }

    // Validate that size exists
    const size = await db.query.sizes.findFirst({
      where: eq(sizes.id, variantData.sizeId),
    });
    if (!size) {
      throw new AppError("Size not found");
    }

    // Validate that material type exists
    const materialType = await db.query.materialTypes.findFirst({
      where: eq(materialTypes.id, variantData.materialTypeId),
    });
    if (!materialType) {
      throw new AppError("Material type not found");
    }

    // Validate that design pattern exists
    const designPattern = await db.query.designPatterns.findFirst({
      where: eq(designPatterns.id, variantData.designPatternId),
    });
    if (!designPattern) {
      throw new AppError("Design pattern not found");
    }

    // Validate itemId based on product type
    if (product.storeId === StoreIds.direct) {
      if (!variantData.itemId) {
        throw new AppError("Item ID is required for direct order products");
      }

      const item = await db.query.items.findFirst({
        where: eq(items.id, variantData.itemId),
      });
      if (!item) {
        throw new AppError("Item not found");
      }
    } else if (product.storeId === StoreIds.dropshipping) {
      if (variantData.itemId) {
        throw new AppError("Item ID should not be provided for dropshipping products");
      }
    }

    // Validate quantity
    if (variantData.quantity < 0) {
      throw new AppError("Quantity must be a non-negative number");
    }

    // Generate variant code outside transaction
    let variantCode: string;
    if (product.storeId === StoreIds.direct) {
      variantCode = await this.generateDirectOrderVariantCode(
        variantData.productId,
        color.name,
        size.name,
      );
    } else if (product.storeId === StoreIds.dropshipping) {
      variantCode = await this.generateDropshippingVariantCode(
        variantData.productId,
        color.name,
        size.name,
      );
    } else {
      throw new AppError("Invalid product store type");
    }

    const variant = await db.transaction(async (tx) => {
      const newVariant = await this.variantsRepository.create(tx, {
        ...variantData,
        variantCode,
        updatedBy: variantData.createdBy,
      });

      return newVariant;
    });

    const variantWithRelations = await this.variantsRepository.findById(
      variant.id,
    );
    if (!variantWithRelations) {
      throw new AppError("Variant could not be fetched after creation");
    }
    return variantWithRelations as CreateVariantResponse;
  }

  async listVariants(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, any>;
  }) {
    return await this.variantsRepository.list(params);
  }

  async getVariantById(id: number) {
    const variant = await this.variantsRepository.findById(id);
    if (!variant) {
      throw new NotFoundError("Variant not found");
    }
    return variant;
  }

  async updateVariant(
    id: number,
    variantData: UpdateVariantRequest & {
      updatedBy: number;
    },
  ) {
    const variant = await this.variantsRepository.findById(id);

    if (!variant) {
      throw new NotFoundError("Variant not found");
    }

    // Validate that product exists if productId is being updated
    if (variantData.productId) {
      const product = await db.query.products.findFirst({
        where: eq(products.id, variantData.productId),
      });
      if (!product) {
        throw new AppError("Product not found");
      }

      // Validate itemId based on product type
      if (product.storeId === StoreIds.direct) {
        if (!variantData.itemId) {
          throw new AppError("Item ID is required for direct order products");
        }

        const item = await db.query.items.findFirst({
          where: eq(items.id, variantData.itemId),
        });
        if (!item) {
          throw new AppError("Item not found");
        }
      } else if (product.storeId === StoreIds.dropshipping) {
        if (variantData.itemId) {
          throw new AppError("Item ID should not be provided for dropshipping products");
        }
      }
    }

    // Validate that color exists if colorId is being updated
    if (variantData.colorId) {
      const color = await db.query.colors.findFirst({
        where: eq(colors.id, variantData.colorId),
      });
      if (!color) {
        throw new AppError("Color not found");
      }
    }

    // Validate that size exists if sizeId is being updated
    if (variantData.sizeId) {
      const size = await db.query.sizes.findFirst({
        where: eq(sizes.id, variantData.sizeId),
      });
      if (!size) {
        throw new AppError("Size not found");
      }
    }

    // Validate that material type exists if materialTypeId is being updated
    if (variantData.materialTypeId) {
      const materialType = await db.query.materialTypes.findFirst({
        where: eq(materialTypes.id, variantData.materialTypeId),
      });
      if (!materialType) {
        throw new AppError("Material type not found");
      }
    }

    // Validate that design pattern exists if designPatternId is being updated
    if (variantData.designPatternId) {
      const designPattern = await db.query.designPatterns.findFirst({
        where: eq(designPatterns.id, variantData.designPatternId),
      });
      if (!designPattern) {
        throw new AppError("Design pattern not found");
      }
    }

    // Validate quantity if being updated
    if (variantData.quantity !== undefined && variantData.quantity < 0) {
      throw new AppError("Quantity must be a non-negative number");
    }

    await db.transaction(async (tx) => {
      await this.variantsRepository.update(tx, id, {
        ...variantData,
        updatedBy: variantData.updatedBy,
      });
    });

    const updatedVariant = await this.variantsRepository.findById(variant.id);
    if (!updatedVariant) {
      throw new AppError("Variant could not be fetched after update");
    }
    return updatedVariant as CreateVariantResponse;
  }

  async deleteVariants(ids: number[], deletedBy: number) {
    const result = await db.transaction(async (tx) => {
      return await this.variantsRepository.softDeleteMany(tx, ids, deletedBy);
    });
    if (!result) {
      throw new AppError("Failed to delete variants");
    }
    return result;
  }

  async getVariantsByProductId(productId: number) {
    const variants = await this.variantsRepository.findByProductId(productId);
    return variants;
  }
}
