import { z } from "zod";

export const groupPackageMemberSchema = z.object({
  id: z.number(),
  packageId: z.number().nullable(),
  childGroupPackageId: z.number().nullable(),
  packageCode: z.string().nullable(),
  childGroupPackageCode: z.string().nullable(),
  customerCode: z.string().nullable(),
  addedAt: z.string(),
});

export const groupPackageEventSchema = z.object({
  id: z.number(),
  action: z.string(),
  details: z.string().nullable(),
  createdAt: z.string(),
  createdByName: z.string().nullable(),
});

export const groupPackageResponseSchema = z.object({
  id: z.number(),
  groupPackageCode: z.string(),
  warehouseId: z.number(),
  destinationArea: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  members: z.array(groupPackageMemberSchema).optional(),
  events: z.array(groupPackageEventSchema).optional(),
});

export const createGroupPackageRequestSchema = z.object({
  destinationArea: z.string().trim().min(1),
  packageIds: z.array(z.number().int().positive()).optional(),
  childGroupPackageIds: z.array(z.number().int().positive()).optional(),
});

export const addGroupPackageMembersRequestSchema = z.object({
  packageIds: z.array(z.number().int().positive()).optional(),
  childGroupPackageIds: z.array(z.number().int().positive()).optional(),
});

export const w2ManagementRowSchema = z.object({
  rowType: z.enum(["package", "group"]),
  id: z.number(),
  packageId: z.number().nullable(),
  groupPackageId: z.number().nullable(),
  packageCode: z.string().nullable(),
  groupPackageCode: z.string().nullable(),
  packageCodes: z.array(z.string()).optional(),
  customerCode: z.string().nullable(),
  customerCodes: z.array(z.string()).optional(),
  binLocation: z.string(),
  destination: z.string(),
  packageWeight: z.string(),
  packagingStatus: z.string(),
  receivedAt: z.string().nullable(),
});

export const dispatchGroupPackageRequestSchema = z.object({
  driverId: z.number().min(1),
  driverName: z.string().trim().min(1),
  packageDestination: z.string().trim().min(1),
  additionalNotes: z.string().optional(),
  deliverToDriver: z.string().optional(),
});

export const dispatchGroupPackageResponseSchema = z.object({
  groupPackageId: z.number(),
  driverId: z.number(),
  driverName: z.string(),
  packageDestination: z.string(),
  additionalNotes: z.string().nullable(),
  dispatchTime: z.string(),
  dispatchedPackageIds: z.array(z.number()),
});

export const dispatchReadyGroupSchema = z.object({
  id: z.number(),
  groupPackageCode: z.string(),
  destinationArea: z.string(),
  memberCount: z.number(),
  packageCodes: z.array(z.string()),
  totalWeight: z.string(),
});

export type DispatchGroupPackageRequest = z.infer<typeof dispatchGroupPackageRequestSchema>;
export type GroupPackageResponse = z.infer<typeof groupPackageResponseSchema>;
export type W2ManagementRow = z.infer<typeof w2ManagementRowSchema>;
