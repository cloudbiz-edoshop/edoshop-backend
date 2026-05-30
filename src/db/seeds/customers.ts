import type { Database } from "@/db";

import { CUSTOMERS_DATA } from "@/constants/customers.constants";

import { customers } from "../models/customers";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  for (let i = 0; i < CUSTOMERS_DATA.length; i += CHUNK_SIZE) {
    const chunk = CUSTOMERS_DATA.slice(i, i + CHUNK_SIZE);
    await db.insert(customers).values(chunk);
  }
}
