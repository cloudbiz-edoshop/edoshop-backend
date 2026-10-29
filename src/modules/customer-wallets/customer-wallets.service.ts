import { ForbiddenError, NotFoundError, ValidationError } from "@/core/errors";
import campayConfig from "@/config/campay.config";
import { campayService, normalizeCameroonPhone } from "@/modules/campay/campay.service";
import { MOBILE_TRANSFER_PAYMENT_METHODS } from "@/constants/payment-methods.constants";

import { eq } from "drizzle-orm";

import db from "@/db";
import { customerWalletDeposits, paymentMethods } from "@/db/models";

import {
  normalizeWalletCurrency,
  toMoney,
  WalletDepositStatus,
  WalletTransactionType,
  WalletWithdrawalStatus,
  type WalletCurrency,
} from "./customer-wallets.constants";
import { CustomerWalletsRepository } from "./customer-wallets.repository";

export class CustomerWalletsService {
  private readonly repo = new CustomerWalletsRepository();

  async getPublicSettings() {
    const settings = await this.repo.ensureSettings();
    return {
      walletEnabled: settings.walletEnabled,
      depositsEnabled: settings.depositsEnabled && settings.walletEnabled,
      withdrawalsEnabled: settings.withdrawalsEnabled && settings.walletEnabled,
    };
  }

  async getAdminSettings() {
    return this.repo.ensureSettings();
  }

  async updateAdminSettings(
    payload: Partial<{
      walletEnabled: boolean;
      depositsEnabled: boolean;
      withdrawalsEnabled: boolean;
      withdrawalFeePercent: string | number;
      withdrawalFeeMinXaf: string | number;
      minWithdrawalXaf: string | number;
      maxWithdrawalXaf: string | number;
      withdrawalRequiresApproval: boolean;
    }>,
    updatedBy: number,
  ) {
    return this.repo.updateSettings(payload, updatedBy);
  }

  async assertWalletEnabled() {
    const settings = await this.repo.ensureSettings();
    if (!settings.walletEnabled) {
      throw new ForbiddenError("Customer wallet is not enabled");
    }
    return settings;
  }

  async getCustomerWallets(userId: number) {
    await this.assertWalletEnabled();
    const customer = await this.repo.findCustomerByUserId(userId);
    if (!customer) throw new NotFoundError("Customer not found");

    const wallets = await Promise.all(
      (["XAF", "EUR", "USD"] as WalletCurrency[]).map((currency) =>
        this.repo.ensureWallet(customer.id, currency),
      ),
    );

    return {
      wallets: wallets.map((wallet) => ({
        currency: wallet.currency,
        availableBalance: wallet.availableBalance,
        reservedBalance: wallet.reservedBalance,
        spendableBalance: toMoney(
          Number(wallet.availableBalance) - Number(wallet.reservedBalance),
        ),
      })),
    };
  }

  async getTransactionHistory(userId: number, page = 1, limit = 50) {
    await this.assertWalletEnabled();
    const customer = await this.repo.findCustomerByUserId(userId);
    if (!customer) throw new NotFoundError("Customer not found");
    const rows = await this.repo.listTransactions(customer.id, limit, page);
    return { data: rows, page, limit };
  }

  private computeWithdrawalFee(
    amount: number,
    settings: Awaited<ReturnType<CustomerWalletsRepository["ensureSettings"]>>,
  ) {
    const percentFee = toMoney(
      (amount * Number(settings.withdrawalFeePercent)) / 100,
    );
    const minFee = Number(settings.withdrawalFeeMinXaf);
    return toMoney(Math.max(percentFee, minFee));
  }

  async requestWithdrawal(
    userId: number,
    input: { amount: number; currency?: string; note?: string },
  ) {
    const settings = await this.assertWalletEnabled();
    if (!settings.withdrawalsEnabled) {
      throw new ForbiddenError("Withdrawals are not enabled");
    }

    const currency = normalizeWalletCurrency(input.currency);
    if (currency !== "XAF") {
      throw new ValidationError("Withdrawals are currently supported in XAF only");
    }

    const amount = toMoney(input.amount);
    const min = Number(settings.minWithdrawalXaf);
    const max = Number(settings.maxWithdrawalXaf);
    if (amount < min || amount > max) {
      throw new ValidationError(
        `Withdrawal amount must be between ${min} and ${max} XAF`,
      );
    }

    const customer = await this.repo.findCustomerByUserId(userId);
    if (!customer) throw new NotFoundError("Customer not found");

    const fee = this.computeWithdrawalFee(amount, settings);
    const net = toMoney(amount - fee);
    if (net <= 0) {
      throw new ValidationError("Withdrawal amount is too small after fees");
    }

    return db.transaction(async (tx) => {
      const wallet = await this.repo.ensureWallet(customer.id, currency);
      const available = Number(wallet.availableBalance);
      const reserved = Number(wallet.reservedBalance);
      const eligible = toMoney(available - reserved);
      if (amount > eligible) {
        throw new ValidationError(
          "You cannot withdraw more than your eligible wallet balance",
        );
      }

      const newReserved = toMoney(reserved + amount);
      await this.repo.updateWalletBalances(tx, wallet.id, available, newReserved);

      const withdrawal = await this.repo.createWithdrawal({
        customerId: customer.id,
        amount: String(amount),
        feeAmount: String(fee),
        netAmount: String(net),
        currency,
        status: settings.withdrawalRequiresApproval
          ? WalletWithdrawalStatus.PENDING
          : WalletWithdrawalStatus.APPROVED,
        customerNote: input.note?.trim() || null,
      });

      await this.repo.insertLedgerEntry(tx, {
        customerId: customer.id,
        walletId: wallet.id,
        transactionType: WalletTransactionType.WITHDRAWAL_RESERVE,
        amount: String(amount),
        currency,
        availableBalanceAfter: String(available),
        reservedBalanceAfter: String(newReserved),
        reference: `WD-${withdrawal.id}`,
        reason: input.note?.trim() || "Withdrawal request",
        withdrawalId: withdrawal.id,
        createdBy: userId,
      });

      return withdrawal;
    });
  }

  async applyManualAdjustment(input: {
    customerId: number;
    currency?: string;
    amount: number;
    direction: "credit" | "debit";
    reason: string;
    adminUserId: number;
  }) {
    const reason = input.reason?.trim();
    if (!reason || reason.length < 3) {
      throw new ValidationError("A reason is required for manual wallet adjustments");
    }

    const currency = normalizeWalletCurrency(input.currency);
    const amount = toMoney(Math.abs(input.amount));
    if (amount <= 0) throw new ValidationError("Amount must be greater than zero");

    return db.transaction(async (tx) => {
      const wallet = await this.repo.ensureWallet(input.customerId, currency);
      let available = Number(wallet.availableBalance);
      const reserved = Number(wallet.reservedBalance);

      if (input.direction === "debit") {
        const eligible = toMoney(available - reserved);
        if (amount > eligible) {
          throw new ValidationError("Debit would exceed eligible wallet balance");
        }
        available = toMoney(available - amount);
      } else {
        available = toMoney(available + amount);
      }

      const updated = await this.repo.updateWalletBalances(
        tx,
        wallet.id,
        available,
        reserved,
      );

      await this.repo.insertLedgerEntry(tx, {
        customerId: input.customerId,
        walletId: wallet.id,
        transactionType:
          input.direction === "credit"
            ? WalletTransactionType.MANUAL_CREDIT
            : WalletTransactionType.MANUAL_DEBIT,
        amount: String(amount),
        currency,
        availableBalanceAfter: updated.availableBalance,
        reservedBalanceAfter: updated.reservedBalance,
        reason,
        createdBy: input.adminUserId,
      });

      return updated;
    });
  }

  async creditDeposit(
    depositId: number,
    reference: string,
    actorUserId?: number,
  ) {
    const deposit = await this.repo.findDepositById(depositId);
    if (!deposit) throw new NotFoundError("Deposit not found");
    if (deposit.paymentStatus === WalletDepositStatus.COMPLETED) {
      return deposit;
    }

    const currency = normalizeWalletCurrency(deposit.currency);
    const amount = Number(deposit.amount);

    return db.transaction(async (tx) => {
      const wallet = await this.repo.ensureWallet(deposit.customerId, currency);
      const available = toMoney(Number(wallet.availableBalance) + amount);
      const reserved = Number(wallet.reservedBalance);
      const updated = await this.repo.updateWalletBalances(
        tx,
        wallet.id,
        available,
        reserved,
      );

      await this.repo.insertLedgerEntry(tx, {
        customerId: deposit.customerId,
        walletId: wallet.id,
        transactionType: WalletTransactionType.DEPOSIT,
        amount: String(amount),
        currency,
        availableBalanceAfter: updated.availableBalance,
        reservedBalanceAfter: updated.reservedBalance,
        reference,
        reason: "Wallet deposit",
        depositId: deposit.id,
        createdBy: actorUserId ?? null,
      });

      return this.repo.markDepositCompleted(deposit.id, reference);
    });
  }

  async initiateDeposit(
    userId: number,
    input: {
      amount: number;
      currency?: string;
      paymentMethodId: number;
      phoneNumber?: string;
    },
  ) {
    const settings = await this.assertWalletEnabled();
    if (!settings.depositsEnabled) {
      throw new ForbiddenError("Wallet deposits are not enabled");
    }

    const amount = toMoney(input.amount);
    if (amount <= 0) throw new ValidationError("Deposit amount must be greater than zero");

    const customer = await this.repo.findCustomerByUserId(userId);
    if (!customer) throw new NotFoundError("Customer not found");

    const currency = normalizeWalletCurrency(input.currency);
    const deposit = await this.repo.createDeposit({
      customerId: customer.id,
      amount: String(amount),
      currency,
      paymentMethodId: input.paymentMethodId,
      paymentStatus: WalletDepositStatus.PENDING,
    });

    const [paymentMethod] = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, input.paymentMethodId))
      .limit(1);
    if (!paymentMethod) {
      throw new ValidationError("Payment method not available");
    }

    if (
      (MOBILE_TRANSFER_PAYMENT_METHODS as readonly string[]).includes(
        paymentMethod.name,
      ) &&
      campayConfig.enabled
    ) {
      const phone = normalizeCameroonPhone(input.phoneNumber || "");
      const collect = await campayService.initCollect({
        amount,
        phone,
        description: `Edoshop wallet deposit ${deposit.id}`,
        externalReference: `WALLET-DEP-${deposit.id}`,
      });
      if (!collect.reference) {
        throw new ValidationError("Unable to initiate mobile money deposit");
      }
      await db
        .update(customerWalletDeposits)
        .set({
          transactionReference: collect.reference,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(customerWalletDeposits.id, deposit.id));
      return {
        depositId: deposit.id,
        amount: String(amount),
        currency,
        campayReference: collect.reference,
        campayStatus: String(collect.status || "PENDING").toUpperCase(),
      };
    }

    return {
      depositId: deposit.id,
      amount: String(amount),
      currency,
      message: "Complete payment using the selected method to credit your wallet",
    };
  }

  async applyWalletPayment(input: {
    userId: number;
    orderId: number;
    orderCode: string;
    amount: number;
    currency?: string;
  }) {
    await this.assertWalletEnabled();
    const customer = await this.repo.findCustomerByUserId(input.userId);
    if (!customer) throw new NotFoundError("Customer not found");

    const currency = normalizeWalletCurrency(input.currency);
    const amount = toMoney(input.amount);
    if (amount <= 0) return { walletAmountApplied: 0 };

    return db.transaction(async (tx) => {
      const wallet = await this.repo.ensureWallet(customer.id, currency);
      const available = Number(wallet.availableBalance);
      const reserved = Number(wallet.reservedBalance);
      const eligible = toMoney(available - reserved);
      if (amount > eligible) {
        throw new ValidationError("Insufficient wallet balance for this payment");
      }

      const newAvailable = toMoney(available - amount);
      const updated = await this.repo.updateWalletBalances(
        tx,
        wallet.id,
        newAvailable,
        reserved,
      );

      await this.repo.insertLedgerEntry(tx, {
        customerId: customer.id,
        walletId: wallet.id,
        transactionType: WalletTransactionType.PURCHASE,
        amount: String(amount),
        currency,
        availableBalanceAfter: updated.availableBalance,
        reservedBalanceAfter: updated.reservedBalance,
        reference: input.orderCode,
        reason: `Order payment ${input.orderCode}`,
        orderId: input.orderId,
        createdBy: input.userId,
      });

      return { walletAmountApplied: amount };
    });
  }

  async syncDepositFromCampayReference(reference: string, userId: number) {
    const [deposit] = await db
      .select()
      .from(customerWalletDeposits)
      .where(eq(customerWalletDeposits.transactionReference, reference))
      .limit(1);
    if (!deposit) throw new NotFoundError("Wallet deposit not found");

    const customer = await this.repo.findCustomerByUserId(userId);
    if (!customer || customer.id !== deposit.customerId) {
      throw new ForbiddenError("Not allowed to sync this deposit");
    }

    const status = await campayService.syncTransactionStatus(reference);
    if (String(status.paymentStatus).toLowerCase() === "completed") {
      await this.creditDeposit(deposit.id, reference, userId);
    }
    return status;
  }

  async listAdminWallets(search?: string, page = 1, limit = 25) {
    const data = await this.repo.listAdminWallets({ search, page, limit });
    return { data, page, limit };
  }

  async approveWithdrawal(id: number, adminUserId: number, adminNote?: string) {
    const withdrawal = await this.repo.findWithdrawalById(id);
    if (!withdrawal) throw new NotFoundError("Withdrawal request not found");
    if (withdrawal.status !== WalletWithdrawalStatus.PENDING) {
      throw new ValidationError("Withdrawal is not pending approval");
    }

    return db.transaction(async (tx) => {
      const wallet = await this.repo.ensureWallet(
        withdrawal.customerId,
        normalizeWalletCurrency(withdrawal.currency),
      );
      const available = Number(wallet.availableBalance);
      const reserved = Number(wallet.reservedBalance);
      const amount = Number(withdrawal.amount);
      const newAvailable = toMoney(available - amount);
      const newReserved = toMoney(Math.max(0, reserved - amount));

      if (newAvailable < 0 || newReserved < 0) {
        throw new ValidationError("Wallet balances would become invalid");
      }

      const updated = await this.repo.updateWalletBalances(
        tx,
        wallet.id,
        newAvailable,
        newReserved,
      );

      await this.repo.insertLedgerEntry(tx, {
        customerId: withdrawal.customerId,
        walletId: wallet.id,
        transactionType: WalletTransactionType.WITHDRAWAL_PAYOUT,
        amount: String(amount),
        currency: withdrawal.currency,
        availableBalanceAfter: updated.availableBalance,
        reservedBalanceAfter: updated.reservedBalance,
        reference: `WD-${withdrawal.id}`,
        reason: adminNote?.trim() || "Withdrawal approved",
        withdrawalId: withdrawal.id,
        createdBy: adminUserId,
      });

      return this.repo.updateWithdrawal(id, {
        status: WalletWithdrawalStatus.PAID,
        reviewedBy: adminUserId,
        reviewedAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
        adminNote: adminNote?.trim() || null,
      });
    });
  }

  async rejectWithdrawal(id: number, adminUserId: number, adminNote?: string) {
    const withdrawal = await this.repo.findWithdrawalById(id);
    if (!withdrawal) throw new NotFoundError("Withdrawal request not found");
    if (withdrawal.status !== WalletWithdrawalStatus.PENDING) {
      throw new ValidationError("Withdrawal is not pending approval");
    }

    return db.transaction(async (tx) => {
      const wallet = await this.repo.ensureWallet(
        withdrawal.customerId,
        normalizeWalletCurrency(withdrawal.currency),
      );
      const available = Number(wallet.availableBalance);
      const reserved = Number(wallet.reservedBalance);
      const amount = Number(withdrawal.amount);
      const newReserved = toMoney(Math.max(0, reserved - amount));
      const updated = await this.repo.updateWalletBalances(
        tx,
        wallet.id,
        available,
        newReserved,
      );

      await this.repo.insertLedgerEntry(tx, {
        customerId: withdrawal.customerId,
        walletId: wallet.id,
        transactionType: WalletTransactionType.WITHDRAWAL_RELEASE,
        amount: String(amount),
        currency: withdrawal.currency,
        availableBalanceAfter: updated.availableBalance,
        reservedBalanceAfter: updated.reservedBalance,
        reference: `WD-${withdrawal.id}`,
        reason: adminNote?.trim() || "Withdrawal rejected",
        withdrawalId: withdrawal.id,
        createdBy: adminUserId,
      });

      return this.repo.updateWithdrawal(id, {
        status: WalletWithdrawalStatus.REJECTED,
        reviewedBy: adminUserId,
        reviewedAt: new Date().toISOString(),
        adminNote: adminNote?.trim() || null,
      });
    });
  }

  async listPendingWithdrawals() {
    return this.repo.listPendingWithdrawals();
  }
}