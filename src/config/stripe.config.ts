import currenciesConfig from "./currencies.config";
import env from "./env.config";

export const stripeConfig = {
  secretKey: env.STRIPE_SECRET_KEY,
  publishableKey: env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  defaultCurrency: currenciesConfig.defaultCurrency,
  storefrontUrl: env.STOREFRONT_URL.replace(/\/$/, ""),
  get enabled() {
    return Boolean(this.secretKey && this.publishableKey);
  },
  toStripeAmount(amount: number, currency: string) {
    return currenciesConfig.toStripeAmount(
      amount,
      currenciesConfig.resolveCurrency(currency),
    );
  },
};

export default stripeConfig;
