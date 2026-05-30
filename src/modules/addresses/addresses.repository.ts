import type { CreateAddress, UpdateAddress } from "@/db/models/addresses";

import type { TX } from "@/lib/types";
import { eq } from "drizzle-orm";

import db from "@/db";
import { addresses, cities, countries } from "@/db/models";
/**
 * Repository for address-related database operations
 */
export class AddressRepository {
  /**
   * Create a new address with associated user in a transaction
   *
   * @param tx - Transaction object
   * @param data : CreateAddress - CreateAddress object
   * @returns Created address
   * @throws Will throw an error if address creation fails
   */
  async create(tx: TX, data: CreateAddress) {
    const [result] = await tx.insert(addresses).values(data).returning();

    return result;
  }

  /**
   * Update an address
   *
   * @param tx - Transaction object
   * @param addressId - The ID of the address to update
   * @param data - The data to update the address with
   * @returns The updated address
   */
  async update(tx: TX, addressId: number, data: UpdateAddress) {
    const [result] = await tx
      .update(addresses)
      .set(data)
      .where(eq(addresses.id, addressId))
      .returning();

    return result;
  }

  /**
   * Get the ISO code for a country by its ID
   * @param countryId - The ID of the country
   * @returns The ISO code of the country
   * @throws Will throw an error if the country is not found
   */
  async getCountryCode(countryId: number) {
    const result = await db.query.countries.findFirst({
      where: eq(countries.id, countryId),
    });
    if (!result) {
      return null;
    }
    return result.isoCode;
  }

  async getAllCountries() {
    const result = await db.query.countries.findMany();
    return result;
  }

  async getAllCities() {
    const result = await db.query.cities.findMany();
    return result;
  }

  async getCitiesByCountryCode(countryCode: string) {
    const result = await db.query.cities.findMany({
      where: eq(cities.countryCode, countryCode),
    });
    return result;
  }

  async getCitiesByCountryId(countryId: number) {
    const result = await db.query.cities.findMany({
      where: eq(cities.countryId, countryId),
    });
    return result;
  }
}
