import type { Database } from "@/db";

import { PAYMENT_TRANSACTIONS } from "@/constants";

import { paymentTransactions as paymentTransactionsTable } from "../models/payment-transactions";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < PAYMENT_TRANSACTIONS.length; i += CHUNK_SIZE) {
    const chunk = PAYMENT_TRANSACTIONS.slice(i, i + CHUNK_SIZE);

    await db.insert(paymentTransactionsTable).values(chunk);
  }
}
