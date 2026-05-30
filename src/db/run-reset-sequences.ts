/* eslint-disable no-console */
/**
 * Standalone script to reset all database sequences.
 * Run this after manually inserting data with explicit IDs.
 *
 * Usage: pnpm db:reset-sequences
 */

import db from "@/db";

import { resetAllSequences } from "./reset-sequences";

console.log("Starting sequence reset...\n");

await resetAllSequences(db);

await db.$client.end();

console.log("Done!");
