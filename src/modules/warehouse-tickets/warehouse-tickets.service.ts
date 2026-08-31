import type {
  ConfirmTakeoutRequest,
  ConfirmWarehouseTicketRequest,
  CreateWarehouseTicketRequest,
  InitiateReturnRequest,
  PrepareWarehouseTicketRequest,
  ConfirmReturnRequest,
  UpdateWarehouseTicketRequest,
  UpdateWarehouseTicketSettingsRequest,
  WarehouseTicketResponse,
} from "./warehouse-tickets.schema";
import {
  WAREHOUSE_TICKET_LIMITS,
  WAREHOUSE_TICKET_PERMISSIONS,
  WAREHOUSE_TICKET_W1_TECH_ROLES,
  WAREHOUSE_TICKET_W2_TECH_ROLES,
  WarehouseTicketEventAction,
  WarehouseTicketStatus,
  type WarehouseTicketLimits,
} from "@/constants/warehouse-tickets.constants";
import { ForbiddenError, NotFoundError, ValidationError } from "@/core/errors";
import db from "@/db";
import { PermissionsService } from "@/modules/permissions/permissions.service";

import {
  deactivateTicketApprovalNotifications,
  deactivateTicketNotifications,
  formatUserName,
  notifyApproversAndRequester,
  notifyApproversForNewTicket,
  notifyRequester,
  notifyReturnReminder,
  notifyWarehouseTechsForApprovedTicket,
  notifyWarehouseTechsForReturn,
  notifyStaffForReturnInitiated,
  deactivateReturnPendingNotifications,
} from "./warehouse-tickets.notifications";
import { WarehouseTicketsRepository } from "./warehouse-tickets.repository";
import {
  getItemOutstanding,
  getItemPrepared,
  getItemReceived,
  getItemReturnable,
  getTicketQuantitySummary,
  resolveBorrowTicketStatus,
} from "./warehouse-tickets.quantities";

type ActorContext = {
  userId: number;
  roleName?: string | null;
  isAdmin?: boolean;
};

type TicketRecord = NonNullable<
  Awaited<ReturnType<WarehouseTicketsRepository["findById"]>>
>;
type TicketItemRecord = NonNullable<TicketRecord["items"]>[number];

export class WarehouseTicketsService {
  private readonly repository: WarehouseTicketsRepository;
  private readonly permissionsService: PermissionsService;

  constructor() {
    this.repository = new WarehouseTicketsRepository();
    this.permissionsService = new PermissionsService();
  }

  private generateTicketCode(sequence: number) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `WT-${datePart}-${String(sequence).padStart(4, "0")}`;
  }

  private async getTicketLimits(): Promise<WarehouseTicketLimits> {
    const settings = await this.repository.getTicketSettings();

    return {
      maxLineItems: settings?.maxLineItems ?? WAREHOUSE_TICKET_LIMITS.MAX_LINE_ITEMS,
      maxTotalQuantity:
        settings?.maxTotalQuantity ?? WAREHOUSE_TICKET_LIMITS.MAX_TOTAL_QUANTITY,
      maxOpenTicketsPerUser:
        settings?.maxOpenTicketsPerUser ??
        WAREHOUSE_TICKET_LIMITS.MAX_OPEN_TICKETS_PER_USER,
    };
  }

  private async validateItems(
    items: CreateWarehouseTicketRequest["items"],
    limits: WarehouseTicketLimits,
  ) {
    if (items.length > limits.maxLineItems) {
      throw new ValidationError(
        `A ticket cannot contain more than ${limits.maxLineItems} products`,
      );
    }

    const entryIds = items.map((item) => item.entryId);
    const uniqueEntryIds = new Set(entryIds);
    if (uniqueEntryIds.size !== entryIds.length) {
      throw new ValidationError("Each product can only be added once per ticket");
    }

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity > limits.maxTotalQuantity) {
      throw new ValidationError(
        `Total quantity cannot exceed ${limits.maxTotalQuantity} items`,
      );
    }

    return totalQuantity;
  }

  private async resolveItems(
    items: CreateWarehouseTicketRequest["items"],
    warehouseId: number,
  ) {
    const entryIds = items.map((item) => item.entryId);
    const entries = await this.repository.findEntriesForTicket(
      entryIds,
      warehouseId,
    );
    const entryMap = new Map(entries.map((entry) => [entry.id, entry]));

    return items.map((item) => {
      const entry = entryMap.get(item.entryId);
      if (!entry) {
        throw new ValidationError(
          `Product ${item.entryId} was not found in the selected warehouse`,
        );
      }

      const productCode = entry.productCode ?? `Entry ${entry.id}`;

      return {
        entryId: item.entryId,
        productLabel: item.productLabel?.trim() || productCode,
        sku: item.sku?.trim() || productCode,
        quantity: item.quantity,
        notes: item.notes?.trim() || null,
      };
    });
  }

  private enrichItem(item: TicketItemRecord) {
    const receivedQuantity = getItemReceived(item);
    return {
      ...item,
      preparedQuantity: getItemPrepared(item),
      receivedQuantity,
      outstandingQuantity: getItemOutstanding(item),
      pendingReturnQuantity: item.pendingReturnQuantity ?? 0,
      shortageReason: item.shortageReason ?? null,
    };
  }

  private async mapTicket(ticket: TicketRecord): Promise<WarehouseTicketResponse> {
    const entryIds = ticket.items?.map((item) => item.entryId) ?? [];
    const imageMap = await this.repository.getEntryImagesByIds(
      entryIds.filter((id): id is number => Boolean(id)),
    );

    return {
      ...ticket,
      status: ticket.status as WarehouseTicketStatus,
      pausedFromStatus: ticket.pausedFromStatus as WarehouseTicketStatus | null,
      items: ticket.items?.map((item) => ({
        ...this.enrichItem(item),
        entryId: item.entryId ?? null,
        sku: item.sku ?? null,
        notes: item.notes ?? null,
        imageUrl: item.entryId ? imageMap.get(item.entryId) ?? null : null,
      })),
      events: ticket.events
        ?.slice()
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
        .map((event) => ({
        ...event,
        action: event.action as WarehouseTicketEventAction,
        previousStatus: event.previousStatus as WarehouseTicketStatus | null,
        newStatus: event.newStatus as WarehouseTicketStatus | null,
        comment: event.comment ?? null,
      })),
    };
  }

  private async getActorRoleName(actor: ActorContext) {
    if (actor.roleName) {
      return actor.roleName;
    }

    const employeeRow = await db.query.employees.findFirst({
      where: (employees, { eq }) => eq(employees.userId, actor.userId),
      with: { role: true },
    });

    return employeeRow?.role?.name ?? null;
  }

  private async assertTicketApprover(actor: ActorContext) {
    if (actor.isAdmin) {
      return;
    }

    const accessProfile = await this.permissionsService.getUserAccessProfile(
      actor.userId,
    );

    if (
      accessProfile.isSuperAdmin ||
      this.permissionsService.hasPermission(
        accessProfile,
        WAREHOUSE_TICKET_PERMISSIONS.APPROVER_ENTITY,
        WAREHOUSE_TICKET_PERMISSIONS.APPROVER_OPERATION,
      )
    ) {
      return;
    }

    throw new ForbiddenError(
      "Only members with Tickets Approver permission can perform this action",
    );
  }

  private async isTicketApprover(actor: ActorContext) {
    if (actor.isAdmin) {
      return true;
    }

    const accessProfile = await this.permissionsService.getUserAccessProfile(
      actor.userId,
    );

    return (
      accessProfile.isSuperAdmin ||
      this.permissionsService.hasPermission(
        accessProfile,
        WAREHOUSE_TICKET_PERMISSIONS.APPROVER_ENTITY,
        WAREHOUSE_TICKET_PERMISSIONS.APPROVER_OPERATION,
      )
    );
  }

  private async assertBorrowLimitsEditor(actor: ActorContext) {
    if (actor.isAdmin) {
      return;
    }

    const accessProfile = await this.permissionsService.getUserAccessProfile(
      actor.userId,
    );

    if (
      accessProfile.isSuperAdmin ||
      this.permissionsService.hasPermission(
        accessProfile,
        WAREHOUSE_TICKET_PERMISSIONS.BORROW_LIMITS_ENTITY,
        WAREHOUSE_TICKET_PERMISSIONS.BORROW_LIMITS_OPERATION,
      )
    ) {
      return;
    }

    throw new ForbiddenError(
      "Only Super Admin or members with Limit Borrowed Products permission can update these settings",
    );
  }

  private async assertNotSelfApprover(
    ticketRequesterId: number,
    actor: ActorContext,
  ) {
    if (ticketRequesterId === actor.userId) {
      throw new ForbiddenError(
        "You cannot approve or reject your own ticket. Another approver must review it.",
      );
    }
  }

  private assertWarehouseTechRole(
    warehouseId: number,
    roleName?: string | null,
    isAdmin?: boolean,
  ) {
    if (isAdmin) {
      return;
    }

    const allowedRoles =
      warehouseId === 1
        ? WAREHOUSE_TICKET_W1_TECH_ROLES
        : WAREHOUSE_TICKET_W2_TECH_ROLES;

    if (
      !roleName ||
      !(allowedRoles as readonly string[]).includes(roleName)
    ) {
      throw new ForbiddenError(
        "Only the assigned warehouse team can perform this action",
      );
    }
  }

  private assertEditableStatus(status: string) {
    if (
      ![
        WarehouseTicketStatus.PENDING_APPROVAL,
        WarehouseTicketStatus.PAUSED,
      ].includes(status as WarehouseTicketStatus)
    ) {
      throw new ValidationError(
        "Only pending or paused tickets can be edited",
      );
    }
  }

  private assertRequesterOrAdmin(
    ticketRequesterId: number,
    actor: ActorContext,
  ) {
    if (actor.isAdmin || ticketRequesterId === actor.userId) {
      return;
    }

    throw new ForbiddenError("You can only modify your own tickets");
  }

  async getTicketSettings() {
    const limits = await this.getTicketLimits();
    const settings = await this.repository.getTicketSettings();

    return {
      ...limits,
      returnReminderDays: settings?.returnReminderDays ?? 7,
      updatedAt: settings?.updatedAt,
    };
  }

  async updateTicketSettings(
    data: UpdateWarehouseTicketSettingsRequest,
    actor: ActorContext,
  ) {
    await this.assertBorrowLimitsEditor(actor);

    const settings = await this.repository.upsertTicketSettings({
      maxLineItems: data.maxLineItems,
      maxTotalQuantity: data.maxTotalQuantity,
      maxOpenTicketsPerUser: data.maxOpenTicketsPerUser,
      returnReminderDays: data.returnReminderDays,
      updatedBy: actor.userId,
    });

    return {
      maxLineItems: settings.maxLineItems,
      maxTotalQuantity: settings.maxTotalQuantity,
      maxOpenTicketsPerUser: settings.maxOpenTicketsPerUser,
      returnReminderDays: settings.returnReminderDays,
      updatedAt: settings.updatedAt,
    };
  }

  async searchEntryOptions(params: {
    warehouseId: number;
    search?: string;
    limit?: number;
  }) {
    return this.repository.searchEntryOptions(params);
  }

  async createTicket(
    data: CreateWarehouseTicketRequest,
    actor: ActorContext,
  ): Promise<WarehouseTicketResponse> {
    const limits = await this.getTicketLimits();
    const totalQuantity = await this.validateItems(data.items, limits);
    const resolvedItems = await this.resolveItems(data.items, data.warehouseId);

    const openTickets = await this.repository.countOpenTicketsByRequester(
      actor.userId,
    );
    if (openTickets >= limits.maxOpenTicketsPerUser) {
      throw new ValidationError(
        `You already have ${limits.maxOpenTicketsPerUser} open tickets. Complete or cancel one before creating another.`,
      );
    }

    const sequence = await this.repository.getNextTicketSequence();
    const ticketCode = this.generateTicketCode(sequence);

    const ticketId = await db.transaction(async (tx) => {
      const ticket = await this.repository.createTicket(tx, {
        ticketCode,
        warehouseId: data.warehouseId,
        reason: data.reason,
        status: WarehouseTicketStatus.PENDING_APPROVAL,
        requesterId: actor.userId,
        totalQuantity,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      });

      await this.repository.replaceItems(tx, ticket.id, resolvedItems);
      await this.repository.addEvent(tx, {
        ticketId: ticket.id,
        actorId: actor.userId,
        action: WarehouseTicketEventAction.CREATED,
        newStatus: WarehouseTicketStatus.PENDING_APPROVAL,
      });

      return ticket.id;
    });

    const ticket = await this.repository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError("Ticket could not be loaded after creation");
    }

    await notifyApproversForNewTicket({
      ticketId: ticket.id,
      ticketCode: ticket.ticketCode,
      requesterId: ticket.requesterId,
      requesterName: formatUserName(ticket.requester ?? undefined),
      warehouseLabel: ticket.warehouse?.name ?? `Warehouse ${ticket.warehouseId}`,
    });

    return await this.mapTicket(ticket);
  }

  async getTicketById(id: number): Promise<WarehouseTicketResponse> {
    const ticket = await this.repository.findById(id);
    if (!ticket) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    return await this.mapTicket(ticket);
  }

  async listTickets(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, unknown>;
  }) {
    await this.processReturnReminders().catch(() => undefined);
    return this.repository.list(params);
  }

  async updateTicket(
    id: number,
    data: UpdateWarehouseTicketRequest,
    actor: ActorContext,
  ): Promise<WarehouseTicketResponse> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    this.assertRequesterOrAdmin(existing.requesterId, actor);
    this.assertEditableStatus(existing.status);

    let totalQuantity = existing.totalQuantity;
    let resolvedItems;
    const limits = await this.getTicketLimits();
    const warehouseId = data.warehouseId ?? existing.warehouseId;

    if (data.items) {
      totalQuantity = await this.validateItems(data.items, limits);
      resolvedItems = await this.resolveItems(data.items, warehouseId);
    }

    await db.transaction(async (tx) => {
      await this.repository.updateTicket(tx, id, {
        warehouseId: data.warehouseId,
        reason: data.reason,
        totalQuantity,
        updatedBy: actor.userId,
        ...(existing.status === WarehouseTicketStatus.PAUSED
          ? { status: WarehouseTicketStatus.PENDING_APPROVAL }
          : {}),
      });

      if (resolvedItems) {
        await this.repository.replaceItems(tx, id, resolvedItems);
      }

      await this.repository.addEvent(tx, {
        ticketId: id,
        actorId: actor.userId,
        action: WarehouseTicketEventAction.UPDATED,
        previousStatus: existing.status,
        newStatus:
          existing.status === WarehouseTicketStatus.PAUSED
            ? WarehouseTicketStatus.PENDING_APPROVAL
            : existing.status,
      });
    });

    const ticket = await this.repository.findById(id);
    if (!ticket) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    if (existing.status === WarehouseTicketStatus.PAUSED) {
      await notifyApproversForNewTicket({
        ticketId: ticket.id,
        ticketCode: ticket.ticketCode,
        requesterId: ticket.requesterId,
        requesterName: formatUserName(ticket.requester ?? undefined),
        warehouseLabel: ticket.warehouse?.name ?? `Warehouse ${ticket.warehouseId}`,
      });
    }

    return await this.mapTicket(ticket);
  }

  async deleteTicket(id: number, actor: ActorContext): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    this.assertRequesterOrAdmin(existing.requesterId, actor);
    if (existing.status !== WarehouseTicketStatus.PENDING_APPROVAL) {
      throw new ValidationError(
        "Only pending tickets can be deleted. Use cancel for other statuses.",
      );
    }

    await db.transaction(async (tx) => {
      await this.repository.addEvent(tx, {
        ticketId: id,
        actorId: actor.userId,
        action: WarehouseTicketEventAction.DELETED,
        previousStatus: existing.status,
        newStatus: WarehouseTicketStatus.CANCELLED,
      });
      await this.repository.deleteTicket(tx, id);
    });
  }

  async approveTicket(
    id: number,
    actor: ActorContext,
  ): Promise<WarehouseTicketResponse> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    const roleName = await this.getActorRoleName(actor);
    await this.assertTicketApprover(actor);
    await this.assertNotSelfApprover(existing.requesterId, actor);

    if (
      ![
        WarehouseTicketStatus.PENDING_APPROVAL,
        WarehouseTicketStatus.PAUSED,
      ].includes(existing.status as WarehouseTicketStatus)
    ) {
      throw new ValidationError("Only pending or paused tickets can be approved");
    }

    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      await this.repository.updateTicket(tx, id, {
        status: WarehouseTicketStatus.APPROVED,
        pausedFromStatus: null,
        statusComment: null,
        approverId: actor.userId,
        approvedAt: now,
        pausedAt: null,
        updatedBy: actor.userId,
      });

      await this.repository.addEvent(tx, {
        ticketId: id,
        actorId: actor.userId,
        action: WarehouseTicketEventAction.APPROVED,
        previousStatus: existing.status,
        newStatus: WarehouseTicketStatus.APPROVED,
      });
    });

    await deactivateTicketApprovalNotifications(id);

    const ticket = await this.repository.findById(id);
    if (!ticket) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    await notifyRequester({
      requesterId: ticket.requesterId,
      ticketId: ticket.id,
      title: "Warehouse ticket approved",
      message: `Your ticket ${ticket.ticketCode} was approved. Warehouse staff will prepare the items.`,
    });

    await notifyWarehouseTechsForApprovedTicket({
      ticketId: ticket.id,
      warehouseId: ticket.warehouseId,
      ticketCode: ticket.ticketCode,
      requesterName: formatUserName(ticket.requester ?? undefined),
      requesterId: ticket.requesterId,
    });

    return await this.mapTicket(ticket);
  }

  async pauseTicket(
    id: number,
    comment: string,
    actor: ActorContext,
  ): Promise<WarehouseTicketResponse> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    const roleName = await this.getActorRoleName(actor);
    const isApprover = await this.isTicketApprover(actor);
    const isWarehouseTech =
      existing.warehouseId === 1
        ? (WAREHOUSE_TICKET_W1_TECH_ROLES as readonly string[]).includes(
            roleName ?? "",
          )
        : (WAREHOUSE_TICKET_W2_TECH_ROLES as readonly string[]).includes(
            roleName ?? "",
          );

    if (!actor.isAdmin && !isApprover && !isWarehouseTech) {
      throw new ForbiddenError("You are not allowed to pause this ticket");
    }

    if (isApprover && !isWarehouseTech) {
      await this.assertNotSelfApprover(existing.requesterId, actor);
    }

    const allowedStatuses = isWarehouseTech
      ? [WarehouseTicketStatus.APPROVED]
      : [
          WarehouseTicketStatus.PENDING_APPROVAL,
          WarehouseTicketStatus.APPROVED,
        ];

    if (!allowedStatuses.includes(existing.status as WarehouseTicketStatus)) {
      throw new ValidationError("This ticket cannot be paused in its current status");
    }

    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      await this.repository.updateTicket(tx, id, {
        status: WarehouseTicketStatus.PAUSED,
        pausedFromStatus: existing.status,
        statusComment: comment,
        pausedAt: now,
        updatedBy: actor.userId,
      });

      await this.repository.addEvent(tx, {
        ticketId: id,
        actorId: actor.userId,
        action: WarehouseTicketEventAction.PAUSED,
        comment,
        previousStatus: existing.status,
        newStatus: WarehouseTicketStatus.PAUSED,
      });
    });

    const ticket = await this.repository.findById(id);
    if (!ticket) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    if (isWarehouseTech) {
      await notifyApproversAndRequester({
        requesterId: ticket.requesterId,
        ticketId: ticket.id,
        ticketCode: ticket.ticketCode,
        title: "Warehouse ticket paused by warehouse team",
        message: `Ticket ${ticket.ticketCode} was paused during delivery. Comment: ${comment}`,
      });
    } else {
      await deactivateTicketApprovalNotifications(id);
      await notifyRequester({
        requesterId: ticket.requesterId,
        ticketId: ticket.id,
        title: "Warehouse ticket paused",
        message: `Your ticket ${ticket.ticketCode} was paused. Comment: ${comment}`,
      });
    }

    return await this.mapTicket(ticket);
  }

  async rejectTicket(
    id: number,
    comment: string,
    actor: ActorContext,
  ): Promise<WarehouseTicketResponse> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    const roleName = await this.getActorRoleName(actor);
    const isApprover = await this.isTicketApprover(actor);
    const isWarehouseTech =
      existing.warehouseId === 1
        ? (WAREHOUSE_TICKET_W1_TECH_ROLES as readonly string[]).includes(
            roleName ?? "",
          )
        : (WAREHOUSE_TICKET_W2_TECH_ROLES as readonly string[]).includes(
            roleName ?? "",
          );

    if (!actor.isAdmin && !isApprover && !isWarehouseTech) {
      throw new ForbiddenError("You are not allowed to reject this ticket");
    }

    if (isApprover && !isWarehouseTech) {
      await this.assertNotSelfApprover(existing.requesterId, actor);
    }

    const allowedStatuses = isWarehouseTech
      ? [WarehouseTicketStatus.APPROVED]
      : [
          WarehouseTicketStatus.PENDING_APPROVAL,
          WarehouseTicketStatus.PAUSED,
        ];

    if (!allowedStatuses.includes(existing.status as WarehouseTicketStatus)) {
      throw new ValidationError("This ticket cannot be rejected in its current status");
    }

    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      await this.repository.updateTicket(tx, id, {
        status: WarehouseTicketStatus.REJECTED,
        statusComment: comment,
        rejectedAt: now,
        updatedBy: actor.userId,
      });

      await this.repository.addEvent(tx, {
        ticketId: id,
        actorId: actor.userId,
        action: WarehouseTicketEventAction.REJECTED,
        comment,
        previousStatus: existing.status,
        newStatus: WarehouseTicketStatus.REJECTED,
      });
    });

    const ticket = await this.repository.findById(id);
    if (!ticket) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    if (isWarehouseTech) {
      await notifyApproversAndRequester({
        requesterId: ticket.requesterId,
        ticketId: ticket.id,
        ticketCode: ticket.ticketCode,
        title: "Warehouse ticket rejected by warehouse team",
        message: `Ticket ${ticket.ticketCode} was rejected during delivery. Comment: ${comment}`,
      });
    } else {
      await deactivateTicketApprovalNotifications(id);
      await notifyRequester({
        requesterId: ticket.requesterId,
        ticketId: ticket.id,
        title: "Warehouse ticket rejected",
        message: `Your ticket ${ticket.ticketCode} was rejected. Comment: ${comment}`,
      });
    }

    return await this.mapTicket(ticket);
  }

  async resumeTicket(
    id: number,
    actor: ActorContext,
  ): Promise<WarehouseTicketResponse> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    if (existing.status !== WarehouseTicketStatus.PAUSED) {
      throw new ValidationError("Only paused tickets can be resumed");
    }

    const roleName = await this.getActorRoleName(actor);
    await this.assertTicketApprover(actor);
    await this.assertNotSelfApprover(existing.requesterId, actor);

    const nextStatus =
      existing.pausedFromStatus === WarehouseTicketStatus.APPROVED
        ? WarehouseTicketStatus.APPROVED
        : WarehouseTicketStatus.PENDING_APPROVAL;

    await db.transaction(async (tx) => {
      await this.repository.updateTicket(tx, id, {
        status: nextStatus,
        pausedFromStatus: null,
        statusComment: null,
        pausedAt: null,
        updatedBy: actor.userId,
      });

      await this.repository.addEvent(tx, {
        ticketId: id,
        actorId: actor.userId,
        action: WarehouseTicketEventAction.RESUMED,
        previousStatus: existing.status,
        newStatus: nextStatus,
      });
    });

    const ticket = await this.repository.findById(id);
    if (!ticket) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    if (nextStatus === WarehouseTicketStatus.APPROVED) {
      await deactivateTicketApprovalNotifications(id);
      await notifyWarehouseTechsForApprovedTicket({
        ticketId: ticket.id,
        warehouseId: ticket.warehouseId,
        ticketCode: ticket.ticketCode,
        requesterName: formatUserName(ticket.requester ?? undefined),
        requesterId: ticket.requesterId,
      });
    } else {
      await notifyApproversForNewTicket({
        ticketId: ticket.id,
        ticketCode: ticket.ticketCode,
        requesterId: ticket.requesterId,
        requesterName: formatUserName(ticket.requester ?? undefined),
        warehouseLabel: ticket.warehouse?.name ?? `Warehouse ${ticket.warehouseId}`,
      });
    }

    return await this.mapTicket(ticket);
  }

  async prepareTicket(
    id: number,
    data: PrepareWarehouseTicketRequest,
    actor: ActorContext,
  ): Promise<WarehouseTicketResponse> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    const allowedStatuses = [
      WarehouseTicketStatus.APPROVED,
      WarehouseTicketStatus.BEING_PREPARED,
    ];
    if (!allowedStatuses.includes(existing.status as WarehouseTicketStatus)) {
      throw new ValidationError(
        "Only approved tickets can be prepared for pickup",
      );
    }

    const roleName = await this.getActorRoleName(actor);
    this.assertWarehouseTechRole(existing.warehouseId, roleName, actor.isAdmin);

    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      for (const row of data.items) {
        const item = existing.items?.find((entry) => entry.id === row.itemId);
        if (!item) {
          throw new ValidationError(`Ticket item ${row.itemId} not found`);
        }

        if (row.preparedQuantity > item.quantity) {
          throw new ValidationError(
            `Prepared quantity cannot exceed requested quantity for ${item.productLabel}`,
          );
        }

        if (row.preparedQuantity < item.quantity) {
          const reason = row.shortageReason?.trim();
          if (!reason || reason.length < 3) {
            throw new ValidationError(
              `Shortage reason is required when prepared quantity is less than requested for ${item.productLabel}`,
            );
          }
        }

        await this.repository.updateItemPrepared(tx, row.itemId, id, {
          preparedQuantity: row.preparedQuantity,
          shortageReason: row.shortageReason?.trim() || null,
        });

        await this.repository.addEvent(tx, {
          ticketId: id,
          actorId: actor.userId,
          action: WarehouseTicketEventAction.ITEM_PREPARED,
          comment: `${item.productLabel}: ${row.preparedQuantity}/${item.quantity} prepared${row.shortageReason ? ` (${row.shortageReason})` : ""}`,
        });
      }

      const treatedItemIds = new Set(data.items.map((row) => row.itemId));
      const allTreated = (existing.items ?? []).every((item) =>
        treatedItemIds.has(item.id),
      );

      if (!allTreated) {
        throw new ValidationError(
          "All ticket items must be treated before completing preparation",
        );
      }

      await this.repository.updateTicket(tx, id, {
        status: WarehouseTicketStatus.READY_FOR_PICKUP,
        preparedAt: now,
        preparedById: actor.userId,
        warehouseTechId: actor.userId,
        confirmedAt: now,
        updatedBy: actor.userId,
      });

      await this.repository.addEvent(tx, {
        ticketId: id,
        actorId: actor.userId,
        action: WarehouseTicketEventAction.PREPARED,
        previousStatus: existing.status,
        newStatus: WarehouseTicketStatus.READY_FOR_PICKUP,
      });
    });

    const ticket = await this.repository.findById(id);
    if (!ticket) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    await notifyRequester({
      requesterId: ticket.requesterId,
      ticketId: ticket.id,
      title: "Items ready for pickup",
      message: `Ticket ${ticket.ticketCode} is ready. Please collect your items from ${ticket.warehouse?.name ?? "the warehouse"}.`,
    });

    await deactivateTicketNotifications(id);

    return await this.mapTicket(ticket);
  }

  async confirmTicket(
    id: number,
    data: ConfirmWarehouseTicketRequest,
    actor: ActorContext,
  ): Promise<WarehouseTicketResponse> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    const items = data.items?.length
      ? data.items.map((row) => ({
          itemId: row.itemId,
          preparedQuantity: row.transferredQuantity,
          shortageReason:
            row.transferredQuantity
            < (existing.items?.find((item) => item.id === row.itemId)?.quantity ?? 0)
              ? "Partial preparation"
              : null,
        }))
      : (existing.items ?? []).map((item) => ({
          itemId: item.id,
          preparedQuantity: item.quantity,
          shortageReason: null,
        }));

    return this.prepareTicket(id, { items }, actor);
  }

  async confirmTakeout(
    id: number,
    data: ConfirmTakeoutRequest,
    actor: ActorContext,
  ): Promise<WarehouseTicketResponse> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    if (existing.status !== WarehouseTicketStatus.READY_FOR_PICKUP) {
      throw new ValidationError(
        "Only tickets ready for pickup can be confirmed as taken out",
      );
    }

    const roleName = await this.getActorRoleName(actor);
    this.assertWarehouseTechRole(existing.warehouseId, roleName, actor.isAdmin);

    const settings = await this.repository.getTicketSettings();
    const reminderDays = settings?.returnReminderDays ?? 7;
    const borrowDueAt = new Date(
      Date.now() + reminderDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      for (const item of existing.items ?? []) {
        const override = data.items?.find((row) => row.itemId === item.id);
        const receivedQuantity =
          override?.receivedQuantity ?? getItemPrepared(item);

        if (receivedQuantity > getItemPrepared(item)) {
          throw new ValidationError(
            `Received quantity cannot exceed prepared quantity for ${item.productLabel}`,
          );
        }

        await this.repository.updateItemReceived(
          tx,
          item.id,
          id,
          receivedQuantity,
        );

        await this.repository.addEvent(tx, {
          ticketId: id,
          actorId: actor.userId,
          action: WarehouseTicketEventAction.ITEM_TRANSFERRED,
          comment: `${item.productLabel}: ${receivedQuantity} received by requester`,
        });
      }

      await this.repository.updateTicket(tx, id, {
        status: WarehouseTicketStatus.RECEIVED_BORROWED,
        completedAt: now,
        releasedAt: now,
        borrowDueAt,
        updatedBy: actor.userId,
      });

      await this.repository.addEvent(tx, {
        ticketId: id,
        actorId: actor.userId,
        action: WarehouseTicketEventAction.TAKEOUT_CONFIRMED,
        previousStatus: existing.status,
        newStatus: WarehouseTicketStatus.RECEIVED_BORROWED,
      });
    });

    const ticket = await this.repository.findById(id);
    if (!ticket) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    await notifyRequester({
      requesterId: ticket.requesterId,
      ticketId: ticket.id,
      title: "Borrow confirmed",
      message: `Ticket ${ticket.ticketCode}: takeout was confirmed. Return items through the ticket when finished.`,
    });

    await deactivateTicketNotifications(id);

    return await this.mapTicket(ticket);
  }

  async completeTicket(
    id: number,
    actor: ActorContext,
  ): Promise<WarehouseTicketResponse> {
    return this.confirmTakeout(id, {}, actor);
  }

  async initiateReturn(
    id: number,
    data: InitiateReturnRequest,
    actor: ActorContext,
  ): Promise<WarehouseTicketResponse> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    const borrowStatuses = [
      WarehouseTicketStatus.RECEIVED_BORROWED,
      WarehouseTicketStatus.PARTIALLY_RETURNED,
      WarehouseTicketStatus.COMPLETED,
    ];
    if (!borrowStatuses.includes(existing.status as WarehouseTicketStatus)) {
      throw new ValidationError(
        "Only borrowed tickets can initiate product returns",
      );
    }

    if (
      data.requesterId != null &&
      data.requesterId !== existing.requesterId
    ) {
      throw new ValidationError(
        "Returned products must match the requester who borrowed them",
      );
    }

    const isRequester = existing.requesterId === actor.userId;
    if (!actor.isAdmin && !isRequester) {
      throw new ForbiddenError("Only the requester can initiate a return");
    }

    const returnRows = data.items.filter((row) => row.returnQuantity > 0);
    if (!returnRows.length) {
      throw new ValidationError(
        "At least one return quantity greater than zero is required",
      );
    }

    await db.transaction(async (tx) => {
      if (data.idempotencyKey) {
        const isDuplicate = await this.repository.hasReturnIdempotencyKey(
          tx,
          id,
          data.idempotencyKey,
          ["return_initiated"],
        );
        if (isDuplicate) {
          throw new ValidationError("This return was already recorded");
        }
      }

      for (const row of returnRows) {
        const item = await this.repository.lockTicketItem(tx, row.itemId, id);
        if (!item) {
          throw new ValidationError(`Ticket item ${row.itemId} not found`);
        }

        const returnable = getItemReturnable(item);
        if (row.returnQuantity > returnable) {
          throw new ValidationError(
            `Return quantity exceeds outstanding borrowed amount for ${item.productLabel}`,
          );
        }

        const updatedItem = await this.repository.incrementItemPendingReturn(
          tx,
          row.itemId,
          id,
          row.returnQuantity,
        );

        if (!updatedItem) {
          throw new ValidationError(
            `Unable to record return for ${item.productLabel}. Please refresh and try again.`,
          );
        }

        const idempotencySuffix = data.idempotencyKey
          ? ` [idempotency:${data.idempotencyKey}]`
          : "";

        await this.repository.addEvent(tx, {
          ticketId: id,
          actorId: actor.userId,
          action: WarehouseTicketEventAction.RETURN_INITIATED,
          comment: `${item.productLabel}: ${row.returnQuantity} return initiated${idempotencySuffix}`,
        });
      }

      const refreshedItems = await tx.query.warehouseTicketItems.findMany({
        where: (items, { eq }) => eq(items.ticketId, id),
      });
      const nextStatus = resolveBorrowTicketStatus(
        refreshedItems,
        WarehouseTicketStatus.RETURN_PENDING,
      );

      await this.repository.updateTicket(tx, id, {
        status: nextStatus,
        updatedBy: actor.userId,
      });
    });

    const ticket = await this.repository.findById(id);
    if (!ticket) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    await notifyRequester({
      requesterId: ticket.requesterId,
      ticketId: ticket.id,
      title: "Return submitted",
      message: `Ticket ${ticket.ticketCode}: your return is pending warehouse confirmation.`,
    });

    await deactivateReturnPendingNotifications(ticket.id);

    await notifyStaffForReturnInitiated({
      ticketId: ticket.id,
      warehouseId: ticket.warehouseId,
      ticketCode: ticket.ticketCode,
      requesterId: ticket.requesterId,
      requesterName: formatUserName(ticket.requester ?? undefined),
    });

    return await this.mapTicket(ticket);
  }

  async confirmReturn(
    id: number,
    data: ConfirmReturnRequest,
    actor: ActorContext,
  ): Promise<WarehouseTicketResponse> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    const roleName = await this.getActorRoleName(actor);
    this.assertWarehouseTechRole(existing.warehouseId, roleName, actor.isAdmin);

    const returnRows = data.items.filter((row) => row.confirmedQuantity > 0);
    if (!returnRows.length) {
      throw new ValidationError(
        "At least one confirmed return quantity greater than zero is required",
      );
    }

    await db.transaction(async (tx) => {
      if (data.idempotencyKey) {
        const isDuplicate = await this.repository.hasReturnIdempotencyKey(
          tx,
          id,
          data.idempotencyKey,
          ["return_confirmed"],
        );
        if (isDuplicate) {
          throw new ValidationError("This return confirmation was already recorded");
        }
      }

      for (const row of returnRows) {
        const item = await this.repository.lockTicketItem(tx, row.itemId, id);
        if (!item) {
          throw new ValidationError(`Ticket item ${row.itemId} not found`);
        }

        if (row.confirmedQuantity > (item.pendingReturnQuantity ?? 0)) {
          throw new ValidationError(
            `Confirmed quantity exceeds pending return for ${item.productLabel}`,
          );
        }

        const updatedItem = await this.repository.confirmItemPendingReturn(
          tx,
          row.itemId,
          id,
          row.confirmedQuantity,
        );

        if (!updatedItem) {
          throw new ValidationError(
            `Unable to confirm return for ${item.productLabel}. Please refresh and try again.`,
          );
        }

        const idempotencySuffix = data.idempotencyKey
          ? ` [idempotency:${data.idempotencyKey}]`
          : "";

        await this.repository.addEvent(tx, {
          ticketId: id,
          actorId: actor.userId,
          action: WarehouseTicketEventAction.RETURN_CONFIRMED,
          comment: `${item.productLabel}: ${row.confirmedQuantity} return confirmed in EWMS${idempotencySuffix}`,
        });
      }

      const refreshedItems = await tx.query.warehouseTicketItems.findMany({
        where: (items, { eq }) => eq(items.ticketId, id),
      });
      const nextStatus = resolveBorrowTicketStatus(
        refreshedItems,
        existing.status,
      );
      const summary = getTicketQuantitySummary(refreshedItems);
      const now = new Date().toISOString();

      await this.repository.updateTicket(tx, id, {
        status: nextStatus,
        closedAt: nextStatus === WarehouseTicketStatus.CLOSED ? now : null,
        updatedBy: actor.userId,
      });

      if (nextStatus === WarehouseTicketStatus.CLOSED) {
        await this.repository.addEvent(tx, {
          ticketId: id,
          actorId: actor.userId,
          action: WarehouseTicketEventAction.CLOSED,
          previousStatus: existing.status,
          newStatus: WarehouseTicketStatus.CLOSED,
          comment: `All ${summary.received} borrowed item(s) returned`,
        });
      }
    });

    const ticket = await this.repository.findById(id);
    if (!ticket) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    await notifyRequester({
      requesterId: ticket.requesterId,
      ticketId: ticket.id,
      title: "Return confirmed",
      message: `Ticket ${ticket.ticketCode}: returned quantities were confirmed in EWMS.`,
    });

    return await this.mapTicket(ticket);
  }

  async returnTicket(
    id: number,
    data: {
      items: Array<{ itemId: number; returnedQuantity: number }>;
      requesterId?: number;
      idempotencyKey?: string;
    },
    actor: ActorContext,
  ): Promise<WarehouseTicketResponse> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError("Warehouse ticket not found");
    }

    const isRequester = existing.requesterId === actor.userId;
    const roleName = await this.getActorRoleName(actor);
    const isWarehouseTech = this.canHandleWarehouseTech(
      existing.warehouseId,
      roleName,
      actor.isAdmin,
    );

    const hasPendingReturn = (existing.items ?? []).some(
      (item) => (item.pendingReturnQuantity ?? 0) > 0,
    );

    if (isWarehouseTech && hasPendingReturn && !isRequester) {
      return this.confirmReturn(
        id,
        {
          idempotencyKey: data.idempotencyKey,
          items: data.items.map((row) => ({
            itemId: row.itemId,
            confirmedQuantity: row.returnedQuantity,
          })),
        },
        actor,
      );
    }

    return this.initiateReturn(
      id,
      {
        requesterId: data.requesterId,
        idempotencyKey: data.idempotencyKey,
        items: data.items.map((row) => ({
          itemId: row.itemId,
          returnQuantity: row.returnedQuantity,
        })),
      },
      actor,
    );
  }

  private canHandleWarehouseTech(
    warehouseId: number,
    roleName: string | null,
    isAdmin?: boolean,
  ) {
    if (isAdmin) {
      return true;
    }

    const w1Roles = WAREHOUSE_TICKET_W1_TECH_ROLES as readonly string[];
    const w2Roles = WAREHOUSE_TICKET_W2_TECH_ROLES as readonly string[];

    if (warehouseId === 1) {
      return roleName != null && w1Roles.includes(roleName);
    }

    if (warehouseId === 2) {
      return roleName != null && w2Roles.includes(roleName);
    }

    return false;
  }

  async processReturnReminders() {
    const settings = await this.repository.getTicketSettings();
    const reminderDays = settings?.returnReminderDays ?? 7;
    const reminderIntervalMs = reminderDays * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();

    const overdueTickets = await this.repository.listOverdueBorrowTickets();
    let sentCount = 0;

    for (const ticket of overdueTickets) {
      const outstanding = (ticket.items ?? []).reduce(
        (sum, item) =>
          sum + Math.max(0, item.transferredQuantity - (item.returnedQuantity ?? 0)),
        0,
      );

      if (outstanding <= 0) {
        continue;
      }

      if (ticket.lastReturnReminderAt) {
        const lastSentMs = new Date(ticket.lastReturnReminderAt).getTime();
        if (nowMs - lastSentMs < reminderIntervalMs) {
          continue;
        }
      }

      await notifyReturnReminder({
        requesterId: ticket.requesterId,
        ticketId: ticket.id,
        ticketCode: ticket.ticketCode,
        outstandingQuantity: outstanding,
      });
      await this.repository.markReturnReminderSent(ticket.id);
      sentCount += 1;
    }

    return sentCount;
  }
}
