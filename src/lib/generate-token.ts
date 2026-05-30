import crypto from "node:crypto";
import * as argon2 from "argon2";
import { sign, verify } from "hono/jwt";

import { env } from "@/config";

const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Generates a random 6-digit numeric OTP (One-Time Password)
 *
 * @returns A string containing a 6-digit numeric OTP
 */
function generateOTP() {
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += numbers[crypto.randomInt(numbers.length)];
  }
  return otp;
}

/**
 * Generates a password reset token
 *
 * Creates a 6-digit OTP that can be sent to users via email or SMS
 * for password reset verification.
 *
 * @returns A Promise that resolves to the generated OTP token
 */
async function generatePasswordResetToken() {
  const token = generateOTP();
  return token;
}

/**
 * Verifies a password reset token against its hashed version
 *
 * Uses argon2 to verify that the provided token matches the previously
 * hashed token stored in the database.
 *
 * @param hashedToken - The hashed token from the database
 * @param token - The plain text token provided by the user
 * @returns A Promise that resolves to true if the token is valid, false otherwise
 */
async function verifyPasswordResetToken(hashedToken: string, token: string) {
  const isVerified = await argon2.verify(hashedToken, token);
  return isVerified;
}

/**
 * Generates a JWT for password reset flow
 *
 * Creates a signed JWT containing the user ID, token information,
 * and expiration time for the password reset process.
 *
 * @param userId - The ID of the user requesting password reset
 * @param token - The hashed token string
 * @param tokenId - The database ID of the token record
 * @param expiresAt - Unix timestamp when the token expires
 * @returns A Promise that resolves to the signed JWT string
 */
async function generatePasswordResetJWT(
  userId: number,
  token: string,
  tokenId: number,
  expiresAt: number,
) {
  // Create a JWT to embed the token and user ID
  const resetToken = await sign(
    {
      userId,
      token,
      tokenId,
      iat: Math.floor(Date.now() / 1000),
      exp: expiresAt,
    },
    env.JWT_SECRET_REST_TOKEN,
  );
  return resetToken;
}

/**
 * Verifies a password reset JWT
 *
 * Validates and decodes the JWT used in the password reset flow.
 * Returns the payload containing user ID and token information if valid.
 *
 * @param token - The JWT token string to verify
 * @returns A Promise that resolves to the decoded token payload or null if invalid
 */
async function verifyPasswordResetJWT(token: string) {
  try {
    const decoded = await verify(token, env.JWT_SECRET_REST_TOKEN, "HS256");
    return decoded as {
      userId: number;
      token: string;
      tokenId: number;
      iat: number;
      exp: number;
    };
  } catch (error) {
    // Token is invalid or expired
    console.error("Error verifying OTP");
    console.error(error);
    return null;
  }
}

export {
  generatePasswordResetJWT,
  generatePasswordResetToken,
  verifyPasswordResetJWT,
  verifyPasswordResetToken,
};
