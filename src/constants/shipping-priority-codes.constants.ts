export enum SHIPPING_PRIORITY_CODES {
  A01 = "A01",
  A02 = "A02",
  B01 = "B01",
  B02 = "B02",
  C01 = "C01",
  C02 = "C02",
}

export const SHIPPING_PRIORITY_DESCRIPTIONS = {
  [SHIPPING_PRIORITY_CODES.A01]: "High Priority - Next Day Delivery",
  [SHIPPING_PRIORITY_CODES.A02]: "High Priority - Two Day Delivery",
  [SHIPPING_PRIORITY_CODES.B01]: "Standard Priority - Three to Five Day Delivery",
  [SHIPPING_PRIORITY_CODES.B02]: "Standard Priority - Five to Seven Day Delivery",
  [SHIPPING_PRIORITY_CODES.C01]: "Low Priority - Seven to Ten Day Delivery",
  [SHIPPING_PRIORITY_CODES.C02]: "Low Priority - Ten to Fourteen Day Delivery",
};
