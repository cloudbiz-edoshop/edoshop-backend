import { env } from "@/config";
import { PRODUCT_SECTION_LABELS } from "@/constants/product-sections.constants";
import { StoreIds, StoreNames } from "@/constants/stores.constants";

export const TV_CATALOG_MODES = ["all", "selected"] as const;
export const TV_MEDIA_TYPES = ["image", "video"] as const;

export const WAREHOUSE_ORIGIN_BY_CODE: Record<string, string> = {
  TR: "Turkey",
  CN: "China",
  US: "USA",
};

export const TV_STORES = [
  { id: StoreIds.direct, name: StoreNames.DIRECT },
  { id: StoreIds.dropshipping, name: StoreNames.DROPSHIPPING },
];

export const TV_ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;
export const TV_REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60;

export const EDOSHOP_HOW_IT_WORKS_VIDEOS = [
  {
    id: "script1-en",
    path: "/videos/edoshop-script1-en.mp4",
    posterPath: "/videos/edoshop-script1-en-poster.jpg",
    language: "en",
  },
  {
    id: "script1-fr",
    path: "/videos/edoshop-script1-fr.mp4",
    posterPath: "/videos/edoshop-script1-fr-poster.jpg",
    language: "fr",
  },
  {
    id: "script2-en",
    path: "/videos/edoshop-script2-en.mp4",
    posterPath: "/videos/edoshop-script2-en-poster.jpg",
    language: "en",
  },
  {
    id: "script2-fr",
    path: "/videos/edoshop-script2-fr.mp4",
    posterPath: "/videos/edoshop-script2-fr-poster.jpg",
    language: "fr",
  },
] as const;

export const buildStorefrontAssetUrl = (path: string) => {
  const base = (env.STOREFRONT_URL || "https://edoshop.online").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};

export const getSectionLabel = (section: string | null | undefined) => {
  if (!section) return "General";
  return PRODUCT_SECTION_LABELS[section as keyof typeof PRODUCT_SECTION_LABELS]
    || section.replaceAll("_", " ");
};
