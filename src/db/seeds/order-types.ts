import type { Database } from "@/db";

import {
  ORDER_TYPE_DESCRIPTIONS,
  OrderType,
} from "../../constants/order-types.constants";
import { orderTypes as orderTypesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < Object.values(OrderType).length; i += CHUNK_SIZE) {
    const chunk = Object.values(OrderType)
      .slice(i, i + CHUNK_SIZE)
      .map((type) => ({
        name: type,
        description: ORDER_TYPE_DESCRIPTIONS[type],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(orderTypesTable).values(chunk);
  }
}
