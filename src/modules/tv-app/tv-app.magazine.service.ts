import { and, count, eq, inArray } from "drizzle-orm";

import db from "@/db";
import { products, tvAds } from "@/db/models";
import { BannersService } from "@/modules/banners/banners.service";
import {
  DiscountsService,
  isDiscountCurrentlyActive,
} from "@/modules/discounts/discounts.service";
import { ProductsRepository } from "@/modules/products/products.repository";

import {
  buildStorefrontAssetUrl,
  EDOSHOP_HOW_IT_WORKS_VIDEOS,
  getSectionLabel,
  TV_STORES,
  WAREHOUSE_ORIGIN_BY_CODE,
} from "./tv-app.constants";
import { tvAppRepository } from "./tv-app.repository";

const bannersService = new BannersService();
const discountsService = new DiscountsService();
const productsRepository = new ProductsRepository();

const inferProductOrigin = (product: Record<string, unknown>) => {
  const code =
    (product.directOrderCode as string)
    || ((product.dropshippingDetails as { dropshippingCode?: string } | null)
      ?.dropshippingCode
      || "");
  const codeMatch = String(code).match(/^DO-(TR|CN|US)-/i);
  if (codeMatch?.[1]) {
    return WAREHOUSE_ORIGIN_BY_CODE[codeMatch[1].toUpperCase()] || null;
  }

  const specifications = String(product.specifications || "");
  const originMatch = specifications.match(/Product Origin:\s*([^\n]+)/i);
  if (originMatch?.[1]) return originMatch[1].trim();

  const warehouseMatch = specifications.match(/Warehouse:\s*(TR|CN|US)/i);
  if (warehouseMatch?.[1]) {
    return WAREHOUSE_ORIGIN_BY_CODE[warehouseMatch[1].toUpperCase()] || null;
  }

  return null;
};

const getProductImageUrl = (product: Record<string, unknown>) => {
  const imageUrls = (product.imageUrls as string[] | undefined) || [];
  const fromProduct = imageUrls.find(Boolean) || (product.imageUrl as string | undefined);
  if (fromProduct) return fromProduct;

  const variants = (product.variants as Array<{ images?: Array<{ imageUrl?: string }> }>) || [];
  for (const variant of variants) {
    for (const image of variant.images || []) {
      if (image?.imageUrl) return image.imageUrl;
    }
  }

  return null;
};

const mapTvProduct = (product: Record<string, unknown>) => ({
  id: product.id,
  name: product.name,
  price: product.price,
  imageUrl: getProductImageUrl(product),
  imageUrls: product.imageUrls || [],
  shortDescription: product.shortDescription,
  fullDescription: product.fullDescription,
  specifications: product.specifications,
  section: product.section || null,
  sectionLabel: getSectionLabel(product.section as string | null | undefined),
  storeId: product.storeId,
  productOrigin: inferProductOrigin(product),
  categories: product.categories || [],
  directOrderCode: product.directOrderCode || null,
  dropshippingDetails: product.dropshippingDetails || null,
});

const isAdCurrentlyActive = (
  ad: {
    isPermanent?: boolean | null;
    startsAt?: string | null;
    endsAt?: string | null;
  },
  now = Date.now(),
) => {
  if (ad.isPermanent) return true;
  const startsOk = !ad.startsAt || new Date(ad.startsAt).getTime() <= now;
  const endsOk = !ad.endsAt || new Date(ad.endsAt).getTime() >= now;
  return startsOk && endsOk;
};

export class TvAppMagazineService {
  private getHowItWorksVideos() {
    return EDOSHOP_HOW_IT_WORKS_VIDEOS.map((video) => ({
      id: video.id,
      url: buildStorefrontAssetUrl(video.path),
      posterUrl: video.posterPath
        ? buildStorefrontAssetUrl(video.posterPath)
        : null,
      language: video.language,
      keepOriginalAudio: true as const,
    }));
  }

  private async loadCatalogProducts(catalogMode: string) {
    if (catalogMode === "selected") {
      const selections = await tvAppRepository.listCatalogSelections();
      const productIds = selections.map((row) => row.productId);
      if (!productIds.length) return [];

      const rows = await db
        .select({ id: products.id })
        .from(products)
        .where(inArray(products.id, productIds));

      const loaded = await Promise.all(
        rows.map(async (row) => productsRepository.findById(row.id)),
      );
      return loaded.filter(Boolean) as Record<string, unknown>[];
    }

    const result = await productsRepository.list({
      page: 1,
      limit: 10000,
      sortBy: "name",
      sortOrder: "asc",
    });
    return result.data as Record<string, unknown>[];
  }

  private organizeCatalog(rawProducts: Record<string, unknown>[]) {
    type ProductNode = ReturnType<typeof mapTvProduct>;
    type SectionNode = { name: string; products: ProductNode[] };
    type OriginNode = { name: string; sections: SectionNode[] };
    type StoreNode = { id: number; name: string; origins: OriginNode[] };

    const storeMap = new Map<number, StoreNode>();

    for (const store of TV_STORES) {
      storeMap.set(store.id, { id: store.id, name: store.name, origins: [] });
    }

    for (const product of rawProducts) {
      const storeId = Number(product.storeId);
      const storeConfig = TV_STORES.find((store) => store.id === storeId);
      if (!storeConfig) continue;

      const storeNode = storeMap.get(storeId)!;
      const originName = inferProductOrigin(product) || "General";
      let originNode = storeNode.origins.find((origin) => origin.name === originName);
      if (!originNode) {
        originNode = { name: originName, sections: [] };
        storeNode.origins.push(originNode);
      }

      const sectionName = getSectionLabel(product.section as string | null | undefined);
      let sectionNode = originNode.sections.find((section) => section.name === sectionName);
      if (!sectionNode) {
        sectionNode = { name: sectionName, products: [] };
        originNode.sections.push(sectionNode);
      }

      sectionNode.products.push(mapTvProduct(product));
    }

    const stores = Array.from(storeMap.values())
      .filter((store) => store.origins.length > 0)
      .map((store) => ({
        ...store,
        origins: store.origins
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((origin) => ({
            ...origin,
            sections: origin.sections
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((section) => ({
                ...section,
                products: section.products.sort((a, b) =>
                  String(a.name).localeCompare(String(b.name)),
                ),
              })),
          })),
      }));

    return { stores };
  }

  async getMagazineVersion() {
    const settings = await tvAppRepository.ensureSettings();
    return {
      magazineVersion: settings.magazineVersion ?? 1,
      generatedAt: new Date().toISOString(),
    };
  }

  async buildMagazineFeed() {
    const settings = await tvAppRepository.ensureSettings();
    const catalogMode = settings.catalogMode || "all";
    const rawProducts = await this.loadCatalogProducts(catalogMode);
    const catalog = {
      mode: catalogMode,
      ...this.organizeCatalog(rawProducts),
    };

    const discountsResult = await discountsService.listDiscounts({
      page: 1,
      limit: 1000,
    });
    const activeDiscounts = discountsResult.data
      .filter((discount) => isDiscountCurrentlyActive(discount))
      .map((discount) => ({
        id: discount.id,
        name: discount.name,
        description: discount.description,
        discountValue: discount.discountValue,
        discountTypeId: discount.discountTypeId,
        targetType: discount.productId ? "product" : "series",
        productId: discount.productId,
        seriesId: discount.seriesId,
        startsAt: discount.startsAt,
        endsAt: discount.endsAt,
        isPermanent: !discount.endsAt,
      }));

    let bannerItems: unknown[] = [];
    if (settings.includeBanners) {
      const bannersResult = await bannersService.listBanners({
        page: 1,
        limit: 100,
      });
      bannerItems = bannersResult.data;
    }

    const ads = (await tvAppRepository.listActiveAds())
      .filter((ad) => isAdCurrentlyActive(ad))
      .map((ad) => ({
        id: ad.id,
        title: ad.title,
        subtitle: ad.subtitle,
        mediaType: ad.mediaType,
        mediaUrl: ad.mediaUrl,
        displayOrder: ad.displayOrder,
        displayDurationMs: ad.displayDurationMs,
        isPermanent: ad.isPermanent,
        startsAt: ad.startsAt,
        endsAt: ad.endsAt,
      }));

    return {
      magazineVersion: settings.magazineVersion ?? 1,
      generatedAt: new Date().toISOString(),
      invitation: {
        title: settings.invitationTitle,
        iosUrl: settings.iosUrl,
        androidUrl: settings.androidUrl,
        fallbackUrl: settings.fallbackUrl,
        qrTargetUrl: settings.qrTargetUrl,
      },
      stores: TV_STORES,
      catalog,
      discounts: activeDiscounts,
      banners: bannerItems,
      ads,
      howItWorksVideos: this.getHowItWorksVideos(),
    };
  }

  async getOverview() {
    const settings = await tvAppRepository.ensureSettings();
    const [{ value: adCount }] = await db
      .select({ value: count() })
      .from(tvAds)
      .where(and(eq(tvAds.isDeleted, false), eq(tvAds.isActive, true)));

    const devices = await tvAppRepository.listDevices({ page: 1, limit: 1 });
    const catalogSelections = await tvAppRepository.listCatalogSelections();

    return {
      magazineVersion: settings.magazineVersion ?? 1,
      catalogMode: settings.catalogMode || "all",
      includeBanners: settings.includeBanners ?? true,
      selectedProductCount: catalogSelections.length,
      registeredDeviceCount: devices.total,
      activeAdCount: Number(adCount || 0),
      updatedAt: settings.updatedAt,
    };
  }
}

export const tvAppMagazineService = new TvAppMagazineService();
