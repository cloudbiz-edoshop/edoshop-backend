import { ALL_ENTITY_TYPES, STANDARD_CRUD_OPERATIONS } from "@/constants/permissions.constants";

import { rolesAndPermissionsMiddleware } from "./roles-and-permissions";

/**
 * Reference data that many forms load as dropdown options (colors, sizes,
 * categories, stores, entry types). Any employee holding at least one
 * permission may read it, so a page opened for one module never fails on
 * lookups owned by another module.
 */
export const staffLookupReadMiddleware = () =>
  rolesAndPermissionsMiddleware(
    ALL_ENTITY_TYPES.flatMap((entity) =>
      STANDARD_CRUD_OPERATIONS.map((operation) => ({ entity, operation })),
    ),
    "ANY",
  );
