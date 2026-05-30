import type { Database } from "@/db";

import {
  ORDER_STATUS_TYPE_DESCRIPTIONS,
  OrderStatusType,
} from "../../constants/order-statuses.constants";
import { orderStatuses as orderStatusesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < Object.values(OrderStatusType).length; i += CHUNK_SIZE) {
    const chunk = Object.values(OrderStatusType)
      .slice(i, i + CHUNK_SIZE)
      .map((status) => ({
        name: status,
        description: ORDER_STATUS_TYPE_DESCRIPTIONS[status],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(orderStatusesTable).values(chunk);
  }
}
