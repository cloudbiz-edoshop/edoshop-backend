import { createRoute, z } from "@hono/zod-openapi";

import { EntityType, OperationType } from "@/constants";
import {
  jwtMiddleware,
  rolesAndPermissionsMiddleware,
} from "@/core/middlewares";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import {
  commonErrorResponses,
  jsonContent,
  jsonContentRequired,
} from "@/lib/openapi/helpers";
import { createSuccessResponseSchema, idParams } from "@/lib/openapi/schemas";
import { createSuccessResponseSchemaWithPagination } from "@/lib/openapi/schemas/create-api-response";
import commonQueryParamsSchema from "@/lib/openapi/schemas/query-params-schema";
import { jwtHeaderSchema } from "@/lib/zod-schemas";

import { tvDeviceMiddleware } from "./tv-device.middleware";
import {
  createTvAdRequestSchema,
  createTvDeviceRequestSchema,
  createTvDeviceResponseSchema,
  tvAdResponseSchema,
  tvAuthRefreshRequestSchema,
  tvAuthTokenRequestSchema,
  tvAuthTokenResponseSchema,
  tvCatalogSelectionSchema,
  tvDeviceResponseSchema,
  tvHowItWorksVideoSchema,
  tvMagazineVersionResponseSchema,
  tvSettingsResponseSchema,
  updateTvAdRequestSchema,
  updateTvCatalogRequestSchema,
  updateTvDeviceRequestSchema,
  updateTvSettingsRequestSchema,
} from "./tv-app.schema";

const tags = ["TV App"];

const magazineFeedSchema = z.object({
  magazineVersion: z.number(),
  generatedAt: z.string(),
  invitation: z.object({
    title: z.string(),
    iosUrl: z.string().nullable().optional(),
    androidUrl: z.string().nullable().optional(),
    fallbackUrl: z.string().nullable().optional(),
    qrTargetUrl: z.string().nullable().optional(),
  }),
  stores: z.array(z.object({ id: z.number(), name: z.string() })),
  catalog: z.object({
    mode: z.enum(["all", "selected"]),
    stores: z.array(z.any()),
  }),
  discounts: z.array(z.any()),
  banners: z.array(z.any()),
  ads: z.array(z.any()),
  howItWorksVideos: z.array(tvHowItWorksVideoSchema),
});

const overviewSchema = z.object({
  magazineVersion: z.number(),
  catalogMode: z.enum(["all", "selected"]),
  includeBanners: z.boolean(),
  selectedProductCount: z.number(),
  registeredDeviceCount: z.number(),
  activeAdCount: z.number(),
  updatedAt: z.string(),
});

const catalogResponseSchema = z.object({
  catalogMode: z.enum(["all", "selected"]),
  selections: z.array(tvCatalogSelectionSchema),
});

export const getOverview = createRoute({
  path: "/tv/overview",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TV_APP, operation: OperationType.READ },
    ]),
  ] as const,
  request: { headers: jwtHeaderSchema },
  summary: "Get TV app overview",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(overviewSchema),
      "TV overview",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN],
      z.object({}),
    ),
  },
});

export const getSettings = createRoute({
  path: "/tv/settings",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TV_SETTINGS, operation: OperationType.READ },
    ]),
  ] as const,
  request: { headers: jwtHeaderSchema },
  summary: "Get TV settings",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(tvSettingsResponseSchema),
      "TV settings",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN],
      z.object({}),
    ),
  },
});

export const patchSettings = createRoute({
  path: "/tv/settings",
  method: "patch",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TV_SETTINGS, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(updateTvSettingsRequestSchema, "TV settings"),
  },
  summary: "Update TV settings",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(tvSettingsResponseSchema),
      "Updated TV settings",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN],
      z.object({}),
    ),
  },
});

export const listAds = createRoute({
  path: "/tv/ads",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TV_ADS, operation: OperationType.READ },
    ]),
  ] as const,
  request: { headers: jwtHeaderSchema, query: commonQueryParamsSchema },
  summary: "List TV ads",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(z.array(tvAdResponseSchema)),
      "TV ads",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN],
      commonQueryParamsSchema,
    ),
  },
});

export const createAd = createRoute({
  path: "/tv/ads",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TV_ADS, operation: OperationType.CREATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(createTvAdRequestSchema, "TV ad"),
  },
  summary: "Create TV ad",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(tvAdResponseSchema),
      "Created TV ad",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN],
      z.object({}),
    ),
  },
});

export const getAd = createRoute({
  path: "/tv/ads/{id}",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TV_ADS, operation: OperationType.READ },
    ]),
  ] as const,
  request: { headers: jwtHeaderSchema, params: idParams },
  summary: "Get TV ad",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(tvAdResponseSchema),
      "TV ad",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.NOT_FOUND],
      idParams,
    ),
  },
});

export const patchAd = createRoute({
  path: "/tv/ads/{id}",
  method: "patch",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TV_ADS, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(updateTvAdRequestSchema, "TV ad"),
  },
  summary: "Update TV ad",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(tvAdResponseSchema),
      "Updated TV ad",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.NOT_FOUND],
      idParams,
    ),
  },
});

export const deleteAds = createRoute({
  path: "/tv/ads",
  method: "delete",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TV_ADS, operation: OperationType.DELETE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(z.object({ ids: z.array(z.number()) }), "TV ad IDs"),
  },
  summary: "Delete TV ads",
  responses: {
    [HttpStatusCodes.NO_CONTENT]: { description: "TV ads deleted" },
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN],
      z.object({}),
    ),
  },
});

export const listDevices = createRoute({
  path: "/tv/devices",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TV_DEVICES, operation: OperationType.READ },
    ]),
  ] as const,
  request: { headers: jwtHeaderSchema, query: commonQueryParamsSchema },
  summary: "List TV devices",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchemaWithPagination(z.array(tvDeviceResponseSchema)),
      "TV devices",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN],
      commonQueryParamsSchema,
    ),
  },
});

export const registerDevice = createRoute({
  path: "/tv/devices",
  method: "post",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TV_DEVICES, operation: OperationType.CREATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(createTvDeviceRequestSchema, "TV device"),
  },
  summary: "Register TV device",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(createTvDeviceResponseSchema),
      "Registered TV device",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.CONFLICT],
      z.object({}),
    ),
  },
});

export const patchDevice = createRoute({
  path: "/tv/devices/{id}",
  method: "patch",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TV_DEVICES, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContentRequired(updateTvDeviceRequestSchema, "TV device"),
  },
  summary: "Update TV device",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(tvDeviceResponseSchema),
      "Updated TV device",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.NOT_FOUND],
      idParams,
    ),
  },
});

export const getCatalog = createRoute({
  path: "/tv/catalog",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TV_CATALOG, operation: OperationType.READ },
    ]),
  ] as const,
  request: { headers: jwtHeaderSchema },
  summary: "Get TV catalog selection",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(catalogResponseSchema),
      "TV catalog",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN],
      z.object({}),
    ),
  },
});

export const updateCatalog = createRoute({
  path: "/tv/catalog",
  method: "put",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TV_CATALOG, operation: OperationType.UPDATE },
    ]),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(updateTvCatalogRequestSchema, "TV catalog"),
  },
  summary: "Update TV catalog selection",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(catalogResponseSchema),
      "Updated TV catalog",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN],
      z.object({}),
    ),
  },
});

export const listVideos = createRoute({
  path: "/tv/how-it-works-videos",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware([
      { entity: EntityType.TV_APP, operation: OperationType.READ },
    ]),
  ] as const,
  request: { headers: jwtHeaderSchema },
  summary: "List How EDOSHOP Works videos",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(z.array(tvHowItWorksVideoSchema)),
      "How-it-works videos",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN],
      z.object({}),
    ),
  },
});

export const authToken = createRoute({
  path: "/tv/auth/token",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(tvAuthTokenRequestSchema, "TV device credentials"),
  },
  summary: "Authenticate TV device",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(tvAuthTokenResponseSchema),
      "TV device tokens",
    ),
    ...commonErrorResponses([HttpStatusCodes.UNAUTHORIZED], z.object({})),
  },
});

export const authRefresh = createRoute({
  path: "/tv/auth/refresh",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(tvAuthRefreshRequestSchema, "TV refresh token"),
  },
  summary: "Refresh TV device token",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(tvAuthTokenResponseSchema),
      "Refreshed TV device tokens",
    ),
    ...commonErrorResponses([HttpStatusCodes.UNAUTHORIZED], z.object({})),
  },
});

export const getMagazineVersion = createRoute({
  path: "/tv/magazine/version",
  method: "get",
  tags,
  middleware: [tvDeviceMiddleware()] as const,
  summary: "Get magazine version for TV device",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(tvMagazineVersionResponseSchema),
      "Magazine version",
    ),
    ...commonErrorResponses([HttpStatusCodes.UNAUTHORIZED], z.object({})),
  },
});

export const getMagazineFeed = createRoute({
  path: "/tv/magazine/feed",
  method: "get",
  tags,
  middleware: [tvDeviceMiddleware()] as const,
  summary: "Get consolidated magazine feed for TV device",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(magazineFeedSchema),
      "Magazine feed",
    ),
    ...commonErrorResponses([HttpStatusCodes.UNAUTHORIZED], z.object({})),
  },
});

export type GetOverviewRoute = typeof getOverview;
export type GetSettingsRoute = typeof getSettings;
export type PatchSettingsRoute = typeof patchSettings;
export type ListAdsRoute = typeof listAds;
export type CreateAdRoute = typeof createAd;
export type GetAdRoute = typeof getAd;
export type PatchAdRoute = typeof patchAd;
export type DeleteAdsRoute = typeof deleteAds;
export type ListDevicesRoute = typeof listDevices;
export type RegisterDeviceRoute = typeof registerDevice;
export type PatchDeviceRoute = typeof patchDevice;
export type GetCatalogRoute = typeof getCatalog;
export type UpdateCatalogRoute = typeof updateCatalog;
export type ListVideosRoute = typeof listVideos;
export type AuthTokenRoute = typeof authToken;
export type AuthRefreshRoute = typeof authRefresh;
export type GetMagazineVersionRoute = typeof getMagazineVersion;
export type GetMagazineFeedRoute = typeof getMagazineFeed;
