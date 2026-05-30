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
};
