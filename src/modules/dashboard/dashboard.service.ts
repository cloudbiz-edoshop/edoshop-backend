import { PackageStatusIdToEnum } from "@/constants/package-statuses.constants";

import { DashboardRepository } from "./dashboard.repository";

export class DashboardService {
  private readonly repository = new DashboardRepository();

  async getMetrics(params: {
    weeks?: number;
    from?: string;
    to?: string;
  }) {
    const metrics = await this.repository.getMetrics(params);

    return {
      ...metrics,
      packageStatusBreakdown: metrics.packageStatusBreakdown.map((item) => ({
        status:
          PackageStatusIdToEnum[Number(item.status)] ?? `Status ${item.status}`,
        count: item.count,
      })),
    };
  }
}
