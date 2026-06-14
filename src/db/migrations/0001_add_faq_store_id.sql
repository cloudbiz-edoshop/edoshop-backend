ALTER TABLE "faqs" ADD COLUMN "store_id" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
