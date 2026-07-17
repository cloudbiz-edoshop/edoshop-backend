export enum TrackingStepLeg {
  MANUFACTURER = "manufacturer",
  STORE = "store",
}

export enum TrackingBundleStoreType {
  DIRECT_ORDER = "direct_order",
  GROUPAGE = "groupage",
  DROPSHIPPING = "dropshipping",
}

export enum TrackingBundleStatus {
  ACTIVE = "active",
  CLOSED = "closed",
  CANCELLED = "cancelled",
}

export const TRACKING_STEP_DEFINITIONS = [
  {
    id: 1,
    stepOrder: 1,
    code: "approval",
    label: "Approval",
    leg: TrackingStepLeg.MANUFACTURER,
    details: "Bundle orders are approved and ready to proceed.",
  },
  {
    id: 2,
    stepOrder: 2,
    code: "payment_of_items",
    label: "Payment Of Items (HT)",
    leg: TrackingStepLeg.MANUFACTURER,
    details: "Payment for bundle items has been received.",
  },
  {
    id: 3,
    stepOrder: 3,
    code: "order_received_by_manufacturer",
    label: "Order Received By Manufacturer",
    leg: TrackingStepLeg.MANUFACTURER,
    details: "Manufacturer has received the bundle order.",
  },
  {
    id: 4,
    stepOrder: 4,
    code: "order_shipped_by_agent",
    label: "Order Shipped By Agent",
    leg: TrackingStepLeg.MANUFACTURER,
    details: "Agent has shipped the bundle order.",
  },
  {
    id: 5,
    stepOrder: 5,
    code: "orders_arrived_at_local_customs",
    label: "Orders Arrived At Local Custom",
    leg: TrackingStepLeg.MANUFACTURER,
    details: "Bundle has arrived at local customs.",
  },
  {
    id: 6,
    stepOrder: 6,
    code: "order_at_the_store",
    label: "Order At The Store",
    leg: TrackingStepLeg.MANUFACTURER,
    details: "Bundle goods are now at the Edoshop store.",
  },
  {
    id: 7,
    stepOrder: 7,
    code: "bundle_to_order",
    label: "Bundle to Order",
    leg: TrackingStepLeg.MANUFACTURER,
    details: "Bundle is unpacked and customer orders are sent to order tracking.",
  },
  {
    id: 8,
    stepOrder: 8,
    code: "payment_of_kilo",
    label: "Payment Of Kilo",
    leg: TrackingStepLeg.MANUFACTURER,
    details: "Kilo/shipping payment for the bundle has been received.",
  },
  {
    id: 9,
    stepOrder: 9,
    code: "packaging",
    label: "Packaging",
    leg: TrackingStepLeg.STORE,
    details: "Bundle orders are being packaged for delivery.",
  },
  {
    id: 10,
    stepOrder: 10,
    code: "payment_for_deliveries",
    label: "Payment For Deliveries",
    leg: TrackingStepLeg.STORE,
    details: "Delivery payment has been received.",
  },
  {
    id: 11,
    stepOrder: 11,
    code: "deliveries",
    label: "Deliveries",
    leg: TrackingStepLeg.STORE,
    details: "Bundle orders are out for delivery or collected.",
  },
] as const;
