import type {
  AuthRefreshRoute,
  AuthTokenRoute,
  CreateAdRoute,
  DeleteAdsRoute,
  GetAdRoute,
  GetCatalogRoute,
  GetMagazineFeedRoute,
  GetMagazineVersionRoute,
  GetOverviewRoute,
  GetSettingsRoute,
  ListAdsRoute,
  ListDevicesRoute,
  ListVideosRoute,
  PatchAdRoute,
  PatchDeviceRoute,
  PatchSettingsRoute,
  RegisterDeviceRoute,
  UpdateCatalogRoute,
} from "./tv-app.route";

import type { AppRouteHandler } from "@/lib/types";
import { successResponse, successResponseWithPagination } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { tvAppAuthService } from "./tv-app.auth.service";
import { tvAppService } from "./tv-app.service";

export const getOverview: AppRouteHandler<GetOverviewRoute> = async (c) => {
  const data = await tvAppService.getOverview();
  return c.json(successResponse(data, "TV overview retrieved successfully"), HttpStatusCodes.OK);
};

export const getSettings: AppRouteHandler<GetSettingsRoute> = async (c) => {
  const data = await tvAppService.getSettings();
  return c.json(successResponse(data, "TV settings retrieved successfully"), HttpStatusCodes.OK);
};

export const patchSettings: AppRouteHandler<PatchSettingsRoute> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const data = await tvAppService.updateSettings(c.req.valid("json"), payload.userId);
  return c.json(successResponse(data, "TV settings updated successfully"), HttpStatusCodes.OK);
};

export const listAds: AppRouteHandler<ListAdsRoute> = async (c) => {
  const { page, limit } = c.req.valid("query");
  const result = await tvAppService.listAds({ page, limit });
  return c.json(
    successResponseWithPagination(
      result.data,
      createPagination(result.total, page, limit),
      result.searchableFields,
      "TV ads retrieved successfully",
    ),
    HttpStatusCodes.OK,
  );
};

export const createAd: AppRouteHandler<CreateAdRoute> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const data = await tvAppService.createAd(c.req.valid("json"), payload.userId);
  return c.json(successResponse(data, "TV ad created successfully"), HttpStatusCodes.OK);
};

export const getAd: AppRouteHandler<GetAdRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const data = await tvAppService.getAdById(id);
  return c.json(successResponse(data, "TV ad retrieved successfully"), HttpStatusCodes.OK);
};

export const patchAd: AppRouteHandler<PatchAdRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const payload = c.get("accessTokenPayload");
  const data = await tvAppService.updateAd(id, c.req.valid("json"), payload.userId);
  return c.json(successResponse(data, "TV ad updated successfully"), HttpStatusCodes.OK);
};

export const deleteAds: AppRouteHandler<DeleteAdsRoute> = async (c) => {
  const { ids } = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  await tvAppService.deleteAds(ids, payload.userId);
  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const listDevices: AppRouteHandler<ListDevicesRoute> = async (c) => {
  const { page, limit } = c.req.valid("query");
  const result = await tvAppService.listDevices({ page, limit });
  return c.json(
    successResponseWithPagination(
      result.data,
      createPagination(result.total, page, limit),
      result.searchableFields,
      "TV devices retrieved successfully",
    ),
    HttpStatusCodes.OK,
  );
};

export const registerDevice: AppRouteHandler<RegisterDeviceRoute> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const data = await tvAppService.createDevice(c.req.valid("json"), payload.userId);
  return c.json(successResponse(data, "TV device registered successfully"), HttpStatusCodes.OK);
};

export const patchDevice: AppRouteHandler<PatchDeviceRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const payload = c.get("accessTokenPayload");
  const data = await tvAppService.updateDevice(id, c.req.valid("json"), payload.userId);
  return c.json(successResponse(data, "TV device updated successfully"), HttpStatusCodes.OK);
};

export const getCatalog: AppRouteHandler<GetCatalogRoute> = async (c) => {
  const data = await tvAppService.getCatalog();
  return c.json(successResponse(data, "TV catalog retrieved successfully"), HttpStatusCodes.OK);
};

export const updateCatalog: AppRouteHandler<UpdateCatalogRoute> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const data = await tvAppService.updateCatalog(c.req.valid("json"), payload.userId);
  return c.json(successResponse(data, "TV catalog updated successfully"), HttpStatusCodes.OK);
};

export const listVideos: AppRouteHandler<ListVideosRoute> = async (c) => {
  const data = tvAppService.getHowItWorksVideos();
  return c.json(successResponse(data, "How-it-works videos retrieved successfully"), HttpStatusCodes.OK);
};

export const authToken: AppRouteHandler<AuthTokenRoute> = async (c) => {
  const { deviceKey, deviceSecret } = c.req.valid("json");
  const data = await tvAppAuthService.authenticateDevice(deviceKey, deviceSecret);
  return c.json(successResponse(data, "TV device authenticated successfully"), HttpStatusCodes.OK);
};

export const authRefresh: AppRouteHandler<AuthRefreshRoute> = async (c) => {
  const { refreshToken } = c.req.valid("json");
  const data = await tvAppAuthService.refreshAccessToken(refreshToken);
  return c.json(successResponse(data, "TV device token refreshed successfully"), HttpStatusCodes.OK);
};

export const getMagazineVersion: AppRouteHandler<GetMagazineVersionRoute> = async (c) => {
  const data = await tvAppService.getMagazineVersion();
  return c.json(successResponse(data, "Magazine version retrieved successfully"), HttpStatusCodes.OK);
};

export const getMagazineFeed: AppRouteHandler<GetMagazineFeedRoute> = async (c) => {
  const data = await tvAppService.buildMagazineFeed();
  return c.json(successResponse(data, "Magazine feed retrieved successfully"), HttpStatusCodes.OK);
};
