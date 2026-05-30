import type { Database } from "@/db";

import { ORDERS } from "@/constants/orders.constants";

import { orders as ordersTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seedOrders(db: Database) {
  for (let i = 0; i < ORDERS.length; i += CHUNK_SIZE) {
    const chunk = ORDERS.slice(i, i + CHUNK_SIZE).map((order) => ({
      ...order,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    await db.insert(ordersTable).values(chunk);
  }
}
