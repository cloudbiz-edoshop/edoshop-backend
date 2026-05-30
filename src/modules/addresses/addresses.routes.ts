import { createRoute, z } from "@hono/zod-openapi";

import { listCitiesResponseSchema } from "@/db/models/cities";
import { listCountriesResponseSchema } from "@/db/models/countries";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { commonErrorResponses, jsonContent } from "@/lib/openapi/helpers";
import { createSuccessResponseSchema } from "@/lib/openapi/schemas/create-api-response";

const tags = ["Addresses"];

export const getAllCountries = createRoute({
  path: "/addresses/countries",
  summary: "List all countries",
  description: "List all countries",
  method: "get",
  tags,
  request: {},
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(listCountriesResponseSchema),
      "The list of all countries",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.INTERNAL_SERVER_ERROR],
      z.object({}),
    ),
  },
});

export const getAllCities = createRoute({
  path: "/addresses/cities",
  summary: "List all cities",
  description: "List all cities",
  method: "get",
  tags,
  request: {},
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(listCitiesResponseSchema),
      "The list of all cities",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.INTERNAL_SERVER_ERROR],
      z.object({}),
    ),
  },
});

export const getCitiesByCountryCode = createRoute({
  path: "/addresses/cities-by-country-code/{countryCode}",
  summary: "Get cities by country code",
  description: "Get cities by country code",
  method: "get",
  tags,
  request: {
    params: z.object({
      countryCode: z.string(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(listCitiesResponseSchema),
      "The list of all cities",
    ),
    ...commonErrorResponses(
      [HttpStatusCodes.INTERNAL_SERVER_ERROR],
      z.object({}),
    ),
  },
});

export const getCitiesByCountryId = createRoute({
  path: "/addresses/cities-by-country-id/{countryId}",
  summary: "Get cities by country id",
  description: "Get cities by country id",
  method: "get",
  tags,
  request: {
    params: z.object({
      countryId: z.coerce.number(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSuccessResponseSchema(listCitiesResponseSchema),
      "The list of all cities",
    ),
  },
});

export type ListAllCountriesRoute = typeof getAllCountries;
export type ListAllCitiesRoute = typeof getAllCities;
export type GetCitiesByCountryCodeRoute = typeof getCitiesByCountryCode;
export type GetCitiesByCountryIdRoute = typeof getCitiesByCountryId;
