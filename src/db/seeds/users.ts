import type { Database } from "@/db";

import * as argon2 from "argon2";

import { ADMINS, CUSTOMER_USERS, DRIVER_USERS, EMPLOYEES } from "@/constants";

import { users as usersTable } from "../models";

const CHUNK_SIZE = 50;

const USERS = [...ADMINS, ...EMPLOYEES, ...DRIVER_USERS, ...CUSTOMER_USERS];

export default async function seed(db: Database) {
  const seedPassword = process.env.SEED_USER_PASSWORD?.trim();
  const passwordHash = seedPassword ? await argon2.hash(seedPassword) : null;

  if (!passwordHash) {
    console.warn(
      "SEED_USER_PASSWORD is not set — seeded users will have no local password. " +
        "Use Nextcloud sign-in or set a password via the Admin Panel.",
    );
  }

  // Process in chunks
  for (let i = 0; i < USERS.length; i += CHUNK_SIZE) {
    const chunk = USERS.slice(i, i + CHUNK_SIZE).map((user) => ({
      username: user.username,
      isAdmin: user.isAdmin,
      email: user.email,
      password: passwordHash,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      profilePhotoUrl: user.profilePhotoUrl,
      isActive: true,
      isEmailVerified: false,
      isPhoneNumberVerified: false,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      isDeleted: false,
      deletedBy: null,
    }));
    await db.insert(usersTable).values(chunk);
  }
}
