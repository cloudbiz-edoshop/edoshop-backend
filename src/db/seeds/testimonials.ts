import type { Database } from "@/db";

import { TESTIMONIALS } from "@/constants";

import { testimonials as testimonialsTables } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  // Process entities in chunks
  for (let i = 0; i < TESTIMONIALS.length; i += CHUNK_SIZE) {
    const chunk = TESTIMONIALS.slice(i, i + CHUNK_SIZE).map((testimonial) => ({
      order: testimonial.order,
      authorName: testimonial.authorName,
      authorTitle: testimonial.authorTitle,
      testimonial: testimonial.testimonial,
      imageUrl: testimonial.imageUrl,
      createdBy: 1,
      updatedBy: 1,
    }));
    await db.insert(testimonialsTables).values(chunk);
  }
}
