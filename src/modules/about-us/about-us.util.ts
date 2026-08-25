import {
  AboutUsImageDisplayStyle,
  AboutUsImagePosition,
  type AboutUsImageItem,
} from "@/constants/about-us-image.constants";

import type { AboutUsImageInput } from "./about-us.schema";

type AboutUsPayload = {
  imageUrl?: string;
  imagePosition?: string;
  images?: AboutUsImageInput[];
};

export const normalizeAboutUsPayload = <T extends AboutUsPayload>(
  data: T,
): T & {
  imageUrl: string;
  imagePosition: string;
  images: AboutUsImageItem[];
} => {
  let images: AboutUsImageItem[] = Array.isArray(data.images)
    ? data.images
        .filter((item) => item?.imageUrl?.trim())
        .map((item, index) => {
          const rawStyle = item.displayStyle || AboutUsImageDisplayStyle.SINGLE;
          const displayStyle =
            rawStyle === "carousel"
              ? AboutUsImageDisplayStyle.COLLAGE
              : rawStyle;

          return {
            imageUrl: item.imageUrl.trim(),
            displayStyle,
            sortOrder:
              typeof item.sortOrder === "number" ? item.sortOrder : index,
          };
        })
        .sort((left, right) => left.sortOrder - right.sortOrder)
    : [];

  if (!images.length && data.imageUrl?.trim()) {
    images = [
      {
        imageUrl: data.imageUrl.trim(),
        displayStyle: AboutUsImageDisplayStyle.SINGLE,
        sortOrder: 0,
      },
    ];
  }

  if (images.length === 1) {
    images[0].displayStyle = images[0].displayStyle || AboutUsImageDisplayStyle.SINGLE;
  }

  return {
    ...data,
    imageUrl: images[0]?.imageUrl || data.imageUrl?.trim() || "",
    imagePosition: data.imagePosition || AboutUsImagePosition.RIGHT,
    images,
  };
};

export const serializeAboutUsRecord = <
  T extends {
    imageUrl?: string | null;
    imagePosition?: string | null;
    images?: AboutUsImageItem[] | null;
  },
>(
  record: T,
) => {
  const normalized = normalizeAboutUsPayload({
    imageUrl: record.imageUrl || undefined,
    imagePosition: record.imagePosition || AboutUsImagePosition.RIGHT,
    images: Array.isArray(record.images) ? record.images : undefined,
  });

  return {
    ...record,
    imageUrl: normalized.imageUrl,
    imagePosition: normalized.imagePosition,
    images: normalized.images,
  };
};
