import type { Database } from "@/db";

import { RETURNS_DATA } from "@/constants/returns.constants";

import { returns } from "../models/returns";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < RETURNS_DATA.length; i += CHUNK_SIZE) {
    const chunk = RETURNS_DATA.slice(i, i + CHUNK_SIZE);
    await db.insert(returns).values(chunk);
  }
}
