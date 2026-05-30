/**
 * Password validator with configurable complexity requirements
 */

import { z } from "zod";

/**
 * Configuration options for password validation
 *
 * Controls the requirements for password complexity, length,
 * and other security measures.
 */
export interface PasswordValidationOptions {
  /** Minimum password length (default: 8) */
  minLength?: number;
  /** Maximum password length (default: 72, bcrypt's limit) */
  maxLength?: number;
  /** Require at least one uppercase letter (default: true) */
  requireUppercase?: boolean;
  /** Require at least one lowercase letter (default: true) */
  requireLowercase?: boolean;
  /** Require at least one number (default: true) */
  requireNumbers?: boolean;
  /** Require at least one special character (default: true) */
  requireSpecialChars?: boolean;
  /** If true, requires all enabled character types; if false, requires at least one character type (default: false) */
  requireAllGroups?: boolean;
  /** List of common passwords to reject (default: includes several common passwords) */
  bannedPasswords?: string[];
}

/**
 * Default password validation options
 *
 * These settings provide a good balance between security and usability.
 * Requires at least 8 characters with a max of 72 (bcrypt limit),
 * and at least one character of each type (uppercase, lowercase, number, special).
 */
export const DEFAULT_PASSWORD_OPTIONS: PasswordValidationOptions = {
  minLength: 8,
  maxLength: 72, // bcrypt limit is 72 bytes
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  requireAllGroups: false, // Require at least one of the enabled groups
  bannedPasswords: [
    "password",
    "123456",
    "123456789",
    "qwerty",
    "admin",
    "welcome",
    "letmein",
  ],
};

/**
 * Creates a Zod schema for password validation with specified options
 *
 * This schema can be used in combination with other Zod schemas
 * to validate user input during registration and password changes.
 *
 * @param options - Password validation configuration (defaults to DEFAULT_PASSWORD_OPTIONS)
 * @returns A Zod schema for validating passwords according to the specified options
 */
export const createPasswordSchema = (
  options: PasswordValidationOptions = DEFAULT_PASSWORD_OPTIONS,
): z.ZodType<string> => {
  const finalOptions = { ...DEFAULT_PASSWORD_OPTIONS, ...options };

  // Create base schema with length validation
  let schema = createBaseLengthSchema(finalOptions);

  // Add complexity requirements
  schema = addComplexityRequirements(schema, finalOptions);

  // Add banned password check
  if (finalOptions.bannedPasswords && finalOptions.bannedPasswords.length > 0) {
    return addBannedPasswordCheck(schema, finalOptions.bannedPasswords);
  }

  return schema;
};

/**
 * Create base schema with length validation
 *
 * @param options - Password validation options
 * @returns A Zod string schema with length validation
 */
function createBaseLengthSchema(
  options: PasswordValidationOptions,
): z.ZodString {
  return z
    .string()
    .min(
      options.minLength ?? 1,
      `Password must be at least ${options.minLength} characters`,
    )
    .max(
      options.maxLength ?? 72,
      `Password must be at most ${options.maxLength} characters`,
    );
}

/**
 * Add complexity requirements to the schema
 *
 * @param schema - Base schema to add complexity requirements to
 * @param options - Password validation options
 * @returns A Zod string schema with complexity requirements
 */
function addComplexityRequirements(
  schema: z.ZodString,
  options: PasswordValidationOptions,
): z.ZodString {
  // Prepare regex patterns
  const patterns = {
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    numbers: /\d/,
    specialChars: /[^A-Z0-9]/i,
  };

  // Create a list of active requirements for error messaging
  const activeRequirements: string[] = [];

  if (options.requireAllGroups) {
    return addAllGroupsRequirements(
      schema,
      patterns,
      options,
      activeRequirements,
    );
  } else {
    return addAnyGroupRequirements(
      schema,
      patterns,
      options,
      activeRequirements,
    );
  }
}

/**
 * Add requirements where all enabled complexity groups must be met
 *
 * @param schema - Base schema to add requirements to
 * @param patterns - Regular expressions for different character types
 * @param options - Password validation options
 * @param activeRequirements - Array to track active requirements for error messages
 * @returns A Zod string schema with all-groups requirements
 */
function addAllGroupsRequirements(
  schema: z.ZodString,
  patterns: Record<string, RegExp>,
  options: PasswordValidationOptions,
  activeRequirements: string[],
): z.ZodString {
  let result = schema;

  if (options.requireUppercase) {
    result = result.regex(
      patterns.uppercase,
      "Password must contain at least one uppercase letter",
    );
    activeRequirements.push("uppercase letter");
  }

  if (options.requireLowercase) {
    result = result.regex(
      patterns.lowercase,
      "Password must contain at least one lowercase letter",
    );
    activeRequirements.push("lowercase letter");
  }

  if (options.requireNumbers) {
    result = result.regex(
      patterns.numbers,
      "Password must contain at least one number",
    );
    activeRequirements.push("number");
  }

  if (options.requireSpecialChars) {
    result = result.regex(
      patterns.specialChars,
      "Password must contain at least one special character",
    );
    activeRequirements.push("special character");
  }

  return result;
}

/**
 * Add requirements where at least one enabled complexity group must be met
 *
 * @param schema - Base schema to add requirements to
 * @param patterns - Regular expressions for different character types
 * @param options - Password validation options
 * @param activeRequirements - Array to track active requirements for error messages
 * @returns A Zod string schema with any-group requirements
 */
function addAnyGroupRequirements(
  schema: z.ZodString,
  patterns: Record<string, RegExp>,
  options: PasswordValidationOptions,
  activeRequirements: string[],
): z.ZodString {
  const activePatterns: RegExp[] = [];

  if (options.requireUppercase) {
    activePatterns.push(patterns.uppercase);
    activeRequirements.push("uppercase letter");
  }

  if (options.requireLowercase) {
    activePatterns.push(patterns.lowercase);
    activeRequirements.push("lowercase letter");
  }

  if (options.requireNumbers) {
    activePatterns.push(patterns.numbers);
    activeRequirements.push("number");
  }

  if (options.requireSpecialChars) {
    activePatterns.push(patterns.specialChars);
    activeRequirements.push("special character");
  }

  if (activePatterns.length > 0) {
    const combinedPattern = new RegExp(
      activePatterns.map((p) => `(?=.*${p.source})`).join(""),
    );

    return schema.regex(
      combinedPattern,
      `Password must contain at least one of each: ${activeRequirements.join(", ")}`,
    );
  }

  return schema;
}

/**
 * Add check for banned/common passwords
 *
 * @param schema - Base schema to add banned password check to
 * @param bannedPasswords - Array of banned password strings
 * @returns A Zod schema that rejects banned passwords
 */
function addBannedPasswordCheck(
  schema: z.ZodString,
  bannedPasswords: string[],
): z.ZodType<string> {
  return schema.refine((value) => !bannedPasswords.includes(value.toLowerCase()), {
    message: "Password is too common and easily guessed",
  });
}

/**
 * Validates a password string against the specified options
 *
 * Provides a simple function interface for password validation
 * without needing to work with Zod schemas directly.
 *
 * @param password - The password string to validate
 * @param options - Password validation configuration (defaults to DEFAULT_PASSWORD_OPTIONS)
 * @returns Object indicating validation success and optional error message
 */
export const validatePassword = (
  password: string,
  options: PasswordValidationOptions = DEFAULT_PASSWORD_OPTIONS,
): { success: boolean; error?: string } => {
  try {
    const schema = createPasswordSchema(options);
    schema.parse(password);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message,
      };
    }
    return {
      success: false,
      error: "Invalid password",
    };
  }
};
