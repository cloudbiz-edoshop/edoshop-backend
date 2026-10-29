import { createRoute, z } from "@hono/zod-openapi";

import { jwtMiddleware } from "@/core/middlewares";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import {
  commonErrorResponses,
  jsonContent,
  jsonContentRequired,
} from "@/lib/openapi/helpers";
import { createSuccessResponseSchema, idParams } from "@/lib/openapi/schemas";
import commonQueryParamsSchema from "@/lib/openapi/schemas/query-params-schema";
import { jwtHeaderSchema } from "@/lib/zod-schemas";

import {
  createWalletDepositSchema,
  createWalletWithdrawalSchema,
  manualWalletAdjustmentSchema,
  publicWalletSettingsSchema,
  reviewWithdrawalSchema,
  updateWalletSettingsSchema,
  walletBalancesResponseSchema,
  walletSettingsResponseSchema,
} from "./customer-wallets.schema";

const tags = ["Customer Wallets"];

export const getPublicWalletSettingsRoute = createRoute({
  path: "/public/wallet-settings",
  method: "get",
  tags,
  summary: "Public customer wallet feature flags",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(publicWalletSettingsSchema),
    ),
  },
});

export const getAdminSettingsRoute = createRoute({
  path: "/customer-wallets/settings",
  method: "get",
  tags,
  middleware: [jwtMiddleware()],
  request: { headers: jwtHeaderSchema },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(walletSettingsResponseSchema),
    ),
    ...commonErrorResponses([HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN]),
  },
});

export const patchAdminSettingsRoute = createRoute({
  path: "/customer-wallets/settings",
  method: "patch",
  tags,
  middleware: [jwtMiddleware()],
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(updateWalletSettingsSchema, "Wallet settings"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(walletSettingsResponseSchema),
    ),
    ...commonErrorResponses([
      HttpStatusCodes.UNAUTHORIZED,
      HttpStatusCodes.FORBIDDEN,
      HttpStatusCodes.UNPROCESSABLE_ENTITY,
    ]),
  },
});

export const getMyWalletRoute = createRoute({
  path: "/wallets/me",
  method: "get",
  tags,
  middleware: [jwtMiddleware()],
  request: { headers: jwtHeaderSchema },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(walletBalancesResponseSchema),
    ),
    ...commonErrorResponses([HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN]),
  },
});

export const getMyTransactionsRoute = createRoute({
  path: "/wallets/me/transactions",
  method: "get",
  tags,
  middleware: [jwtMiddleware()],
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema.pick({ page: true, limit: true }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(createSuccessResponseSchema(z.object({}))),
    ...commonErrorResponses([HttpStatusCodes.UNAUTHORIZED]),
  },
});

export const createDepositRoute = createRoute({
  path: "/wallets/me/deposits",
  method: "post",
  tags,
  middleware: [jwtMiddleware()],
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(createWalletDepositSchema, "Wallet deposit"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(createSuccessResponseSchema(z.object({}))),
    ...commonErrorResponses([
      HttpStatusCodes.UNAUTHORIZED,
      HttpStatusCodes.FORBIDDEN,
      HttpStatusCodes.UNPROCESSABLE_ENTITY,
    ]),
  },
});

export const createWithdrawalRoute = createRoute({
  path: "/wallets/me/withdrawals",
  method: "post",
  tags,
  middleware: [jwtMiddleware()],
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(createWalletWithdrawalSchema, "Wallet withdrawal"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(createSuccessResponseSchema(z.object({}))),
    ...commonErrorResponses([
      HttpStatusCodes.UNAUTHORIZED,
      HttpStatusCodes.FORBIDDEN,
      HttpStatusCodes.UNPROCESSABLE_ENTITY,
    ]),
  },
});

export const syncDepositRoute = createRoute({
  path: "/wallets/me/deposits/{reference}/sync",
  method: "post",
  tags,
  middleware: [jwtMiddleware()],
  request: {
    headers: jwtHeaderSchema,
    params: z.object({ reference: z.string().min(1) }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(createSuccessResponseSchema(z.object({}))),
    ...commonErrorResponses([HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.NOT_FOUND]),
  },
});

export const listAdminWalletsRoute = createRoute({
  path: "/customer-wallets/balances",
  method: "get",
  tags,
  middleware: [jwtMiddleware()],
  request: {
    headers: jwtHeaderSchema,
    query: commonQueryParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(createSuccessResponseSchema(z.object({}))),
    ...commonErrorResponses([HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN]),
  },
});

export const manualAdjustRoute = createRoute({
  path: "/customer-wallets/adjustments",
  method: "post",
  tags,
  middleware: [jwtMiddleware()],
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(manualWalletAdjustmentSchema, "Manual adjustment"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(createSuccessResponseSchema(z.object({}))),
    ...commonErrorResponses([
      HttpStatusCodes.UNAUTHORIZED,
      HttpStatusCodes.FORBIDDEN,
      HttpStatusCodes.UNPROCESSABLE_ENTITY,
    ]),
  },
});

export const listWithdrawalsRoute = createRoute({
  path: "/customer-wallets/withdrawals",
  method: "get",
  tags,
  middleware: [jwtMiddleware()],
  request: { headers: jwtHeaderSchema },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(createSuccessResponseSchema(z.array(z.object({})))),
    ...commonErrorResponses([HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN]),
  },
});

export const approveWithdrawalRoute = createRoute({
  path: "/customer-wallets/withdrawals/{id}/approve",
  method: "post",
  tags,
  middleware: [jwtMiddleware()],
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContent(reviewWithdrawalSchema, "Review note"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(createSuccessResponseSchema(z.object({}))),
    ...commonErrorResponses([HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN]),
  },
});

export const rejectWithdrawalRoute = createRoute({
  path: "/customer-wallets/withdrawals/{id}/reject",
  method: "post",
  tags,
  middleware: [jwtMiddleware()],
  request: {
    headers: jwtHeaderSchema,
    params: idParams,
    body: jsonContent(reviewWithdrawalSchema, "Review note"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(createSuccessResponseSchema(z.object({}))),
    ...commonErrorResponses([HttpStatusCodes.UNAUTHORIZED, HttpStatusCodes.FORBIDDEN]),
  },
});
