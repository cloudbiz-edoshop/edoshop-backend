import type { Context } from "hono";

import env from "@/config/env.config";
import { ADMIN_ACCESS_AUTH_METHODS } from "@/constants/admin-access-log.constants";
import { UnauthorizedError } from "@/core/errors";
import {
  buildNextcloudAuthorizeUrl,
  createOAuthState,
  exchangeAuthorizationCode,
  fetchNextcloudUserIdentity,
  getNextcloudBaseUrl,
  hashOAuthState,
  isNextcloudOAuthConfigured,
} from "@/lib/nextcloud-auth";
import { adminAccessLogsService } from "@/modules/admin-access-logs/admin-access-logs.service";
import { PermissionsService } from "@/modules/permissions/permissions.service";
import { UsersService } from "@/modules/users/users.service";

const usersService = new UsersService();
const oauthStates = new Map<string, number>();

function getAdminPanelUrl() {
  return env.ADMIN_PANEL_URL.replace(/\/$/, "");
}

function cleanupExpiredStates() {
  const now = Date.now();
  for (const [key, expiresAt] of oauthStates.entries()) {
    if (expiresAt <= now) {
      oauthStates.delete(key);
    }
  }
}

export async function startNextcloudOAuth(c: Context) {
  if (!isNextcloudOAuthConfigured()) {
    return c.redirect(`${getNextcloudBaseUrl()}/login`);
  }

  cleanupExpiredStates();
  const state = createOAuthState();
  oauthStates.set(hashOAuthState(state), Date.now() + 10 * 60 * 1000);

  return c.redirect(buildNextcloudAuthorizeUrl(state));
}

export async function completeNextcloudOAuth(c: Context) {
  if (!isNextcloudOAuthConfigured()) {
    return c.redirect(`${getAdminPanelUrl()}/login?error=nextcloud_oauth_not_configured`);
  }

  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");

  if (error) {
    return c.redirect(`${getAdminPanelUrl()}/login?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return c.redirect(`${getAdminPanelUrl()}/login?error=missing_oauth_code`);
  }

  cleanupExpiredStates();
  const stateHash = hashOAuthState(state);
  const expiresAt = oauthStates.get(stateHash);
  oauthStates.delete(stateHash);

  if (!expiresAt || expiresAt <= Date.now()) {
    return c.redirect(`${getAdminPanelUrl()}/login?error=invalid_oauth_state`);
  }

  try {
    const tokenPayload = await exchangeAuthorizationCode(code);
    const identity = await fetchNextcloudUserIdentity(tokenPayload.access_token);
    const loginResult = await usersService.loginWithNextcloudIdentity(identity);

    await adminAccessLogsService.recordAttempt({
      userId: loginResult.user.id,
      loginIdentifier: identity.email ?? identity.id,
      authMethod: ADMIN_ACCESS_AUTH_METHODS.NEXTCLOUD_OAUTH,
      ipAddress: c.var.ipAddress,
      userAgent: c.var.userAgent,
      success: true,
    });

    const params = new URLSearchParams({
      accessToken: loginResult.accessToken,
      refreshToken: loginResult.refreshToken,
    });

    return c.redirect(`${getAdminPanelUrl()}/login?${params.toString()}`);
  } catch (cause) {
    const message =
      cause instanceof UnauthorizedError
        ? cause.message
        : "nextcloud_login_failed";

    await adminAccessLogsService.recordAttempt({
      loginIdentifier: c.req.query("state") ?? null,
      authMethod: ADMIN_ACCESS_AUTH_METHODS.NEXTCLOUD_OAUTH,
      ipAddress: c.var.ipAddress,
      userAgent: c.var.userAgent,
      success: false,
      failureReason: message,
    });

    return c.redirect(
      `${getAdminPanelUrl()}/login?error=${encodeURIComponent(message)}`,
    );
  }
}
