export const WALLET_CURRENCIES = ["XAF", "EUR", "USD"] as const;
export type WalletCurrency = (typeof WALLET_CURRENCIES)[number];

export const WalletTransactionType = {
  DEPOSIT: "deposit",
  PURCHASE: "purchase",
  WITHDRAWAL_RESERVE: "withdrawal_reserve",
  WITHDRAWAL_RELEASE: "withdrawal_release",
  WITHDRAWAL_PAYOUT: "withdrawal_payout",
  MANUAL_CREDIT: "manual_credit",
  MANUAL_DEBIT: "manual_debit",
  REFUND: "refund",
} as const;

export const WalletWithdrawalStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  PAID: "paid",
} as const;

export const WalletDepositStatus = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const normalizeWalletCurrency = (value?: string | null): WalletCurrency => {
  const code = String(value || "XAF").trim().toUpperCase();
  if (code === "EUR" || code === "USD") return code;
  return "XAF";
};

export const toMoney = (value: number | string) =>
  Number(Number(value).toFixed(2));
