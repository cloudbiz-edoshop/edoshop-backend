import type {
  AddGroupPackageMembersRoute,
  CreateGroupPackageRoute,
  DispatchGroupPackageRoute,
  GetGroupPackageRoute,
  ListAvailableGroupsRoute,
  ListAvailablePackagesRoute,
  ListDispatchReadyGroupsRoute,
  ListGroupPackagesRoute,
  PrintGroupPackageLabelRoute,
  RemoveGroupPackageMemberRoute,
} from "./group-packages.route";

import type { AppRouteHandler } from "@/lib/types";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import GroupPackagesService from "./group-packages.service";

const groupPackagesService = new GroupPackagesService();

export const listGroupPackages: AppRouteHandler<ListGroupPackagesRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder } = queryParams;
  const result = await groupPackagesService.list({ search, page, limit, sortBy, sortOrder });
  const pagination = createPagination(result.total, page, limit);

  return c.json(
    successResponseWithPagination(
      result.data,
      pagination,
      result.searchableFields,
      "Group packages fetched successfully",
    ),
    HttpStatusCodes.OK,
  );
};

export const getGroupPackage: AppRouteHandler<GetGroupPackageRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const group = await groupPackagesService.getById(id);
  return c.json(successResponse(group, "Group package fetched successfully"), HttpStatusCodes.OK);
};

export const createGroupPackage: AppRouteHandler<CreateGroupPackageRoute> = async (c) => {
  const data = c.req.valid("json");
  const user = c.get("user");
  const group = await groupPackagesService.create(data, user.id);
  return c.json(successResponse(group, "Group package created successfully"), HttpStatusCodes.OK);
};

export const addGroupPackageMembers: AppRouteHandler<AddGroupPackageMembersRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const user = c.get("user");
  const group = await groupPackagesService.addMembers(id, data, user.id);
  return c.json(successResponse(group, "Group members added successfully"), HttpStatusCodes.OK);
};

export const removeGroupPackageMember: AppRouteHandler<RemoveGroupPackageMemberRoute> = async (c) => {
  const { id, memberId } = c.req.valid("param");
  const user = c.get("user");
  const group = await groupPackagesService.removeMember(id, memberId, user.id);
  return c.json(successResponse(group, "Group member removed successfully"), HttpStatusCodes.OK);
};

export const listAvailablePackages: AppRouteHandler<ListAvailablePackagesRoute> = async (c) => {
  const { destinationArea } = c.req.valid("query");
  const data = await groupPackagesService.getAvailablePackages(destinationArea);
  return c.json(successResponse(data, "Available packages fetched successfully"), HttpStatusCodes.OK);
};

export const listAvailableGroups: AppRouteHandler<ListAvailableGroupsRoute> = async (c) => {
  const { destinationArea, excludeGroupId } = c.req.valid("query");
  const data = await groupPackagesService.getAvailableGroups(destinationArea, excludeGroupId);
  return c.json(successResponse(data, "Available group packages fetched successfully"), HttpStatusCodes.OK);
};

export const printGroupPackageLabel: AppRouteHandler<PrintGroupPackageLabelRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const user = c.get("user");
  const pdfBuffer = await groupPackagesService.printGroupLabel(id, user.id);
  const uint8Array = new Uint8Array(pdfBuffer);

  return c.newResponse(uint8Array, HttpStatusCodes.OK, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="group-label-${id}.pdf"`,
  });
};

export const listDispatchReadyGroups: AppRouteHandler<ListDispatchReadyGroupsRoute> = async (c) => {
  const data = await groupPackagesService.listDispatchReadyGroups();
  return c.json(
    successResponse(data, "Dispatch-ready group packages fetched successfully"),
    HttpStatusCodes.OK,
  );
};

export const dispatchGroupPackage: AppRouteHandler<DispatchGroupPackageRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const user = c.get("user");
  const result = await groupPackagesService.dispatchGroupPackage(id, data, user.id);
  return c.json(
    successResponse(result, "Group package dispatched successfully"),
    HttpStatusCodes.OK,
  );
};
