import env from "./env.config";

export type SupportedCurrencyCode = "xaf" | "usd" | "eur";

export const BASE_CURRENCY: SupportedCurrencyCode = "xaf";

const ZERO_DECIMAL_CURRENCIES = new Set<SupportedCurrencyCode>(["xaf"]);

export const SUPPORTED_CURRENCIES: Array<{
  code: SupportedCurrencyCode;
  label: string;
  zeroDecimal: boolean;
}> = [
  { code: "xaf", label: "FCFA", zeroDecimal: true },
  { code: "usd", label: "USD", zeroDecimal: false },
  { code: "eur", label: "Euro", zeroDecimal: false },
];

const EXCHANGE_RATES: Record<Exclude<SupportedCurrencyCode, "xaf">, number> = {
  usd: env.EXCHANGE_XAF_PER_USD,
  eur: env.EXCHANGE_XAF_PER_EUR,
};

export const currenciesConfig = {
  baseCurrency: BASE_CURRENCY,
  defaultCurrency: env.STRIPE_CURRENCY.toLowerCase() as SupportedCurrencyCode,
  supported: SUPPORTED_CURRENCIES,
  resolveCurrency(code?: string | null): SupportedCurrencyCode {
    const normalized = String(code || env.STRIPE_CURRENCY).toLowerCase();
    const match = SUPPORTED_CURRENCIES.find((currency) => currency.code === normalized);
    return match?.code ?? BASE_CURRENCY;
  },
  convertFromBase(amountXaf: number, targetCurrency: SupportedCurrencyCode) {
    const normalizedAmount = Math.max(0, Number(amountXaf) || 0);
    if (targetCurrency === BASE_CURRENCY) {
      return normalizedAmount;
    }

    const rate = EXCHANGE_RATES[targetCurrency];
    if (!rate || rate <= 0) {
      return normalizedAmount;
    }

    if (targetCurrency === "usd" || targetCurrency === "eur") {
      return normalizedAmount / rate;
    }

    return normalizedAmount;
  },
  toStripeAmount(amount: number, currency: SupportedCurrencyCode) {
    const normalized = Math.max(0, amount);
    if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
      return Math.round(normalized);
    }
    return Math.round(normalized * 100);
  },
  getPublicCurrencies() {
    return SUPPORTED_CURRENCIES.map((currency) => ({
      code: currency.code,
      label: currency.label,
      ...(currency.code === "usd"
        ? { xafPerUnit: EXCHANGE_RATES.usd }
        : {}),
      ...(currency.code === "eur"
        ? { xafPerUnit: EXCHANGE_RATES.eur }
        : {}),
    }));
  },
};

export default currenciesConfig;
