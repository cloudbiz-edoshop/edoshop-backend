import type {
  ApproveRoute,
  CompleteRoute,
  ConfirmRoute,
  ConfirmReturnRoute,
  ConfirmTakeoutRoute,
  CreateRoute,
  GetOneRoute,
  GetSettingsRoute,
  InitiateReturnRoute,
  ListRoute,
  PatchRoute,
  PauseRoute,
  PrepareRoute,
  RejectRoute,
  RemoveRoute,
  ResumeRoute,
  SearchEntryOptionsRoute,
  ReturnTicketRoute,
  UpdateSettingsRoute,
} from "./warehouse-tickets.route";

import type {
  ListWarehouseTicketsResponse,
  WarehouseTicketResponse,
} from "./warehouse-tickets.schema";
import type { AppRouteHandler } from "@/lib/types";
import type { AppContext } from "@/lib/types";
import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { WarehouseTicketsService } from "./warehouse-tickets.service";

const warehouseTicketsService = new WarehouseTicketsService();

const getActor = (c: AppContext) => {
  const user = c.get("user");
  return {
    userId: user.id,
    isAdmin: user.isAdmin,
  };
};

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  const parsedFilters =
    typeof filters === "string" ? JSON.parse(filters) : filters;

  const result = await warehouseTicketsService.listTickets({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters: parsedFilters,
  });

  const pagination = createPagination(result.total, page, limit);

  return c.json(
    successResponseWithPagination<ListWarehouseTicketsResponse>(
      result.data.map((ticket) => ({
        ...ticket,
        status: ticket.status as WarehouseTicketResponse["status"],
        pausedFromStatus:
          ticket.pausedFromStatus as WarehouseTicketResponse["pausedFromStatus"],
      })),
      pagination,
      result.searchableFields,
    ),
    HttpStatusCodes.OK,
  );
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const data = c.req.valid("json");
  const ticket = await warehouseTicketsService.createTicket(data, getActor(c));

  return c.json(
    successResponse<WarehouseTicketResponse>(
      ticket,
      STANDARD_MESSAGES.SUCCESS.CREATED,
    ),
    HttpStatusCodes.CREATED,
  );
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const ticket = await warehouseTicketsService.getTicketById(id);

  return c.json(
    successResponse<WarehouseTicketResponse>(ticket),
    HttpStatusCodes.OK,
  );
};

export const update: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const ticket = await warehouseTicketsService.updateTicket(
    id,
    data,
    getActor(c),
  );

  return c.json(
    successResponse<WarehouseTicketResponse>(
      ticket,
      STANDARD_MESSAGES.SUCCESS.UPDATED,
    ),
    HttpStatusCodes.OK,
  );
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");
  await warehouseTicketsService.deleteTicket(id, getActor(c));
  return new Response(null, { status: HttpStatusCodes.NO_CONTENT });
};

export const approve: AppRouteHandler<ApproveRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const ticket = await warehouseTicketsService.approveTicket(id, getActor(c));

  return c.json(
    successResponse<WarehouseTicketResponse>(ticket, "Ticket approved"),
    HttpStatusCodes.OK,
  );
};

export const pause: AppRouteHandler<PauseRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { comment } = c.req.valid("json");
  const ticket = await warehouseTicketsService.pauseTicket(
    id,
    comment,
    getActor(c),
  );

  return c.json(
    successResponse<WarehouseTicketResponse>(ticket, "Ticket paused"),
    HttpStatusCodes.OK,
  );
};

export const reject: AppRouteHandler<RejectRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { comment } = c.req.valid("json");
  const ticket = await warehouseTicketsService.rejectTicket(
    id,
    comment,
    getActor(c),
  );

  return c.json(
    successResponse<WarehouseTicketResponse>(ticket, "Ticket rejected"),
    HttpStatusCodes.OK,
  );
};

export const resume: AppRouteHandler<ResumeRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const ticket = await warehouseTicketsService.resumeTicket(id, getActor(c));

  return c.json(
    successResponse<WarehouseTicketResponse>(ticket, "Ticket resumed"),
    HttpStatusCodes.OK,
  );
};

export const prepare: AppRouteHandler<PrepareRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const ticket = await warehouseTicketsService.prepareTicket(
    id,
    data,
    getActor(c),
  );

  return c.json(
    successResponse<WarehouseTicketResponse>(
      ticket,
      "Ticket prepared for pickup",
    ),
    HttpStatusCodes.OK,
  );
};

export const confirmTakeout: AppRouteHandler<ConfirmTakeoutRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json") ?? {};
  const ticket = await warehouseTicketsService.confirmTakeout(
    id,
    data,
    getActor(c),
  );

  return c.json(
    successResponse<WarehouseTicketResponse>(ticket, "Takeout confirmed"),
    HttpStatusCodes.OK,
  );
};

export const initiateReturn: AppRouteHandler<InitiateReturnRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const ticket = await warehouseTicketsService.initiateReturn(
    id,
    data,
    getActor(c),
  );

  return c.json(
    successResponse<WarehouseTicketResponse>(ticket, "Return initiated"),
    HttpStatusCodes.OK,
  );
};

export const confirmReturn: AppRouteHandler<ConfirmReturnRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const ticket = await warehouseTicketsService.confirmReturn(
    id,
    data,
    getActor(c),
  );

  return c.json(
    successResponse<WarehouseTicketResponse>(ticket, "Return confirmed"),
    HttpStatusCodes.OK,
  );
};

export const confirm: AppRouteHandler<ConfirmRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json") ?? {};
  const ticket = await warehouseTicketsService.confirmTicket(
    id,
    data,
    getActor(c),
  );

  return c.json(
    successResponse<WarehouseTicketResponse>(
      ticket,
      "Ticket confirmed for pickup",
    ),
    HttpStatusCodes.OK,
  );
};

export const complete: AppRouteHandler<CompleteRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const ticket = await warehouseTicketsService.completeTicket(id, getActor(c));

  return c.json(
    successResponse<WarehouseTicketResponse>(ticket, "Ticket completed"),
    HttpStatusCodes.OK,
  );
};

export const getSettings: AppRouteHandler<GetSettingsRoute> = async (c) => {
  const settings = await warehouseTicketsService.getTicketSettings();

  return c.json(successResponse(settings), HttpStatusCodes.OK);
};

export const updateSettings: AppRouteHandler<UpdateSettingsRoute> = async (c) => {
  const data = c.req.valid("json");
  const settings = await warehouseTicketsService.updateTicketSettings(
    data,
    getActor(c),
  );

  return c.json(
    successResponse(settings, "Ticket settings updated"),
    HttpStatusCodes.OK,
  );
};

export const searchEntryOptions: AppRouteHandler<SearchEntryOptionsRoute> = async (
  c,
) => {
  const { warehouseId, search, limit } = c.req.valid("query");
  const options = await warehouseTicketsService.searchEntryOptions({
    warehouseId,
    search,
    limit,
  });

  return c.json(successResponse(options), HttpStatusCodes.OK);
};

export const returnTicket: AppRouteHandler<ReturnTicketRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const ticket = await warehouseTicketsService.returnTicket(
    id,
    data,
    getActor(c),
  );

  return c.json(
    successResponse<WarehouseTicketResponse>(ticket, "Return recorded"),
    HttpStatusCodes.OK,
  );
};
