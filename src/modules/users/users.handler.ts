import type { AppRouteHandler } from "@/lib/types";

import type {
  ForgotPasswordRoute,
  ListAllEmailsRoute,
  ListAllUserNamesRoute,
  LoginRoute,
  RefreshTokenRoute,
  RegisterUserWithoutRolesRoute,
  ResetPasswordRoute,
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
import { successResponse } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { UsersService } from "@/modules/users/users.service";

// Create service instances
const usersService = new UsersService();

export const login: AppRouteHandler<LoginRoute> = async (c) => {
  const { email, phoneNumber, password } = c.req.valid("json");

  const result = await usersService.login({ email, phoneNumber, password });

  const response: LoginResponse = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    user: result.user,
  };

  return c.json(
    successResponse(response, STANDARD_MESSAGES.AUTH.LOGIN_SUCCESS),
    HttpStatusCodes.OK,
  );
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
  const { email, phoneNumber } = c.req.valid("json");

  // Use auth service
  const result = await usersService.forgotPassword({
    email,
    phoneNumber,
    ipAddress: c.var.ipAddress,
    userAgent: c.var.userAgent,
  });

  const response: ForgotPasswordResponse = {
    token: result.token,
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
  const { token, password, confirmPassword } = c.req.valid("json");

  // Use auth service
  const result = await usersService.resetPassword({
    token,
    password,
    confirmPassword,
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
