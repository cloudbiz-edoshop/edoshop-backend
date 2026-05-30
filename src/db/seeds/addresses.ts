import type { Database } from "@/db";

import { ADDRESSES_DATA } from "@/constants/addresses.constants";

import addresses from "../models/addresses";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < ADDRESSES_DATA.length; i += CHUNK_SIZE) {
    const chunk = ADDRESSES_DATA.slice(i, i + CHUNK_SIZE);
    await db.insert(addresses).values(chunk);
  }
}
