import env from "./env.config";

/**
 * Authentication configuration values
 */
export const authConfig = {
  /**
   * JWT secret key for token signing
   */
  jwtSecret: env.JWT_SECRET,

  /**
   * Previous JWT secret key (for rotation purposes)
   */
  jwtSecretPrevious: env.JWT_SECRET_PREVIOUS,

  /**
   * JWT secret key for reset tokens
   */
  jwtSecretResetToken: env.JWT_SECRET_REST_TOKEN,

  /**
   * CSRF protection secret
   */
  csrfSecret: env.CSRF_SECRET,

  /**
   * Access token expiry time in seconds
   */
  accessTokenExpiry: env.ACCESS_TOKEN_EXPIRY,

  /**
   * Refresh token expiry time in seconds
   */
  refreshTokenExpiry: env.REFRESH_TOKEN_EXPIRY,
};
