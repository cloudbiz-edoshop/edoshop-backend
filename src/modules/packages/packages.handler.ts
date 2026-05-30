import type {
  CreatePackageRoute,
  CreatePackageWithItemsRoute,
  CreateShippingLabelRoute,
  DispatchPackagesRoute,
  EditPackageRoute,
  EditReceivedPackageFromW1Route,
  EditShippingLabelRoute,
  GetAllPackageStatusesRoute,
  GetPackageInfoForShippingLabelRoute,
  GetPackageManagementW1Route,
  GetPackageManagementW2Route,
  GetPackedPackagesThatAreBeingReceived,
  GetShippingPriorityCodesRoute,
  GetShippingTypesRoute,
  ListShippingLabelsRoute,
  PrintShippingLabelRoute,
  ReceiveAPackagesFromW1Route,
  ReceivedPackageDispatchManagementRoute,
  UpdateReceivedPackageStatusRoute,
} from "./packages.route";

import type { AppRouteHandler } from "@/lib/types";

import { PackageStatusIdToEnum } from "@/constants/package-statuses.constants";

import { successResponse, successResponseWithPagination } from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";
import { PackagesService } from "./packages.service";

const packagesService = new PackagesService();

export const createPackage: AppRouteHandler<CreatePackageRoute> = async (c) => {
  const data = c.req.valid("json");
  const result = await packagesService.createPackage(data);
  return c.json(
    successResponse(result, "Package created successfully"),
    HttpStatusCodes.OK,
  );
};

export const editPackage: AppRouteHandler<EditPackageRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updateData = c.req.valid("json");
  await packagesService.editPackage({
    ...updateData,
    packageId: Number(id),
  });
  // Fetch and return the updated package
  const result = await packagesService.getPackageById(Number(id));
  if (!result) {
    throw new Error("Failed to fetch updated package");
  }
  return c.json(
    successResponse(result, "Package updated successfully"),
    HttpStatusCodes.OK,
  );
};

export const createShippingLabel: AppRouteHandler<
  CreateShippingLabelRoute
> = async (c) => {
  const data = c.req.valid("json");
  const result = await packagesService.createShippingLabel({ ...data, note: data.note ?? "N/A" });
  return c.json(
    successResponse(result, "Shipping label created successfully"),
    HttpStatusCodes.OK,
  );
};

export const editShippingLabel: AppRouteHandler<
  EditShippingLabelRoute
> = async (c) => {
  const { id } = c.req.valid("param");
  const updateData = c.req.valid("json");
  await packagesService.editShippingLabel({
    ...updateData,
    shippingLabelId: Number(id),
  });
  // Fetch and return the updated shipping label
  const result = await packagesService.getShippingLabelById(Number(id));
  if (!result) {
    throw new Error("Failed to fetch updated shipping label");
  }
  return c.json(
    successResponse(result, "Shipping label updated successfully"),
    HttpStatusCodes.OK,
  );
};

export const getPackageManagementW1: AppRouteHandler<
  GetPackageManagementW1Route
> = async (c) => {
  const queryParams = c.req.valid("query");
  const { page, limit } = queryParams;
  const result = await packagesService.getPackageManagementW1(queryParams);
  const pagination = createPagination(result.total, page, limit);
  return c.json(
    successResponseWithPagination(result.data, pagination, result.searchableFields, "Package management W1 retrieved successfully"),
    HttpStatusCodes.OK,
  );
};

export const getPackageManagementW2: AppRouteHandler<
  GetPackageManagementW2Route
> = async (c) => {
  const queryParams = c.req.valid("query");
  const { page, limit } = queryParams;
  const result = await packagesService.getPackageManagementW2(queryParams);
  const pagination = createPagination(result.total, page, limit);
  return c.json(
    successResponseWithPagination(result.data, pagination, result.searchableFields, "Package management W2 retrieved successfully"),
    HttpStatusCodes.OK,
  );
};

export const createPackageWithItems: AppRouteHandler<
  CreatePackageWithItemsRoute
> = async (c) => {
  const data = c.req.valid("json");
  const jwtPayload = c.get("accessTokenPayload");
  const userId = jwtPayload.userId;

  const result = await packagesService.createPackageWithItems({
    ...data,
    userId,
  });

  return c.json(
    successResponse(result, "Package with items created successfully"),
    HttpStatusCodes.CREATED,
  );
};

export const printShippingLabel: AppRouteHandler<PrintShippingLabelRoute> = async (c) => {
  const { packageId } = c.req.valid("param");

  const pdfBuffer = await packagesService.generateLabelPdf(Number(packageId));

  // Convert Buffer to Uint8Array for Hono response
  const uint8Array = new Uint8Array(pdfBuffer);

  return c.newResponse(uint8Array, HttpStatusCodes.OK, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="label-${packageId}.pdf"`,
  });
};

export const listShippingLabels: AppRouteHandler<ListShippingLabelsRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { page, limit } = queryParams;
  const result = await packagesService.listShippingLabels(queryParams);
  const pagination = createPagination(result.total, page, limit);
  return c.json(
    successResponseWithPagination(result.data, pagination, result.searchableFields, "Shipping labels retrieved successfully"),
    HttpStatusCodes.OK,
  );
};

export const receiveAPackageFromW1: AppRouteHandler<ReceiveAPackagesFromW1Route> = async (c) => {
  const data = c.req.valid("json");
  const result = await packagesService.receiveAPackageFromW1(data);
  return c.json(
    successResponse(result, "Package received successfully"),
    HttpStatusCodes.OK,
  );
};

export const getPackedPackagesThatAreBeingReceived: AppRouteHandler<GetPackedPackagesThatAreBeingReceived> = async (c) => {
  const queryParams = c.req.valid("query");
  const { page, limit } = queryParams;
  const result = await packagesService.getPackedPackagesThatAreBeingReceived(queryParams);
  const pagination = createPagination(result.total, page, limit);
  return c.json(
    successResponseWithPagination(result.data, pagination, result.searchableFields, "Packed packages that are being received retrieved successfully"),
    HttpStatusCodes.OK,
  );
};

export const editReceivedPackageFromW1: AppRouteHandler<EditReceivedPackageFromW1Route> = async (c) => {
  const { id } = c.req.valid("param");
  const updateData = c.req.valid("json");
  const result = await packagesService.editReceivedPackageFromW1({
    ...updateData,
    packageId: Number(id),
  });

  return c.json(
    successResponse(result, "Received package updated successfully"),
    HttpStatusCodes.OK,
  );
};
export const receivedPackageDispatchManagement: AppRouteHandler<ReceivedPackageDispatchManagementRoute> = async (c) => {
  const result = await packagesService.getReceivedPackageDispatchManagement();
  return c.json(
    successResponse(result, "Packages ready for dispatch retrieved successfully"),
    HttpStatusCodes.OK,
  );
};

export const updateReceivedPackageStatus: AppRouteHandler<UpdateReceivedPackageStatusRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { status } = c.req.valid("json");

  await packagesService.updateReceivedPackageStatus({
    packageId: Number(id),
    status: Number(status),
  });

  const statusName = PackageStatusIdToEnum[Number(status)] ?? String(status);

  return c.json(
    successResponse({ packageId: Number(id), status: statusName }, "Received package status updated successfully"),
    HttpStatusCodes.OK,
  );
};

export const dispatchPackages: AppRouteHandler<DispatchPackagesRoute> = async (c) => {
  const data = c.req.valid("json");
  const result = await packagesService.dispatchPackages(data);

  return c.json(
    successResponse(result, "Packages dispatched successfully"),
    HttpStatusCodes.OK,
  );
};

export const getPackageInfoForShippingLabel: AppRouteHandler<GetPackageInfoForShippingLabelRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const result = await packagesService.getPackageInfoForShippingLabel(Number(id));

  return c.json(
    successResponse(result, "Package info for shipping label retrieved successfully"),
    HttpStatusCodes.OK,
  );
};

export const getAllPackageStatuses: AppRouteHandler<GetAllPackageStatusesRoute> = async (c) => {
  const result = await packagesService.getAllPackageStatuses();

  return c.json(
    successResponse(result, "Package statuses retrieved successfully"),
    HttpStatusCodes.OK,
  );
};

export const getShippingPriorityCodes: AppRouteHandler<GetShippingPriorityCodesRoute> = async (c) => {
  const result = await packagesService.getAllShippingPriorityCodes();

  return c.json(
    successResponse(result, "Shipping priority codes retrieved successfully"),
    HttpStatusCodes.OK,
  );
};

export const getShippingTypes: AppRouteHandler<GetShippingTypesRoute> = async (c) => {
  const result = await packagesService.getAllShippingTypes();

  return c.json(
    successResponse(result, "Shipping types retrieved successfully"),
    HttpStatusCodes.OK,
  );
};
