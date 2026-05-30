import { z } from "zod";

import { addressesSchema } from "@/db/models/addresses";
import { supplierSchema } from "@/db/models/suppliers";
import {
  emailSchema,
  fullNameSchema,
  idSchema,
  nameSchema,
  phoneSchema,
  profilePhotoUrlSchema,
} from "@/lib/zod-schemas";
import { streetAddressSchema } from "@/lib/zod-schemas/common-schemas";
import { userSchema } from "@/modules/users/users.schema";
// Schema for creating a new supplier
// Base schema without refinement
const baseSupplierSchema = z.object({
  fullName: fullNameSchema.describe("Full name of the supplier"),
  storeName: nameSchema.describe("Name of the supplier's store"),
  email: emailSchema.describe("Email of the supplier"),
  phoneNumber: phoneSchema.describe("Supplier's WhatsApp number"),
  address: streetAddressSchema.describe("Address of the supplier"),
  countryId: idSchema.describe("ID of the country"),
  paymentMethodId: idSchema.describe("ID of the payment method"),
  entryTypeId: idSchema.describe("ID of the entry type"),
  bankAccountName: nameSchema.describe("Bank account name"),
  bankAccountNumber: z.string().min(10).max(20).describe("Bank account number"),
  profilePhotoUrl: profilePhotoUrlSchema.optional(),
});

// Schema for creating a new supplier
export const createSupplierRequestSchema = baseSupplierSchema;
// Schema for updating a supplier
export const updateSupplierRequestSchema = baseSupplierSchema.partial();

// Create supplier request type
export type CreateSupplierRequest = z.infer<typeof createSupplierRequestSchema>;

// Create supplier response schema
export const createSupplierResponseSchema = supplierSchema.extend({
  user: userSchema,
});

// Create supplier response type
export type CreateSupplierResponse = z.infer<
  typeof createSupplierResponseSchema
>;

// Update supplier request type
export type UpdateSupplierRequest = z.infer<typeof updateSupplierRequestSchema>;

// Schema for updating a supplier
export const updateSupplierResponseSchema = z.object({
  ...supplierSchema.shape,
  user: userSchema,
});

// Update supplier response type
export type UpdateSupplierResponse = z.infer<
  typeof updateSupplierResponseSchema
>;

// Schema for getting a supplier
export const getSupplierResponseSchema = supplierSchema.extend({
  user: userSchema.extend({
    addresses: z.array(addressesSchema),
  }),
});

// Get supplier response type
export type GetSupplierResponse = z.infer<typeof getSupplierResponseSchema>;

// List suppliers response schema
export const listSuppliersResponseSchema = z.array(getSupplierResponseSchema);

// List suppliers response type
export type ListSuppliersResponse = z.infer<typeof listSuppliersResponseSchema>;
