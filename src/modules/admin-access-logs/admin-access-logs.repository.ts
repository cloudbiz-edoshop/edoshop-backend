import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";

import db from "@/db";
import { adminPanelAccessLogs, users } from "@/db/models";
import { getPaginationValues } from "@/lib/searching-sorting";

export class AdminAccessLogsRepository {
  async create(data: {
    userId?: number | null;
    loginIdentifier?: string | null;
    authMethod: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    success: boolean;
    failureReason?: string | null;
  }) {
    const [created] = await db
      .insert(adminPanelAccessLogs)
      .values({
        userId: data.userId ?? null,
        loginIdentifier: data.loginIdentifier ?? null,
        authMethod: data.authMethod,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        success: data.success,
        failureReason: data.failureReason ?? null,
      })
      .returning();

    return created;
  }

  async list(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const { offset, limit } = getPaginationValues(params.page, params.limit);
    const normalizedSearch = params.search?.trim();
    const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";

    const searchCondition = normalizedSearch
      ? or(
          ilike(adminPanelAccessLogs.loginIdentifier, `%${normalizedSearch}%`),
          ilike(adminPanelAccessLogs.ipAddress, `%${normalizedSearch}%`),
          ilike(adminPanelAccessLogs.authMethod, `%${normalizedSearch}%`),
          ilike(users.fullName, `%${normalizedSearch}%`),
          ilike(users.email, `%${normalizedSearch}%`),
          ilike(users.username, `%${normalizedSearch}%`),
        )
      : undefined;

    const whereClause = searchCondition ? and(searchCondition) : undefined;

    const orderByColumn =
      params.sortBy === "loginIdentifier"
        ? adminPanelAccessLogs.loginIdentifier
        : params.sortBy === "authMethod"
          ? adminPanelAccessLogs.authMethod
          : params.sortBy === "success"
            ? adminPanelAccessLogs.success
            : adminPanelAccessLogs.createdAt;

    const [rows, totalResult] = await Promise.all([
      db
        .select({
          id: adminPanelAccessLogs.id,
          userId: adminPanelAccessLogs.userId,
          loginIdentifier: adminPanelAccessLogs.loginIdentifier,
          authMethod: adminPanelAccessLogs.authMethod,
          ipAddress: adminPanelAccessLogs.ipAddress,
          userAgent: adminPanelAccessLogs.userAgent,
          success: adminPanelAccessLogs.success,
          failureReason: adminPanelAccessLogs.failureReason,
          createdAt: adminPanelAccessLogs.createdAt,
          user: {
            id: users.id,
            fullName: users.fullName,
            username: users.username,
            email: users.email,
          },
        })
        .from(adminPanelAccessLogs)
        .leftJoin(users, eq(adminPanelAccessLogs.userId, users.id))
        .where(whereClause)
        .orderBy(
          sortOrder === "asc" ? asc(orderByColumn) : desc(orderByColumn),
        )
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(adminPanelAccessLogs)
        .leftJoin(users, eq(adminPanelAccessLogs.userId, users.id))
        .where(whereClause),
    ]);

    return {
      data: rows,
      total: Number(totalResult[0]?.total ?? 0),
      searchableFields: [
        "loginIdentifier",
        "authMethod",
        "ipAddress",
        "user.fullName",
        "user.email",
      ],
    };
  }
}
