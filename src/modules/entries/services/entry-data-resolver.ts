import type { CreateEntriesRequest } from "@/modules/entries/entries.schema";

import { eq } from "drizzle-orm";

import { AppError } from "@/core/errors";
import { db } from "@/db";
import { bundles } from "@/db/models/bundles";
import { items } from "@/db/models/items";
import { packages } from "@/db/models/packages";
import { series } from "@/db/models/series";
import { CustomersRepository } from "@/modules/customers/customers.repository";
import { ProductsRepository } from "@/modules/products/products.repository";
import { SupplierRepository } from "@/modules/suppliers/suppliers.repository";

export interface ResolvedEntityIds {
  supplierId?: number;
  bundleId?: number;
  seriesId?: number;
  itemId?: number;
  packageId?: number;
  customerId?: number;
  productId?: number;
}

/**
 * Service responsible for resolving entity IDs from their codes
 */
export class EntryDataResolver {
  private readonly supplierRepository: SupplierRepository;
  private readonly customerRepository: CustomersRepository;
  private readonly productsRepository: ProductsRepository;

  constructor() {
    this.supplierRepository = new SupplierRepository();
    this.customerRepository = new CustomersRepository();
    this.productsRepository = new ProductsRepository();
  }

  /**
   * Resolve all entity IDs from the request data
   */
  async resolveEntityIds(entryData: CreateEntriesRequest): Promise<ResolvedEntityIds> {
    const [
      supplierId,
      bundleId,
      seriesId,
      itemId,
      packageId,
      customerId,
      productId,
    ] = await Promise.all([
      this.resolveSupplierId(entryData.supplierCode),
      this.resolveBundleId(entryData.bundleCode),
      this.resolveSeriesId(entryData.seriesCode),
      this.resolveItemId(entryData.itemCode),
      this.resolvePackageId(entryData.packageCode),
      this.resolveCustomerId(entryData.customerCode, entryData.customerName),
      this.resolveProductId(entryData.productCode),
    ]);

    return {
      supplierId,
      bundleId,
      seriesId,
      itemId,
      packageId,
      customerId,
      productId,
    };
  }

  private async resolveSupplierId(supplierCode?: string): Promise<number | undefined> {
    if (!supplierCode) {
      return undefined;
    }

    const supplier = await this.supplierRepository.findBySupplierCode(supplierCode);
    if (!supplier) {
      throw new AppError(`Supplier with code ${supplierCode} not found`);
    }
    return supplier.id;
  }

  private async resolveBundleId(bundleCode?: string): Promise<number | undefined> {
    if (!bundleCode) {
      return undefined;
    }

    const bundle = await db.query.bundles.findFirst({
      where: eq(bundles.bundleCode, bundleCode),
    });
    if (!bundle) {
      throw new AppError(`Bundle with code ${bundleCode} not found`);
    }
    return bundle.id;
  }

  private async resolveSeriesId(seriesCode?: string): Promise<number | undefined> {
    if (!seriesCode) {
      return undefined;
    }

    const seriesRecord = await db.query.series.findFirst({
      where: eq(series.seriesCode, seriesCode),
    });
    if (!seriesRecord) {
      throw new AppError(`Series with code ${seriesCode} not found`);
    }
    return seriesRecord.id;
  }

  private async resolveItemId(itemCode?: string): Promise<number | undefined> {
    if (!itemCode) {
      return undefined;
    }

    const item = await db.query.items.findFirst({
      where: eq(items.itemCode, itemCode),
    });
    if (!item) {
      throw new AppError(`Item with code ${itemCode} not found`);
    }
    return item.id;
  }

  private async resolvePackageId(packageCode?: string): Promise<number | undefined> {
    if (!packageCode) {
      return undefined;
    }

    const packageRecord = await db.query.packages.findFirst({
      where: eq(packages.packageCode, packageCode),
    });
    if (!packageRecord) {
      throw new AppError(`Package with code ${packageCode} not found`);
    }
    return packageRecord.id;
  }

  private async resolveCustomerId(
    customerCode?: string,
    customerName?: string,
  ): Promise<number | undefined> {
    if (customerCode) {
      const customer = await this.customerRepository.findByCustomerCode(customerCode);
      if (!customer) {
        throw new AppError(`Customer with code ${customerCode} not found`);
      }
      return customer.id;
    }

    if (customerName) {
      const customer = await this.customerRepository.findByCustomerName(customerName);
      if (!customer) {
        throw new AppError(`Customer with name ${customerName} not found`);
      }
      return customer.id;
    }

    return undefined;
  }

  private async resolveProductId(productCode?: string): Promise<number | undefined> {
    if (!productCode) {
      return undefined;
    }

    const productId = await this.productsRepository.findProductIdByCode(productCode);
    if (!productId) {
      throw new AppError(`Product with code ${productCode} not found`);
    }
    return productId;
  }
}
