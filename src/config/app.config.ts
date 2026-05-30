import env from "./env.config";

/**
 * Application configuration values
 */
export const appConfig = {
  /**
   * Current environment (development, production, test)
   */
  nodeEnv: env.NODE_ENV,

  /**
   * Server port
   */
  port: env.PORT,

  /**
   * Logging level
   */
  logLevel: env.LOG_LEVEL,

  /**
   * Is the application running in development mode
   */
  isDevelopment: env.NODE_ENV === "development",

  /**
   * Is the application running in production mode
   */
  isProduction: env.NODE_ENV === "production",

  /**
   * Is the application running in test mode
   */
  isTest: env.NODE_ENV === "test",
};
