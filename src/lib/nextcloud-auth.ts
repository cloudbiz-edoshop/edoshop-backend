import { createHash, randomBytes } from "node:crypto";

import env from "@/config/env.config";

export type NextcloudUserIdentity = {
  id: string;
  email: string | null;
  displayName: string | null;
};

export function isNextcloudAuthEnabled() {
  return Boolean(env.NEXTCLOUD_URL && env.NEXTCLOUD_AUTH_ENABLED);
}

export function isNextcloudOAuthConfigured() {
  return Boolean(
    env.NEXTCLOUD_URL &&
      env.NEXTCLOUD_OAUTH_CLIENT_ID &&
      env.NEXTCLOUD_OAUTH_CLIENT_SECRET &&
      env.NEXTCLOUD_OAUTH_REDIRECT_URI,
  );
}

export function getNextcloudBaseUrl() {
  return env.NEXTCLOUD_URL!.replace(/\/$/, "");
}

export function buildNextcloudAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.NEXTCLOUD_OAUTH_CLIENT_ID!,
    redirect_uri: env.NEXTCLOUD_OAUTH_REDIRECT_URI!,
    state,
  });

  return `${getNextcloudBaseUrl()}/apps/oauth2/authorize?${params.toString()}`;
}

export function createOAuthState() {
  return randomBytes(24).toString("hex");
}

export function hashOAuthState(state: string) {
  return createHash("sha256").update(state).digest("hex");
}

function isOcsSuccess(statuscode?: number) {
  // OCS v1 uses 100; OCS v2 on mydrive.edoshop.online returns 200.
  return statuscode === 100 || statuscode === 200;
}

function parseOcsUserPayload(payload: {
  ocs?: {
    meta?: { statuscode?: number };
    data?: {
      id?: string;
      email?: string | null;
      displayname?: string | null;
    };
  };
}): NextcloudUserIdentity | null {
  const data = payload.ocs?.data;
  if (!isOcsSuccess(payload.ocs?.meta?.statuscode) || !data?.id) {
    return null;
  }

  return {
    id: data.id,
    email: data.email ?? null,
    displayName: data.displayname ?? null,
  };
}

export function normalizeNextcloudLoginIdentifier(raw: string) {
  let value = raw.trim();

  try {
    value = decodeURIComponent(value);
  } catch {
    // Keep the original value when it is not URL-encoded.
  }

  return value.trim();
}

/**
 * Verify Nextcloud App Password credentials via the OCS user endpoint.
 * Returns the authenticated Nextcloud user identity on success.
 */
export async function authenticateNextcloudAppPassword(
  username: string,
  appPassword: string,
): Promise<NextcloudUserIdentity | null> {
  const loginId = normalizeNextcloudLoginIdentifier(username);
  const authorization = Buffer.from(`${loginId}:${appPassword}`).toString(
    "base64",
  );

  const response = await fetch(
    `${getNextcloudBaseUrl()}/ocs/v2.php/cloud/user?format=json`,
    {
      headers: {
        Authorization: `Basic ${authorization}`,
        "OCS-APIRequest": "true",
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Parameters<
    typeof parseOcsUserPayload
  >[0];

  return parseOcsUserPayload(payload);
}

export async function exchangeAuthorizationCode(code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: env.NEXTCLOUD_OAUTH_REDIRECT_URI!,
    client_id: env.NEXTCLOUD_OAUTH_CLIENT_ID!,
    client_secret: env.NEXTCLOUD_OAUTH_CLIENT_SECRET!,
  });

  const response = await fetch(
    `${getNextcloudBaseUrl()}/apps/oauth2/api/v1/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  if (!response.ok) {
    throw new Error(`Nextcloud token exchange failed (${response.status})`);
  }

  return response.json() as Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }>;
}

export async function fetchNextcloudUserIdentity(
  accessToken: string,
): Promise<NextcloudUserIdentity> {
  const response = await fetch(
    `${getNextcloudBaseUrl()}/ocs/v2.php/cloud/user?format=json`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "OCS-APIRequest": "true",
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Nextcloud user lookup failed (${response.status})`);
  }

  const payload = (await response.json()) as Parameters<
    typeof parseOcsUserPayload
  >[0];

  const identity = parseOcsUserPayload(payload);
  if (!identity) {
    throw new Error("Nextcloud user identity is missing");
  }

  return identity;
}
