import type { Database } from "@/db";

import { cities as citiesTable, countries as countriesTable } from "../models";
import cities from "./data/cities.json";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  const countries = await db.select().from(countriesTable);

  const citiesWithCountryId = (cities as any[]).map((city) => {
    const countryId = countries.find((c) => c.isoCode === city.countryCode)?.id;
    if (!countryId) {
      throw new Error(`Country not found for city: ${city.name}`);
    }
    return {
      name: city.name,
      countryId,
      countryCode: city.countryCode,
      stateCode: city.stateCode,
      latitude: city.latitude,
      longitude: city.longitude,
    };
  });

  // Process cities in chunks
  for (let i = 0; i < citiesWithCountryId.length; i += CHUNK_SIZE) {
    const chunk = citiesWithCountryId.slice(i, i + CHUNK_SIZE);
    await db.insert(citiesTable).values(chunk);
  }
}
