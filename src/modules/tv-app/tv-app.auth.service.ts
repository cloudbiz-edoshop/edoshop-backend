import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/config";
import { ForbiddenError, UnauthorizedError } from "@/core/errors";
import {
  TV_ACCESS_TOKEN_EXPIRY_SECONDS,
  TV_REFRESH_TOKEN_EXPIRY_SECONDS,
} from "./tv-app.constants";
import { tvAppRepository } from "./tv-app.repository";

export type TvDeviceTokenPayload = {
  type: "tv_device";
  deviceId: number;
  deviceKey: string;
  scope: ["tv:read"];
  iat: number;
  exp: number;
};

const base64UrlEncode = (value: string | Buffer) =>
  Buffer.from(value).toString("base64url");

const signHs256 = (payload: Record<string, unknown>, secret: string) => {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
};

const verifyHs256 = <T>(token: string, secret: string): T => {
  const [encodedHeader, encodedPayload, signature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new UnauthorizedError("Invalid TV device token");
  }

  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(data)
    .digest("base64url");
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new UnauthorizedError("Invalid TV device token");
  }

  const payload = JSON.parse(
    Buffer.from(encodedPayload, "base64url").toString("utf8"),
  ) as Record<string, unknown>;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp <= now) {
    throw new UnauthorizedError("TV device token expired");
  }

  return payload as T;
};

export class TvAppAuthService {
  private getSecret() {
    return env.JWT_SECRET;
  }

  signAccessToken(deviceId: number, deviceKey: string) {
    const now = Math.floor(Date.now() / 1000);
    const payload: TvDeviceTokenPayload = {
      type: "tv_device",
      deviceId,
      deviceKey,
      scope: ["tv:read"],
      iat: now,
      exp: now + TV_ACCESS_TOKEN_EXPIRY_SECONDS,
    };
    return signHs256(payload, this.getSecret());
  }

  verifyAccessToken(token: string): TvDeviceTokenPayload {
    const payload = verifyHs256<TvDeviceTokenPayload>(token, this.getSecret());
    if (payload.type !== "tv_device" || !payload.deviceId) {
      throw new UnauthorizedError("Invalid TV device token scope");
    }
    return payload;
  }

  async authenticateDevice(deviceKey: string, deviceSecret: string) {
    const device = await tvAppRepository.findDeviceByKey(deviceKey);
    if (!device || !device.isActive || device.revokedAt) {
      throw new UnauthorizedError("Invalid TV device credentials");
    }

    const valid = await tvAppRepository.verifyDeviceSecret(
      device.secretHash,
      deviceSecret,
    );
    if (!valid) {
      throw new UnauthorizedError("Invalid TV device credentials");
    }

    await tvAppRepository.touchDeviceSeen(device.id);
    const accessToken = this.signAccessToken(device.id, device.deviceKey);
    const refreshToken = tvAppRepository.generateRefreshToken();
    const expiresAt = new Date(
      Date.now() + TV_REFRESH_TOKEN_EXPIRY_SECONDS * 1000,
    ).toISOString();

    await tvAppRepository.createRefreshToken({
      deviceId: device.id,
      tokenHash: tvAppRepository.hashRefreshToken(refreshToken),
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: TV_ACCESS_TOKEN_EXPIRY_SECONDS,
      tokenType: "Bearer" as const,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const tokenHash = tvAppRepository.hashRefreshToken(refreshToken);
    const stored = await tvAppRepository.findRefreshTokenByHash(tokenHash);
    if (!stored || new Date(stored.expiresAt).getTime() <= Date.now()) {
      throw new UnauthorizedError("Invalid or expired TV refresh token");
    }

    const device = await tvAppRepository.findDeviceById(stored.deviceId);
    if (!device || !device.isActive || device.revokedAt) {
      throw new ForbiddenError("TV device is disabled");
    }

    await tvAppRepository.revokeRefreshToken(stored.id);
    await tvAppRepository.touchDeviceSeen(device.id);

    const accessToken = this.signAccessToken(device.id, device.deviceKey);
    const nextRefreshToken = tvAppRepository.generateRefreshToken();
    const expiresAt = new Date(
      Date.now() + TV_REFRESH_TOKEN_EXPIRY_SECONDS * 1000,
    ).toISOString();

    await tvAppRepository.createRefreshToken({
      deviceId: device.id,
      tokenHash: tvAppRepository.hashRefreshToken(nextRefreshToken),
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      expiresIn: TV_ACCESS_TOKEN_EXPIRY_SECONDS,
      tokenType: "Bearer" as const,
    };
  }

  async assertDeviceAllowed(deviceId: number) {
    const device = await tvAppRepository.findDeviceById(deviceId);
    if (!device || !device.isActive || device.revokedAt) {
      throw new ForbiddenError("TV device is disabled");
    }
    await tvAppRepository.touchDeviceSeen(device.id);
    return device;
  }
}

export const tvAppAuthService = new TvAppAuthService();
