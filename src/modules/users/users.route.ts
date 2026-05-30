import { createRoute, z } from "@hono/zod-openapi";

import { EntityType, OperationType, STANDARD_MESSAGES } from "@/constants";
import {
  jwtMiddleware,
  rolesAndPermissionsMiddleware,
} from "@/core/middlewares";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import {
  commonErrorResponses,
  jsonContent,
  jsonContentRequired,
} from "@/lib/openapi/helpers";
import { createSuccessResponseSchema } from "@/lib/openapi/schemas/create-api-response";
import { jwtHeaderSchema } from "@/lib/zod-schemas/common-schemas";
import {
  forgotPasswordRequestSchema,
  forgotPasswordResponseSchema,
  loginRequestSchema,
  loginResponseSchema,
  refreshTokenRequestSchema,
  refreshTokenResponseSchema,
  registerUserAdminPanelRequestSchema,
  registerUserAdminPanelResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  updatePasswordRequestSchema,
  updatePasswordResponseSchema,
  verifyOtpRequestSchema,
  verifyOtpResponseSchema,
} from "@/modules/users/users.schema";

const tags = ["Users"];

// Define login route
export const loginRoute = createRoute({
  method: "post",
  path: "/login",
  tags,
  summary: "User login",
  description: "Login with email/phone number and password",
  request: {
    body: jsonContentRequired(loginRequestSchema, "Login Credentials"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        loginResponseSchema,
        STANDARD_MESSAGES.AUTH.LOGIN_SUCCESS,
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.NOT_FOUND,
        HttpStatusCodes.TOO_MANY_REQUESTS,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      loginRequestSchema,
    ),
  },
});

// Define route for refreshing access token
export const refreshTokenRoute = createRoute({
  method: "post",
  path: "/refresh-token",
  tags,
  summary: "Refresh access token",
  description: "Generate a new access token using a valid refresh token",
  request: {
    body: jsonContentRequired(refreshTokenRequestSchema, "Refresh token"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        refreshTokenResponseSchema,
        STANDARD_MESSAGES.AUTH.TOKEN_REFRESHED,
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      refreshTokenRequestSchema,
    ),
  },
});

export const forgotPasswordRoute = createRoute({
  path: "/forgot-password",
  method: "post",
  tags,
  summary: "Forgot Password",
  description: "Request a password reset token via email",
  request: {
    body: jsonContentRequired(
      forgotPasswordRequestSchema,
      "Forgotten Password",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        forgotPasswordResponseSchema,
        STANDARD_MESSAGES.AUTH.PASSWORD_RESET_REQUEST,
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      forgotPasswordRequestSchema,
    ),
  },
});

export const verifyOtpRoute = createRoute({
  path: "/verify-otp",
  method: "post",
  tags,
  summary: "Verify OTP",
  description: "Verify OTP sent for password reset",
  request: {
    body: jsonContentRequired(verifyOtpRequestSchema, "OTP Verification"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        verifyOtpResponseSchema,
        STANDARD_MESSAGES.AUTH.OTP_VERIFIED,
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      verifyOtpRequestSchema,
    ),
  },
});

export const resetPasswordRoute = createRoute({
  path: "/reset-password",
  method: "post",
  tags,
  summary: "Reset Password",
  description: "Reset password using verified token",
  request: {
    body: jsonContentRequired(resetPasswordRequestSchema, "Password Reset"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        resetPasswordResponseSchema,
        STANDARD_MESSAGES.AUTH.PASSWORD_RESET_SUCCESS,
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      resetPasswordRequestSchema,
    ),
  },
});

export const updatePasswordRoute = createRoute({
  path: "/update-password",
  method: "post",
  tags,
  summary: "Update Password",
  description: "Update password for the user",
  middleware: [jwtMiddleware()] as const,
  request: {
    headers: jwtHeaderSchema,
    body: jsonContentRequired(updatePasswordRequestSchema, "Update Password"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        updatePasswordResponseSchema,
        STANDARD_MESSAGES.AUTH.PASSWORD_UPDATE_SUCCESS,
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      updatePasswordRequestSchema,
    ),
  },
});

export const getAllUserNames = createRoute({
  path: "/users/user-names",
  summary: "List all user names",
  description: "List all user names",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware(
      [
        { entity: EntityType.USERS, operation: OperationType.READ },
        { entity: EntityType.EMPLOYEES, operation: OperationType.READ },
      ],
      "ANY",
    ),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        z.object({
          userNames: z.array(z.string()),
        }),
      ),
      "The list of all user names",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({}),
    ),
  },
});

export const getAllEmails = createRoute({
  path: "/users/emails",
  summary: "List all user emails",
  description: "List all user emails",
  method: "get",
  tags,
  middleware: [
    jwtMiddleware(),
    rolesAndPermissionsMiddleware(
      [
        { entity: EntityType.USERS, operation: OperationType.READ },
        { entity: EntityType.EMPLOYEES, operation: OperationType.READ },
      ],
      "ANY",
    ),
  ] as const,
  request: {
    headers: jwtHeaderSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(
        z.object({
          emails: z.array(z.string()),
        }),
      ),
      "The list of all user emails",
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNAUTHORIZED,
        HttpStatusCodes.FORBIDDEN,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      z.object({}),
    ),
  },
});

// Register User without Roles

export const registerUserWithoutRolesRoute = createRoute({
  path: "/register-user-without-roles",
  method: "post",
  tags,
  summary: "Register User without Roles",
  description: "Register a new user without assigning any roles",
  request: {
    body: jsonContentRequired(
      registerUserAdminPanelRequestSchema,
      "Register User without Roles",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      createSuccessResponseSchema(
        registerUserAdminPanelResponseSchema,
        STANDARD_MESSAGES.AUTH.USER_REGISTERED_SUCCESSFULLY,
      ),
    ),
    ...commonErrorResponses(
      [
        HttpStatusCodes.UNPROCESSABLE_ENTITY,
        HttpStatusCodes.BAD_REQUEST,
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      ],
      updatePasswordRequestSchema,
    ),
  },
});

export type LoginRoute = typeof loginRoute;
export type ListAllUserNamesRoute = typeof getAllUserNames;
export type ListAllEmailsRoute = typeof getAllEmails;
export type RefreshTokenRoute = typeof refreshTokenRoute;
export type ForgotPasswordRoute = typeof forgotPasswordRoute;
export type VerifyOtpRoute = typeof verifyOtpRoute;
export type ResetPasswordRoute = typeof resetPasswordRoute;
export type UpdatePasswordRoute = typeof updatePasswordRoute;
export type RegisterUserWithoutRolesRoute =
  typeof registerUserWithoutRolesRoute;
