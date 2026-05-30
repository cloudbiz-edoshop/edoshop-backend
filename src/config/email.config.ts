import env from "./env.config";

/**
 * Email configuration values
 */
export const emailConfig = {
  /**
   * SMTP service provider
   */
  smtpService: env.SMPT_SERVICE,

  /**
   * SMTP email address
   */
  smtpEmail: env.SMPT_MAIL,

  /**
   * SMTP password
   */
  smtpPassword: env.SMPT_PASSWORD,

  /**
   * SMTP host
   */
  smtpHost: env.SMPT_HOST,

  /**
   * SMTP port
   */
  smtpPort: env.SMPT_PORT,
};
