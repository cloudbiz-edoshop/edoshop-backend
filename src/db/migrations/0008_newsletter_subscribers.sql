CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" varchar(255) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_subscribers_email_unique"
  ON "newsletter_subscribers" ("email");
