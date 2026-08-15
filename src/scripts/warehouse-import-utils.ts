import { readFileSync } from "node:fs";

import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";

import db from "@/db";
import {
  categories,
  colors,
  directOrderProducts,
  products,
  sizes,
  variants,
} from "@/db/models";

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
  descriptionEn: string;
  color: string;
  colorLabel: string;
  colorLabelEn: string;
  sizeLabel: string;
  sizeLabels: string[];
  sizeLabelsEn: string[];
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  binLocation: string;
  comment: string;
  commentEn: string;
  entryDate: string;
  emitterInitials: string;
  sorties: string;
  remainingStock: string;
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
  bordeaux: "red",
  doré: "yellow",
  dore: "yellow",
  cyan: "blue",
  turquoise: "blue",
  kaki: "green",
  crème: "white",
  creme: "white",
};

const FRENCH_CATEGORY_TRANSLATIONS: Record<string, string> = {
  "ens jogging pull": "Jogging Hoodie Set",
  "ens culotte": "Shorts Set",
  "ens evenementiel": "Occasion Set",
  "ens pantalon jean": "Jeans Pants Set",
  "ens pantalon kaki": "Khaki Pants Set",
  "robe évènementielle": "Occasion Dress",
  "robe evenementielle": "Occasion Dress",
  "jouets pour enfants": "Children's Toys",
  "accessoire enfant": "Children's Accessory",
  "accessoire enfant ": "Children's Accessory",
  "hygiene ,soins personnels": "Hygiene & Personal Care",
  "hygiene, soins personnels": "Hygiene & Personal Care",
  "article scolaire": "School Supplies",
  "accessoire beaute": "Beauty Accessory",
  "accessoire bea": "Beauty Accessory",
  "ustensile de cuisine": "Kitchen Utensil",
  "appareil domestique": "Home Appliance",
  "soins pedicure": "Pedicure Care",
  "maison, deco, et": "Home Decor",
  "soins dentaire": "Dental Care",
  "sous-vetement": "Underwear",
  vetement: "Clothing",
  "deco anniversaire": "Birthday Decor",
  chaussure: "Shoes",
  "sac a dos": "Backpack",
  "sac a main": "Handbag",
  appareils: "Electronics & Appliances",
  "pull simple": "Hoodie",
  "jogging simple": "Joggers",
  "culotte simple": "Shorts",
  chemise: "Shirt",
  grenouillère: "Sleep Suit",
  barboteuse: "Romper",
  polo: "Polo Shirt",
  "t-shirt": "T-Shirt",
  combinaison: "Jumpsuit",
  salopette: "Overalls",
  robe: "Dress",
  "jupe jean simple": "Denim Skirt",
  "collant simple": "Tights",
};

const FRENCH_PHRASES: Array<[RegExp, string]> = [
  [/ens jogging pull/gi, "jogging hoodie set"],
  [/ens pantalon jogging/gi, "jogging pants set"],
  [/ens pantalon jean/gi, "jeans pants set"],
  [/ens pantalon kaki/gi, "khaki pants set"],
  [/ens culotte/gi, "shorts set"],
  [/ens evenementiel/gi, "occasion outfit set"],
  [/ens jupe/gi, "skirt set"],
  [/ens collant/gi, "tights set"],
  [/longue manche/gi, "long sleeve"],
  [/longue mache/gi, "long sleeve"],
  [/contenant le lot/gi, "bundle containing"],
  [/plastiques? noir/gi, "black plastic bags"],
  [/prix déballage/gi, "unpacking price"],
  [/chargeur pour ordinateur/gi, "laptop charger"],
  [/tablette avec clavier/gi, "tablet with keyboard"],
  [/ordinateur hp/gi, "HP computer"],
  [/souris/gi, "mouse"],
  [/sortie/gi, "dispatched"],
  [/cadeaux/gi, "gift items"],
  [/petite fille/gi, "little girl"],
  [/cheveux noir/gi, "black hair"],
  [/motif panthere/gi, "leopard print"],
  [/motif panthère/gi, "leopard print"],
  [/mikey mouse/gi, "Mickey Mouse"],
  [/2 pcs/gi, "2-piece"],
  [/2ps/gi, "2-piece"],
  [/3 pieces/gi, "3-piece"],
  [/3 pièces/gi, "3-piece"],
];

const FRENCH_WORDS: Record<string, string> = {
  ens: "set",
  jogging: "jogging",
  pull: "hoodie",
  pantalon: "pants",
  culotte: "shorts",
  jean: "jeans",
  robe: "dress",
  jupe: "skirt",
  collant: "tights",
  tricot: "knit",
  fille: "girls",
  garcon: "boys",
  garçon: "boys",
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
  plusieurs: "assorted",
  brocante: "mixed second-hand lot",
  adultes: "adults",
  adulte: "adult",
  enfants: "children",
  enfant: "child",
  bebe: "baby",
  bébé: "baby",
  mois: "months",
  ans: "years",
  pcs: "pcs",
  pièces: "pieces",
  pce: "pc",
  paires: "pairs",
  paire: "pair",
  lot: "lot",
  sac: "bag",
  ceinture: "belt",
  bout: "tip",
  phantom: "phantom",
  grand: "large",
  petit: "small",
  learning: "learning",
  computer: "computer",
  barrette: "hair clip",
  mannequin: "mannequin",
  cheveux: "hair",
  hygiene: "hygiene",
  soins: "care",
  personnels: "personal",
  chaussure: "shoes",
  chaussures: "shoes",
  habit: "clothing",
  ados: "teens",
  plastiques: "plastic bags",
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

export const formatExcelDate = (value: unknown) => {
  const serial = Number(value);
  if (Number.isFinite(serial) && serial > 1000) {
    const utcDays = Math.floor(serial - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  return normalizeText(value);
};

export const translateFrenchText = (text: string) => {
  let result = normalizeText(text);
  if (!result) return "";

  for (const [pattern, replacement] of FRENCH_PHRASES) {
    result = result.replace(pattern, replacement);
  }

  result = result
    .split(/\s+/)
    .map((token) => {
      const cleaned = token.replace(/[^a-zA-Zàâäéèêëïîôùûüç'-]/g, "");
      const lower = cleaned.toLowerCase();
      if (!cleaned) return token;
      if (FRENCH_WORDS[lower]) {
        const translated = FRENCH_WORDS[lower];
        return /^[A-Z]/.test(cleaned)
          ? translated.charAt(0).toUpperCase() + translated.slice(1)
          : translated;
      }
      return token;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return result.charAt(0).toUpperCase() + result.slice(1);
};

export const translateCategoryName = (categoryName: string) => {
  const raw = normalizeText(categoryName);
  const key = raw.toLowerCase();
  if (FRENCH_CATEGORY_TRANSLATIONS[key]) {
    return FRENCH_CATEGORY_TRANSLATIONS[key];
  }

  let result = raw;
  const isGirls = /\bfille\b/i.test(result);
  result = result.replace(/^Ens\s+/i, "Set ");
  result = result.replace(/\s+fille$/i, "");
  result = translateFrenchText(result);

  if (isGirls && !/\(Girls\)$/i.test(result)) {
    result = `${result} (Girls)`;
  }

  return result.trim() || raw;
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

export const translateColorLabel = (rawColor: string) => {
  const normalized = normalizeText(rawColor);
  if (!normalized || /^r\.?a\.?s\.?$/i.test(normalized)) return "";
  if (/plusieurs/i.test(normalized)) return "Assorted colors";
  if (/brocante/i.test(normalized)) return "Mixed / second-hand lot";

  const parts = normalized
    .split(/[-,/]| et | sac /i)
    .map((part) => part.trim())
    .filter(Boolean);

  const translated = parts.map((part) =>
    mapEnglishColorToFilterLabel(mapFrenchColorToEnglishName(part)),
  );

  return [...new Set(translated)].join(" / ");
};

export const translateSizeLabelDisplay = (label: string) => {
  let result = normalizeText(label);
  if (!result) return "";
  if (/^(r\.?a\.?s|r\.a\.s\.?)$/i.test(result)) return "One size";

  result = result.replace(/\bans\b/gi, "years");
  result = result.replace(/\bmois\b/gi, "months");
  result = result.replace(/\bpces?\b/gi, "pcs");
  result = result.replace(/\bpaires?\b/gi, "pairs");
  result = result.replace(/\blot\b/gi, "lot");
  result = result.replace(/\badultes?\b/gi, "Adults");
  result = result.replace(/\bb[eé]b[eé]s?\b/gi, "Baby");
  result = result.replace(/\benfants?\b/gi, "Children");
  result = result.replace(/\bhomme\b/gi, "Men");
  result = result.replace(/\bfemme\b/gi, "Women");
  result = result.replace(/\bmixte\b/gi, "Unisex");
  result = result.replace(/\s+/g, " ").trim();

  return result;
};

export const parseSizeLabels = (rawSize: string) => {
  const normalized = normalizeText(rawSize);
  if (!normalized) return ["one-size"];
  if (/^(r\.?a\.?s|r\.a\.s\.?)$/i.test(normalized)) return ["one-size"];
  if (
    /^(adultes?|enfants?|b[eé]b[eé]s?|bab(y|ies)|homme|femme|mixte|unisex|gar[cç]ons?|filles?|brocante)$/i.test(
      normalized,
    )
  ) {
    return ["one-size"];
  }

  const tokens = normalized
    .split(/[,;]+|\set\s|\s+\/\s+/)
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .filter(
      (part) =>
        !/^(adultes?|enfants?|b[eé]b[eé]s?|bab(y|ies)|homme|femme|mixte|unisex|gar[cç]ons?|filles?|brocante)$/i.test(
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

  return (
    normalized
      .replace(/[^a-z0-9- ]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 40) || "one-size"
  );
};

export const inferOriginFromReference = (reference: string) => {
  const match = normalizeLegacyReference(reference).match(/^DO-(TR|CN|US)-/i);
  if (!match) return null;
  return WAREHOUSE_ORIGIN_BY_CODE[match[1].toUpperCase()] || null;
};

export const buildFullDescription = (row: WarehouseRow) => {
  const parts: string[] = [];

  if (row.descriptionEn) {
    parts.push(row.descriptionEn);
  }

  parts.push(`Sourced from the ${row.origin} warehouse.`);
  parts.push(`Category: ${row.categoryNameEn}.`);

  if (row.colorLabelEn) {
    parts.push(`Color: ${row.colorLabelEn}.`);
  }

  if (row.sizeLabelsEn.length) {
    parts.push(`Available sizes: ${row.sizeLabelsEn.join(", ")}.`);
  }

  if (row.quantity) {
    parts.push(`Quantity in stock: ${row.quantity}.`);
  }

  return parts.join(" ");
};

export const buildSpecifications = (row: WarehouseRow) =>
  [
    `Product Code: ${row.legacyReference}`,
    `Product Origin: ${row.origin}`,
    `Warehouse: ${row.warehouse}`,
    `Category: ${row.categoryNameEn}`,
    row.categoryName !== row.categoryNameEn
      ? `Original Category (FR): ${row.categoryName}`
      : null,
    `Description: ${row.descriptionEn || row.description}`,
    row.description && row.description !== row.descriptionEn
      ? `Original Description (FR): ${row.description}`
      : null,
    row.colorLabelEn ? `Color: ${row.colorLabelEn}` : null,
    row.color && row.color !== row.colorLabelEn
      ? `Original Color (FR): ${row.color}`
      : null,
    row.sizeLabelsEn.length ? `Available Sizes: ${row.sizeLabelsEn.join(", ")}` : null,
    row.sizeLabel ? `Original Size Label (FR): ${row.sizeLabel}` : null,
    row.quantity ? `Quantity in Stock: ${row.quantity}` : null,
    row.unitPrice ? `Unit Price (XAF): ${parsePrice(row.unitPrice)}` : null,
    row.totalPrice ? `Total Value (XAF): ${parsePrice(row.totalPrice)}` : null,
    row.binLocation ? `Bin Location: ${row.binLocation}` : null,
    row.entryDate ? `Stock Entry Date: ${row.entryDate}` : null,
    row.emitterInitials ? `Recorded By: ${row.emitterInitials}` : null,
    row.sorties ? `Stock Dispatched: ${row.sorties}` : null,
    row.remainingStock ? `Remaining Stock: ${row.remainingStock}` : null,
    row.commentEn ? `Notes: ${row.commentEn}` : null,
    row.comment && row.comment !== row.commentEn
      ? `Original Notes (FR): ${row.comment}`
      : null,
    `Suggested image filename prefix: ${row.legacyReference}`,
  ]
    .filter(Boolean)
    .join("\n");

export const parseWarehouseSheetRow = (
  sheetRow: (string | number)[],
  sheetConfig: (typeof WAREHOUSE_SHEETS)[number],
): WarehouseRow | null => {
  const legacyReference = normalizeLegacyReference(normalizeText(sheetRow[2]));
  if (!isValidLegacyReference(legacyReference)) return null;

  const categoryName = normalizeText(sheetRow[3]) || "Warehouse Import";
  const categoryNameEn = translateCategoryName(categoryName);
  const description = normalizeText(sheetRow[4]);
  const descriptionEn = translateFrenchText(description);
  const rawColor = normalizeText(sheetRow[5]);
  const rawSize = normalizeText(sheetRow[6]);
  const sizeLabels = parseSizeLabels(rawSize);
  const sizeLabelsEn = sizeLabels.map((label) => translateSizeLabelDisplay(label));
  const colorLabelEn = translateColorLabel(rawColor);

  return {
    warehouse: sheetConfig.warehouse,
    origin: sheetConfig.origin,
    seriesId: sheetConfig.seriesId,
    sheetName: sheetConfig.sheetName,
    legacyReference,
    categoryName,
    categoryNameEn,
    name: truncate(descriptionEn || description || categoryNameEn || legacyReference, 255),
    description,
    descriptionEn,
    color: rawColor,
    colorLabel: rawColor,
    colorLabelEn,
    sizeLabel: rawSize,
    sizeLabels,
    sizeLabelsEn,
    quantity: normalizeText(sheetRow[7]),
    unitPrice: normalizeText(sheetRow[8]),
    totalPrice: normalizeText(sheetRow[9]),
    binLocation: normalizeText(sheetRow[10]),
    comment: normalizeText(sheetRow[11]),
    commentEn: translateFrenchText(normalizeText(sheetRow[11])),
    entryDate: formatExcelDate(sheetRow[0]),
    emitterInitials: normalizeText(sheetRow[1]),
    sorties: normalizeText(sheetRow[12]),
    remainingStock: normalizeText(sheetRow[13]),
  };
};

export const mergeWarehouseRows = (
  existing: WarehouseRow,
  incoming: WarehouseRow,
): WarehouseRow => {
  const mergedSizeLabels = [
    ...new Set([...existing.sizeLabels, ...incoming.sizeLabels]),
  ];
  const mergedSizeLabelsEn = mergedSizeLabels.map((label) =>
    translateSizeLabelDisplay(label),
  );

  const comments = [existing.comment, incoming.comment].filter(Boolean);
  const commentsEn = [existing.commentEn, incoming.commentEn].filter(Boolean);

  return {
    ...existing,
    sizeLabels: mergedSizeLabels,
    sizeLabelsEn: mergedSizeLabelsEn,
    quantity: incoming.quantity || existing.quantity,
    remainingStock: incoming.remainingStock || existing.remainingStock,
    sorties: [existing.sorties, incoming.sorties].filter(Boolean).join("; "),
    comment: comments.join(" | "),
    commentEn: commentsEn.join(" | "),
    unitPrice: incoming.unitPrice || existing.unitPrice,
    totalPrice: incoming.totalPrice || existing.totalPrice,
    binLocation: incoming.binLocation || existing.binLocation,
  };
};

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
      description: truncate(translateSizeLabelDisplay(rawSize), 255),
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
        sizeLabelEn: translateSizeLabelDisplay(sizeLabel),
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
      .map(
        (row) =>
          [
            normalizeLegacyReference(row.directOrderCode || ""),
            row.productId,
          ] as const,
      )
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
  const shortDescription = truncate(
    row.descriptionEn || row.description || row.categoryNameEn,
    500,
  );
  const fullDescription = buildFullDescription(row);
  const specifications = buildSpecifications(row);
  const parsedQuantity = Number.parseInt(row.quantity, 10);

  if (dryRun) return;

  await db
    .update(products)
    .set({
      seriesId: row.seriesId,
      name: truncate(row.descriptionEn || row.name, 255),
      price,
      shortDescription,
      fullDescription,
      specifications,
      updatedBy: DEFAULT_USER_ID,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(products.id, productId));

  await db
    .update(directOrderProducts)
    .set({
      seriesId: row.seriesId,
      totalItems: Number.isFinite(parsedQuantity) ? parsedQuantity : null,
    })
    .where(eq(directOrderProducts.productId, productId));
};

export const loadWorkbookRowsByReference = (xlsxPath: string) => {
  const workbook = XLSX.read(readFileSync(xlsxPath), { type: "buffer" });
  const rowsByReference = new Map<string, WarehouseRow>();

  for (const sheetConfig of WAREHOUSE_SHEETS) {
    const sheet = workbook.Sheets[sheetConfig.sheetName];
    if (!sheet) {
      console.warn(`Sheet not found: ${sheetConfig.sheetName}`);
      continue;
    }

    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
      header: 1,
      defval: "",
    });

    for (let index = 5; index < rows.length; index += 1) {
      const parsed = parseWarehouseSheetRow(rows[index] || [], sheetConfig);
      if (!parsed) continue;

      const existing = rowsByReference.get(parsed.legacyReference);
      rowsByReference.set(
        parsed.legacyReference,
        existing ? mergeWarehouseRows(existing, parsed) : parsed,
      );
    }
  }

  return rowsByReference;
};
