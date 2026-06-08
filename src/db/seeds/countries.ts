import type { Database } from "@/db";

import { Country } from "country-state-city";

import { countries as countriesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  const countries = Country.getAllCountries().map((country) => ({
    name: country.name,
    isoCode: country.isoCode,
    flag: country.flag || country.isoCode,
    phonecode: country.phonecode || "",
    currency: country.currency || "",
    latitude: country.latitude || "0",
    longitude: country.longitude || "0",
  }));

  // Process countries in chunks
  for (let i = 0; i < countries.length; i += CHUNK_SIZE) {
    const chunk = countries.slice(i, i + CHUNK_SIZE);
    await db.insert(countriesTable).values(chunk).onConflictDoNothing();
  }
}
