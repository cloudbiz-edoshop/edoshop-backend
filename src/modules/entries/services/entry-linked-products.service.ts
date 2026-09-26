import { and, eq, inArray, or, sql } from "drizzle-orm";

import { EntryTypeIds } from "@/constants";
import db from "@/db";
import { directOrderProducts } from "@/db/models/direct-order-products";
import { entryProducts } from "@/db/models/entry-products";
import { products } from "@/db/models/products";

export type LinkedStoreProduct = {
  id: number;
  name: string;
  directOrderCode: string | null;
};

type EntryRow = {
  id: number;
  entryTypeId?: number | null;
  items?: Array<{
    itemCode?: string;
    series?: {
      id?: number;
      entryId?: number;
      seriesCode?: string;
    } | null;
  }>;
  series?: Array<{
    id?: number;
    entryId?: number;
    seriesCode?: string;
  }>;
  entryProducts?: Array<{
    product?: { id?: number; name?: string } | null;
  }>;
};

const addProduct = (
  map: Map<number, LinkedStoreProduct>,
  row: { id: number; name: string; directOrderCode?: string | null },
) => {
  if (!row.id || !row.name) return;
  map.set(row.id, {
    id: row.id,
    name: row.name,
    directOrderCode: row.directOrderCode ?? null,
  });
};

const productsFromEntryProducts = (
  map: Map<number, LinkedStoreProduct>,
  rows: Array<{ product?: { id: number; name: string } | null }>,
) => {
  for (const row of rows) {
    if (row.product?.id && row.product?.name) {
      addProduct(map, {
        id: row.product.id,
        name: row.product.name,
        directOrderCode: null,
      });
    }
  }
};

export async function enrichEntriesWithLinkedStoreProducts<T extends EntryRow>(
  entries: T[],
): Promise<Array<T & { linkedStoreProducts: LinkedStoreProduct[] }>> {
  if (entries.length === 0) {
    return [];
  }

  const itemCodes = new Set<string>();
  const seriesIds = new Set<number>();
  const seriesEntryIds = new Set<number>();
  const entryIds = new Set<number>();
  const seriesCodePrefixes = new Set<string>();

  for (const entry of entries) {
    entryIds.add(entry.id);

    const item = entry.items?.[0];
    const seriesFromItem = item?.series;
    const seriesFromEntry = entry.series?.[0];

    if (item?.itemCode) {
      itemCodes.add(item.itemCode);
    }

    const series = seriesFromItem ?? seriesFromEntry;
    if (series?.id) {
      seriesIds.add(series.id);
    }
    if (series?.seriesCode) {
      seriesCodePrefixes.add(series.seriesCode);
    }

    if (entry.entryTypeId === EntryTypeIds.SERIES && entry.id) {
      seriesEntryIds.add(entry.id);
    } else if (seriesFromItem?.entryId) {
      seriesEntryIds.add(seriesFromItem.entryId);
    } else if (seriesFromEntry?.entryId) {
      seriesEntryIds.add(seriesFromEntry.entryId);
    }
  }

  const seriesPrefixPatterns = [...seriesCodePrefixes].map((code) => `${code}_%`);

  const directOrderConditions = [];
  if (itemCodes.size > 0) {
    directOrderConditions.push(
      inArray(directOrderProducts.directOrderCode, [...itemCodes]),
    );
  }
  if (seriesIds.size > 0) {
    directOrderConditions.push(
      inArray(directOrderProducts.seriesId, [...seriesIds]),
    );
  }
  if (seriesPrefixPatterns.length > 0) {
    directOrderConditions.push(
      or(
        ...seriesPrefixPatterns.map(
          (pattern) => sql`${directOrderProducts.directOrderCode} LIKE ${pattern}`,
        ),
      )!,
    );
  }

  const directOrderRows =
    directOrderConditions.length > 0
      ? await db
          .select({
            id: products.id,
            name: products.name,
            directOrderCode: directOrderProducts.directOrderCode,
            seriesId: directOrderProducts.seriesId,
          })
          .from(directOrderProducts)
          .innerJoin(products, eq(directOrderProducts.productId, products.id))
          .where(and(eq(products.isDeleted, false), or(...directOrderConditions)))
      : [];

  const catalogBySeriesId =
    seriesIds.size > 0
      ? await db
          .select({
            id: products.id,
            name: products.name,
            seriesId: products.seriesId,
          })
          .from(products)
          .where(
            and(
              eq(products.isDeleted, false),
              inArray(products.seriesId, [...seriesIds]),
            ),
          )
      : [];

  const entryProductEntryIds = [...new Set([...entryIds, ...seriesEntryIds])];
  const entryProductRows =
    entryProductEntryIds.length > 0
      ? await db.query.entryProducts.findMany({
          where: inArray(entryProducts.entryId, entryProductEntryIds),
          with: {
            product: true,
          },
        })
      : [];

  const entryProductsByEntryId = new Map<number, typeof entryProductRows>();
  for (const row of entryProductRows) {
    const list = entryProductsByEntryId.get(row.entryId) ?? [];
    list.push(row);
    entryProductsByEntryId.set(row.entryId, list);
  }

  const directByItemCode = new Map<string, LinkedStoreProduct[]>();
  const directBySeriesId = new Map<number, LinkedStoreProduct[]>();
  const directBySeriesPrefix = new Map<string, LinkedStoreProduct[]>();

  for (const row of directOrderRows) {
    const product: LinkedStoreProduct = {
      id: row.id,
      name: row.name,
      directOrderCode: row.directOrderCode,
    };

    if (row.directOrderCode) {
      const list = directByItemCode.get(row.directOrderCode) ?? [];
      list.push(product);
      directByItemCode.set(row.directOrderCode, list);

      for (const prefix of seriesCodePrefixes) {
        if (row.directOrderCode.startsWith(`${prefix}_`)) {
          const prefixList = directBySeriesPrefix.get(prefix) ?? [];
          prefixList.push(product);
          directBySeriesPrefix.set(prefix, prefixList);
        }
      }
    }

    if (row.seriesId) {
      const list = directBySeriesId.get(row.seriesId) ?? [];
      list.push(product);
      directBySeriesId.set(row.seriesId, list);
    }
  }

  const catalogProductsBySeriesId = new Map<number, LinkedStoreProduct[]>();
  for (const row of catalogBySeriesId) {
    if (!row.seriesId) continue;
    const list = catalogProductsBySeriesId.get(row.seriesId) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      directOrderCode: null,
    });
    catalogProductsBySeriesId.set(row.seriesId, list);
  }

  return entries.map((entry) => {
    const linked = new Map<number, LinkedStoreProduct>();

    productsFromEntryProducts(linked, entry.entryProducts ?? []);

    const entryEp = entryProductsByEntryId.get(entry.id);
    if (entryEp) {
      productsFromEntryProducts(linked, entryEp);
    }

    const item = entry.items?.[0];
    const series = item?.series ?? entry.series?.[0];
    const seriesCode = series?.seriesCode;
    const seriesId = series?.id;
    const seriesEntryId =
      entry.entryTypeId === EntryTypeIds.SERIES
        ? entry.id
        : series?.entryId;

    if (seriesEntryId) {
      const seriesEp = entryProductsByEntryId.get(seriesEntryId);
      if (seriesEp) {
        productsFromEntryProducts(linked, seriesEp);
      }
    }

    if (item?.itemCode) {
      for (const product of directByItemCode.get(item.itemCode) ?? []) {
        addProduct(linked, product);
      }
    }

    if (seriesCode) {
      for (const product of directBySeriesPrefix.get(seriesCode) ?? []) {
        addProduct(linked, product);
      }
    }

    if (seriesId) {
      for (const product of directBySeriesId.get(seriesId) ?? []) {
        addProduct(linked, product);
      }
      for (const product of catalogProductsBySeriesId.get(seriesId) ?? []) {
        addProduct(linked, product);
      }
    }

    const linkedStoreProducts = [...linked.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    return {
      ...entry,
      linkedStoreProducts,
    };
  });
}
