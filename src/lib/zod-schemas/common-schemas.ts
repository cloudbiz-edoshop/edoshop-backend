import { z } from "zod";

import { constraintAndMessages } from "@/constants";
import { createPasswordSchema } from "@/lib/password-validator";

/**
 * Common String schema with standardized validation
 */
export const commonStringSchema = z
  .string()
  .trim()
  .min(
    1,
    "Common string cannot be empty",
  )
  .describe("Common string");

/**
 * Name schema with standardized validation
 */
export const nameSchema = z
  .string()
  .trim()
  .regex(
    constraintAndMessages.NAME.REGEX,
    constraintAndMessages.NAME.INVALID_ERROR,
  )
  .min(
    constraintAndMessages.NAME.MIN_LENGTH,
    constraintAndMessages.NAME.MIN_LENGTH_ERROR,
  )
  .max(
    constraintAndMessages.NAME.MAX_LENGTH,
    constraintAndMessages.NAME.MAX_LENGTH_ERROR,
  )
  .describe("Name");

/**
 * Description schema with standardized validation
 */
export const descriptionSchema = z
  .string()
  .max(
    constraintAndMessages.DESCRIPTION.MAX_LENGTH,
    constraintAndMessages.DESCRIPTION.MAX_LENGTH_ERROR,
  )
  .describe("Description");

/**
 * Email schema with standardized validation
 */
export const emailSchema = z
  .email(constraintAndMessages.EMAIL.INVALID_ERROR)
  .max(
    constraintAndMessages.EMAIL.MAX_LENGTH,
    constraintAndMessages.EMAIL.MAX_LENGTH_ERROR,
  )
  .describe("Email address");

/**
 * Username schema with standardized validation
 */
export const usernameSchema = z
  .string()
  .toLowerCase()
  .min(
    constraintAndMessages.USERNAME.MIN_LENGTH,
    constraintAndMessages.USERNAME.MIN_LENGTH_ERROR,
  )
  .max(
    constraintAndMessages.USERNAME.MAX_LENGTH,
    constraintAndMessages.USERNAME.MAX_LENGTH_ERROR,
  )
  .regex(
    constraintAndMessages.USERNAME.REGEX,
    constraintAndMessages.USERNAME.INVALID_ERROR,
  )
  .describe("Username");

/**
 * Phone number schema with standardized validation
 */
export const phoneSchema = z
  .string()
  .regex(
    constraintAndMessages.PHONE.REGEX,
    constraintAndMessages.PHONE.PATTERN_ERROR,
  )
  .describe("WhatsApp number");

/**
 * Password schema with standardized validation
 */
export const passwordSchema = createPasswordSchema({
  minLength: constraintAndMessages.PASSWORD.MIN_LENGTH,
  requireUppercase: constraintAndMessages.PASSWORD.REQUIRE_UPPERCASE,
  requireLowercase: constraintAndMessages.PASSWORD.REQUIRE_LOWERCASE,
  requireNumbers: constraintAndMessages.PASSWORD.REQUIRE_NUMBERS,
  requireSpecialChars: constraintAndMessages.PASSWORD.REQUIRE_SPECIAL_CHARS,
});

/**
 * Full name schema with standardized validation
 */
export const fullNameSchema = z
  .string()
  .trim()
  .regex(
    constraintAndMessages.FULL_NAME.REGEX,
    constraintAndMessages.FULL_NAME.INVALID_ERROR,
  )
  .min(
    constraintAndMessages.FULL_NAME.MIN_LENGTH,
    constraintAndMessages.FULL_NAME.MIN_LENGTH_ERROR,
  )
  .max(
    constraintAndMessages.FULL_NAME.MAX_LENGTH,
    constraintAndMessages.FULL_NAME.MAX_LENGTH_ERROR,
  )
  .describe("Full name");

/**
 * Street address schema with standardized validation
 */
export const streetAddressSchema = z
  .string()
  .min(
    constraintAndMessages.STREET_ADDRESS.MIN_LENGTH,
    constraintAndMessages.STREET_ADDRESS.MIN_LENGTH_ERROR,
  )
  .max(
    constraintAndMessages.STREET_ADDRESS.MAX_LENGTH,
    constraintAndMessages.STREET_ADDRESS.MAX_LENGTH_ERROR,
  )
  .describe("Street address");

/**
 * Profile photo URL schema with standardized validation
 */
export const profilePhotoUrlSchema = z
  .string()
  .max(
    constraintAndMessages.PROFILE_PHOTO_URL.MAX_LENGTH,
    constraintAndMessages.PROFILE_PHOTO_URL.MAX_LENGTH_ERROR,
  )
  .describe("Profile photo URL");

/**
 * OTP schema with standardized validation
 */
export const otpSchema = z.string().describe("One-time password");

/**
 * JWT token schema with standardized validation
 */
export const jwtTokenSchema = z
  .string()
  .regex(
    constraintAndMessages.JWT_TOKEN.REGEX,
    constraintAndMessages.JWT_TOKEN.REGEX_ERROR,
  )
  .describe("JWT token");

/**
 * ID schema with standardized validation
 */
export const idSchema = z
  .number()
  .int()
  .positive()
  .describe("Unique identifier");

/**
 * Timestamp schema with standardized validation
 */
export const timestampSchema = z
  .iso
  .datetime("Invalid timestamp format")
  .describe("Timestamp");

export const jwtHeaderSchema = z.object({
  authorization: z
    .string()
    .describe("JWT token in format: Bearer <token>")
    .default(
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoibmFiZWVsIiwiaWF0IjoxNzQyOTgxNjgyLCJleHAiOjE3NzQ1MTc2NjN9.iUNAeWjdD-UykeQY7vv4bmFA1JI67mHgYcNZ8mW0ZRo",
    ),
  manager1: z
    .string()
    .describe("JWT token in format: Bearer <token>")
    .default(
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoibmFiZWVsIiwiaWF0IjoxNzQyOTgxNjgyLCJleHAiOjE3NzQ1MTc2NjN9.iUNAeWjdD-UykeQY7vv4bmFA1JI67mHgYcNZ8mW0ZRo",
    ),
});
