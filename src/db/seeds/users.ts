import type { Database } from "@/db";

import * as argon2 from "argon2";

import { ADMINS, CUSTOMER_USERS, DRIVER_USERS, EMPLOYEES } from "@/constants";

import { users as usersTable } from "../models";

const CHUNK_SIZE = 50;

const USERS = [...ADMINS, ...EMPLOYEES, ...DRIVER_USERS, ...CUSTOMER_USERS];

export default async function seed(db: Database) {
  // Process in chunks
  for (let i = 0; i < USERS.length; i += CHUNK_SIZE) {
    const chunk = USERS.slice(i, i + CHUNK_SIZE).map(async (user) => {
      const passwordHash = await argon2.hash(user.password);
      return {
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
      };
    });
    const x = await Promise.all(chunk);
    await db.insert(usersTable).values(x);
  }
}
