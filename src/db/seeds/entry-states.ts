import type { Database } from "@/db";

import {
  ENTRY_STATE_DESCRIPTIONS,
  EntryState,
} from "@/constants/entries/entry-states.constants";

import { entryStates as entryStatesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  const entries = Object.values(EntryState).map((state) => ({
    name: state,
    description: ENTRY_STATE_DESCRIPTIONS[state],
    createdBy: 1,
    updatedBy: 1,
  }));

  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const chunk = entries.slice(i, i + CHUNK_SIZE);
    await db.insert(entryStatesTable).values(chunk);
  }
}
