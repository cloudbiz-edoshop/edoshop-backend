import type { CreatePackageWithItemsRequest } from "./packages.schema";
import type { CommonQueryParams } from "@/lib/openapi/schemas/query-params-schema";
import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import bwipjs from "bwip-js";
import { sql } from "drizzle-orm";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { EntryStateIds, EntryTypeIds } from "@/constants";
import { PackageStatusIds } from "@/constants/package-statuses.constants";
import { ConflictError, NotFoundError, ValidationError } from "@/core/errors";
import db from "@/db";
import { CustomersRepository } from "../customers/customers.repository";
import { EntriesRepository } from "../entries/entries.repository";
import { OrdersRepository } from "../orders/orders.repository";
import { WarehouseRepository } from "../warehouses/warehouses.repository";
import { PackagesRepository } from "./packages.repository";

export class PackagesService {
  private readonly packagesRepository: PackagesRepository;
  private readonly ordersRepository: OrdersRepository;
  private readonly entriesRepository: EntriesRepository;
  private readonly customersRepository: CustomersRepository;
  private readonly warehouseRepository: WarehouseRepository;

  constructor() {
    this.packagesRepository = new PackagesRepository();
    this.ordersRepository = new OrdersRepository();
    this.entriesRepository = new EntriesRepository();
    this.customersRepository = new CustomersRepository();
    this.warehouseRepository = new WarehouseRepository();
  }

  async getAllPackageStatuses() {
    return await this.packagesRepository.getAllPackageStatuses();
  }

  async getAllShippingPriorityCodes() {
    return await this.packagesRepository.getAllShippingPriorityCodes();
  }

  async getAllShippingTypes() {
    return await this.packagesRepository.getAllShippingTypes();
  }

  async createPackage(data: {
    customerId: number;
    packageWeight: number;
    comments?: string;
    userId?: number;
  }) {
    const entryTypeId = EntryTypeIds.PACKAGE;
    const entryStateId = EntryStateIds.NEW;
    const warehouseId = 1; // Default warehouse ID

    // Create entry

    const newEntry = await this.packagesRepository.createEntry({
      entryTypeId,
      entryStateId,
      warehouseId,
      quantity: 1,
      weight: data.packageWeight.toString(),
      date: new Date().toISOString().split("T")[0],
      description: data.comments,
      customerId: data.customerId,
    });

    const status = await this.packagesRepository.getPackageStatus("Created");
    const statusId = status?.id ?? 1;

    const newPackage = await this.packagesRepository.createPackage({
      entryId: newEntry.id,
      packageCode: `PKG-${Date.now()}`,
      packageStatusId: statusId,
      createdAt: new Date().toISOString(),
      createdBy: data.userId || 1,
      updatedBy: data.userId || 1,
    });

    return newPackage;
  }

  async editPackage(data: {
    packageId: number;
    packageWeight?: number;
    comments?: string;
    address?: string;
  }) {
    const pkg = await this.packagesRepository.getPackageById(data.packageId);
    if (!pkg) {
      throw new NotFoundError("Package not found");
    }

    // Get shipping label for this package
    const shippingLabel = await this.packagesRepository.getShippingLabelByPackageId(data.packageId);

    // Update both entry and shipping label in a transaction
    await db.transaction(async (tx) => {
      await this.packagesRepository.editPackage(
        tx,
        pkg.entryId,
        {
          weight: data.packageWeight?.toString(),
          description: data.comments,
          address: data.address,
        },
        shippingLabel?.id,
        {
          netWeight: data.packageWeight?.toString(),
          additionalNotes: data.comments,
        },
      );
    });

    return { success: true };
  }

  async createShippingLabel(data: { packageId: number; note: string }) {
    const pkg = await this.packagesRepository.getPackageById(data.packageId);
    if (!pkg) {
      throw new NotFoundError("Package not found");
    }

    const existingLabel = await this.packagesRepository.getShippingLabelByPackageId(data.packageId);
    if (existingLabel) {
      throw new ConflictError(`A shipping label already exists for package with ID ${data.packageId}.`);
    }

    // Fetch the Shipping Label Info Service with this package ID to get the necessary info for creating the label
    const info = await this.getPackageInfoForShippingLabel(data.packageId);

    const label = await db.transaction(async (tx) => {
      if (info.shippingType == null) {
        throw new ValidationError(`Cannot create shipping label: Shipping type information is missing for package with ID ${data.packageId}. Please verify the package data.`);
      }

      if (info.shippingPriorityCode == null) {
        throw new ValidationError(`Cannot create shipping label: Shipping priority code information is missing for package with ID ${data.packageId}. Please verify the package data.`);
      }

      if (info.purchasedBy == null) {
        throw new ValidationError(`Cannot create shipping label: Purchased by information is missing for package with ID ${data.packageId}. Please verify the package data.`);
      }

      if (!info.address) {
        throw new ValidationError(`Cannot create shipping label: Address information is missing for package with ID ${data.packageId}. Please verify the package data.`);
      }

      // Address is normalized to a string by getPackageInfoForShippingLabel.
      if (info.address.trim() === "") {
        throw new ValidationError(`Cannot create shipping label: Address information is invalid for package with ID ${data.packageId}. Address must be a non-empty string. Please verify the package data.`);
      }

      // If country is missing, try to get it from the customer's default address
      if (!info.country) {
        throw new ValidationError(`Cannot create shipping label: Country information is missing for package with ID ${data.packageId}. Please verify the package data.`);
      }

      // City is required for the shipping label, if it's missing throw an error
      if (!info.city) {
        throw new ValidationError(`Cannot create shipping label: City information is missing for package with ID ${data.packageId}. Please verify the package data.`);
      }
      const label = await this.packagesRepository.createShippingLabel(tx, {
        packageId: data.packageId,
        shippingTypeId: info.shippingType.id,
        shippingPriorityCodeId: info.shippingPriorityCode.id,
        netWeight: info.weight.toString(),
        purchasedBy: info.purchasedBy.userId,
        additionalNotes: data.note,
        customerFullName: info.purchasedBy.user.fullName,
        address: info.address,
        country: info.country.name,
        city: info.city.name,
      });

      // Update hasShippingLabel flag on package
      await this.packagesRepository.updatePackageHasShippingLabel(tx, data.packageId, 1);

      return label;
    });

    return label;
  }

  async editShippingLabel(data: {
    shippingLabelId: number;
    weight?: number;
    address?: string;
    note?: string;
  }) {
    await this.packagesRepository.updateShippingLabel(data.shippingLabelId, {
      netWeight: data.weight?.toString(),
      address: data.address,
      additionalNotes: data.note,
    });

    return { success: true };
  }

  async getPackageManagementW1(params: CommonQueryParams) {
    const result = await this.packagesRepository.getPackageManagementW1(params);

    return {
      ...result,
      data: result.data.map(({ packageItems: pkgItems, ...r }) => {
        const orderCreatedAts = pkgItems
          .map((pi) => pi.orderItem.order?.createdAt)
          .filter((d): d is string => !!d)
          .sort((a, b) => a.localeCompare(b));

        const earliestOrderAt = orderCreatedAts[0] ?? null;

        let fulfillmentTime: string | null = null;
        if (earliestOrderAt) {
          const diffMs = Math.max(0, new Date(r.createdAt).getTime() - new Date(earliestOrderAt).getTime());
          const totalSeconds = Math.floor(diffMs / 1000);
          const days = Math.floor(totalSeconds / 86400);
          const hours = Math.floor((totalSeconds % 86400) / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          const parts: string[] = [];
          if (days > 0)
            parts.push(`${days}days`);
          if (hours > 0)
            parts.push(`${hours}hours`);
          if (minutes > 0)
            parts.push(`${minutes}minutes`);
          if (seconds > 0 || parts.length === 0)
            parts.push(`${seconds}seconds`);
          fulfillmentTime = parts.join(" ");
        }

        const addresses = r.entry?.customer?.user?.addresses ?? [];
        const addr = addresses.find((a) => a.isDefault) || addresses[0];
        const destination = addr
          ? [addr.streetAddress, addr.city?.name, addr.country?.name].filter(Boolean).join(", ") || (r.address ?? "Unknown")
          : (r.address ?? "Unknown");

        return {
          id: r.id,
          packageId: r.id,
          packageCode: r.packageCode,
          customerCode: r.entry?.customer?.customerCode || "Unknown",
          customerId: r.entry?.customerId || null,
          destination,
          packagingStatus: r.packageStatus.name,
          fulfillmentTime,
          packageWeight: r.entry?.weight?.toString() || "0",
          registeredOn: r.createdAt,
          description: r.entry.description || "N/A",
          hasShippingLabel: r.hasShippingLabel === 1,
        };
      }),
    };
  }

  async getPackageManagementW2(params: CommonQueryParams) {
    const result = await this.packagesRepository.getPackageManagementW2(params);

    return {
      ...result,
      data: result.data.map(({ packageItems: pkgItems, ...r }) => {
        const addresses = r.entry?.customer?.user?.addresses ?? [];
        const addr = addresses.find((a) => a.isDefault) || addresses[0];
        const destination = addr
          ? [addr.streetAddress, addr.city?.name, addr.country?.name].filter(Boolean).join(", ") || (r.address ?? "Unknown")
          : (r.address ?? "Unknown");

        return {
          id: r.id,
          packageId: r.id,
          packageCode: r.packageCode,
          binLocation: r.binLocationAtReceived ?? r.binLocation ?? "Unknown",
          customerCode: r.entry?.customer?.customerCode || "Unknown",
          customerId: r.entry.customerId || null,
          destination: r.packageDestinationAtReceived ?? destination,
          packageWeight: r.packageWeightAtReceived ?? r.entry.weight.toString(),
          packagingStatus: r.packageStatus.name,
          receivedAt: r.receivedAt,
        };
      }),
    };
  }

  async getPackedPackagesThatAreBeingReceived(params: CommonQueryParams) {
    const result = await this.packagesRepository.getPackedPackagesThatAreBeingReceived(params);

    return {
      ...result,
      data: result.data.map((r) => ({
        id: r.id,
        packageId: r.id,
        packageCode: r.packageCode,
        warehouseId: r.entry.warehouseId,
        binLocation: r.binLocation || "Unknown",
        destination: r.address || "Unknown",
        packageWeight: r.entry.weight,
        packageStatus: r.packageStatus.name,
        receivedAt: r.entry.warehouseTransfers[0].receivedAt,
      })),
    };
  }

  async getPackageById(packageId: number) {
    return await this.packagesRepository.getPackageById(packageId);
  }

  async getShippingLabelById(shippingLabelId: number) {
    return await this.packagesRepository.getShippingLabelById(shippingLabelId);
  }

  /**
   * Create a package with order items in a single transaction
   * Validates business rules and creates package with items atomically
   *
   * @param data - Package creation data with order items
   * @param userId - ID of the user creating the package
   * @returns Created package with items and affected orders
   */
  async createPackageWithItems(
    data: CreatePackageWithItemsRequest & { userId: number },
  ) {
    // Check if customerID exists on DB
    const fetchedCustomer = await this.customersRepository.findByCustomerCode(data.customerCode);
    if (!fetchedCustomer) {
      throw new NotFoundError(
        `Customer with code ${data.customerCode} not found.`,
      );
    }
    // Check if warehouseID exists on DB
    const warehouse = await this.warehouseRepository.findById(
      data.warehouseId,
    );
    if (!warehouse) {
      throw new NotFoundError(
        `Warehouse with ID ${data.warehouseId} not found.`,
      );
    }
    const orderItemIds = data.orderItems.map((item) => item.orderItemId);

    // 1. Validation Phase - Fetch all order items
    const fetchedOrderItems =
      await this.ordersRepository.getOrderItemsByIds(orderItemIds);

    if (fetchedOrderItems.length === 0) {
      throw new NotFoundError("No Valid order items found in DB.");
    }
    const fetchedOrderItemIds = fetchedOrderItems.map((oi) => oi.id);

    // Check if all order items were found
    const fetchedOrderItemIdsSet = new Set(fetchedOrderItemIds);
    const requestedOrderItemIdsSet = new Set(orderItemIds);
    const missingIds = requestedOrderItemIdsSet.difference(fetchedOrderItemIdsSet).values().toArray();
    if (missingIds.length > 0) {
      throw new ValidationError(
        `Order items not found: ${missingIds.join(", ")}. Please verify the order item IDs.`,
      );
    }

    // Validate all items belong to the specified customer
    const invalidItems = fetchedOrderItems.filter(
      (oi) => oi.order.customerId !== fetchedCustomer.id,
    );
    if (invalidItems.length > 0) {
      const invalidItemDetails = invalidItems
        .map(
          (oi) =>
            `Order item #${oi.id} belongs to customer #${oi.order.customerId}`,
        )
        .join(", ");
      throw new ValidationError(
        `All order items must belong to customer #${data.customerCode}. Found: ${invalidItemDetails}`,
      );
    }

    // Validate quantities for each item
    const quantityErrors: string[] = [];

    const fetchedOrderItemsMap = new Map(
      fetchedOrderItems.map(oi => [oi.id, oi]),
    );

    for (const requestItem of data.orderItems) {
      const orderItem = fetchedOrderItemsMap.get(requestItem.orderItemId)!;
      const quantityOrdered = orderItem.quantity;
      const quantityPacked = orderItem.quantityPacked;
      const remainingQuantitiesToPack = quantityOrdered - quantityPacked;

      // Check if quantity to pack exceeds available quantity
      if (requestItem.quantityToPack > remainingQuantitiesToPack) {
        quantityErrors.push(
          `Order item ${requestItem.orderItemId}: Cannot pack ${requestItem.quantityToPack} units. Only ${remainingQuantitiesToPack} units needed to be packed (ordered: ${quantityOrdered}, already packed: ${quantityPacked})`,
        );
      }
    }

    if (quantityErrors.length > 0) {
      throw new ValidationError(`Quantity validation failed:\n${quantityErrors.join("\n")}`);
    }

    // 3. Generate package code using database function
    const packageCodeResult = await db.execute(
      sql`SELECT next_package_code() as code`,
    );
    // Fallback to a UUID-based code if the database function fails or returns no result
    const randomPkgCode = `PKG-${randomUUID()}`;
    const packageCode =
      ((packageCodeResult[0] as any)?.code as string) || randomPkgCode;

    // 4. Create package with items in transaction
    const result =
      await this.packagesRepository.createPackageWithItemsTransaction({
        customerId: fetchedCustomer.id,
        warehouseId: data.warehouseId,
        packageWeight: data.packageWeight,
        comments: data.comments,
        orderItems: data.orderItems,
        address: data.address,
        userId: data.userId,
        packageCode,
        entryTypeId: EntryTypeIds.PACKAGE,
        entryStateId: EntryStateIds.NEW,
        packageStatusId: PackageStatusIds.PACKED,
      });

    return result;
  }

  /**
   * Sanitise a string so it only contains characters encodable by WinAnsi
   * (pdf-lib standard fonts). Strategy:
   *  1. NFD-decompose to separate base letters from combining diacritics.
   *  2. Strip all combining diacritical marks (U+0300–U+036F).
   *  3. Replace any remaining character whose code-point is > 0x00FF with '?'.
   */
  private sanitizeForPdf(text: string): string {
    // 1. NFD-decompose to separate base letters from combining diacritics.
    // 2. Strip combining diacritical marks (U+0300–U+036F).
    // 3. Replace any char whose code-point is still > 0xFF with '?' so that
    //    pdf-lib's WinAnsi standard fonts can always encode it safely.
    const decomposed = text
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036F]/g, "");

    return [...decomposed]
      .map(ch => ((ch.codePointAt(0) ?? 0) > 0xFF ? "?" : ch))
      .join("");
  }

  /**
   * Word-wrap `text` so each line fits within `maxWidth` points at `fontSize`.
   * Returns at most `maxLines` lines.
   */
  private wrapText(
    text: string,
    f: { widthOfTextAtSize: (t: string, s: number) => number },
    fontSize: number,
    maxWidth: number,
    maxLines: number,
  ): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (f.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
      }
      else {
        if (current)
          lines.push(current);
        current = word;
      }
    }
    if (current)
      lines.push(current);
    return lines.slice(0, maxLines);
  }

  async listShippingLabels(params: CommonQueryParams) {
    return await this.packagesRepository.listShippingLabels(params);
  }

  async generateLabelPdf(packageId: number): Promise<Buffer> {
    // ── 1. Fetch package data ─────────────────────────────────────────────
    const data = await this.packagesRepository.getFullLabelData(packageId);
    if (!data)
      throw new NotFoundError("Package not found");

    const shippingLabel = data.shippingLabel;
    if (!shippingLabel)
      throw new NotFoundError("Shipping label not found for this package");

    // ── 2. Resolve variable data ──────────────────────────────────────────
    const trackingNumber = `${data.packageCode}`;

    // Fallback sources (used only when the shipping label fields are empty)
    const customerUser = data.entry?.customer?.user;
    const customerAddress = customerUser?.addresses?.[0];

    // Prefer the persisted shipping label fields so the PDF always matches the
    // saved label record, even if the customer's profile/address changes later.
    const labelFullName = shippingLabel.customerFullName?.trim();

    const customerName = this.sanitizeForPdf(
      labelFullName || customerUser?.fullName?.toUpperCase() || "N/A",
    );
    const streetAddress = this.sanitizeForPdf(
      shippingLabel.address?.trim() || customerAddress?.streetAddress || "N/A",
    );
    const city = this.sanitizeForPdf(
      shippingLabel.city?.trim() || customerAddress?.city?.name || "N/A",
    );
    const country = this.sanitizeForPdf(
      shippingLabel.country?.trim() || customerAddress?.country?.name || "N/A",
    );
    const countryCity = this.sanitizeForPdf([country.toUpperCase(), city].filter(Boolean).join(", "));
    const shippingType = this.sanitizeForPdf(shippingLabel.shippingType?.name?.toUpperCase() || "NORMAL");
    const packageWeight = this.sanitizeForPdf(
      shippingLabel.netWeight
        ? `${shippingLabel.netWeight}`
        : data.entry?.weight
          ? `${data.entry.weight}`
          : "N/A",
    );
    const priorityCode = this.sanitizeForPdf(shippingLabel.shippingPriorityCode?.code || "N/A");
    // Customer ID is used as the REF identifier
    const customerId = String(data.entry?.customer?.customerCode ?? "N/A");
    const approvalDate = new Date().toLocaleDateString("en-GB");

    // Collect notes from all orders belonging to this customer.

    const orderNotes = (data.entry?.customer?.orders ?? [])
      .filter(o => o.notes?.trim())
      .map(o => ` ${(o.notes ?? "").trim()}`)
      .join("  |  ");
    const notesText = this.sanitizeForPdf(orderNotes);

    // ── 3. Generate QR code PNG (tracking URL) via bwip-js ───────────────
    const qrCodePng: Buffer = await bwipjs.toBuffer({
      bcid: "qrcode",
      text: trackingNumber,
      scale: 3,
    });

    // ── 4. Load PDF template ──────────────────────────────────────────────
    // Resolve path relative to this file for both dev and production
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const templatePath = join(__dirname, "../../assets/Edoshop-template.pdf");
    const templateBytes = await readFile(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    // ── 5. Embed fonts & QR image ──────────────────────────────────────────
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const qrImage = await pdfDoc.embedPng(qrCodePng);

    const page = pdfDoc.getPages()[0];
    const { width: W } = page.getSize();
    const black = rgb(0, 0, 0);

    // ── Helper: center text inside a box ─────────────────────────────────
    const centerX = (boxX: number, boxW: number, text: string, f: typeof font, size: number) =>
      boxX + (boxW - f.widthOfTextAtSize(text, size)) / 2;

    // ── 6. Overlay dynamic fields ─────────────────────────────────────────
    // Coordinates use pdf-lib bottom-left (0,0) origin.

    // Shipping type (NORMAL / FRAGILE)  x:185  y:345
    page.drawText(shippingType, {
      x: 185,
      y: 345,
      size: 10,
      font: fontBold,
      color: black,
    });

    // Customer name  x:80  y:305
    page.drawText(customerName, {
      x: 80,
      y: 304,
      size: 8,
      font: fontBold,
      color: black,
      maxWidth: 200,
    });

    // Street address  x:80  y:290
    page.drawText(streetAddress, {
      x: 80,
      y: 289,
      size: 8,
      font,
      color: black,
      maxWidth: 200,
    });

    // City / Country  x:80  y:275
    page.drawText(countryCity, {
      x: 80,
      y: 274,
      size: 8,
      font,
      color: black,
      maxWidth: 200,
    });

    // ── REF row: customer ID label value | package code in left box | priority in right box
    //
    // Template boxes (approximate, measured from the generated template):
    //   Left box  : x ≈ 168–216  (48pt wide, centre ≈ 192)
    //   Right box : x ≈ 224–266  (42pt wide, centre ≈ 245)
    const leftBoxX = 168;
    const leftBoxW = 48;
    const rightBoxX = 224;
    const rightBoxW = 42;

    // Customer ID as the REF value  x:60  y:246
    page.drawText(customerId, {
      x: 60,
      y: 247,
      size: 9,
      font: fontBold,
      color: black,
    });

    // Package weight centred inside the left box
    page.drawText(packageWeight, {
      x: centerX(leftBoxX, leftBoxW, packageWeight, fontBold, 7),
      y: 248,
      size: 8,
      font: fontBold,
      color: black,
    });

    // Priority code centred inside the right box
    page.drawText(priorityCode, {
      x: centerX(rightBoxX, rightBoxW, priorityCode, fontBold, 7),
      y: 248,
      size: 8,
      font: fontBold,
      color: black,
    });

    // ── Notes box content ─────────────────────────────────────────────────
    // Box inner area (pdf-lib coords): x:36–354, y:178–222
    if (notesText) {
      const noteBoxX = 32;
      const noteBoxMaxW = 318;
      const noteFontSize = 8;
      const noteStartY = 213;
      const noteLineH = 28;

      // Split on the segment separator so each order's note wraps independently,
      // then flatten all resulting lines and cap at 2 total.
      const segments = notesText.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean);
      const allLines: string[] = [];
      for (const seg of segments) {
        const wrapped = this.wrapText(seg, font, noteFontSize, noteBoxMaxW, 2);
        allLines.push(...wrapped);
        if (allLines.length >= 2)
          break;
      }

      allLines.slice(0, 2).forEach((line, i) => {
        page.drawText(line, {
          x: noteBoxX,
          y: noteStartY - i * noteLineH,
          size: noteFontSize,
          font,
          color: black,
        });
      });
    }

    // ── Tracking section: QR code centred + tracking number below ────────
    // The tracking section occupies roughly y:85–165 on the page.
    // We place a 75×75 QR centred horizontally, then the tracking number below.
    const qrSize = 65;
    const qrX = (W - qrSize) / 2;
    const qrY = 45;

    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

    // Tracking number centred below the QR
    const formattedTracking = trackingNumber.match(/.{1,4}/g)?.join(" ") ?? trackingNumber;
    const trackingTextWidth = font.widthOfTextAtSize(formattedTracking, 8);
    page.drawText(formattedTracking, {
      x: (W - trackingTextWidth) / 2,
      y: qrY - 9,
      size: 8,
      font: fontBold,
      color: black,
    });

    // Footer date  x:105  y:35
    page.drawText(approvalDate, {
      x: 107,
      y: 17,
      size: 6.2,
      font: fontBold,
      color: black,
    });

    // ── 7. Serialise and return ───────────────────────────────────────────
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Receive package from warehouse 1
   * Updates package receipt information in a transaction
   */
  async receiveAPackageFromW1(data: {
    packageId: number;
    packageWeightAtReceived: number;
    binLocationAtReceived: string;
    packageDestinationAtReceived: string;
    receivedAt: string;
  }) {
    const pkg = await this.packagesRepository.getPackageById(data.packageId);
    if (!pkg) {
      throw new NotFoundError(`Package with ID ${data.packageId} not found`);
    }

    if (pkg.receivedAt) {
      throw new ConflictError(`Package with ID ${data.packageId} has already been received.`);
    }

    const entry = await this.entriesRepository.findById(pkg.entryId);
    if (entry?.weight != null &&
      data.packageWeightAtReceived != null &&
      Number(entry.weight) !== data.packageWeightAtReceived) {
      throw new ValidationError(`Received package weight (${data.packageWeightAtReceived}) does not match expected weight (${entry.weight}). Please verify the weight.`);
    }
    await db.transaction(async (tx) => {
      await this.packagesRepository.receiveAPackageFromW1(tx, data.packageId, {
        packageWeightAtReceived: data.packageWeightAtReceived,
        binLocationAtReceived: data.binLocationAtReceived,
        packageDestinationAtReceived: data.packageDestinationAtReceived,
        receivedAt: data.receivedAt,
      });
    });

    const updatedPackage = await this.packagesRepository.getPackageById(data.packageId);
    if (!updatedPackage) {
      throw new NotFoundError(`Failed to fetch updated package`);
    }

    return updatedPackage;
  }

  /**
   * Edit received package from warehouse 1
   * Updates specific received package information in a transaction
   */
  async editReceivedPackageFromW1(data: {
    packageId: number;
    binLocationAtReceived?: string;
    packageDestinationAtReceived?: string;
  }) {
    const pkg = await this.packagesRepository.getPackageById(data.packageId);
    if (!pkg) {
      throw new NotFoundError(`Package with ID ${data.packageId} not found`);
    }

    // Check if package was already received
    if (!pkg.receivedAt) {
      throw new ValidationError(`Package with ID ${data.packageId} has not been received yet. Please receive the package first.`);
    }

    await db.transaction(async (tx) => {
      await this.packagesRepository.editReceivedPackageFromW1(tx, data.packageId, {
        binLocationAtReceived: data.binLocationAtReceived,
        packageDestinationAtReceived: data.packageDestinationAtReceived,
      });
    });

    const updatedPackage = await this.packagesRepository.getPackageById(data.packageId);
    if (!updatedPackage) {
      throw new NotFoundError(`Failed to fetch updated package`);
    }

    return updatedPackage;
  }

  async updateReceivedPackageStatus(data: { packageId: number; status: number }) {
    const pkg = await this.packagesRepository.getPackageById(data.packageId);
    if (!pkg) {
      throw new NotFoundError(`Package with ID ${data.packageId} not found`);
    }

    // Check if package was already received
    if (!pkg.receivedAt) {
      throw new ValidationError(`Package with ID ${data.packageId} has not been received yet. Please receive the package first.`);
    }

    await db.transaction(async (tx) => {
      await this.packagesRepository.updateReceivedPackageStatus(tx, data.packageId, data.status);
    });

    const updatedPackage = await this.packagesRepository.getPackageById(data.packageId);
    if (!updatedPackage) {
      throw new NotFoundError(`Failed to fetch updated package`);
    }

    return updatedPackage;
  }

  async getReceivedPackageDispatchManagement() {
    const result = await this.packagesRepository.getReceivedPackageDispatchManagement();

    return result.map((r) => {
      const orderId = r.packageItems[0]?.orderItem?.orderId ?? null;

      return {
        id: r.id,
        packageId: r.id,
        priorityCode: r.shippingLabel?.shippingPriorityCode?.code || "N/A",
        customerId: r.entry?.customer?.id ?? null,
        orderId,
        packageWeight: r.packageWeightAtReceived?.toString() || "0",
        destination: r.packageDestinationAtReceived || "Unknown",
        customerCode: r.entry?.customer?.customerCode ?? null,
        priorityDescription: r.shippingLabel?.shippingPriorityCode?.description || "N/A",
        dispatchStatus: r.packageStatus?.name || "Unknown",
        registered: r.createdAt,
        fulfillmentTime: r.createdAt,
      };
    });
  }

  async dispatchPackages(data: {
    packageId: number;
    driverId: number;
    driverName: string;
    packageDestination: string;
    additionalNotes?: string;
    deliverToDriver?: string;
  }) {
    const pkg = await this.packagesRepository.getPackageById(data.packageId);
    if (!pkg) {
      throw new NotFoundError(`Package with ID ${data.packageId} not found`);
    }

    if (pkg.packageStatusId !== PackageStatusIds.READY_TO_DISPATCH) {
      throw new ValidationError(
        `Package with ID ${data.packageId} is not ready for dispatch. Current status ID: ${pkg.packageStatusId}.`,
      );
    }

    const dispatchTime = new Date().toISOString();

    await db.transaction(async (tx) => {
      await this.packagesRepository.dispatchPackage(tx, data.packageId, {
        packageStatusId: PackageStatusIds.DISPATCHED,
      });
    });

    return {
      packageId: data.packageId,
      driverId: data.driverId,
      driverName: data.driverName,
      packageDestination: data.packageDestination,
      additionalNotes: data.additionalNotes ?? null,
      dispatchTime,
    };
  }

  async getPackageInfoForShippingLabel(packageId: number) {
    const data = await this.packagesRepository.getPackageInfoForShippingLabel(packageId);
    if (!data) {
      throw new NotFoundError("Package not found");
    }
    if (data.packageStatusId !== PackageStatusIds.PACKED) {
      throw new ConflictError("Package is not in packed");
    }

    const entry = data.entry;
    const order = data.entry.customer?.orders?.[0];
    const shippingAddress = order?.shippingAddress;
    const fallbackAddress = data.entry.customer?.user.addresses?.[0];
    let stringifiedAddress = shippingAddress?.streetAddress
      ? [shippingAddress.streetAddress, shippingAddress.landmark].filter(Boolean).join(", ")
      : (fallbackAddress?.streetAddress ?? "N/A");

    if (data.address) {
      // If the package has an address specified directly on it, use that instead of the order/customer address
      stringifiedAddress = data.address;
    }

    return {
      packageCode: data.packageCode,
      hasShippingLabel: Boolean(data.hasShippingLabel),
      shippingLabelId: data.shippingLabel?.id ?? null,
      shippingType: order?.shippingType,
      shippingPriorityCode: order?.shippingPriorityCode,
      weight: entry.weight,
      fullName: entry.customer?.user.fullName ?? "N/A",
      address: stringifiedAddress,
      city: shippingAddress?.city ?? fallbackAddress?.city ?? null,
      country: shippingAddress?.country ?? fallbackAddress?.country ?? null,
      additionalNotes: entry.customer?.orders?.[0]?.notes ?? null,
      purchasedBy: data.entry.customer,
    };
  }
}

export const packagesService = new PackagesService();
