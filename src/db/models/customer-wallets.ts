import type { z } from "zod";

import {
  boolean,
  decimal,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { customers } from "./customers";
import { orders } from "./orders";
import { paymentMethods } from "./payment-methods";
import { users } from "./users";

export const customerWalletSettings = pgTable("customer_wallet_settings", {
  id: serial().primaryKey(),
  walletEnabled: boolean("wallet_enabled").notNull().default(false),
  depositsEnabled: boolean("deposits_enabled").notNull().default(true),
  withdrawalsEnabled: boolean("withdrawals_enabled").notNull().default(false),
  withdrawalFeePercent: decimal("withdrawal_fee_percent", {
    precision: 5,
    scale: 2,
  })
    .notNull()
    .default("2"),
  withdrawalFeeMinXaf: decimal("withdrawal_fee_min_xaf", {
    precision: 12,
    scale: 2,
  })
    .notNull()
    .default("500"),
  minWithdrawalXaf: decimal("min_withdrawal_xaf", { precision: 12, scale: 2 })
    .notNull()
    .default("1000"),
  maxWithdrawalXaf: decimal("max_withdrawal_xaf", { precision: 12, scale: 2 })
    .notNull()
    .default("5000000"),
  withdrawalRequiresApproval: boolean("withdrawal_requires_approval")
    .notNull()
    .default(true),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
});

export const customerWallets = pgTable(
  "customer_wallets",
  {
    id: serial().primaryKey(),
    customerId: integer("customer_id")
      .references(() => customers.id)
      .notNull(),
    currency: varchar({ length: 3 }).notNull(),
    availableBalance: decimal("available_balance", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    reservedBalance: decimal("reserved_balance", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.customerId, table.currency)],
);

export const customerWalletDeposits = pgTable("customer_wallet_deposits", {
  id: serial().primaryKey(),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  amount: decimal({ precision: 14, scale: 2 }).notNull(),
  currency: varchar({ length: 3 }).notNull().default("XAF"),
  paymentMethodId: integer("payment_method_id").references(() => paymentMethods.id),
  paymentStatus: varchar("payment_status", { length: 32 }).notNull().default("pending"),
  transactionReference: varchar("transaction_reference", { length: 100 }),
  creditedAt: timestamp("credited_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export const customerWalletWithdrawals = pgTable("customer_wallet_withdrawals", {
  id: serial().primaryKey(),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  amount: decimal({ precision: 14, scale: 2 }).notNull(),
  feeAmount: decimal("fee_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  netAmount: decimal("net_amount", { precision: 14, scale: 2 }).notNull(),
  currency: varchar({ length: 3 }).notNull().default("XAF"),
  status: varchar({ length: 32 }).notNull().default("pending"),
  customerNote: text("customer_note"),
  adminNote: text("admin_note"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { mode: "string" }),
  paidAt: timestamp("paid_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export const customerWalletTransactions = pgTable("customer_wallet_transactions", {
  id: serial().primaryKey(),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  walletId: integer("wallet_id")
    .references(() => customerWallets.id)
    .notNull(),
  transactionType: varchar("transaction_type", { length: 32 }).notNull(),
  amount: decimal({ precision: 14, scale: 2 }).notNull(),
  currency: varchar({ length: 3 }).notNull(),
  availableBalanceAfter: decimal("available_balance_after", {
    precision: 14,
    scale: 2,
  }).notNull(),
  reservedBalanceAfter: decimal("reserved_balance_after", {
    precision: 14,
    scale: 2,
  }).notNull(),
  reference: varchar({ length: 100 }),
  reason: text(),
  orderId: integer("order_id").references(() => orders.id),
  depositId: integer("deposit_id").references(() => customerWalletDeposits.id),
  withdrawalId: integer("withdrawal_id").references(() => customerWalletWithdrawals.id),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const customerWalletSettingsSchema = createSelectSchema(customerWalletSettings);
export type CustomerWalletSettings = z.infer<typeof customerWalletSettingsSchema>;

export const customerWalletSchema = createSelectSchema(customerWallets);
export type CustomerWallet = z.infer<typeof customerWalletSchema>;

export const insertCustomerWalletSchema = createInsertSchema(customerWallets);

export default customerWalletSettings;
