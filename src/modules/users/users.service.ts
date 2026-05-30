import type { TX } from "@/lib/types";

import type {
  CreateUserDataWithEmail,
  CreateUserDataWithEmailAndPhone,
  CreateUserDataWithPhoneNumber,
  CreateUserResponseWithEmail,
  CreateUserResponseWithEmailAndPhone,
  CreateUserResponseWithPhoneNumber,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  UpdatePasswordRequest,
  UpdatePasswordResponse,
  UpdateUser,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from "@/modules/users/users.schema";
import * as argon2 from "argon2";

import { addMinutes } from "@/common/date-utils";
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/core/errors";
import {
  signJwtToken,
  signRefreshToken,
  verifyJwtToken,
} from "@/core/middlewares/jwt";
import { db } from "@/db";
import {
  generatePasswordResetJWT,
  generatePasswordResetToken,
  verifyPasswordResetJWT,
  verifyPasswordResetToken,
} from "@/lib/generate-token";
import { sendEmail } from "@/lib/send-email";
import sendWhatsapp from "@/lib/send-whatsapp";
import { UserRepository } from "@/modules/users/users.repository";

import { AddressService } from "../addresses/addresses.service";

/**
 * JWT refresh token payload structure
 * Contains user identifiers and token version for verification
 */
interface JWTRefreshTokenPayload {
  userId: number;
  username: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

/**
 * Password reset JWT payload structure
 * Contains user ID and reset token for verification
 */
interface PasswordResetJWTPayload {
  userId: number;
  token: string;
  iat?: number;
  exp?: number;
}

/**
 * Service for authentication and user account management
 * Handles user creation, authentication, password reset, and token management
 */
export class UsersService {
  private readonly userRepository: UserRepository;
  private readonly addressService: AddressService;

  /**
   * Create a new UsersService
   * Initializes the user repository for database operations
   */
  constructor() {
    this.userRepository = new UserRepository();
    this.addressService = new AddressService();
  }

  /**
   * Create a new user with email
   *
   * @param userData - User data including email and password
   * @returns The created user object (without password)
   */
  async createUserWithEmail(
    userData: CreateUserDataWithEmail,
  ): Promise<CreateUserResponseWithEmail> {
    return await db.transaction(async (tx) => {
      // hash password
      if (userData.password) {
        userData.password = await argon2.hash(userData.password);
      } else {
        userData.password = undefined;
      }
      const user = await this.userRepository.createWithEmail(tx, {
        ...userData,
        password: userData.password,
      });
      return user as CreateUserResponseWithEmail;
    });
  }

  /**
   * Create a new user with phone number
   *
   * @param userData - User data including phone number
   * @returns The created user object
   */
  async createUserWithPhoneNumber(
    userData: CreateUserDataWithPhoneNumber,
  ): Promise<CreateUserResponseWithPhoneNumber> {
    return await db.transaction(async (tx) => {
      const user = await this.userRepository.createWithPhoneNumber(
        tx,
        userData,
      );
      return user as CreateUserResponseWithPhoneNumber;
    });
  }

  /**
   * Find a user by email or create a new one if not found
   *
   * @param userData - User data including email and password
   * @returns The existing or newly created user object
   */
  async findOrCreateUserWithEmail(
    userData: CreateUserDataWithEmail,
  ): Promise<CreateUserResponseWithEmail> {
    const user = await this.userRepository.findByEmail(userData.email);
    if (user) {
      return user as CreateUserResponseWithEmail;
    }

    return this.createUserWithEmail(userData);
  }

  /**
   * Find a user by phone number or create a new one if not found
   *
   * @param userData - User data including phone number
   * @returns The existing or newly created user object
   */
  async findOrCreateUserWithPhoneNumber(
    userData: CreateUserDataWithPhoneNumber,
  ): Promise<CreateUserResponseWithPhoneNumber> {
    const user = await this.userRepository.findByPhoneNumber(
      userData.phoneNumber,
    );
    if (user) {
      return user as CreateUserResponseWithPhoneNumber;
    }
    return this.createUserWithPhoneNumber(userData);
  }

  /**
   * Authenticate a user with email/phone and password
   *
   * @param loginData - Login request data containing email/phone and password
   * @returns Authentication tokens and user data
   * @throws ValidationError if required fields are missing
   * @throws UnauthorizedError if credentials are invalid
   */
  async login(loginData: LoginRequest): Promise<LoginResponse> {
    const { email, phoneNumber, password } = loginData;

    if (!email && !phoneNumber) {
      throw new ValidationError("Email or phone number is required");
    }

    if (!password) {
      throw new ValidationError("Password is required");
    }

    let user;

    if (email) {
      user = await this.userRepository.findByEmail(email);
    } else if (phoneNumber) {
      user = await this.userRepository.findByPhoneNumber(phoneNumber);
    }

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (!user.password) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const passwordValid = await argon2.verify(user.password, password);

    if (!passwordValid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Remove password from the user object
    const { password: _, ...userWithoutPassword } = user;
    user = userWithoutPassword;

    // Generate token version for the refresh token
    const tokenVersion = Math.floor(Math.random() * 1000000);

    // Generate tokens
    const accessToken = await signJwtToken({
      userId: user.id,
      username: user.username,
    });

    const refreshToken = await signRefreshToken({
      userId: user.id,
      username: user.username,
      tokenVersion,
    });

    // Map to UserDTO
    const userDto: LoginResponse = {
      user,
      accessToken,
      refreshToken,
    };

    return userDto;
  }

  /**
   * Refresh an access token using a refresh token
   *
   * @param refreshData - Refresh token request data
   * @returns New access token and refresh token pair
   * @throws ValidationError if refresh token is missing
   * @throws UnauthorizedError if token is invalid or expired
   */
  async refreshToken(
    refreshData: RefreshTokenRequest,
  ): Promise<RefreshTokenResponse> {
    const { refreshToken } = refreshData;

    if (!refreshToken) {
      throw new ValidationError("Refresh token is required");
    }

    // Verify refresh token
    let payload: JWTRefreshTokenPayload;

    try {
      payload = await verifyJwtToken(refreshToken);
    } catch (error) {
      console.error(error);
      throw new UnauthorizedError("Invalid refresh token");
    }

    // Check if token exists in database
    const storedToken = await this.userRepository.findRefreshToken(
      payload.userId,
      payload.tokenVersion,
    );

    if (!storedToken || storedToken.isRevoked) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    // Get user
    const user = await this.userRepository.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    // Generate new token version
    const newTokenVersion = Math.floor(Math.random() * 1000000);

    // Generate new tokens
    const accessToken = await signJwtToken({
      userId: user.id,
      username: user.username,
    });

    const newRefreshToken = await signRefreshToken({
      userId: user.id,
      username: user.username,
      tokenVersion: newTokenVersion,
    });

    // Save new refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await db.transaction(async (tx) => {
      await this.userRepository.saveRefreshToken(
        tx,
        user.id,
        newTokenVersion,
        expiresAt,
      );

      // Revoke old refresh token
      await this.userRepository.revokeRefreshToken(
        tx,
        payload.userId,
        payload.tokenVersion,
      );
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Initiate password reset process by sending OTP via email or phone
   *
   * @param forgotData - Request data with email/phone and IP/user agent for tracking
   * @returns Confirmation of OTP delivery
   * @throws ValidationError if required fields are missing
   * @throws NotFoundError if user doesn't exist
   */
  async forgotPassword(
    forgotData: ForgotPasswordRequest & {
      ipAddress: string;
      userAgent: string;
    },
  ): Promise<ForgotPasswordResponse> {
    const {
      email,
      phoneNumber,
      method = "email",
      ipAddress,
      userAgent,
    } = forgotData;
    let user;
    if (email) {
      user = await this.userRepository.findByEmail(email);
    } else if (phoneNumber) {
      user = await this.userRepository.findByPhoneNumber(phoneNumber);
    }

    if (!user) {
      throw new ValidationError("User not found");
    }

    // Generate reset token
    const plainToken = await generatePasswordResetToken();
    const hash = await argon2.hash(plainToken);

    // Use our utility for adding minutes instead of direct date manipulation
    const expiresAt = addMinutes(new Date(), 30); // 30 minutes from now

    const { id: tokenId } = await db.transaction(async (tx) => {
      return await this.userRepository.saveResetToken(
        tx,
        user.id,
        hash,
        expiresAt,
        ipAddress,
        userAgent,
        method,
      );
    });

    // Generate JWT for the reset process (ensure this returns a string not a Promise)
    const token = await generatePasswordResetJWT(
      user.id,
      hash,
      tokenId,
      Math.floor(expiresAt.getTime() / 1000),
    );

    // Send notification based on method
    if (method === "email" && user.email) {
      await sendEmail({
        email: user.email,
        subject: "Password Reset",
        message: `Your password reset code is: ${plainToken}`,
        html: `<p>Your password reset code is: <strong>${plainToken}</strong></p>`,
      });
    } else if (method === "whatsapp" && user.phoneNumber) {
      await sendWhatsapp({
        phoneNumber: user.phoneNumber,
        message: `Your password reset code is: ${plainToken}`,
      });
    }

    return {
      token,
    };
  }

  /**
   * Verify the OTP sent during password reset request
   *
   * @param verifyData - OTP and email/phone for verification
   * @returns Reset token for password reset step
   * @throws ValidationError if required fields are missing
   * @throws UnauthorizedError if OTP is invalid or expired
   */
  async verifyOtp(verifyData: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    const { otp, token } = verifyData;

    if (!otp || !token) {
      throw new ValidationError("OTP and token are required");
    }

    // Verify JWT
    const payload = (await verifyPasswordResetJWT(
      token,
    )) as PasswordResetJWTPayload;

    if (!payload) {
      throw new UnauthorizedError("Invalid token");
    }

    // Get user
    const user = await this.userRepository.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    // Get stored reset token
    const storedToken = await this.userRepository.findResetToken(payload.token);

    if (!storedToken) {
      throw new UnauthorizedError("Invalid or expired token");
    }

    // Verify OTP
    const otpValid = await verifyPasswordResetToken(storedToken.token, otp);

    if (!otpValid) {
      throw new UnauthorizedError("Invalid OTP");
    }

    return {
      success: true,
      token,
    };
  }

  /**
   * Reset user password using reset token from OTP verification
   *
   * @param resetData - Reset token and new password
   * @returns Confirmation of password reset
   * @throws ValidationError if required fields are missing
   * @throws UnauthorizedError if reset token is invalid or expired
   */
  async resetPassword(
    resetData: ResetPasswordRequest,
  ): Promise<ResetPasswordResponse> {
    const { token, password } = resetData;

    if (!token || !password) {
      throw new ValidationError("Token and password are required");
    }

    // Verify JWT
    const payload = (await verifyPasswordResetJWT(
      token,
    )) as PasswordResetJWTPayload;

    if (!payload) {
      throw new UnauthorizedError("Invalid token");
    }

    // Get stored reset token
    const storedToken = await this.userRepository.findResetToken(payload.token);

    if (!storedToken) {
      throw new UnauthorizedError("Invalid or expired token");
    }

    // Get user
    const user = await this.userRepository.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    // Hash password
    const passwordHash = await argon2.hash(password);

    // Update password
    await db.transaction(async (tx) => {
      await this.userRepository.updatePassword(tx, user.id, passwordHash);

      // Mark reset token as used
      await this.userRepository.markResetTokenAsUsed(tx, payload.token);
    });

    return { success: true };
  }

  /**
   * Update user password (when already authenticated)
   *
   * @param updateData - Current password and new password
   * @param userId - ID of the authenticated user
   * @returns Confirmation of password update
   * @throws ValidationError if passwords don't meet requirements
   * @throws UnauthorizedError if current password is incorrect
   */
  async updatePassword(
    updateData: UpdatePasswordRequest,
    userId: number,
  ): Promise<UpdatePasswordResponse> {
    const { currentPassword, newPassword } = updateData;

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ValidationError("User not found");
    }

    if (!user.password) {
      throw new ValidationError("User has no password");
    }

    const passwordMatch = await argon2.verify(user.password, currentPassword);
    if (!passwordMatch) {
      throw new ValidationError("Invalid current password");
    }

    const hashedPassword = await argon2.hash(newPassword);
    await db.transaction(async (tx) => {
      await this.userRepository.updatePassword(tx, user.id, hashedPassword);
    });

    return {
      updated: true,
    };
  }

  /**
   * Delete a user (soft delete)
   *
   * @param id - User ID
   * @param deletedBy - User ID who deleted this user
   * @returns Deleted user
   */
  async deleteUser(id: number, deletedBy: number) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    return await db.transaction(async (tx) => {
      return await this.userRepository.softDelete(tx, id, deletedBy);
    });
  }

  /**
   * Create user with email within an active database transaction
   *
   * @param tx - Active database transaction
   * @param userData - User data including email and password
   * @returns The created user
   */
  async createUserWithEmailInTransaction(
    tx: TX,
    userData: CreateUserDataWithEmail,
  ) {
    // if password is provided, hash it
    if (userData.password) {
      userData.password = await argon2.hash(userData.password);
    } else {
      userData.password = undefined;
    }
    const user = await this.userRepository.createWithEmail(tx, {
      ...userData,
      password: userData.password,
    });
    return user as CreateUserResponseWithEmail;
  }

  /**
   * Create user with email and phone number within an active database transaction
   *
   * @param tx - Active database transaction
   * @param userData - User data including email and phone number
   * @returns The created user
   */
  async createUserWithEmailAndPhoneNumberInTransaction(
    tx: TX,
    userData: CreateUserDataWithEmailAndPhone,
  ) {
    // if password is provided, hash it
    if (userData.password) {
      userData.password = await argon2.hash(userData.password);
    } else {
      userData.password = undefined;
    }
    const user = await this.userRepository.createWithEmail(tx, {
      ...userData,
      password: userData.password,
    });
    return user as CreateUserResponseWithEmailAndPhone;
  }

  /**
   * Update user with email within an active database transaction
   *
   * @param tx - Active database transaction
   * @param userId - User ID
   * @param userData - User data including email and password
   * @returns The updated user
   */
  async updateUserWithEmailInTransaction(
    tx: TX,
    userId: number,
    userData: UpdateUser,
  ) {
    // if password is provided, hash it
    if (userData.password) {
      userData.password = await argon2.hash(userData.password);
    }
    return await this.userRepository.updateUser(tx, userId, userData);
  }

  async getAllUserNames() {
    const userNames = (await this.userRepository.getAllUserNames()).map(
      (user) => user.username,
    );
    return userNames;
  }

  async getAllEmails() {
    const users = await this.userRepository.getAllEmails();
    // Filter out null emails and map to strings
    const emails = users
      .map((user) => user.email)
      .filter((email): email is string => email !== null);
    return emails;
  }
}
