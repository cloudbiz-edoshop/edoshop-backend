import type { AppRouteHandler } from "@/lib/types";
import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveRoute,
  RemoveSelectedRoute,
} from "@/modules/employees/employees.route";
import type {
  CreateEmployeeResponse,
  GetEmployeeResponse,
  ListEmployeesResponse,
} from "@/modules/employees/employees.schema";

import { STANDARD_MESSAGES } from "@/constants";
import {
  successResponse,
  successResponseWithPagination,
} from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";
import { EmployeeService } from "@/modules/employees/employees.service";

// Create service instance
const employeeService = new EmployeeService();

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const {
    email,
    fullName,
    username,
    password,
    roleId,
    isTempRole,
    roleExpiresAfter,
  } = c.req.valid("json");

  const userId = c.get("user").id;

  // Use employee service to create the employee
  const employee = await employeeService.createEmployee({
    email,
    fullName,
    username,
    password,
    roleId,
    isTempRole,
    roleExpiresAfter,
    createdBy: userId,
  });
  const typedResponse: CreateEmployeeResponse = employee;
  const response = successResponse(
    typedResponse,
    STANDARD_MESSAGES.EMPLOYEE.CREATED,
  );
  return c.json(response, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const employee = await employeeService.getEmployee(id);
  const typedResponse: GetEmployeeResponse = employee;
  const response = successResponse(
    typedResponse,
    STANDARD_MESSAGES.EMPLOYEE.FETCHED,
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder, filters } = queryParams;

  // Use role service for listing roles
  const result = await employeeService.listEmployees({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });

  const pagination = createPagination(result.total, page, limit);
  const employeesList: ListEmployeesResponse = result.data;
  const searchableFields: string[] = result.searchableFields;

  const response = successResponseWithPagination(
    employeesList,
    pagination,
    searchableFields,
    "Employees retrieved successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updateData = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const updatedBy = payload.userId;
  const data = {
    ...updateData,
    id,
    updatedBy,
  };
  // Use employee service to update the employee
  const updatedEmployee = await employeeService.updateEmployee(data);

  const response = successResponse(
    updatedEmployee,
    "Employee updated successfully",
  );
  return c.json(response, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;
  // Use role service to delete the role
  await employeeService.deleteEmployee(id, deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const removeSelected: AppRouteHandler<RemoveSelectedRoute> = async (
  c,
) => {
  const { ids } = c.req.valid("json");
  const payload = c.get("accessTokenPayload");
  const deletedBy = payload.userId;
  // Use role service to delete the role
  await employeeService.deleteEmployees(ids, deletedBy);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
