import type { ListRoute } from "./admin-access-logs.route";
import type { ListAdminAccessLogsResponse } from "./admin-access-logs.schema";
import type { AppRouteHandler } from "@/lib/types";

import {
  successResponseWithPagination,
} from "@/lib/api-response";
import * as HttpStatusCodes from "@/lib/http-status-codes";
import { createPagination } from "@/lib/searching-sorting";

import { AdminAccessLogsService } from "./admin-access-logs.service";

const adminAccessLogsService = new AdminAccessLogsService();

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const queryParams = c.req.valid("query");
  const { search, page, limit, sortBy, sortOrder } = queryParams;

  const result = await adminAccessLogsService.listAccessLogs({
    search,
    page,
    limit,
    sortBy,
    sortOrder,
  });

  const pagination = createPagination(result.total, page, limit);
  const logsList: ListAdminAccessLogsResponse = result.data;

  return c.json(
    successResponseWithPagination(
      logsList,
      pagination,
      result.searchableFields,
      "Admin panel access logs retrieved successfully",
    ),
    HttpStatusCodes.OK,
  );
};
