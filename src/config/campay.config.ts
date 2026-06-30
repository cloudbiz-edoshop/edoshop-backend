import env from "./env.config";

const normalizeEnvironment = (value: string) =>
  value.trim().toLowerCase() === "dev" ? "dev" : "prod";

export const campayConfig = {
  appId: env.CAMPAY_APP_ID,
  username: env.CAMPAY_USERNAME,
  password: env.CAMPAY_PASSWORD,
  environment: normalizeEnvironment(env.CAMPAY_ENVIRONMENT),
  baseUrl:
    env.CAMPAY_BASE_URL
    || (normalizeEnvironment(env.CAMPAY_ENVIRONMENT) === "dev"
      ? "https://demo.campay.net/api"
      : "https://campay.net/api"),
  currency: env.CAMPAY_CURRENCY.toLowerCase(),
  get enabled() {
    return Boolean(this.username && this.password);
  },
};

export default campayConfig;
