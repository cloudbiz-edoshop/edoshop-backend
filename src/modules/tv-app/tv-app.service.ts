import { randomBytes } from "node:crypto";

import { ConflictError, NotFoundError } from "@/core/errors";

import {
  buildStorefrontAssetUrl,
  EDOSHOP_HOW_IT_WORKS_VIDEOS,
} from "./tv-app.constants";
import { tvAppMagazineService } from "./tv-app.magazine.service";
import { tvAppRepository } from "./tv-app.repository";
import type {
  CreateTvAdRequest,
  CreateTvDeviceRequest,
  UpdateTvAdRequest,
  UpdateTvCatalogRequest,
  UpdateTvDeviceRequest,
  UpdateTvSettingsRequest,
} from "./tv-app.schema";

const mapSettings = (row: NonNullable<Awaited<ReturnType<typeof tvAppRepository.getSettings>>>) => ({
  id: row.id,
  magazineVersion: row.magazineVersion ?? 1,
  invitationTitle: row.invitationTitle,
  iosUrl: row.iosUrl,
  androidUrl: row.androidUrl,
  fallbackUrl: row.fallbackUrl,
  qrTargetUrl: row.qrTargetUrl,
  catalogMode: row.catalogMode as "all" | "selected",
  includeBanners: row.includeBanners ?? true,
  updatedAt: row.updatedAt,
});

const mapAd = (row: NonNullable<Awaited<ReturnType<typeof tvAppRepository.findAdById>>>) => ({
  id: row.id,
  title: row.title,
  subtitle: row.subtitle,
  mediaType: row.mediaType as "image" | "video",
  mediaUrl: row.mediaUrl,
  isActive: row.isActive ?? true,
  displayOrder: row.displayOrder ?? 0,
  displayDurationMs: row.displayDurationMs ?? 8000,
  isPermanent: row.isPermanent ?? false,
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const mapDevice = (
  row: NonNullable<Awaited<ReturnType<typeof tvAppRepository.findDeviceById>>>,
) => ({
  id: row.id,
  name: row.name,
  deviceKey: row.deviceKey,
  isActive: row.isActive ?? true,
  lastSeenAt: row.lastSeenAt,
  registeredAt: row.registeredAt,
  revokedAt: row.revokedAt,
  createdAt: row.createdAt,
});

export class TvAppService {
  async getSettings() {
    const settings = await tvAppRepository.ensureSettings();
    return mapSettings(settings);
  }

  async updateSettings(data: UpdateTvSettingsRequest, updatedBy: number) {
    const updated = await tvAppRepository.updateSettings({
      ...data,
      updatedBy,
    });
    await tvAppRepository.bumpMagazineVersion(updatedBy);
    return mapSettings(updated);
  }

  async listAds(params: { page: number; limit: number }) {
    const result = await tvAppRepository.listAds(params);
    return {
      data: result.data.map(mapAd),
      total: result.total,
      searchableFields: ["title", "subtitle"],
    };
  }

  async getAdById(id: number) {
    const ad = await tvAppRepository.findAdById(id);
    if (!ad) throw new NotFoundError("TV ad not found");
    return mapAd(ad);
  }

  async createAd(data: CreateTvAdRequest, actorId: number) {
    const created = await tvAppRepository.createAd({
      ...data,
      createdBy: actorId,
      updatedBy: actorId,
    });
    await tvAppRepository.bumpMagazineVersion(actorId);
    return mapAd(created);
  }

  async updateAd(id: number, data: UpdateTvAdRequest, actorId: number) {
    const updated = await tvAppRepository.updateAd(id, {
      ...data,
      updatedBy: actorId,
    });
    if (!updated) throw new NotFoundError("TV ad not found");
    await tvAppRepository.bumpMagazineVersion(actorId);
    return mapAd(updated);
  }

  async deleteAds(ids: number[], actorId: number) {
    await tvAppRepository.softDeleteAds(ids, actorId);
    await tvAppRepository.bumpMagazineVersion(actorId);
  }

  async listDevices(params: { page: number; limit: number }) {
    const result = await tvAppRepository.listDevices(params);
    return {
      data: result.data.map(mapDevice),
      total: result.total,
      searchableFields: ["name", "deviceKey"],
    };
  }

  async createDevice(data: CreateTvDeviceRequest, actorId: number) {
    const deviceKey = data.deviceKey || `tv-${randomBytes(8).toString("hex")}`;
    const existing = await tvAppRepository.findDeviceByKey(deviceKey);
    if (existing) {
      throw new ConflictError("Device key already exists");
    }

    const deviceSecret = tvAppRepository.generateDeviceSecret();
    const secretHash = await tvAppRepository.hashDeviceSecret(deviceSecret);
    const created = await tvAppRepository.createDevice({
      name: data.name,
      deviceKey,
      secretHash,
      isActive: true,
      createdBy: actorId,
      updatedBy: actorId,
    });

    return {
      ...mapDevice(created),
      deviceSecret,
    };
  }

  async updateDevice(id: number, data: UpdateTvDeviceRequest, actorId: number) {
    const payload: Record<string, unknown> = { ...data, updatedBy: actorId };
    if (data.isActive === false) {
      payload.revokedAt = new Date().toISOString();
    }
    if (data.isActive === true) {
      payload.revokedAt = null;
    }

    const updated = await tvAppRepository.updateDevice(id, payload);
    if (!updated) throw new NotFoundError("TV device not found");
    return mapDevice(updated);
  }

  async getCatalog() {
    const settings = await tvAppRepository.ensureSettings();
    const selections = await tvAppRepository.listCatalogSelections();
    return {
      catalogMode: (settings.catalogMode || "all") as "all" | "selected",
      selections,
    };
  }

  async updateCatalog(data: UpdateTvCatalogRequest, actorId: number) {
    await tvAppRepository.updateSettings({
      catalogMode: data.catalogMode,
      updatedBy: actorId,
    });
    if (data.catalogMode === "selected") {
      await tvAppRepository.replaceCatalogSelections(data.productIds, actorId);
    } else {
      await tvAppRepository.replaceCatalogSelections([], actorId);
    }
    await tvAppRepository.bumpMagazineVersion(actorId);
    return this.getCatalog();
  }

  getHowItWorksVideos() {
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

  getMagazineVersion() {
    return tvAppMagazineService.getMagazineVersion();
  }

  buildMagazineFeed() {
    return tvAppMagazineService.buildMagazineFeed();
  }

  getOverview() {
    return tvAppMagazineService.getOverview();
  }
}

export const tvAppService = new TvAppService();
