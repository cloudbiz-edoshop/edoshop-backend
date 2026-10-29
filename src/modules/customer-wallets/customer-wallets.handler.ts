import type { AppRouteHandler } from "@/lib/types";
import { ForbiddenError } from "@/core/errors";
import { successResponse } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { PermissionsService } from "@/modules/permissions/permissions.service";

import { CustomerWalletsService } from "./customer-wallets.service";

const service = new CustomerWalletsService();
const permissionsService = new PermissionsService();

async function requireSuperAdmin(userId: number) {
  const profile = await permissionsService.getUserAccessProfile(userId);
  if (!profile.isSuperAdmin) {
    throw new ForbiddenError("Super Admin access is required");
  }
  return profile;
}

export const getPublicWalletSettings: AppRouteHandler<any> = async (c) => {
  const data = await service.getPublicSettings();
  return c.json(successResponse(data, "Wallet settings"), HttpStatusCodes.OK);
};

export const getAdminWalletSettings: AppRouteHandler<any> = async (c) => {
  const payload = c.get("accessTokenPayload");
  await requireSuperAdmin(payload.userId);
  const data = await service.getAdminSettings();
  return c.json(successResponse(data, "Wallet settings"), HttpStatusCodes.OK);
};

export const patchAdminWalletSettings: AppRouteHandler<any> = async (c) => {
  const payload = c.get("accessTokenPayload");
  await requireSuperAdmin(payload.userId);
  const body = c.req.valid("json");
  const data = await service.updateAdminSettings(body, payload.userId);
  return c.json(successResponse(data, "Wallet settings updated"), HttpStatusCodes.OK);
};

export const getMyWallet: AppRouteHandler<any> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const data = await service.getCustomerWallets(payload.userId);
  return c.json(successResponse(data, "Wallet balances"), HttpStatusCodes.OK);
};

export const getMyWalletTransactions: AppRouteHandler<any> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const query = c.req.valid("query");
  const data = await service.getTransactionHistory(
    payload.userId,
    Number(query.page) || 1,
    Number(query.limit) || 50,
  );
  return c.json(successResponse(data, "Wallet transactions"), HttpStatusCodes.OK);
};

export const createMyDeposit: AppRouteHandler<any> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const body = c.req.valid("json");
  const data = await service.initiateDeposit(payload.userId, body);
  return c.json(successResponse(data, "Deposit initiated"), HttpStatusCodes.CREATED);
};

export const createMyWithdrawal: AppRouteHandler<any> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const body = c.req.valid("json");
  const data = await service.requestWithdrawal(payload.userId, body);
  return c.json(successResponse(data, "Withdrawal requested"), HttpStatusCodes.CREATED);
};

export const syncMyDeposit: AppRouteHandler<any> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const { reference } = c.req.valid("param");
  const data = await service.syncDepositFromCampayReference(reference, payload.userId);
  return c.json(successResponse(data, "Deposit status updated"), HttpStatusCodes.OK);
};

export const listAdminWallets: AppRouteHandler<any> = async (c) => {
  const payload = c.get("accessTokenPayload");
  await requireSuperAdmin(payload.userId);
  const query = c.req.valid("query");
  const data = await service.listAdminWallets(
    query.search,
    Number(query.page) || 1,
    Number(query.limit) || 25,
  );
  return c.json(successResponse(data, "Customer wallets"), HttpStatusCodes.OK);
};

export const manualAdjustWallet: AppRouteHandler<any> = async (c) => {
  const payload = c.get("accessTokenPayload");
  await requireSuperAdmin(payload.userId);
  const body = c.req.valid("json");
  const data = await service.applyManualAdjustment({
    ...body,
    adminUserId: payload.userId,
  });
  return c.json(successResponse(data, "Wallet adjusted"), HttpStatusCodes.OK);
};

export const listWithdrawalRequests: AppRouteHandler<any> = async (c) => {
  const payload = c.get("accessTokenPayload");
  await requireSuperAdmin(payload.userId);
  const data = await service.listPendingWithdrawals();
  return c.json(successResponse(data, "Withdrawal requests"), HttpStatusCodes.OK);
};

export const approveWithdrawal: AppRouteHandler<any> = async (c) => {
  const payload = c.get("accessTokenPayload");
  await requireSuperAdmin(payload.userId);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const data = await service.approveWithdrawal(Number(id), payload.userId, body.adminNote);
  return c.json(successResponse(data, "Withdrawal approved"), HttpStatusCodes.OK);
};

export const rejectWithdrawal: AppRouteHandler<any> = async (c) => {
  const payload = c.get("accessTokenPayload");
  await requireSuperAdmin(payload.userId);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const data = await service.rejectWithdrawal(Number(id), payload.userId, body.adminNote);
  return c.json(successResponse(data, "Withdrawal rejected"), HttpStatusCodes.OK);
};
