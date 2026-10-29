import { z } from "@hono/zod-openapi";

export const walletSettingsResponseSchema = z.object({
  walletEnabled: z.boolean(),
  depositsEnabled: z.boolean(),
  withdrawalsEnabled: z.boolean(),
  withdrawalFeePercent: z.string(),
  withdrawalFeeMinXaf: z.string(),
  minWithdrawalXaf: z.string(),
  maxWithdrawalXaf: z.string(),
  withdrawalRequiresApproval: z.boolean(),
  updatedAt: z.string().optional(),
});

export const updateWalletSettingsSchema = z.object({
  walletEnabled: z.boolean().optional(),
  depositsEnabled: z.boolean().optional(),
  withdrawalsEnabled: z.boolean().optional(),
  withdrawalFeePercent: z.union([z.string(), z.number()]).optional(),
  withdrawalFeeMinXaf: z.union([z.string(), z.number()]).optional(),
  minWithdrawalXaf: z.union([z.string(), z.number()]).optional(),
  maxWithdrawalXaf: z.union([z.string(), z.number()]).optional(),
  withdrawalRequiresApproval: z.boolean().optional(),
});

export const walletBalancesResponseSchema = z.object({
  wallets: z.array(
    z.object({
      currency: z.string(),
      availableBalance: z.string(),
      reservedBalance: z.string(),
      spendableBalance: z.number(),
    }),
  ),
});

export const createWalletDepositSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(["xaf", "eur", "usd"]).optional(),
  paymentMethodId: z.number().int().positive(),
  phoneNumber: z.string().optional(),
});

export const createWalletWithdrawalSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(["xaf", "eur", "usd"]).optional(),
  note: z.string().max(500).optional(),
});

export const manualWalletAdjustmentSchema = z.object({
  customerId: z.number().int().positive(),
  amount: z.number().positive(),
  direction: z.enum(["credit", "debit"]),
  currency: z.enum(["xaf", "eur", "usd"]).optional(),
  reason: z.string().min(3).max(500),
});

export const reviewWithdrawalSchema = z.object({
  adminNote: z.string().max(500).optional(),
});

export const publicWalletSettingsSchema = z.object({
  walletEnabled: z.boolean(),
  depositsEnabled: z.boolean(),
  withdrawalsEnabled: z.boolean(),
  withdrawalFeePercent: z.string(),
  withdrawalFeeMinXaf: z.string(),
  minWithdrawalXaf: z.string(),
  maxWithdrawalXaf: z.string(),
  withdrawalRequiresApproval: z.boolean(),
});
