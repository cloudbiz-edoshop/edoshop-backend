import type { Database } from "@/db";

import {
  NOTIFICATION_FREQUENCY_DESCRIPTIONS,
  NotificationFrequency,
} from "@/constants";

import { notificationFrequencies as notificationFrequenciesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process entities in chunks
  for (
    let i = 0;
    i < Object.values(NotificationFrequency).length;
    i += CHUNK_SIZE
  ) {
    const chunk = Object.values(NotificationFrequency)
      .slice(i, i + CHUNK_SIZE)
      .map((notificationFrequency) => ({
        name: notificationFrequency,
        description: NOTIFICATION_FREQUENCY_DESCRIPTIONS[notificationFrequency],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(notificationFrequenciesTable).values(chunk);
  }
}
