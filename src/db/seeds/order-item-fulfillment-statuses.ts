import type { Database } from "@/db";

import {
  ORDER_ITEM_FULFILLMENT_STATUS_DESCRIPTIONS,
  OrderItemFulfillmentStatusType,
} from "../../constants/order-item-fulfillment-statuses.constants";
import { orderItemFulfillmentStatuses as orderItemFulfillmentStatusesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < Object.values(OrderItemFulfillmentStatusType).length; i += CHUNK_SIZE) {
    const chunk = Object.values(OrderItemFulfillmentStatusType)
      .slice(i, i + CHUNK_SIZE)
      .map((status) => ({
        name: status,
        description: ORDER_ITEM_FULFILLMENT_STATUS_DESCRIPTIONS[status],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(orderItemFulfillmentStatusesTable).values(chunk);
  }
}
