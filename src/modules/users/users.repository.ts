import type { TX } from "@/lib/types";

import type {
  CreateUserDataWithEmail,
  CreateUserDataWithPhoneNumber,
  UpdateUser,
} from "@/modules/users/users.schema";
import { and, eq } from "drizzle-orm";

import { formatISODate } from "@/common/date-utils";
import { db } from "@/db";
import { refreshTokens } from "@/db/models";
import { resetTokens } from "@/db/models/reset-tokens";
import users from "@/db/models/users";
/**
 * Repository for user-related database operations
 */
export class UserRepository {
  /**
   * Create a new user using email
   *
   * @param tx - Transaction object
   * @param userData - User data
   * @returns Created user
   */
  async createWithEmail(tx: TX, userData: CreateUserDataWithEmail) {
    const [result] = await tx.insert(users).values(userData).returning();
    return result;
  }

  /**
   * Create a new user using phone number
   *
   * @param tx - Transaction object
   * @param userData - User data
   * @returns Created user
   */
  async createWithPhoneNumber(tx: TX, userData: CreateUserDataWithPhoneNumber) {
    const [result] = await tx.insert(users).values(userData).returning();
    return result;
  }

  /**
   * Find a user by email
   *
   * @param email - User email
   * @returns User if found, null otherwise
   */
  async findByEmail(email: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return {
      ...result[0],
      email: result[0].email as string,
    };
  }

  /**
   * Find a user by phone number
   *
   * @param phoneNumber - User phone number
   * @returns User if found, null otherwise
   */
  async findByPhoneNumber(phoneNumber: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find a user by ID
   *
   * @param id - User ID
   * @returns User if found, null otherwise
   */
  async findById(id: number) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find a user by username
   *
   * @param username - User username
   * @returns User if found, null otherwise
   */
  async findByUsername(username: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0];
  }

  /**
   * Save refresh token for a user
   *
   * @param tx - Transaction object
   * @param userId - User ID
   * @param tokenVersion - Token version
   * @param expiresAt - Expiration timestamp
   * @returns Created refresh token
   */
  async saveRefreshToken(
    tx: TX,
    userId: number,
    tokenVersion: number,
    expiresAt: Date,
  ) {
    const [result] = await tx
      .insert(refreshTokens)
      .values({
        userId,
        tokenVersion,
        expiresAt: formatISODate(expiresAt),
        isRevoked: false,
      })
      .returning();

    return result;
  }

  /**
   * Find refresh token by userId and tokenVersion
   *
   * @param userId - User ID
   * @param tokenVersion - Token version
   * @returns Token if found, null otherwise
   */
  async findRefreshToken(userId: number, tokenVersion: number) {
    const result = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.tokenVersion, tokenVersion),
          eq(refreshTokens.isRevoked, false),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Revoke refresh token
   *
   * @param tx - Transaction object
   * @param userId - User ID
   * @param tokenVersion - Token version
   */
  async revokeRefreshToken(tx: TX, userId: number, tokenVersion: number) {
    await tx
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.tokenVersion, tokenVersion),
        ),
      );
  }

  /**
   * Save password reset token
   *
   * @param tx - Transaction object
   * @param userId - User ID
   * @param token - Reset token
   * @param expiresAt - Expiration timestamp
   * @returns Created reset token
   */
  async saveResetToken(
    tx: TX,
    userId: number,
    token: string,
    expiresAt: Date,
    ipAddress: string,
    userAgent: string,
    deliveryMethod: string,
  ) {
    const [result] = await tx
      .insert(resetTokens)
      .values({
        userId,
        token,
        expiresAt: formatISODate(expiresAt),
        isUsed: false,
        ipAddress,
        userAgent,
        deliveryMethod,
      })
      .returning();

    return result;
  }

  /**
   * Find a reset token
   *
   * @param token - Reset token
   * @returns Token if found, null otherwise
   */
  async findResetToken(token: string) {
    const result = await db
      .select()
      .from(resetTokens)
      .where(and(eq(resetTokens.token, token), eq(resetTokens.isUsed, false)))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Update user password
   * @param tx - Transaction object
   * @param userId - User ID
   * @param passwordHash - Hashed password
   */
  async updatePassword(tx: TX, userId: number, passwordHash: string) {
    await tx
      .update(users)
      .set({ password: passwordHash })
      .where(eq(users.id, userId));
  }

  /**
   * Mark reset token as used
   *
   * @param tx - Transaction object
   * @param token - Reset token
   */
  async markResetTokenAsUsed(tx: TX, token: string) {
    await tx
      .update(resetTokens)
      .set({
        isUsed: true,
        usedAt: formatISODate(new Date()),
      })
      .where(eq(resetTokens.token, token));
  }

  /**
   * Reset failed login attempts
   *
   * @param tx - Transaction object
   * @param userId - User ID
   */
  async resetFailedLoginAttempts(tx: TX, userId: number) {
    await tx
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLoginAt: null,
      })
      .where(eq(users.id, userId));
  }

  /**
   * Increment failed login attempts
   *
   * @param tx - Transaction object
   * @param userId - User ID
   * @param currentAttempts - Current number of failed attempts
   * @param lockUntil - Lock until timestamp
   */
  async incrementFailedLoginAttempts(
    tx: TX,
    userId: number,
    currentAttempts: number,
    lockUntil?: Date,
  ) {
    const updateData: {
      failedLoginAttempts: number;
      lockedUntil?: string | null;
      lastFailedLoginAt?: string | null;
    } = {
      failedLoginAttempts: currentAttempts + 1,
      lastFailedLoginAt: formatISODate(new Date()),
    };

    if (lockUntil) {
      updateData.lockedUntil = formatISODate(lockUntil);
    }

    await tx.update(users).set(updateData).where(eq(users.id, userId));
  }

  /**
   * Update user
   *
   * @param tx - Transaction object
   * @param id - User ID
   * @param data - User data
   * @returns Updated user
   */
  async updateUser(tx: TX, id: number, data: UpdateUser) {
    const [result] = await tx
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();

    return result;
  }

  /**
   * Soft delete a user
   *
   * @param tx - Transaction object
   * @param id - User ID
   * @param deletedBy - Deleted by user ID
   * @returns Deleted user
   */
  async softDelete(tx: TX, id: number, deletedBy: number) {
    const [result] = await tx
      .update(users)
      .set({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy,
        isActive: false,
      })
      .where(eq(users.id, id))
      .returning();

    return result;
  }

  async getAllUserNames() {
    const result = await db
      .select({
        username: users.username,
      })
      .from(users);
    return result;
  }

  async getAllEmails() {
    const result = await db
      .select({
        email: users.email,
      })
      .from(users);
    return result;
  }
}
