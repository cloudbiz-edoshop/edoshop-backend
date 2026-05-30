import type { Database } from "@/db";

import {
  ORDER_FULFILLMENT_STATUS_DESCRIPTIONS,
  OrderFulfillmentStatusType,
} from "../../constants/order-fulfillment-statuses.constants";
import { orderFulfillmentStatuses as orderFulfillmentStatusesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < Object.values(OrderFulfillmentStatusType).length; i += CHUNK_SIZE) {
    const chunk = Object.values(OrderFulfillmentStatusType)
      .slice(i, i + CHUNK_SIZE)
      .map((status) => ({
        name: status,
        description: ORDER_FULFILLMENT_STATUS_DESCRIPTIONS[status],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(orderFulfillmentStatusesTable).values(chunk);
  }
}
