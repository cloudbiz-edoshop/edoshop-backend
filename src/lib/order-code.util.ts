import { OrderTypeIds } from "@/constants/order-types.constants";

/** New customer order codes: ORD-DO-YYYYMMDD-#### vs ORD-DS-YYYYMMDD-#### */
export function generateOrderCode(orderTypeId: number): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  const storeTag =
    orderTypeId === OrderTypeIds.DROPSHIPPING ? "DS" : "DO";
  return `ORD-${storeTag}-${date}-${suffix}`;
}

export type OrderCodeStoreKind = "direct" | "dropshipping" | "legacy" | "unknown";

export function resolveOrderCodeStoreKind(orderCode: string): OrderCodeStoreKind {
  const trimmed = orderCode.trim();
  if (/^ORD-DO-/i.test(trimmed)) return "direct";
  if (/^ORD-DS-/i.test(trimmed)) return "dropshipping";
  if (/^ORD-\d{8}-/i.test(trimmed)) return "legacy";
  return "unknown";
}

export const ORDER_CODE_REGEX =
  /\b(ORD-(?:DO|DS)-\d{8}-\d{4,}|ORD-\d{8}-\d{4,})\b/i;
