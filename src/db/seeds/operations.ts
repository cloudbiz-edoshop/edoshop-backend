import type { Database } from "@/db";

import { OperationType } from "@/constants";

import { operations as operationsTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process operations in chunks
  for (let i = 0; i < Object.keys(OperationType).length; i += CHUNK_SIZE) {
    const chunk = Object.values(OperationType)
      .slice(i, i + CHUNK_SIZE)
      .map((operation) => ({
        name: operation,
        description: `Allow ${operation}`,
      }));
    await db.insert(operationsTable).values(chunk);
  }
}
