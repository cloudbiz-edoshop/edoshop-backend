import type { CreateAddress, UpdateAddress } from "@/db/models/addresses";
import type { TX } from "@/lib/types";

import { AddressRepository } from "./addresses.repository";

export class AddressService {
  private readonly addressRepository: AddressRepository;

  constructor() {
    this.addressRepository = new AddressRepository();
  }

  async createAddress(tx: TX, address: CreateAddress) {
    return this.addressRepository.create(tx, address);
  }

  async getCountryCode(countryId: number) {
    return this.addressRepository.getCountryCode(countryId);
  }

  async getAllCountries() {
    return this.addressRepository.getAllCountries();
  }

  async getAllCities() {
    return this.addressRepository.getAllCities();
  }

  async getCitiesByCountryCode(countryCode: string) {
    return this.addressRepository.getCitiesByCountryCode(countryCode);
  }

  async getCitiesByCountryId(countryId: number) {
    return this.addressRepository.getCitiesByCountryId(countryId);
  }

  async updateAddress(tx: TX, addressId: number, address: UpdateAddress) {
    return this.addressRepository.update(tx, addressId, address);
  }
}
