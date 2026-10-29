import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import db from "@/db";
import {
  customerWalletDeposits,
  customerWalletSettings,
  customerWalletTransactions,
  customerWalletWithdrawals,
  customerWallets,
  customers,
} from "@/db/models";
import { users } from "@/db/models/users";

import {
  normalizeWalletCurrency,
  toMoney,
  WalletDepositStatus,
  WalletTransactionType,
  WalletWithdrawalStatus,
  type WalletCurrency,
} from "./customer-wallets.constants";

export class CustomerWalletsRepository {
  async ensureSettings() {
    const [row] = await db.select().from(customerWalletSettings).limit(1);
    if (row) return row;
    const [created] = await db
      .insert(customerWalletSettings)
      .values({})
      .returning();
    return created;
  }

  async updateSettings(
    values: Partial<typeof customerWalletSettings.$inferInsert>,
    updatedBy: number,
  ) {
    const current = await this.ensureSettings();
    const [row] = await db
      .update(customerWalletSettings)
      .set({ ...values, updatedBy, updatedAt: sql`now()` })
      .where(eq(customerWalletSettings.id, current.id))
      .returning();
    return row;
  }

  async findCustomerByUserId(userId: number) {
    const [row] = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, userId))
      .limit(1);
    return row ?? null;
  }

  async getWalletsForCustomer(customerId: number) {
    return db
      .select()
      .from(customerWallets)
      .where(eq(customerWallets.customerId, customerId));
  }

  async ensureWallet(customerId: number, currency: WalletCurrency) {
    const [existing] = await db
      .select()
      .from(customerWallets)
      .where(
        and(
          eq(customerWallets.customerId, customerId),
          eq(customerWallets.currency, currency),
        ),
      )
      .limit(1);
    if (existing) return existing;
    const [created] = await db
      .insert(customerWallets)
      .values({ customerId, currency })
      .returning();
    return created;
  }

  async listTransactions(customerId: number, limit = 50, page = 1) {
    const offset = (page - 1) * limit;
    return db
      .select()
      .from(customerWalletTransactions)
      .where(eq(customerWalletTransactions.customerId, customerId))
      .orderBy(desc(customerWalletTransactions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async listAdminWallets(params: {
    search?: string;
    page: number;
    limit: number;
  }) {
    const { search, page, limit } = params;
    const offset = (page - 1) * limit;
    const searchFilter = search?.trim()
      ? or(
          ilike(users.fullName, `%${search.trim()}%`),
          ilike(users.email, `%${search.trim()}%`),
          ilike(customers.customerCode, `%${search.trim()}%`),
        )
      : undefined;

    const baseQuery = db
      .select({
        customerId: customers.id,
        customerCode: customers.customerCode,
        fullName: users.fullName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        currency: customerWallets.currency,
        availableBalance: customerWallets.availableBalance,
        reservedBalance: customerWallets.reservedBalance,
      })
      .from(customerWallets)
      .innerJoin(customers, eq(customers.id, customerWallets.customerId))
      .innerJoin(users, eq(users.id, customers.userId));

    if (searchFilter) {
      return baseQuery.where(searchFilter).limit(limit).offset(offset);
    }
    return baseQuery.limit(limit).offset(offset);
  }

  async insertLedgerEntry(
    tx: typeof db,
    entry: typeof customerWalletTransactions.$inferInsert,
  ) {
    const [row] = await tx
      .insert(customerWalletTransactions)
      .values(entry)
      .returning();
    return row;
  }

  async updateWalletBalances(
    tx: typeof db,
    walletId: number,
    availableBalance: number,
    reservedBalance: number,
  ) {
    const [row] = await tx
      .update(customerWallets)
      .set({
        availableBalance: String(toMoney(availableBalance)),
        reservedBalance: String(toMoney(reservedBalance)),
        updatedAt: sql`now()`,
      })
      .where(eq(customerWallets.id, walletId))
      .returning();
    return row;
  }

  async createDeposit(
    values: typeof customerWalletDeposits.$inferInsert,
  ) {
    const [row] = await db
      .insert(customerWalletDeposits)
      .values(values)
      .returning();
    return row;
  }

  async findDepositById(id: number) {
    const [row] = await db
      .select()
      .from(customerWalletDeposits)
      .where(eq(customerWalletDeposits.id, id))
      .limit(1);
    return row ?? null;
  }

  async markDepositCompleted(depositId: number, reference: string) {
    const [row] = await db
      .update(customerWalletDeposits)
      .set({
        paymentStatus: WalletDepositStatus.COMPLETED,
        transactionReference: reference,
        creditedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(eq(customerWalletDeposits.id, depositId))
      .returning();
    return row;
  }

  async createWithdrawal(
    values: typeof customerWalletWithdrawals.$inferInsert,
  ) {
    const [row] = await db
      .insert(customerWalletWithdrawals)
      .values(values)
      .returning();
    return row;
  }

  async findWithdrawalById(id: number) {
    const [row] = await db
      .select()
      .from(customerWalletWithdrawals)
      .where(eq(customerWalletWithdrawals.id, id))
      .limit(1);
    return row ?? null;
  }

  async listPendingWithdrawals() {
    return db
      .select()
      .from(customerWalletWithdrawals)
      .where(eq(customerWalletWithdrawals.status, WalletWithdrawalStatus.PENDING))
      .orderBy(desc(customerWalletWithdrawals.createdAt));
  }

  async updateWithdrawal(
    id: number,
    values: Partial<typeof customerWalletWithdrawals.$inferInsert>,
  ) {
    const [row] = await db
      .update(customerWalletWithdrawals)
      .set({ ...values, updatedAt: sql`now()` })
      .where(eq(customerWalletWithdrawals.id, id))
      .returning();
    return row;
  }
}

export { normalizeWalletCurrency, toMoney };
