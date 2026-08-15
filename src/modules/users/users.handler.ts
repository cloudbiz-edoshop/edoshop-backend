import type { AppRouteHandler } from "@/lib/types";

import type {
  ForgotPasswordRoute,
  GetCurrentUserAccessRoute,
  GetCurrentUserRoute,
  ListAllEmailsRoute,
  ListAllUserNamesRoute,
  LoginRoute,
  RefreshTokenRoute,
  RegisterUserWithoutRolesRoute,
  ResetPasswordRoute,
  UpdateCurrentUserRoute,
  UpdatePasswordRoute,
  VerifyOtpRoute,
} from "@/modules/users/users.route";
import type {
  ForgotPasswordResponse,
  LoginResponse,
  RefreshTokenResponse,
  ResetPasswordResponse,
  UpdatePasswordResponse,
  VerifyOtpResponse,
} from "@/modules/users/users.schema";
import { getConnInfo } from "@hono/node-server/conninfo";

import { STANDARD_MESSAGES } from "@/constants";
import { ADMIN_ACCESS_AUTH_METHODS } from "@/constants/admin-access-log.constants";
import { UnauthorizedError } from "@/core/errors";
import { successResponse } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { adminAccessLogsService } from "@/modules/admin-access-logs/admin-access-logs.service";
import { PermissionsService } from "@/modules/permissions/permissions.service";
import { UsersService } from "@/modules/users/users.service";

// Create service instances
const usersService = new UsersService();
const permissionsService = new PermissionsService();

export const login: AppRouteHandler<LoginRoute> = async (c) => {
  const { email, phoneNumber, username, password } = c.req.valid("json");
  const authMethod = username
    ? ADMIN_ACCESS_AUTH_METHODS.NEXTCLOUD_APP_PASSWORD
    : ADMIN_ACCESS_AUTH_METHODS.LOCAL_PASSWORD;
  const loginIdentifier = username || email || phoneNumber || null;
  const logContext = {
    authMethod,
    ipAddress: c.var.ipAddress,
    userAgent: c.var.userAgent,
    loginIdentifier,
  };

  try {
    const result = await usersService.login({
      email,
      phoneNumber,
      username,
      password,
    });

    await adminAccessLogsService.recordAttempt({
      ...logContext,
      userId: result.user.id,
      success: true,
    });

    const accessProfile = await permissionsService.getUserAccessProfile(
      result.user.id,
    );

    const response: LoginResponse = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
      accessProfile,
    };

    return c.json(
      successResponse(response, STANDARD_MESSAGES.AUTH.LOGIN_SUCCESS),
      HttpStatusCodes.OK,
    );
  } catch (error) {
    await adminAccessLogsService.recordAttempt({
      ...logContext,
      success: false,
      failureReason:
        error instanceof UnauthorizedError || error instanceof Error
          ? error.message
          : "Login failed",
    });
    throw error;
  }
};

export const getCurrentUser: AppRouteHandler<GetCurrentUserRoute> = async (
  c,
) => {
  const payload = c.get("accessTokenPayload");
  const result = await usersService.getCurrentUser(payload.userId);

  return c.json(successResponse(result, STANDARD_MESSAGES.SUCCESS.FETCHED));
};

export const getCurrentUserAccess: AppRouteHandler<
  GetCurrentUserAccessRoute
> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const accessProfile = await permissionsService.getUserAccessProfile(
    payload.userId,
  );

  return c.json(
    successResponse(accessProfile, STANDARD_MESSAGES.SUCCESS.FETCHED),
  );
};

export const updateCurrentUser: AppRouteHandler<
  UpdateCurrentUserRoute
> = async (c) => {
  const payload = c.get("accessTokenPayload");
  const data = c.req.valid("json");
  const result = await usersService.updateCurrentUser(payload.userId, data);

  return c.json(successResponse(result, STANDARD_MESSAGES.SUCCESS.UPDATED));
};

// Refresh token handler to generate new access tokens
export const refreshToken: AppRouteHandler<RefreshTokenRoute> = async (c) => {
  const { refreshToken } = c.req.valid("json");
  const info = getConnInfo(c);

  // Log refresh token attempt
  c.var.logger?.info({
    action: "refresh_token_attempt",
    ip: info.remote.address ?? "unknown",
  });

  // Use auth service for token refresh
  const result = await usersService.refreshToken({ refreshToken });

  const response: RefreshTokenResponse = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  };

  return c.json(
    successResponse(response, STANDARD_MESSAGES.AUTH.TOKEN_REFRESHED),
    HttpStatusCodes.OK,
  );
};

export const forgotPassword: AppRouteHandler<ForgotPasswordRoute> = async (
  c,
) => {
  const { email, phoneNumber, method } = c.req.valid("json");

  // Use auth service
  const result = await usersService.forgotPassword({
    email,
    phoneNumber,
    method,
    ipAddress: c.var.ipAddress,
    userAgent: c.var.userAgent,
  });

  const response: ForgotPasswordResponse = {
    token: result.token,
    ...(result.debugOtp ? { debugOtp: result.debugOtp } : {}),
  };

  return c.json(
    successResponse(response, STANDARD_MESSAGES.AUTH.PASSWORD_RESET_REQUEST),
    HttpStatusCodes.OK,
  );
};

export const verifyOtp: AppRouteHandler<VerifyOtpRoute> = async (c) => {
  const { otp, token } = c.req.valid("json");

  // Use auth service
  const result = await usersService.verifyOtp({ otp, token });

  const response: VerifyOtpResponse = {
    success: result.success,
    token: result.token,
  };

  return c.json(
    successResponse(response, STANDARD_MESSAGES.AUTH.OTP_VERIFIED),
    HttpStatusCodes.OK,
  );
};

export const resetPassword: AppRouteHandler<ResetPasswordRoute> = async (c) => {
  const { token, password, confirmPassword, otp } = c.req.valid("json");

  // Use auth service
  const result = await usersService.resetPassword({
    token,
    password,
    confirmPassword,
    otp,
  });

  const response: ResetPasswordResponse = {
    success: result.success,
  };

  return c.json(
    successResponse(response, STANDARD_MESSAGES.AUTH.PASSWORD_RESET_SUCCESS),
    HttpStatusCodes.OK,
  );
};

export const updatePassword: AppRouteHandler<UpdatePasswordRoute> = async (
  c,
) => {
  const { currentPassword, newPassword, confirmPassword } = c.req.valid("json");
  const user = c.get("user");

  // Log user info
  c.var.logger.info(
    {
      userId: user.id,
      ipAddress: c.var.ipAddress,
      userAgent: c.var.userAgent,
    },
    "Update password attempt",
  );

  const result = await usersService.updatePassword(
    { currentPassword, newPassword, confirmPassword },
    user.id,
  );

  const response: UpdatePasswordResponse = {
    updated: result.updated,
  };

  return c.json(
    successResponse(response, STANDARD_MESSAGES.AUTH.PASSWORD_UPDATE_SUCCESS),
    HttpStatusCodes.OK,
  );
};

export const getAllUserNames: AppRouteHandler<ListAllUserNamesRoute> = async (
  c,
) => {
  const userNames = await usersService.getAllUserNames();
  const response = successResponse(
    { userNames },
    "User names retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const getAllEmails: AppRouteHandler<ListAllEmailsRoute> = async (c) => {
  const emails = await usersService.getAllEmails();
  const response = successResponse(
    { emails },
    "User emails retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const registerUserWithoutRoles: AppRouteHandler<
  RegisterUserWithoutRolesRoute
> = async (c) => {
  const { fullName, username, email, password } = c.req.valid("json");

  // Use auth service to register user
  const result = await usersService.createUserWithEmail({
    fullName,
    username,
    email,
    password,
  });

  const response = {
    id: result.id,
    fullName: result.fullName,
    username: result.username,
    email: result.email,
  };

  return c.json(
    successResponse(
      response,
      STANDARD_MESSAGES.AUTH.USER_REGISTERED_SUCCESSFULLY,
    ),
    HttpStatusCodes.CREATED,
  );
};
