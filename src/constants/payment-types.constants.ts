/**
 * Payment types available in the application
 * Using enum for better type safety and autocompletion
 */
export enum PaymentType {
  BANK_TRANSFER = "bank_transfer",
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
  CASH = "cash",
}

/**
 * Provides descriptions for payment types
 */
export const PAYMENT_TYPE_DESCRIPTIONS: Record<PaymentType, string> = {
  [PaymentType.BANK_TRANSFER]: "Bank Transfer",
  [PaymentType.CREDIT_CARD]: "Credit Card",
  [PaymentType.DEBIT_CARD]: "Debit Card",
  [PaymentType.CASH]: "Cash",
};
