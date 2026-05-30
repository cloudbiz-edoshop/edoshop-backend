import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { users } from "@/db/models";
import {
  emailSchema,
  fullNameSchema,
  idSchema,
  jwtTokenSchema,
  otpSchema,
  passwordSchema,
  phoneSchema,
  usernameSchema,
} from "@/lib/zod-schemas";

// Base user schema
export const userSchema = createSelectSchema(users).omit({
  password: true,
});

// User type from schema
export type User = z.infer<typeof userSchema>;

// Create user schema with email
export const createUserSchemaWithEmail = createInsertSchema(users)
  .omit({
    id: true,
    phoneNumber: true,
    isActive: true,
    isAdmin: true,
    isEmailVerified: true,
    isPhoneNumberVerified: true,
  })
  .extend({
    email: emailSchema,
    password: passwordSchema.optional(),
  });

// Create user type with email
export type CreateUserDataWithEmail = z.infer<typeof createUserSchemaWithEmail>;
// Create user schema with phone number
export const createUserSchemaWithPhoneNumber = createUserSchemaWithEmail.extend(
  {
    phoneNumber: phoneSchema,
    email: emailSchema.optional(),
  },
);

// Create user type with phone number
export type CreateUserDataWithPhoneNumber = z.infer<
  typeof createUserSchemaWithPhoneNumber
>;

// create user data with email and phone
export const createUserDataWithEmailAndPhone = createUserSchemaWithEmail.extend(
  {
    phoneNumber: phoneSchema,
    password: z.string().optional(),
  },
);

export type CreateUserDataWithEmailAndPhone = z.infer<
  typeof createUserDataWithEmailAndPhone
>;

export const createUserSchema = createInsertSchema(users).extend({
  password: passwordSchema.optional(),
});

export type CreateUserData = z.infer<typeof createUserSchema>;

// Create user response schema
export const createUserResponseSchema = createUserSchema.omit({
  password: true,
});

// Create user response type
export type CreateUserResponse = z.infer<typeof createUserResponseSchema>;

export const createUserResponseSchemaWithEmail =
  createUserResponseSchema.extend({
    id: idSchema,
    email: emailSchema,
  });

export type CreateUserResponseWithEmail = z.infer<
  typeof createUserResponseSchemaWithEmail
>;

export const createUserResponseSchemaWithPhoneNumber =
  createUserResponseSchema.extend({
    id: idSchema,
    phoneNumber: phoneSchema,
  });

export type CreateUserResponseWithPhoneNumber = z.infer<
  typeof createUserResponseSchemaWithPhoneNumber
>;

export const createUserResponseSchemaWithEmailAndPhone =
  createUserResponseSchemaWithEmail.extend({
    id: idSchema,
    phoneNumber: phoneSchema,
  });

export type CreateUserResponseWithEmailAndPhone = z.infer<
  typeof createUserResponseSchemaWithEmailAndPhone
>;

export const registerUserAdminPanelRequestSchema = z.object({
  fullName: fullNameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const registerUserAdminPanelResponseSchema = z.object({
  id: z.number(),
  fullName: z.string(),
  username: z.string(),
  email: z.email(),
});

// Update User schema
export const updateUserSchema = createUserSchema
  .omit({
    id: true,
    createdAt: true,
  })
  .partial();

export type UpdateUser = z.infer<typeof updateUserSchema>;

// Login request schema
export const loginRequestSchema = z
  .object({
    email: emailSchema.optional(),
    phoneNumber: phoneSchema.optional(),
    password: passwordSchema.describe("User password"),
  })
  .refine(
    (data) => data.email !== undefined || data.phoneNumber !== undefined,
    {
      message: "Either email or phone number is required",
      path: ["email", "phoneNumber"],
    },
  );

// Login request type
export type LoginRequest = z.infer<typeof loginRequestSchema>;

// Login response schema
export const loginResponseSchema = z.object({
  user: userSchema.describe("User information"),
  accessToken: jwtTokenSchema.describe("JWT access token"),
  refreshToken: jwtTokenSchema.describe("JWT refresh token"),
});

// Login response type
export type LoginResponse = z.infer<typeof loginResponseSchema>;

// Refresh token request schema
export const refreshTokenRequestSchema = z.object({
  refreshToken: jwtTokenSchema,
});

// Refresh token request type
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;

// Refresh token response schema
export const refreshTokenResponseSchema = z.object({
  accessToken: jwtTokenSchema.describe("New JWT access token"),
  refreshToken: jwtTokenSchema.describe("New JWT refresh token"),
});

// Refresh token response type
export type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>;

// Forgot password request schema
export const forgotPasswordRequestSchema = z
  .object({
    email: emailSchema.optional(),
    phoneNumber: phoneSchema.optional(),
    method: z
      .enum(["email", "whatsapp"])
      .optional()
      .describe("Delivery method"),
  })
  .refine(
    (data) => data.email !== undefined || data.phoneNumber !== undefined,
    {
      message: "Either email or phone number is required",
      path: ["email", "phoneNumber"],
    },
  );

// Forgot password request type
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

// Forgot password response schema
export const forgotPasswordResponseSchema = z.object({
  token: z.string().describe("Reset token"),
});

// Forgot password response type
export type ForgotPasswordResponse = z.infer<
  typeof forgotPasswordResponseSchema
>;

// Verify OTP request schema
export const verifyOtpRequestSchema = z.object({
  otp: otpSchema,
  token: z.string().describe("Reset token"),
});

// Verify OTP request type
export type VerifyOtpRequest = z.infer<typeof verifyOtpRequestSchema>;

// Verify OTP response schema
export const verifyOtpResponseSchema = z.object({
  success: z.boolean().describe("Success status"),
  token: z.string().describe("New token for password reset"),
});

// Verify OTP response type
export type VerifyOtpResponse = z.infer<typeof verifyOtpResponseSchema>;

// Reset password request schema
export const resetPasswordRequestSchema = z
  .object({
    token: z.string().describe("Reset token"),
    password: passwordSchema.describe("New password"),
    confirmPassword: z.string().describe("Confirm password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Reset password request type
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

// Reset password response schema
export const resetPasswordResponseSchema = z.object({
  success: z.boolean().describe("Success status"),
});

// Reset password response type
export type ResetPasswordResponse = z.infer<typeof resetPasswordResponseSchema>;

// Update password request schema
export const updatePasswordRequestSchema = z
  .object({
    currentPassword: passwordSchema.describe("Current password"),
    newPassword: passwordSchema.describe("New password"),
    confirmPassword: z.string().describe("Confirm new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Update password request type
export type UpdatePasswordRequest = z.infer<typeof updatePasswordRequestSchema>;

// Update password response schema
export const updatePasswordResponseSchema = z.object({
  updated: z.boolean().describe("Update status"),
});

// Update password response type
export type UpdatePasswordResponse = z.infer<
  typeof updatePasswordResponseSchema
>;
