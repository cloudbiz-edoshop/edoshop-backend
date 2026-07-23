/* eslint-disable no-console */
import { eq, or } from "drizzle-orm";

import db from "@/db";
import { employees, users } from "@/db/models";

const NABEEL_IDENTIFIERS = [
  eq(users.username, "nabeel"),
  eq(users.email, "nabeelkhan5666@gmail.com"),
];

const dryRun = process.argv.includes("--dry-run");
const now = new Date().toISOString();

const [nabeelUser] = await db
  .select({ id: users.id, username: users.username, email: users.email })
  .from(users)
  .where(or(...NABEEL_IDENTIFIERS))
  .limit(1);

if (!nabeelUser) {
  console.log("No Nabeel admin login found. Nothing to remove.");
  process.exit(0);
}

console.log(
  `${dryRun ? "Would remove" : "Removing"} admin login: ${nabeelUser.username} (${nabeelUser.email})`,
);

if (dryRun) {
  process.exit(0);
}

await db
  .update(employees)
  .set({
    isDeleted: true,
    deletedAt: now,
    updatedAt: now,
  })
  .where(eq(employees.userId, nabeelUser.id));

await db
  .update(users)
  .set({
    isDeleted: true,
    deletedAt: now,
    isActive: false,
    password: null,
    updatedAt: now,
  })
  .where(eq(users.id, nabeelUser.id));

console.log("Nabeel admin login removed.");
