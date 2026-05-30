import type { Database } from "@/db";

import { NOTIFICATION_TYPE_DESCRIPTIONS, NotificationType } from "@/constants";

import { notificationTypes as notificationTypesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process entities in chunks
  for (let i = 0; i < Object.values(NotificationType).length; i += CHUNK_SIZE) {
    const chunk = Object.values(NotificationType)
      .slice(i, i + CHUNK_SIZE)
      .map((notificationType) => ({
        name: notificationType,
        description: NOTIFICATION_TYPE_DESCRIPTIONS[notificationType],
        createdBy: 1,
        updatedBy: 1,
      }));
    await db.insert(notificationTypesTable).values(chunk);
  }
}
