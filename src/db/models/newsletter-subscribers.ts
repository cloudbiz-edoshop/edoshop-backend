import type { z } from "zod";

import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial().primaryKey(),
  email: varchar({ length: 255 }).notNull().unique(),
  createdAt: timestamp({ mode: "string" }).notNull().defaultNow(),
});

export const newsletterSubscribersSchema = createSelectSchema(newsletterSubscribers);
export type NewsletterSubscriber = z.infer<typeof newsletterSubscribersSchema>;

export const insertNewsletterSubscriberSchema =
  createInsertSchema(newsletterSubscribers);
export type NewNewsletterSubscriber = z.infer<
  typeof insertNewsletterSubscriberSchema
>;

export default newsletterSubscribers;
