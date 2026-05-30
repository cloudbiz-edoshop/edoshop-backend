/* eslint-disable node/no-process-env */
import path from "node:path";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { z } from "zod";

/**
 * Load environment variables from .env file
 *
 * Uses dotenv to load environment variables from the appropriate .env file
 * based on the current NODE_ENV. Also expands variable references.
 */
expand(
  config({
    path: path.resolve(
      process.cwd(),
      process.env.NODE_ENV === "test" ? ".env.test" : ".env",
    ),
  }),
);

/**
 * Custom Zod transformer to convert string boolean values to actual booleans
 *
 * Transforms "true" to true and any other string to false
 */
const stringBoolean = z
  .preprocess((val) => val === "true", z.boolean())
  .default(false);

/**
 * Zod schema for validating environment variables
 *
 * Defines the required environment variables and their types,
 * with validation rules and defaults where appropriate.
 */
const EnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(9999),
    LOG_LEVEL: z.enum([
      "fatal",
      "error",
      "warn",
      "info",
      "debug",
      "trace",
      "silent",
    ]),
    DATABASE_URL: z.url(),
    DB_HOST: z.string(),
    DB_USER: z.string(),
    DB_PASSWORD: z.string(),
    DB_NAME: z.string(),
    DB_PORT: z.coerce.number(),
    DB_MIGRATING: stringBoolean,
    DB_SEEDING: stringBoolean,
    SMPT_SERVICE: z.string(),
    SMPT_MAIL: z.string(),
    SMPT_PASSWORD: z.string(),
    SMPT_HOST: z.string(),
    SMPT_PORT: z.string(),
    JWT_SECRET: z.string(),
    JWT_SECRET_PREVIOUS: z.string(),
    JWT_SECRET_REST_TOKEN: z.string(),
    CSRF_SECRET: z.string(),
    ACCESS_TOKEN_EXPIRY: z.coerce.number(),
    REFRESH_TOKEN_EXPIRY: z.coerce.number(),
    MINIO_ENDPOINT: z.string(),
    MINIO_PORT: z.coerce.number().default(9000),
    MINIO_USE_SSL: stringBoolean,
    MINIO_ACCESS_KEY: z.string(),
    MINIO_SECRET_KEY: z.string(),
    MINIO_BUCKET_NAME: z.string(),
  })
  .superRefine((input, ctx) => {
    if (input.NODE_ENV === "production" && !input.DATABASE_URL) {
      ctx.addIssue({
        code: "invalid_type",
        expected: "string",
        received: "undefined",
        path: ["DATABASE_URL"],
        message: "Must be set when NODE_ENV is 'production'",
      });
    }
  });

/**
 * Type definition for parsed environment variables
 */
export type Env = z.infer<typeof EnvSchema>;

/**
 * Parse environment variables using the Zod schema
 *
 * Validates that all required environment variables are present
 * and correctly typed. Exits the process if validation fails.
 */
const { data, error } = EnvSchema.safeParse(process.env);

if (error) {
  console.error("❌ Invalid env:");
  console.error(JSON.stringify(error.issues, null, 2));
  process.exit(1);
}

/**
 * Validated environment variables
 *
 * Contains all environment variables after validation and
 * type conversion.
 */
const env: Env = data;

export default env;
