import { eq } from "drizzle-orm";

import db from "@/db";
import { categories, colors, directOrderProducts, products, sizes, variants } from "@/db/models";

export const WAREHOUSE_SHEETS = [
  { sheetName: "Stock Entree TR", warehouse: "TR", seriesId: 1, origin: "Turkey" },
  { sheetName: "Stock Entree Chine", warehouse: "CN", seriesId: 6, origin: "China" },
  { sheetName: "Stock Entree USA", warehouse: "US", seriesId: 7, origin: "USA" },
] as const;

export type WarehouseRow = {
  warehouse: string;
  origin: string;
  seriesId: number;
  sheetName: string;
  legacyReference: string;
  categoryName: string;
  categoryNameEn: string;
  name: string;
  description: string;
  color: string;
  colorLabel: string;
  sizeLabel: string;
  sizeLabels: string[];
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  binLocation: string;
  comment: string;
};

export const WAREHOUSE_ORIGIN_BY_CODE: Record<string, string> = {
  TR: "Turkey",
  CN: "China",
  US: "USA",
};

const DEFAULT_USER_ID = 1;
const DEFAULT_MATERIAL_TYPE_ID = 1;
const DEFAULT_DESIGN_PATTERN_ID = 1;

const FRENCH_COLOR_TO_ENGLISH: Record<string, string> = {
  noir: "black",
  blanc: "white",
  bleu: "blue",
  rouge: "red",
  vert: "green",
  jaune: "yellow",
  rose: "pink",
  violet: "purple",
  marron: "brown",
  gris: "gray",
  grise: "gray",
  argent: "silver",
  beige: "beige",
  orange: "orange",
  multicolore: "multicolor",
  transparent: "silver",
  aluminium: "silver",
  plastique: "silver",
};

const FRENCH_CATEGORY_TRANSLATIONS: Record<string, string> = {
  "ens jogging pull": "Jogging Set",
  "ens culotte": "Shorts Set",
  "ens evenementiel": "Occasion Set",
  "jouets pour enfants": "Children's Toys",
  "accessoire enfant": "Children's Accessory",
  "accessoire enfant ": "Children's Accessory",
  "hygiene, soins": "Hygiene & Care",
  "article scolaire": "School Supplies",
  "accessoire beaute": "Beauty Accessory",
  "accessoire bea": "Beauty Accessory",
  "ustensile de cuisine": "Kitchen Utensil",
  "appareil domestique": "Home Appliance",
  "soins pedicure": "Pedicure Care",
  "maison, deco, et": "Home Decor",
  "soins dentaire": "Dental Care",
  "sous-vetement": "Underwear",
  "vetement": "Clothing",
  "deco anniversaire": "Birthday Decor",
  chaussure: "Shoes",
  "sac a dos": "Backpack",
  "sac a main": "Handbag",
  appareils: "Appliances",
};

export const normalizeText = (value: unknown) =>
  String(value ?? "").replace(/\s+/g, " ").trim();

export const normalizeLegacyReference = (value: string) =>
  value.replace(/\s+/g, "").toUpperCase();

export const isValidLegacyReference = (value: string) => {
  const normalized = normalizeLegacyReference(value);
  if (!normalized) return false;
  if (normalized.toLowerCase().includes("nonmention")) return false;
  if (normalized.toLowerCase().includes("non mention")) return false;
  return /^DO[-_A-Z0-9]+$/i.test(normalized);
};

export const parsePrice = (value: string) => {
  const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return "0.00";
  return parsed.toFixed(2);
};

export const truncate = (value: string, max: number) => {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
};

export const translateCategoryName = (categoryName: string) => {
  const key = normalizeText(categoryName).toLowerCase();
  return FRENCH_CATEGORY_TRANSLATIONS[key] || normalizeText(categoryName);
};

export const mapFrenchColorToEnglishName = (rawColor: string) => {
  const normalized = normalizeText(rawColor).toLowerCase();
  if (!normalized) return "black";

  for (const [needle, englishName] of Object.entries(FRENCH_COLOR_TO_ENGLISH)) {
    if (normalized.includes(needle)) {
      return englishName;
    }
  }

  return normalized.slice(0, 40).replace(/[^a-z0-9- ]/g, "") || "black";
};

export const mapEnglishColorToFilterLabel = (englishName: string) => {
  const normalized = normalizeText(englishName).toLowerCase();
  const labels: Record<string, string> = {
    black: "Black",
    white: "White",
    blue: "Blue",
    red: "Red",
    green: "Green",
    yellow: "Yellow",
    pink: "Pink",
    purple: "Purple",
    brown: "Brown",
    gray: "Silver",
    grey: "Silver",
    silver: "Silver",
    beige: "Brown",
    orange: "Yellow",
    navy: "Blue",
    multicolor: "Purple",
  };

  return labels[normalized] || englishName.charAt(0).toUpperCase() + englishName.slice(1);
};

export const parseSizeLabels = (rawSize: string) => {
  const normalized = normalizeText(rawSize);
  if (!normalized) return ["one-size"];
  if (/^(r\.?a\.?s|r\.a\.s\.?)$/i.test(normalized)) return ["one-size"];
  if (/^(adultes?|enfants?|b[eé]b[eé]s?|bab(y|ies)|homme|femme|mixte|unisex|gar[cç]ons?|filles?)$/i.test(normalized)) {
    return ["one-size"];
  }

  const tokens = normalized
    .split(",")
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .filter(
      (part) =>
        !/^(adultes?|enfants?|b[eé]b[eé]s?|bab(y|ies)|homme|femme|mixte|unisex|gar[cç]ons?|filles?)$/i.test(
          part,
        ),
    );

  return tokens.length ? tokens : ["one-size"];
};

export const normalizeSizeKey = (label: string) => {
  const normalized = normalizeText(label).toLowerCase();
  const aliases: Record<string, string> = {
    xs: "xs",
    s: "s",
    m: "m",
    l: "l",
    xl: "xl",
    xxl: "xxl",
    "one-size": "one-size",
    "taille unique": "one-size",
  };

  if (aliases[normalized]) return aliases[normalized];

  return normalized
    .replace(/[^a-z0-9- ]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40) || "one-size";
};

export const inferOriginFromReference = (reference: string) => {
  const match = normalizeLegacyReference(reference).match(/^DO-(TR|CN|US)-/i);
  if (!match) return null;
  return WAREHOUSE_ORIGIN_BY_CODE[match[1].toUpperCase()] || null;
};

export const buildSpecifications = (row: WarehouseRow) =>
  [
    `Legacy Reference: ${row.legacyReference}`,
    `Product Origin: ${row.origin}`,
    `Warehouse: ${row.warehouse}`,
    `Category: ${row.categoryNameEn}`,
    row.color ? `Color: ${row.colorLabel}` : null,
    row.sizeLabels.length ? `Size: ${row.sizeLabels.join(", ")}` : null,
    row.quantity ? `Quantity: ${row.quantity}` : null,
    row.binLocation ? `Bin Location: ${row.binLocation}` : null,
    row.comment ? `Comment: ${row.comment}` : null,
    `Suggested image filename prefix: ${row.legacyReference}`,
  ]
    .filter(Boolean)
    .join("\n");

const ensureColorId = async (
  cache: Map<string, number>,
  rawColor: string,
  dryRun: boolean,
) => {
  const englishName = mapFrenchColorToEnglishName(rawColor);
  const cached = cache.get(englishName);
  if (cached) return cached;

  const existing = await db.query.colors.findFirst({
    where: eq(colors.name, englishName),
  });
  if (existing) {
    cache.set(englishName, existing.id);
    return existing.id;
  }

  if (dryRun) {
    const fakeId = cache.size + 1000;
    cache.set(englishName, fakeId);
    return fakeId;
  }

  const [created] = await db
    .insert(colors)
    .values({
      name: englishName,
      description: normalizeText(rawColor) || englishName,
      isPredefined: false,
      createdBy: DEFAULT_USER_ID,
      updatedBy: DEFAULT_USER_ID,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning({ id: colors.id });

  cache.set(englishName, created.id);
  return created.id;
};

const ensureSizeId = async (
  cache: Map<string, number>,
  rawSize: string,
  dryRun: boolean,
) => {
  const key = normalizeSizeKey(rawSize);
  const cached = cache.get(key);
  if (cached) return cached;

  const existing = await db.query.sizes.findFirst({
    where: eq(sizes.name, key),
  });
  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }

  if (dryRun) {
    const fakeId = cache.size + 2000;
    cache.set(key, fakeId);
    return fakeId;
  }

  const [created] = await db
    .insert(sizes)
    .values({
      name: key,
      description: truncate(normalizeText(rawSize), 255),
      isPredefined: false,
      createdBy: DEFAULT_USER_ID,
      updatedBy: DEFAULT_USER_ID,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning({ id: sizes.id });

  cache.set(key, created.id);
  return created.id;
};

const buildVariantCode = (
  directOrderCode: string,
  colorName: string,
  sizeKey: string,
  index = 0,
) => {
  const colorCode = colorName.slice(0, 3).toUpperCase() || "COL";
  const sizeCode = sizeKey.slice(0, 4).toUpperCase() || "ONE";
  const suffix = index > 0 ? `_${index}` : "";
  return `${directOrderCode}_${colorCode}_${sizeCode}${suffix}`;
};

export const ensureCategoryId = async (
  cache: Map<string, number>,
  categoryName: string,
  dryRun: boolean,
) => {
  const translated = translateCategoryName(categoryName);
  const key = translated.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const existing = await db.query.categories.findMany({
    where: eq(categories.isDeleted, false),
  });
  const match = existing.find(
    (category) => category.name.trim().toLowerCase() === key,
  );
  if (match) {
    cache.set(key, match.id);
    return match.id;
  }

  if (dryRun) {
    const fakeId = cache.size + 3000;
    cache.set(key, fakeId);
    return fakeId;
  }

  const [created] = await db
    .insert(categories)
    .values({
      name: truncate(translated, 255),
      description: `Imported from warehouse stock spreadsheet (${normalizeText(categoryName)})`,
      parentId: null,
      level: 1,
      createdBy: DEFAULT_USER_ID,
      updatedBy: DEFAULT_USER_ID,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning({ id: categories.id });

  cache.set(key, created.id);
  return created.id;
};

export const createVariantsForProduct = async ({
  productId,
  directOrderCode,
  row,
  dryRun,
  colorCache,
  sizeCache,
}: {
  productId: number;
  directOrderCode: string;
  row: WarehouseRow;
  dryRun: boolean;
  colorCache: Map<string, number>;
  sizeCache: Map<string, number>;
}) => {
  const colorId = await ensureColorId(colorCache, row.color || row.colorLabel, dryRun);
  const englishColorName = mapFrenchColorToEnglishName(row.color || row.colorLabel);
  const parsedQuantity = Number.parseInt(row.quantity, 10);
  const perVariantQuantity =
    Number.isFinite(parsedQuantity) && parsedQuantity > 0
      ? Math.max(1, Math.floor(parsedQuantity / Math.max(row.sizeLabels.length, 1)))
      : 0;

  let variantIndex = 0;
  for (const sizeLabel of row.sizeLabels) {
    const sizeId = await ensureSizeId(sizeCache, sizeLabel, dryRun);
    const sizeKey = normalizeSizeKey(sizeLabel);
    const variantCode = buildVariantCode(
      directOrderCode,
      englishColorName,
      sizeKey,
      variantIndex,
    );
    variantIndex += 1;

    if (dryRun) continue;

    const existing = await db.query.variants.findFirst({
      where: eq(variants.variantCode, variantCode),
    });
    if (existing) continue;

    await db.insert(variants).values({
      productId,
      variantCode,
      colorId,
      sizeId,
      materialTypeId: DEFAULT_MATERIAL_TYPE_ID,
      designPatternId: DEFAULT_DESIGN_PATTERN_ID,
      quantity: perVariantQuantity,
      additionalInfo: {
        source: "warehouse-xlsx",
        warehouse: row.warehouse,
        origin: row.origin,
        rawColor: row.color,
        rawSize: sizeLabel,
      },
      createdBy: DEFAULT_USER_ID,
      updatedBy: DEFAULT_USER_ID,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
};

export const loadDirectOrderProductIdsByCode = async () => {
  const rows = await db
    .select({
      productId: directOrderProducts.productId,
      directOrderCode: directOrderProducts.directOrderCode,
    })
    .from(directOrderProducts);

  return new Map(
    rows
      .map((row) => [
        normalizeLegacyReference(row.directOrderCode || ""),
        row.productId,
      ] as const)
      .filter(([code]) => Boolean(code)),
  );
};

export const updateImportedProductMetadata = async ({
  productId,
  row,
  dryRun,
}: {
  productId: number;
  row: WarehouseRow;
  dryRun: boolean;
}) => {
  const price = parsePrice(row.unitPrice);
  const shortDescription = truncate(row.description || row.categoryNameEn, 500);
  const specifications = buildSpecifications(row);

  if (dryRun) return;

  await db
    .update(products)
    .set({
      seriesId: row.seriesId,
      name: truncate(row.name, 255),
      price,
      shortDescription,
      fullDescription: row.description || shortDescription,
      specifications,
      updatedBy: DEFAULT_USER_ID,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(products.id, productId));
};
