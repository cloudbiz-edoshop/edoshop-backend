import { FulfillmentMethod } from "@/constants/fulfillment.constants";
import {
  ORDER_STATUS_TYPE_DESCRIPTIONS,
  OrderStatusType,
  OrderStatusTypeIds,
} from "@/constants/order-statuses.constants";

export type CustomerTrackingStep = {
  id: number;
  label: string;
  details: string;
  date: string | null;
  completed: boolean;
  active: boolean;
};

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

const isTerminalStatus = (statusId: number) =>
  statusId === OrderStatusTypeIds.CANCELLED
  || statusId === OrderStatusTypeIds.REFUNDED
  || statusId === OrderStatusTypeIds.RETURNED;

const MANUFACTURER_STEP_DEFINITIONS = [
  {
    id: 1,
    label: "Approval",
    statusKey: OrderStatusType.APPROVAL,
    statusIds: [OrderStatusTypeIds.APPROVAL, OrderStatusTypeIds.ORDER_PLACED],
  },
  {
    id: 2,
    label: "Payment Of Items (HT)",
    statusKey: OrderStatusType.PAYMENT_OF_ITEMS,
    statusIds: [
      OrderStatusTypeIds.PAYMENT_OF_ITEMS,
      OrderStatusTypeIds.PAYMENT,
      OrderStatusTypeIds.PENDING,
    ],
  },
  {
    id: 3,
    label: "Order Received By Manufacturer",
    statusKey: OrderStatusType.ORDER_RECEIVE_BY_MANUFACTURER,
    statusIds: [OrderStatusTypeIds.ORDER_RECEIVE_BY_MANUFACTURER],
  },
  {
    id: 4,
    label: "Order Shipped By Agent",
    statusKey: OrderStatusType.ORDER_SHIPPED_BY_AGENT,
    statusIds: [OrderStatusTypeIds.ORDER_SHIPPED_BY_AGENT],
  },
  {
    id: 5,
    label: "Orders Arrived At Local Custom",
    statusKey: OrderStatusType.ORDER_ARRIVED_AT_LOCALE_CUSTOMS,
    statusIds: [OrderStatusTypeIds.ORDER_ARRIVED_AT_LOCALE_CUSTOMS],
  },
  {
    id: 6,
    label: "Order At The Store",
    statusKey: OrderStatusType.ORDER_AT_STORE,
    statusIds: [OrderStatusTypeIds.ORDER_AT_STORE],
  },
  {
    id: 7,
    label: "Payment Of Kilo",
    statusKey: OrderStatusType.PAYMENT_OF_KILO,
    statusIds: [OrderStatusTypeIds.PAYMENT_OF_KILO],
  },
] as const;

const STORE_DELIVERY_STEP_DEFINITIONS = [
  {
    id: 1,
    label: "Packaging",
    statusKey: OrderStatusType.PACKAGING,
    statusIds: [
      OrderStatusTypeIds.PACKAGING,
      OrderStatusTypeIds.READY_FOR_FULFILLMENT,
      OrderStatusTypeIds.PROCESSING,
    ],
  },
  {
    id: 2,
    label: "Payment For Deliveries",
    statusKey: OrderStatusType.PAYMENT_FOR_DELIVERIES,
    statusIds: [OrderStatusTypeIds.PAYMENT_FOR_DELIVERIES],
  },
  {
    id: 3,
    label: "Deliveries",
    statusKey: OrderStatusType.SHIPPED,
    statusIds: [OrderStatusTypeIds.SHIPPED, OrderStatusTypeIds.DELIVERED],
  },
] as const;

const STORE_PICKUP_STEP_DEFINITIONS = [
  {
    id: 1,
    label: "Packaging",
    statusKey: OrderStatusType.PACKAGING,
    statusIds: [
      OrderStatusTypeIds.PACKAGING,
      OrderStatusTypeIds.READY_FOR_FULFILLMENT,
      OrderStatusTypeIds.PROCESSING,
    ],
  },
  {
    id: 2,
    label: "Ready For Pickup",
    statusKey: OrderStatusType.ORDER_AT_STORE,
    statusIds: [OrderStatusTypeIds.ORDER_AT_STORE],
  },
  {
    id: 3,
    label: "Collected",
    statusKey: OrderStatusType.DELIVERED,
    statusIds: [OrderStatusTypeIds.DELIVERED],
  },
] as const;

const resolveManufacturerStage = (statusId: number) => {
  if (isTerminalStatus(statusId)) return 0;

  for (const step of MANUFACTURER_STEP_DEFINITIONS) {
    if (step.statusIds.includes(statusId)) {
      return step.id;
    }
  }

  const storeLegStatuses = new Set<number>([
    OrderStatusTypeIds.PACKAGING,
    OrderStatusTypeIds.PAYMENT_FOR_DELIVERIES,
    OrderStatusTypeIds.READY_FOR_FULFILLMENT,
    OrderStatusTypeIds.PROCESSING,
    OrderStatusTypeIds.SHIPPED,
    OrderStatusTypeIds.DELIVERED,
  ]);

  if (storeLegStatuses.has(statusId)) {
    return MANUFACTURER_STEP_DEFINITIONS.length;
  }

  return 0;
};

const resolveStoreStage = (
  statusId: number,
  fulfillmentMethod: string,
) => {
  if (isTerminalStatus(statusId)) return 0;

  const definitions =
    fulfillmentMethod === FulfillmentMethod.PICKUP
      ? STORE_PICKUP_STEP_DEFINITIONS
      : STORE_DELIVERY_STEP_DEFINITIONS;

  if (statusId === OrderStatusTypeIds.DELIVERED) {
    return definitions.length;
  }

  for (const step of definitions) {
    if (step.statusIds.includes(statusId)) {
      return step.id;
    }
  }

  const manufacturerOnly = new Set<number>(
    MANUFACTURER_STEP_DEFINITIONS.flatMap((step) => [...step.statusIds]),
  );

  if (manufacturerOnly.has(statusId)) {
    return 0;
  }

  return 0;
};

const buildStepList = (
  definitions: ReadonlyArray<{
    id: number;
    label: string;
    statusKey: OrderStatusType;
    statusIds: readonly number[];
  }>,
  currentStage: number,
  placedDate: string | null,
  eventDate: string | null,
) =>
  definitions.map((step) => ({
    id: step.id,
    label: step.label,
    details:
      ORDER_STATUS_TYPE_DESCRIPTIONS[step.statusKey]
      ?? step.label,
    date:
      currentStage >= step.id && currentStage > 0
        ? eventDate ?? placedDate
        : null,
    completed: currentStage > 0 && step.id < currentStage,
    active: currentStage > 0 && step.id === currentStage,
  }));

const resolveTrackingStage = (statusId: number) => {
  if (isTerminalStatus(statusId)) {
    return 0;
  }

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

export const buildManufacturerToStoreSteps = (params: {
  statusId: number;
  createdAt: string;
  updatedAt?: string | null;
}): CustomerTrackingStep[] => {
  const placedDate = formatTrackingDate(params.createdAt);
  const eventDate = formatTrackingDate(params.updatedAt || params.createdAt);
  const currentStage = resolveManufacturerStage(params.statusId);

  if (params.statusId === OrderStatusTypeIds.CANCELLED) {
    return [
      {
        id: 1,
        label: "Order Cancelled",
        details:
          ORDER_STATUS_TYPE_DESCRIPTIONS[OrderStatusType.CANCELLED]
          ?? "This order has been cancelled.",
        date: eventDate,
        completed: true,
        active: true,
      },
    ];
  }

  return buildStepList(
    MANUFACTURER_STEP_DEFINITIONS,
    currentStage,
    placedDate,
    eventDate,
  );
};

export const buildStoreToCustomerSteps = (params: {
  statusId: number;
  fulfillmentMethod: string;
  createdAt: string;
  updatedAt?: string | null;
}): CustomerTrackingStep[] => {
  const placedDate = formatTrackingDate(params.createdAt);
  const eventDate = formatTrackingDate(params.updatedAt || params.createdAt);
  const isPickup = params.fulfillmentMethod === FulfillmentMethod.PICKUP;
  const definitions = isPickup
    ? STORE_PICKUP_STEP_DEFINITIONS
    : STORE_DELIVERY_STEP_DEFINITIONS;
  const currentStage = resolveStoreStage(
    params.statusId,
    params.fulfillmentMethod,
  );

  if (params.statusId === OrderStatusTypeIds.CANCELLED) {
    return [
      {
        id: 1,
        label: "Order Cancelled",
        details:
          ORDER_STATUS_TYPE_DESCRIPTIONS[OrderStatusType.CANCELLED]
          ?? "This order has been cancelled.",
        date: eventDate,
        completed: true,
        active: true,
      },
    ];
  }

  return buildStepList(
    definitions,
    currentStage,
    placedDate,
    eventDate,
  );
};

export const buildCustomerOrderTrackingSteps = (params: {
  statusId: number;
  fulfillmentMethod: string;
  createdAt: string;
  updatedAt?: string | null;
}) => {
  const eventDate = formatTrackingDate(params.updatedAt || params.createdAt);
  const placedDate = formatTrackingDate(params.createdAt);

  if (params.statusId === OrderStatusTypeIds.CANCELLED) {
    return [
      {
        id: 1,
        label: "Order Cancelled",
        details:
          ORDER_STATUS_TYPE_DESCRIPTIONS[OrderStatusType.CANCELLED]
          ?? "This order has been cancelled.",
        date: eventDate,
        completed: true,
        active: true,
      },
    ];
  }

  const isPickup = params.fulfillmentMethod === FulfillmentMethod.PICKUP;
  const currentStage = resolveTrackingStage(params.statusId);

  const steps = [
    {
      id: 1,
      label: "Ordered",
      details:
        ORDER_STATUS_TYPE_DESCRIPTIONS[OrderStatusType.ORDER_PLACED]
        ?? "Your order has been received by Edoshop.",
      date: placedDate,
    },
    {
      id: 2,
      label: "Payment confirmed",
      details:
        ORDER_STATUS_TYPE_DESCRIPTIONS[OrderStatusType.PAYMENT]
        ?? "Payment confirmation is being processed.",
      date: currentStage >= 2 ? eventDate : null,
    },
    {
      id: 3,
      label: isPickup ? "Ready for pickup" : "Shipped",
      details: isPickup
        ? "Your order is being prepared for collection at the Edoshop store."
        : ORDER_STATUS_TYPE_DESCRIPTIONS[OrderStatusType.SHIPPED]
          ?? "Your order is on its way.",
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

export const buildDetailedOrderTracking = (params: {
  statusId: number;
  fulfillmentMethod: string;
  createdAt: string;
  updatedAt?: string | null;
}) => ({
  steps: buildCustomerOrderTrackingSteps(params),
  manufacturerToStoreSteps: buildManufacturerToStoreSteps(params),
  storeToCustomerSteps: buildStoreToCustomerSteps(params),
});

type BundleTrackingInput = {
  currentStepOrder: number;
  steps: Array<{
    id: number;
    stepOrder: number;
    label: string;
    leg: string;
    description?: string | null;
  }>;
  history?: Array<{
    stepId: number;
    createdAt: string;
  }>;
  createdAt: string;
};

const formatTrackingDateFromIso = (value?: string | null) => {
  if (!value) return null;
  return formatTrackingDate(value);
};

const DIRECT_ORDER_RECEIVED_STATUS_IDS = [
  OrderStatusTypeIds.ORDER_PLACED,
  OrderStatusTypeIds.PAYMENT,
  OrderStatusTypeIds.PENDING,
  OrderStatusTypeIds.APPROVAL,
  OrderStatusTypeIds.READY_FOR_FULFILLMENT,
] as const;

const DIRECT_ORDER_DELIVERY_TRACKING_STEPS = [
  {
    stepOrder: 1,
    label: "Order Received",
    description: "Order has been received at the Edoshop store.",
    statusIds: DIRECT_ORDER_RECEIVED_STATUS_IDS,
    targetStatusId: OrderStatusTypeIds.READY_FOR_FULFILLMENT,
  },
  {
    stepOrder: 2,
    label: "Store Packaging",
    description: "Store team is packaging the order.",
    statusIds: [
      OrderStatusTypeIds.PACKAGING,
      OrderStatusTypeIds.PROCESSING,
    ],
    targetStatusId: OrderStatusTypeIds.PACKAGING,
  },
  {
    stepOrder: 3,
    label: "Payment For Deliveries",
    description: "Delivery payment is being processed.",
    statusIds: [OrderStatusTypeIds.PAYMENT_FOR_DELIVERIES],
    targetStatusId: OrderStatusTypeIds.PAYMENT_FOR_DELIVERIES,
  },
  {
    stepOrder: 4,
    label: "Deliveries",
    description: "Order is out for delivery or has been delivered.",
    statusIds: [OrderStatusTypeIds.SHIPPED, OrderStatusTypeIds.DELIVERED],
    targetStatusId: OrderStatusTypeIds.SHIPPED,
  },
] as const;

const DIRECT_ORDER_PICKUP_TRACKING_STEPS = [
  {
    stepOrder: 1,
    label: "Order Received",
    description: "Order has been received at the Edoshop store.",
    statusIds: DIRECT_ORDER_RECEIVED_STATUS_IDS,
    targetStatusId: OrderStatusTypeIds.READY_FOR_FULFILLMENT,
  },
  {
    stepOrder: 2,
    label: "Store Packaging",
    description: "Store team is packaging the order.",
    statusIds: [
      OrderStatusTypeIds.PACKAGING,
      OrderStatusTypeIds.PROCESSING,
    ],
    targetStatusId: OrderStatusTypeIds.PACKAGING,
  },
  {
    stepOrder: 3,
    label: "Ready For Pickup",
    description: "Order is ready for customer collection.",
    statusIds: [OrderStatusTypeIds.ORDER_AT_STORE],
    targetStatusId: OrderStatusTypeIds.ORDER_AT_STORE,
  },
  {
    stepOrder: 4,
    label: "Collected",
    description: "Customer has collected the order.",
    statusIds: [OrderStatusTypeIds.DELIVERED],
    targetStatusId: OrderStatusTypeIds.DELIVERED,
  },
] as const;

export const getDirectOrderTrackingStepDefinitions = (
  fulfillmentMethod: string,
) => (
  fulfillmentMethod === FulfillmentMethod.PICKUP
    ? DIRECT_ORDER_PICKUP_TRACKING_STEPS
    : DIRECT_ORDER_DELIVERY_TRACKING_STEPS
);

export const resolveDirectOrderTrackingStage = (
  statusId: number,
  fulfillmentMethod: string,
) => {
  if (isTerminalStatus(statusId)) return 0;

  const definitions = getDirectOrderTrackingStepDefinitions(fulfillmentMethod);

  if (statusId === OrderStatusTypeIds.DELIVERED) {
    return definitions.length;
  }

  for (const step of definitions) {
    if ((step.statusIds as readonly number[]).includes(statusId)) {
      return step.stepOrder;
    }
  }

  return 1;
};

export const resolveDirectOrderTrackingStepLabel = (
  statusId: number,
  fulfillmentMethod: string,
  statusLabel?: string,
) => {
  const definitions = getDirectOrderTrackingStepDefinitions(fulfillmentMethod);
  const stage = resolveDirectOrderTrackingStage(statusId, fulfillmentMethod);

  if (stage > 0) {
    const step = definitions.find((entry) => entry.stepOrder === stage);
    if (step) return step.label;
  }

  return statusLabel ?? "Order Received";
};

export const getDirectOrderTrackingTargetStatusId = (
  stepOrder: number,
  fulfillmentMethod: string,
) => {
  const step = getDirectOrderTrackingStepDefinitions(fulfillmentMethod)
    .find((entry) => entry.stepOrder === stepOrder);

  return step?.targetStatusId ?? null;
};

export const buildDirectOrderAdminTrackingSteps = (params: {
  statusId: number;
  fulfillmentMethod: string;
  createdAt: string;
  updatedAt?: string | null;
}): CustomerTrackingStep[] => {
  const definitions = getDirectOrderTrackingStepDefinitions(params.fulfillmentMethod);
  const currentStage = resolveDirectOrderTrackingStage(
    params.statusId,
    params.fulfillmentMethod,
  );
  const placedDate = formatTrackingDate(params.createdAt);
  const eventDate = formatTrackingDate(params.updatedAt || params.createdAt);

  return definitions.map((step) => ({
    id: step.stepOrder,
    label: step.label,
    details: step.description,
    date: currentStage >= step.stepOrder ? eventDate ?? placedDate : null,
    completed: currentStage > step.stepOrder,
    active: currentStage === step.stepOrder,
  }));
};

export const buildBundleBasedTracking = (params: BundleTrackingInput) => {
  const historyByStepId = new Map(
    (params.history ?? []).map((entry) => [entry.stepId, entry.createdAt]),
  );

  const manufacturerSteps = params.steps
    .filter((step) => step.leg === "manufacturer")
    .map((step) => {
      const completed = step.stepOrder < params.currentStepOrder;
      const active = step.stepOrder === params.currentStepOrder;
      const date = completed || active
        ? formatTrackingDateFromIso(
            historyByStepId.get(step.id) ?? params.createdAt,
          )
        : null;

      return {
        id: step.id,
        label: step.label,
        details: step.description ?? step.label,
        date,
        completed,
        active,
      };
    });

  const storeSteps = params.steps
    .filter((step) => step.leg === "store")
    .map((step) => {
      const completed = step.stepOrder < params.currentStepOrder;
      const active = step.stepOrder === params.currentStepOrder;
      const date = completed || active
        ? formatTrackingDateFromIso(
            historyByStepId.get(step.id) ?? params.createdAt,
          )
        : null;

      return {
        id: step.id,
        label: step.label,
        details: step.description ?? step.label,
        date,
        completed,
        active,
      };
    });

  const activeStep = params.steps.find(
    (step) => step.stepOrder === params.currentStepOrder,
  );

  const simplifiedSteps = [
    {
      id: 1,
      label: "Ordered",
      details: "Your order is linked to a bundle and is being tracked.",
      date: formatTrackingDateFromIso(params.createdAt),
      completed: params.currentStepOrder > 1,
      active: params.currentStepOrder === 1,
    },
    {
      id: 2,
      label: activeStep?.label ?? "In progress",
      details: activeStep?.description ?? "Bundle tracking is in progress.",
      date: formatTrackingDateFromIso(
        historyByStepId.get(activeStep?.id ?? 0) ?? params.createdAt,
      ),
      completed: false,
      active: true,
    },
    {
      id: 3,
      label: "Delivery",
      details: "Final delivery stage for your order.",
      date:
        params.currentStepOrder >= 10
          ? formatTrackingDateFromIso(historyByStepId.get(10) ?? params.createdAt)
          : null,
      completed: params.currentStepOrder >= 10,
      active: params.currentStepOrder >= 8 && params.currentStepOrder < 10,
    },
    {
      id: 4,
      label: "Completed",
      details: "Your order journey is complete.",
      date:
        params.currentStepOrder >= 10
          ? formatTrackingDateFromIso(historyByStepId.get(10) ?? params.createdAt)
          : null,
      completed: params.currentStepOrder >= 10,
      active: params.currentStepOrder === 10,
    },
  ];

  return {
    steps: simplifiedSteps,
    manufacturerToStoreSteps: manufacturerSteps,
    storeToCustomerSteps: storeSteps,
  };
};

export const DROPSHIPPING_ORDER_LEG_ADMIN_STEPS = [
  {
    stepOrder: 7,
    label: "Payment Of Kilo",
    description: "Customer pays kilo/shipping fees after items arrive at the store.",
    statusIds: [OrderStatusTypeIds.PAYMENT_OF_KILO],
    targetStatusId: OrderStatusTypeIds.PAYMENT_OF_KILO,
  },
  {
    stepOrder: 8,
    label: "Packaging",
    description: "Store team is packaging the order for delivery or pickup.",
    statusIds: [
      OrderStatusTypeIds.PACKAGING,
      OrderStatusTypeIds.READY_FOR_FULFILLMENT,
      OrderStatusTypeIds.PROCESSING,
    ],
    targetStatusId: OrderStatusTypeIds.PACKAGING,
  },
  {
    stepOrder: 9,
    label: "Payment For Deliveries",
    description: "Delivery payment is being processed.",
    statusIds: [OrderStatusTypeIds.PAYMENT_FOR_DELIVERIES],
    targetStatusId: OrderStatusTypeIds.PAYMENT_FOR_DELIVERIES,
  },
  {
    stepOrder: 10,
    label: "Deliveries",
    description: "Order is out for delivery or has been delivered.",
    statusIds: [OrderStatusTypeIds.SHIPPED, OrderStatusTypeIds.DELIVERED],
    targetStatusId: OrderStatusTypeIds.SHIPPED,
  },
] as const;

export const getDropshippingOrderLegStepDefinitions = () =>
  DROPSHIPPING_ORDER_LEG_ADMIN_STEPS;

export const resolveDropshippingOrderLegTrackingStage = (statusId: number) => {
  if (isTerminalStatus(statusId)) return 0;
  if (statusId === OrderStatusTypeIds.DELIVERED) return 10;

  for (const step of DROPSHIPPING_ORDER_LEG_ADMIN_STEPS) {
    if ((step.statusIds as readonly number[]).includes(statusId)) {
      return step.stepOrder;
    }
  }

  return 0;
};

export const resolveDropshippingOrderLegStepLabel = (
  statusId: number,
  statusLabel?: string,
) => {
  const stage = resolveDropshippingOrderLegTrackingStage(statusId);
  if (stage >= 7) {
    const step = DROPSHIPPING_ORDER_LEG_ADMIN_STEPS.find(
      (entry) => entry.stepOrder === stage,
    );
    if (step) return `${step.stepOrder}. ${step.label}`;
  }

  return `Awaiting order leg · ${statusLabel ?? "pending"}`;
};

export const getDropshippingOrderLegTargetStatusId = (stepOrder: number) => {
  const step = DROPSHIPPING_ORDER_LEG_ADMIN_STEPS.find(
    (entry) => entry.stepOrder === stepOrder,
  );

  return step?.targetStatusId ?? null;
};

export const buildDropshippingOrderLegAdminTrackingSteps = (params: {
  statusId: number;
  createdAt: string;
  updatedAt?: string | null;
}): CustomerTrackingStep[] => {
  const currentStage = resolveDropshippingOrderLegTrackingStage(params.statusId);
  const placedDate = formatTrackingDate(params.createdAt);
  const eventDate = formatTrackingDate(params.updatedAt || params.createdAt);

  return DROPSHIPPING_ORDER_LEG_ADMIN_STEPS.map((step) => ({
    id: step.stepOrder,
    label: `${step.stepOrder}. ${step.label}`,
    details: step.description,
    date: currentStage >= step.stepOrder ? eventDate ?? placedDate : null,
    completed: currentStage > step.stepOrder,
    active: currentStage === step.stepOrder,
  }));
};
