/* eslint-disable no-console */
import * as argon2 from "argon2";
import { eq, or } from "drizzle-orm";

import db from "@/db";
import { users } from "@/db/models";

const TEAM_EMAILS = [
  "lydia.ndongo@edoshop.store",
  "edwige.tchana@edoshop.store",
  "aurelien.nekdem@edoshop.store",
  "kenna.nahwedga@edoshop.store",
  "samira.nchars@edoshop.store",
];

const password = process.env.TEAM_USER_PASSWORD;
const dryRun = process.argv.includes("--dry-run");

const fullNameFromEmail = (email: string) => {
  const [localPart] = email.split("@");
  return localPart
    .split(".")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

if (!password && !dryRun) {
  throw new Error(
    "TEAM_USER_PASSWORD is required. Example: TEAM_USER_PASSWORD='Edoshop.2026' npm run users:upsert-team",
  );
}

const passwordHash = password ? await argon2.hash(password) : "";
const now = new Date().toISOString();

for (const email of TEAM_EMAILS) {
  const username = email;
  const fullName = fullNameFromEmail(email);

  const [existingUser] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)))
    .limit(1);

  if (dryRun) {
    console.log(`${existingUser ? "Would update" : "Would create"} ${email}`);
    continue;
  }

  if (existingUser) {
    await db
      .update(users)
      .set({
        username,
        email,
        fullName,
        password: passwordHash,
        isAdmin: true,
        isActive: true,
        isEmailVerified: true,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        updatedAt: now,
      })
      .where(eq(users.id, existingUser.id));

    console.log(`Updated ${email}`);
    continue;
  }

  await db.insert(users).values({
    username,
    email,
    fullName,
    password: passwordHash,
    isAdmin: true,
    phoneNumber: null,
    profilePhotoUrl: null,
    isActive: true,
    isEmailVerified: true,
    isPhoneNumberVerified: false,
    createdBy: null,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    isDeleted: false,
    deletedBy: null,
  });

  console.log(`Created ${email}`);
}

console.log(dryRun ? "Dry run complete." : "Team admin users are ready.");
process.exit(0);
