import env from "./env.config";

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

export const stripeConfig = {
  secretKey: env.STRIPE_SECRET_KEY,
  publishableKey: env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  currency: env.STRIPE_CURRENCY.toLowerCase(),
  storefrontUrl: env.STOREFRONT_URL.replace(/\/$/, ""),
  get enabled() {
    return Boolean(this.secretKey && this.publishableKey);
  },
  toStripeAmount(total: number) {
    const normalized = Math.max(0, Math.round(total));
    if (ZERO_DECIMAL_CURRENCIES.has(this.currency)) {
      return normalized;
    }
    return normalized * 100;
  },
};

export default stripeConfig;
