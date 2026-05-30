import { z } from "@hono/zod-openapi";
import { descriptionSchema } from "@/lib/zod-schemas/common-schemas";

const rayonNameSchema = z
  .string()
  .trim()
  .min(1, "Rayon name is required")
  .max(50, "Rayon name must be 50 characters or less")
  .regex(
    /^[a-z0-9\s-]+$/i,
    "Rayon name can only contain letters, numbers, spaces, and hyphens",
  );

export const getRayonsForWarehouseResponseSchema = z.array(
  z.object({
    id: z.number(),
    warehouseId: z.number(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    createdAt: z.string(), // ISO date string
    updatedAt: z.string().nullable(),
    createdBy: z.number(),
    updatedBy: z.number().nullable(),
  }),
);

export type GetRayonsForWarehouseResponseSchema = z.infer<
  typeof getRayonsForWarehouseResponseSchema
>;

export const getRayonsStatsForAWarehouseResponseSchema = z.array(
  z.object({
    id: z.number(),
    warehouseId: z.number(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    createdAt: z.string(), // ISO date string
    updatedAt: z.string().nullable(),
    createdBy: z.number(),
    updatedBy: z.number().nullable(),
    totalBins: z.number(),
    usedBins: z.number(),
    shelves: z.array(
      z.object({
        id: z.number(),
        rayonId: z.number(),
        columnLabel: z.string().max(5),
        warehouseId: z.number(),
        description: z.string().nullable(),
        createdAt: z.string(), // ISO date string
        updatedAt: z.string().nullable(),
        createdBy: z.number(),
        updatedBy: z.number().nullable(),
        bins: z.array(
          z.object({
            id: z.number(),
            shelfId: z.number(),
            warehouseId: z.number(),
            rowNumber: z.number(),
            locationCode: z.string(),
            createdAt: z.string(), // ISO date string
            updatedAt: z.string().nullable(),
            createdBy: z.number(),
            updatedBy: z.number().nullable(),
            storageItems: z.array(
              z.object({
                id: z.number(),
                binId: z.number(),
                entryId: z.number(),
                quantity: z.number(),
                productCode: z.string().nullable(),
                createdAt: z.string(),
                updatedAt: z.string(),
                createdBy: z.number(),
                updatedBy: z.number().nullable(),
              }),
            ),
            totalItems: z.number(),
            totalQuantity: z.number(),
            isOccupied: z.boolean(),
            productCodes: z.array(z.string()),
          }),
        ),
      }),
    ),
  }),
);

export type GetRayonsStatsForAWarehouseResponseSchema = z.infer<
  typeof getRayonsStatsForAWarehouseResponseSchema
>;

export const createRayonsRequestSchema = z.object({
  name: rayonNameSchema.describe("Rayon name"),
  description: descriptionSchema.describe("Rayon description"),
});
export type CreateRayonsRequestSchema = z.infer<typeof createRayonsRequestSchema>;

export const updateRayonRequestSchema = createRayonsRequestSchema.partial();

export type UpdateRayonRequestSchema = z.infer<typeof updateRayonRequestSchema>;

export const updateRayonResponseSchema = z.object({
  id: z.number(),
  warehouseId: z.number(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.string(), // ISO date string
  updatedAt: z.string().nullable(),
  createdBy: z.number(),
  updatedBy: z.number().nullable(),
});

export type UpdateRayonResponseSchema = z.infer<
  typeof updateRayonResponseSchema
>;

export const createShelvesForRayonsRequestSchema = z.object({
  rayonId: z.number(),
  columnLabel: z.string().trim().min(1, "Column label cannot be empty").max(5, "Column label must be 5 characters or less"),
  description: descriptionSchema.describe("Shelf description"),
});

export type CreateShelvesForRayonRequestSchema = z.infer<typeof createShelvesForRayonsRequestSchema>;

export const updateShelvesRequestSchema = z
  .object({
    columnLabel: z.string().trim().min(1, "Column label cannot be empty").max(10, "Column label must be 5 characters or less"),
    description: descriptionSchema,
  })
  .partial();

export type UpdateShelvesRequestSchema = z.infer<typeof updateShelvesRequestSchema>;

export const updateShelvesResponseSchema = z.object({
  id: z.number(),
  rayonId: z.number(),
  columnLabel: z.string().max(5),
  warehouseId: z.number(),
  description: z.string().nullable(),
  createdAt: z.string(), // ISO date string
  updatedAt: z.string().nullable(),
  createdBy: z.number(),
  updatedBy: z.number().nullable(),
});

export type UpdateShelvesResponseSchema = z.infer<
  typeof updateShelvesResponseSchema
>;

export const createShelvesForRayonResponseSchema = z.object({
  id: z.number(),
  rayonId: z.number(),
  columnLabel: z.string().max(5),
  warehouseId: z.number(),
  description: z.string().nullable(),
  createdAt: z.string(), // ISO date string
  updatedAt: z.string().nullable(),
  createdBy: z.number(),
  updatedBy: z.number().nullable(),
});

export type CreateShelvesForRayonResponseSchema = z.infer<
  typeof createShelvesForRayonResponseSchema
>;

export const createBinsRequestSchema = z.object({
  shelfId: z.number(),
  rowNumber: z.number().int().min(1, "Row number must be at least 1"),
  locationCode: z
    .string()
    .trim()
    .min(1, "Location code cannot be empty")
    .max(20, "Location code must be 20 characters or less")
    .optional(),
});

export type CreateBinsRequestSchema = z.infer<typeof createBinsRequestSchema>;

export const updateBinsRequestSchema = z.object({
  locationCode: z
    .string()
    .trim()
    .min(1, "Location code cannot be empty")
    .max(20, "Location code must be 20 characters or less")
    .optional(),
});

export type UpdateBinsRequestSchema = z.infer<typeof updateBinsRequestSchema>;

export const updateBinsResponseSchema = z.object({
  id: z.number(),
  shelfId: z.number(),
  warehouseId: z.number(),
  rowNumber: z.number(),
  locationCode: z.string(),
  createdAt: z.string(), // ISO date string
  updatedAt: z.string().nullable(),
  createdBy: z.number(),
  updatedBy: z.number().nullable(),
});

export type UpdateBinsResponseSchema = z.infer<typeof updateBinsResponseSchema>;

export const createBinsResponseSchema = z.object({
  id: z.number(),
  shelfId: z.number(),
  warehouseId: z.number(),
  rowNumber: z.number(),
  locationCode: z.string(),
  createdAt: z.string(), // ISO date string
  updatedAt: z.string().nullable(),
  createdBy: z.number(),
  updatedBy: z.number().nullable(),
});

export type CreateBinsResponseSchema = z.infer<typeof createBinsResponseSchema>;

export const getAllShelvesForRayonResponseSchema = z.array(
  z.object({
    id: z.number(),
    rayonId: z.number(),
    columnLabel: z.string().max(5),
    warehouseId: z.number(),
    description: z.string().nullable(),
    createdAt: z.string(), // ISO date string
    updatedAt: z.string().nullable(),
    createdBy: z.number(),
    updatedBy: z.number().nullable(),
  }),
);

export type GetAllShelvesForRayonResponseSchema = z.infer<
  typeof getAllShelvesForRayonResponseSchema
>;
