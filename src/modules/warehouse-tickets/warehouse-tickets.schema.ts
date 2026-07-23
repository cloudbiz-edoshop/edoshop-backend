import { z } from "zod";

import {
  WarehouseTicketEventAction,
  WarehouseTicketStatus,
} from "@/constants/warehouse-tickets.constants";

export const warehouseTicketItemInputSchema = z.object({
  entryId: z.number().int().positive("Product ID is required"),
  productLabel: z.string().trim().optional(),
  sku: z.string().trim().optional().nullable(),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  notes: z.string().trim().optional().nullable(),
});

export const createWarehouseTicketRequestSchema = z.object({
  warehouseId: z.number().int().positive(),
  reason: z.string().trim().min(10, "Reason must be at least 10 characters"),
  items: z
    .array(warehouseTicketItemInputSchema)
    .min(1, "At least one product is required"),
});

export const updateWarehouseTicketRequestSchema = z.object({
  warehouseId: z.number().int().positive().optional(),
  reason: z.string().trim().min(10).optional(),
  items: z.array(warehouseTicketItemInputSchema).min(1).optional(),
});

export const ticketActionCommentSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(3, "Comment is required for this action")
    .max(2000),
});

export const transferTicketItemSchema = z.object({
  itemId: z.number().int().positive(),
  transferredQuantity: z.number().int().positive(),
});

export const confirmWarehouseTicketRequestSchema = z
  .object({
    items: z.array(transferTicketItemSchema).optional(),
  })
  .default({});

export const warehouseTicketUserSchema = z.object({
  id: z.number(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

export const warehouseTicketItemResponseSchema = z.object({
  id: z.number(),
  ticketId: z.number(),
  entryId: z.number().nullable().optional(),
  productLabel: z.string(),
  sku: z.string().nullable().optional(),
  quantity: z.number(),
  transferredQuantity: z.number(),
  returnedQuantity: z.number().optional(),
  notes: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const warehouseTicketEventResponseSchema = z.object({
  id: z.number(),
  ticketId: z.number(),
  actorId: z.number(),
  action: z.nativeEnum(WarehouseTicketEventAction),
  comment: z.string().nullable().optional(),
  previousStatus: z.nativeEnum(WarehouseTicketStatus).nullable().optional(),
  newStatus: z.nativeEnum(WarehouseTicketStatus).nullable().optional(),
  createdAt: z.string(),
  actor: warehouseTicketUserSchema.nullable().optional(),
});

export const warehouseTicketResponseSchema = z.object({
  id: z.number(),
  ticketCode: z.string(),
  warehouseId: z.number(),
  reason: z.string(),
  status: z.nativeEnum(WarehouseTicketStatus),
  pausedFromStatus: z.nativeEnum(WarehouseTicketStatus).nullable().optional(),
  statusComment: z.string().nullable().optional(),
  requesterId: z.number(),
  approverId: z.number().nullable().optional(),
  warehouseTechId: z.number().nullable().optional(),
  approvedAt: z.string().nullable().optional(),
  pausedAt: z.string().nullable().optional(),
  rejectedAt: z.string().nullable().optional(),
  confirmedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  totalQuantity: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.number(),
  updatedBy: z.number(),
  requester: warehouseTicketUserSchema.nullable().optional(),
  approver: warehouseTicketUserSchema.nullable().optional(),
  warehouseTech: warehouseTicketUserSchema.nullable().optional(),
  warehouse: z
    .object({
      id: z.number(),
      name: z.string().nullable().optional(),
      code: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  items: z.array(warehouseTicketItemResponseSchema).optional(),
  events: z.array(warehouseTicketEventResponseSchema).optional(),
});

export const listWarehouseTicketsResponseSchema = z.array(
  warehouseTicketResponseSchema,
);

export const warehouseTicketSettingsSchema = z.object({
  maxLineItems: z.number().int().positive(),
  maxTotalQuantity: z.number().int().positive(),
  maxOpenTicketsPerUser: z.number().int().positive(),
  returnReminderDays: z.number().int().positive().optional(),
  updatedAt: z.string().optional(),
});

export const updateWarehouseTicketSettingsSchema = z.object({
  maxLineItems: z.number().int().positive().max(500),
  maxTotalQuantity: z.number().int().positive().max(5000),
  maxOpenTicketsPerUser: z.number().int().positive().max(100),
  returnReminderDays: z.number().int().positive().max(90).optional(),
});

export const warehouseTicketEntryOptionSchema = z.object({
  entryId: z.number(),
  productCode: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
});

export const returnWarehouseTicketRequestSchema = z.object({
  requesterId: z.number().int().positive().optional(),
  items: z
    .array(
      z.object({
        itemId: z.number().int().positive(),
        returnedQuantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

export const listWarehouseTicketEntryOptionsSchema = z.array(
  warehouseTicketEntryOptionSchema,
);

export type ConfirmWarehouseTicketRequest = z.infer<
  typeof confirmWarehouseTicketRequestSchema
>;
export type CreateWarehouseTicketRequest = z.infer<
  typeof createWarehouseTicketRequestSchema
>;
export type UpdateWarehouseTicketRequest = z.infer<
  typeof updateWarehouseTicketRequestSchema
>;
export type WarehouseTicketResponse = z.infer<
  typeof warehouseTicketResponseSchema
>;
export type ListWarehouseTicketsResponse = z.infer<
  typeof listWarehouseTicketsResponseSchema
>;
export type WarehouseTicketSettingsResponse = z.infer<
  typeof warehouseTicketSettingsSchema
>;
export type UpdateWarehouseTicketSettingsRequest = z.infer<
  typeof updateWarehouseTicketSettingsSchema
>;
export type WarehouseTicketEntryOption = z.infer<
  typeof warehouseTicketEntryOptionSchema
>;
export type ReturnWarehouseTicketRequest = z.infer<
  typeof returnWarehouseTicketRequestSchema
>;
