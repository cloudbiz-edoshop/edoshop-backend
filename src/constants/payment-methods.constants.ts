/**
 * Payment methods available in the application
 * Using enum for better type safety and autocompletion
 */
export enum PaymentMethod {
  PAYPAL = "paypal",
  WESTERN_UNION = "western_union",
  MONEY_GRAM = "money_gram",
  CASH = "cash",
  E_WALLET = "e_wallet",
  MTN_MOBILE_MONEY = "mtn_mobile_money",
  ORANGE_MONEY = "orange_money",
  STRIPE = "stripe",
}

/**
 * Provides descriptions for payment methods
 */
export const PAYMENT_METHOD_DESCRIPTIONS: Record<PaymentMethod, string> = {
  [PaymentMethod.PAYPAL]: "Paypal",
  [PaymentMethod.WESTERN_UNION]: "Western Union",
  [PaymentMethod.MONEY_GRAM]: "Money Gram",
  [PaymentMethod.CASH]: "Cash",
  [PaymentMethod.E_WALLET]: "E-Wallet",
  [PaymentMethod.MTN_MOBILE_MONEY]: "MTN Mobile Money",
  [PaymentMethod.ORANGE_MONEY]: "Orange Money",
  [PaymentMethod.STRIPE]: "Card (Stripe)",
};

/** Mobile transfer gateways offered at storefront checkout */
export const CHECKOUT_PAYMENT_METHODS = [
  PaymentMethod.MTN_MOBILE_MONEY,
  PaymentMethod.ORANGE_MONEY,
  PaymentMethod.STRIPE,
  PaymentMethod.CASH,
] as const;

/** Gateway slug used by the storefront for icons and routing */
export const PAYMENT_METHOD_GATEWAYS: Record<PaymentMethod, string> = {
  [PaymentMethod.PAYPAL]: "paypal",
  [PaymentMethod.WESTERN_UNION]: "western_union",
  [PaymentMethod.MONEY_GRAM]: "money_gram",
  [PaymentMethod.CASH]: "cash",
  [PaymentMethod.E_WALLET]: "mtn",
  [PaymentMethod.MTN_MOBILE_MONEY]: "mtn",
  [PaymentMethod.ORANGE_MONEY]: "orange",
  [PaymentMethod.STRIPE]: "stripe",
};

export const MOBILE_TRANSFER_PAYMENT_METHODS = [
  PaymentMethod.MTN_MOBILE_MONEY,
  PaymentMethod.ORANGE_MONEY,
] as const;
