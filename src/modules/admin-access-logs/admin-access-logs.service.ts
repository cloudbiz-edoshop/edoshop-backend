import type { AdminAccessAuthMethod } from "@/constants/admin-access-log.constants";

import { AdminAccessLogsRepository } from "./admin-access-logs.repository";

export type RecordAdminAccessAttemptInput = {
  userId?: number | null;
  loginIdentifier?: string | null;
  authMethod: AdminAccessAuthMethod;
  ipAddress?: string | null;
  userAgent?: string | null;
  success: boolean;
  failureReason?: string | null;
};

export class AdminAccessLogsService {
  private readonly repository = new AdminAccessLogsRepository();

  async recordAttempt(input: RecordAdminAccessAttemptInput) {
    try {
      await this.repository.create(input);
    } catch (error) {
      console.error("Failed to record admin panel access attempt", error);
    }
  }

  async listAccessLogs(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    return this.repository.list(params);
  }
}

export const adminAccessLogsService = new AdminAccessLogsService();
