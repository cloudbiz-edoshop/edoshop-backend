import { FulfillmentMethod } from "@/constants/fulfillment.constants";
import {
  ORDER_STATUS_TYPE_DESCRIPTIONS,
  OrderStatusType,
  OrderStatusTypeIds,
} from "@/constants/order-statuses.constants";

const formatTrackingDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const resolveTrackingStage = (statusId: number) => {
  const stageThree = new Set<number>([
    OrderStatusTypeIds.PACKAGING,
    OrderStatusTypeIds.PROCESSING,
    OrderStatusTypeIds.SHIPPED,
    OrderStatusTypeIds.READY_FOR_FULFILLMENT,
    OrderStatusTypeIds.ORDER_SHIPPED_BY_AGENT,
  ]);
  const stageTwo = new Set<number>([
    OrderStatusTypeIds.PAYMENT,
    OrderStatusTypeIds.PAYMENT_OF_ITEMS,
    OrderStatusTypeIds.PENDING,
  ]);

  if (
    statusId === OrderStatusTypeIds.DELIVERED
    || statusId === OrderStatusTypeIds.ORDER_AT_STORE
  ) {
    return 4;
  }

  if (stageThree.has(statusId)) {
    return 3;
  }

  if (stageTwo.has(statusId)) {
    return 2;
  }

  return 1;
};

export const buildCustomerOrderTrackingSteps = (params: {
  statusId: number;
  fulfillmentMethod: string;
  createdAt: string;
  updatedAt?: string | null;
}) => {
  const isPickup = params.fulfillmentMethod === FulfillmentMethod.PICKUP;
  const currentStage = resolveTrackingStage(params.statusId);
  const eventDate = formatTrackingDate(params.updatedAt || params.createdAt);
  const placedDate = formatTrackingDate(params.createdAt);

  const steps = [
    {
      id: 1,
      label: "Order Placed",
      details:
        ORDER_STATUS_TYPE_DESCRIPTIONS[OrderStatusType.ORDER_PLACED]
        ?? "Your order has been received by Edoshop.",
      date: placedDate,
    },
    {
      id: 2,
      label: "Payment",
      details:
        ORDER_STATUS_TYPE_DESCRIPTIONS[OrderStatusType.PAYMENT]
        ?? "Payment confirmation is being processed.",
      date: currentStage >= 2 ? eventDate : null,
    },
    {
      id: 3,
      label: isPickup ? "Ready for Pickup" : "Packaging & Shipping",
      details: isPickup
        ? "Your order is being prepared for collection at the Edoshop store."
        : ORDER_STATUS_TYPE_DESCRIPTIONS[OrderStatusType.SHIPPED]
          ?? "Your order is being packed and prepared for delivery.",
      date: currentStage >= 3 ? eventDate : null,
    },
    {
      id: 4,
      label: isPickup ? "Collected" : "Delivered",
      details: isPickup
        ? "Your order has been collected from the Edoshop pickup location."
        : ORDER_STATUS_TYPE_DESCRIPTIONS[OrderStatusType.DELIVERED]
          ?? "Your order has been delivered.",
      date: currentStage >= 4 ? eventDate : null,
    },
  ];

  return steps.map((step) => ({
    ...step,
    completed: step.id <= currentStage,
    active: step.id === currentStage,
  }));
};
