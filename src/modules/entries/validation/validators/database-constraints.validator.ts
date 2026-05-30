import type { CreateEntriesRequest } from "@/modules/entries/entries.schema";

import { and, eq } from "drizzle-orm";

import { AppError } from "@/core/errors";
import { db } from "@/db";
import { bundles } from "@/db/models/bundles";
import { entryStates } from "@/db/models/entry-states";
import { entryTypes } from "@/db/models/entry-types";
import { items } from "@/db/models/items";
import { packages } from "@/db/models/packages";
import { series } from "@/db/models/series";
import { ColorsRepository } from "@/modules/colors/colors.repository";
import { CustomersRepository } from "@/modules/customers/customers.repository";
import { ProductsRepository } from "@/modules/products/products.repository";
import { SizesRepository } from "@/modules/sizes/sizes.repository";
import { SupplierRepository } from "@/modules/suppliers/suppliers.repository";
import { WarehouseRepository } from "@/modules/warehouses/warehouses.repository";

/**
 * Validates database constraints and entity existence
 */
export class DatabaseConstraintsValidator {
  private readonly warehouseRepository: WarehouseRepository;
  private readonly supplierRepository: SupplierRepository;
  private readonly colorsRepository: ColorsRepository;
  private readonly sizesRepository: SizesRepository;
  private readonly customerRepository: CustomersRepository;
  private readonly productsRepository: ProductsRepository;

  constructor() {
    this.warehouseRepository = new WarehouseRepository();
    this.supplierRepository = new SupplierRepository();
    this.colorsRepository = new ColorsRepository();
    this.sizesRepository = new SizesRepository();
    this.customerRepository = new CustomersRepository();
    this.productsRepository = new ProductsRepository();
  }

  /**
   * Validate all database constraints
   */
  async validate(data: CreateEntriesRequest): Promise<void> {
    // Run basic validations in parallel
    await Promise.all([
      this.validateWarehouse(data.warehouseId),
      this.validateEntryType(data.entryTypeId),
      this.validateEntryState(data.entryStateId),
    ]);

    // Run conditional validations
    await Promise.all([
      this.validateSupplier(data.supplierCode),
      this.validateColor(data.colorId),
      this.validateColorSeriesCombination(data.colorId, data.seriesCode),
      this.validateSize(data.sizeId),
      this.validateCustomer(data.customerCode, data.customerName),
      this.validateProduct(data.productCode),
      this.validateBundle(data.bundleCode),
      this.validateSeries(data.seriesCode),
      this.validateItem(data.itemCode),
      this.validatePackage(data.packageCode),
      this.validateNewSeriesWeight(data.bundleCode, data.weight),
      this.validateNewItemWeight(data.seriesCode, data.weight),
      this.validateNewSeriesDate(data.bundleCode, data.date),
      this.validateNewItemDate(data.seriesCode, data.date),
    ]);
  }

  private async validateNewSeriesDate(
    bundleCode?: string,
    date?: string,
  ): Promise<void> {
    if (!bundleCode || !date) {
      return;
    }
    const bundle = await db.query.bundles.findFirst({
      where: eq(bundles.bundleCode, bundleCode),
      with: {
        entry: true,
      },
    });
    if (!bundle) {
      throw new AppError(`Bundle with code ${bundleCode} not found`);
    }
    if (date < bundle.entry.date) {
      throw new AppError(
        `Date ${date} is earlier than bundle date ${bundle.entry.date}`,
      );
    }
  }

  private async validateNewItemDate(
    seriesCode?: string,
    date?: string,
  ): Promise<void> {
    if (!seriesCode || !date) {
      return;
    }
    const existingSeries = await db.query.series.findFirst({
      where: eq(series.seriesCode, seriesCode),
      with: {
        entry: true,
      },
    });
    if (!existingSeries) {
      throw new AppError(`Series with code ${seriesCode} not found`);
    }
    if (date < existingSeries.entry.date) {
      throw new AppError(
        `Date ${date} is earlier than series date ${existingSeries.entry.date}`,
      );
    }
  }

  private async validateNewSeriesWeight(
    bundleCode?: string,
    weight?: number,
  ): Promise<void> {
    if (!bundleCode || !weight) {
      return;
    }
    const bundle = await db.query.bundles.findFirst({
      where: eq(bundles.bundleCode, bundleCode),
      with: {
        entry: true,
      },
    });
    if (!bundle) {
      throw new AppError(`Bundle with code ${bundleCode} not found`);
    }
    if (weight > Number.parseFloat(bundle.entry.weight)) {
      throw new AppError(
        `Weight ${weight} exceeds bundle weight ${Number.parseFloat(bundle.entry.weight)} for bundle ${bundleCode}`,
      );
    }
  }

  private async validateNewItemWeight(
    seriesCode?: string,
    weight?: number,
  ): Promise<void> {
    if (!seriesCode || !weight) {
      return;
    }
    const existingSeries = await db.query.series.findFirst({
      where: eq(series.seriesCode, seriesCode),
      with: {
        entry: true,
      },
    });
    if (!existingSeries) {
      throw new AppError(`Series with code ${seriesCode} not found`);
    }
    if (weight > Number.parseFloat(existingSeries.entry.weight)) {
      throw new AppError(
        `Weight ${weight} exceeds series weight ${Number.parseFloat(existingSeries.entry.weight)} for series ${seriesCode}`,
      );
    }
  }

  private async validateWarehouse(warehouseId: number): Promise<void> {
    await this.validateEntityById(
      warehouseId,
      () => this.warehouseRepository.findById(warehouseId),
      "Warehouse",
    );
  }

  private async validateEntryType(entryTypeId: number): Promise<void> {
    await this.validateEntityById(
      entryTypeId,
      () => db.query.entryTypes.findFirst({
        where: eq(entryTypes.id, entryTypeId),
      }),
      "Entry type",
    );
  }

  private async validateEntryState(entryStateId: number): Promise<void> {
    await this.validateEntityById(
      entryStateId,
      () => db.query.entryStates.findFirst({
        where: eq(entryStates.id, entryStateId),
      }),
      "Entry state",
    );
  }

  private async validateSupplier(supplierCode?: string): Promise<void> {
    await this.validateEntityByCode(
      supplierCode,
      () => this.supplierRepository.findBySupplierCode(supplierCode!),
      "Supplier",
    );
  }

  private async validateColor(colorId?: number): Promise<void> {
    await this.validateEntityById(
      colorId,
      () => this.colorsRepository.findById(colorId!),
      "Color",
    );
  }

  private async validateColorSeriesCombination(
    colorId?: number,
    seriesCode?: string,
  ): Promise<void> {
    if (!colorId || !seriesCode) {
      return;
    }
    const colorSeries = await db.query.series.findFirst({
      where: and(
        eq(series.seriesCode, seriesCode),
        eq(series.colorId, colorId),
      ),
    });
    if (!colorSeries) {
      throw new AppError(`This color(${colorId}) doesn't belong to Series(${seriesCode})`);
    }
  }

  private async validateSize(sizeId?: number): Promise<void> {
    await this.validateEntityById(
      sizeId,
      () => this.sizesRepository.findById(sizeId!),
      "Size",
    );
  }

  private async validateCustomer(
    customerCode?: string,
    customerName?: string,
  ): Promise<void> {
    if (customerCode) {
      await this.validateEntityByCode(
        customerCode,
        () => this.customerRepository.findByCustomerCode(customerCode),
        "Customer",
      );
    }

    if (customerName) {
      await this.validateEntityByCode(
        customerName,
        () => this.customerRepository.findByCustomerName(customerName),
        "Customer",
      );
    }
  }

  /**
   * Generic helper method to validate entity existence by code
   */
  private async validateEntityByCode<T>(
    code: string | undefined,
    queryFn: () => Promise<T | undefined>,
    entityName: string,
  ): Promise<void> {
    if (!code) {
      return;
    }

    const entity = await queryFn();
    if (!entity) {
      throw new AppError(`${entityName} with code ${code} not found`);
    }
  }

  /**
   * Generic helper method to validate entity existence by ID
   */
  private async validateEntityById<T>(
    id: number | undefined,
    queryFn: () => Promise<T | undefined>,
    entityName: string,
  ): Promise<void> {
    if (id === undefined || id === null) {
      return;
    }

    const entity = await queryFn();
    if (!entity) {
      throw new AppError(`${entityName} with ID ${id} not found`);
    }
  }

  private async validateProduct(productCode?: string): Promise<void> {
    await this.validateEntityByCode(
      productCode,
      () => this.productsRepository.findProductIdByCode(productCode!),
      "Product",
    );
  }

  private async validateBundle(bundleCode?: string): Promise<void> {
    await this.validateEntityByCode(
      bundleCode,
      () => db.query.bundles.findFirst({
        where: eq(bundles.bundleCode, bundleCode!),
      }),
      "Bundle",
    );
  }

  private async validateSeries(seriesCode?: string): Promise<void> {
    await this.validateEntityByCode(
      seriesCode,
      () => db.query.series.findFirst({
        where: eq(series.seriesCode, seriesCode!),
      }),
      "Series",
    );
  }

  private async validateItem(itemCode?: string): Promise<void> {
    await this.validateEntityByCode(
      itemCode,
      () => db.query.items.findFirst({
        where: eq(items.itemCode, itemCode!),
      }),
      "Item",
    );
  }

  private async validatePackage(packageCode?: string): Promise<void> {
    await this.validateEntityByCode(
      packageCode,
      () => db.query.packages.findFirst({
        where: eq(packages.packageCode, packageCode!),
      }),
      "Package",
    );
  }
}
