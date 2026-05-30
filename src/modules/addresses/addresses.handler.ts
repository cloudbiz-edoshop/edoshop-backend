import type {
  GetCitiesByCountryCodeRoute,
  GetCitiesByCountryIdRoute,
  ListAllCitiesRoute,
  ListAllCountriesRoute,
} from "./addresses.routes";
import type { ListCitiesResponse } from "@/db/models/cities";
import type { ListCountriesResponse } from "@/db/models/countries";

import type { AppRouteHandler } from "@/lib/types";
import { successResponse } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";

import { AddressService } from "@/modules/addresses/addresses.service";

const addressesService = new AddressService();

export const getAllCountries: AppRouteHandler<ListAllCountriesRoute> = async (
  c,
) => {
  const countries: ListCountriesResponse =
    await addressesService.getAllCountries();
  const response = successResponse(
    countries,
    "Countries retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const getAllCities: AppRouteHandler<ListAllCitiesRoute> = async (c) => {
  const cities: ListCitiesResponse = await addressesService.getAllCities();
  const response = successResponse(cities, "Cities retrieved successfully");
  return c.json(response, HttpStatusCodes.OK);
};

export const getCitiesByCountryCode: AppRouteHandler<
  GetCitiesByCountryCodeRoute
> = async (c) => {
  const { countryCode } = c.req.valid("param");
  const cities: ListCitiesResponse =
    await addressesService.getCitiesByCountryCode(countryCode);
  const response = successResponse(cities, "Cities retrieved successfully");
  return c.json(response, HttpStatusCodes.OK);
};

export const getCitiesByCountryId: AppRouteHandler<
  GetCitiesByCountryIdRoute
> = async (c) => {
  const { countryId } = c.req.valid("param");
  const cities: ListCitiesResponse =
    await addressesService.getCitiesByCountryId(countryId);
  const response = successResponse(cities, "Cities retrieved successfully");
  return c.json(response, HttpStatusCodes.OK);
};
