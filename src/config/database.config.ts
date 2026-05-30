import env from "./env.config";

/**
 * Database configuration values
 */
export const dbConfig = {
  /**
   * Database connection URL
   */
  url: env.DATABASE_URL,

  /**
   * Database host
   */
  host: env.DB_HOST,

  /**
   * Database username
   */
  user: env.DB_USER,

  /**
   * Database password
   */
  password: env.DB_PASSWORD,

  /**
   * Database name
   */
  name: env.DB_NAME,

  /**
   * Database port
   */
  port: env.DB_PORT,

  /**
   * Whether the database is in migration mode
   */
  isMigrating: env.DB_MIGRATING,

  /**
   * Whether the database is in seeding mode
   */
  isSeeding: env.DB_SEEDING,
};
