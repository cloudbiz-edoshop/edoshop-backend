import type { Database } from "@/db";

import {
  ORDER_ITEMS,
} from "../../constants/order-items.constant";
import { orderItems as orderItemsTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < ORDER_ITEMS.length; i += CHUNK_SIZE) {
    const chunk = ORDER_ITEMS.slice(i, i + CHUNK_SIZE);
    await db.insert(orderItemsTable).values(chunk);
  }
}
