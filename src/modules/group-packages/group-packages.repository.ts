import type { CommonQueryParams } from "@/lib/openapi/schemas/query-params-schema";
import type { TX } from "@/lib/types";
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  notInArray,
  or,
  sql,
} from "drizzle-orm";

import { GROUP_PACKAGE_STATUS } from "@/constants/group-packages.constants";
import { PackageStatusIds } from "@/constants/package-statuses.constants";
import { WarehouseIds } from "@/constants/warehouses.constants";
import db from "@/db";
import {
  groupPackageEvents,
  groupPackageMembers,
  groupPackages,
  packages,
} from "@/db/models";
import {
  createSearchCondition,
  createSortCondition,
  getPaginationValues,
} from "@/lib/searching-sorting";

export class GroupPackagesRepository {
  async nextGroupPackageCode(tx: TX | typeof db = db) {
    const result = await tx.execute(sql`SELECT next_group_package_code() as code`);
    const rows = result as unknown as Array<{ code: string }>;
    return rows[0]?.code ?? `GPKG-${Date.now()}`;
  }

  async createGroupPackage(
    tx: TX,
    data: {
      groupPackageCode: string;
      warehouseId: number;
      destinationArea: string;
      packageWeight?: string;
      binLocation?: string;
      customerCode?: string;
      createdBy: number;
      updatedBy: number;
    },
  ) {
    const [row] = await tx.insert(groupPackages).values(data).returning();
    return row;
  }

  async recordEvent(
    tx: TX,
    data: {
      groupPackageId: number;
      action: string;
      details?: string;
      createdBy: number;
    },
  ) {
    const [row] = await tx.insert(groupPackageEvents).values(data).returning();
    return row;
  }

  async addMember(
    tx: TX,
    data: {
      groupPackageId: number;
      packageId?: number;
      childGroupPackageId?: number;
      addedBy: number;
    },
  ) {
    const [row] = await tx.insert(groupPackageMembers).values({
      groupPackageId: data.groupPackageId,
      packageId: data.packageId ?? null,
      childGroupPackageId: data.childGroupPackageId ?? null,
      addedBy: data.addedBy,
    }).returning();
    return row;
  }

  async getActivePackageIds() {
    const rows = await db
      .select({ packageId: groupPackageMembers.packageId })
      .from(groupPackageMembers)
      .where(and(isNull(groupPackageMembers.removedAt), isNotNull(groupPackageMembers.packageId)));

    return rows.map((row) => row.packageId!).filter(Boolean);
  }

  async getActiveChildGroupIds() {
    const rows = await db
      .select({ childGroupPackageId: groupPackageMembers.childGroupPackageId })
      .from(groupPackageMembers)
      .where(and(isNull(groupPackageMembers.removedAt), isNotNull(groupPackageMembers.childGroupPackageId)));

    return rows.map((row) => row.childGroupPackageId!).filter(Boolean);
  }

  async getGroupPackageById(groupPackageId: number) {
    return db.query.groupPackages.findFirst({
      where: eq(groupPackages.id, groupPackageId),
      with: {
        members: {
          where: isNull(groupPackageMembers.removedAt),
          with: {
            package: {
              with: {
                entry: {
                  with: {
                    customer: {
                      columns: { customerCode: true },
                    },
                  },
                },
              },
            },
            childGroupPackage: true,
          },
        },
        events: {
          orderBy: [desc(groupPackageEvents.createdAt)],
          with: {
            createdByUser: {
              columns: { fullName: true, email: true },
            },
          },
        },
      },
    });
  }

  async listGroupPackages(params: CommonQueryParams & { warehouseId?: number }) {
    const { search, page, limit, sortBy, sortOrder, warehouseId } = params;
    const searchableFields = ["groupPackageCode", "destinationArea"];
    const searchCondition = createSearchCondition(searchableFields, groupPackages, search);
    const whereConditions = [];

    if (warehouseId) {
      whereConditions.push(eq(groupPackages.warehouseId, warehouseId));
    }
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    const whereClause = whereConditions.length ? and(...whereConditions) : undefined;
    const { limit: limitVal, offset } = getPaginationValues(page, limit);
    const sortCondition = createSortCondition(groupPackages, sortBy, sortOrder);

    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(groupPackages)
      .where(whereClause);

    const nestedGroupIds = await this.getActiveChildGroupIds();
    const topLevelCondition = nestedGroupIds.length
      ? notInArray(groupPackages.id, nestedGroupIds)
      : undefined;

    const data = await db.query.groupPackages.findMany({
      where: topLevelCondition
        ? whereClause
          ? and(whereClause, topLevelCondition)
          : topLevelCondition
        : whereClause,
      limit: limitVal,
      offset,
      orderBy: sortCondition ? [sortCondition] : [desc(groupPackages.createdAt)],
      with: {
        members: {
          where: isNull(groupPackageMembers.removedAt),
          with: {
            package: {
              columns: { packageCode: true },
              with: {
                entry: {
                  with: {
                    customer: { columns: { customerCode: true } },
                  },
                },
              },
            },
            childGroupPackage: {
              columns: { groupPackageCode: true },
            },
          },
        },
      },
    });

    return { data, total: totalCount, searchableFields };
  }

  async getMemberById(memberId: number) {
    return db.query.groupPackageMembers.findFirst({
      where: eq(groupPackageMembers.id, memberId),
    });
  }

  async removeMember(tx: TX, memberId: number, removedBy: number) {
    const [row] = await tx
      .update(groupPackageMembers)
      .set({
        removedAt: new Date().toISOString(),
        removedBy,
      })
      .where(eq(groupPackageMembers.id, memberId))
      .returning();
    return row;
  }

  async updatePackageStatus(tx: TX, packageId: number, packageStatusId: number, userId: number) {
    await tx
      .update(packages)
      .set({
        packageStatusId,
        updatedBy: userId,
        updatedAt: sql`now()`,
      })
      .where(eq(packages.id, packageId));
  }

  async getPackagesByIds(packageIds: number[]) {
    if (!packageIds.length) return [];

    return db.query.packages.findMany({
      where: inArray(packages.id, packageIds),
      with: {
        entry: {
          with: {
            customer: { columns: { customerCode: true } },
          },
        },
        packageStatus: { columns: { name: true } },
      },
    });
  }

  async getGroupsByIds(groupIds: number[]) {
    if (!groupIds.length) return [];

    return db.query.groupPackages.findMany({
      where: inArray(groupPackages.id, groupIds),
    });
  }

  async updateGroupStatus(
    tx: TX,
    groupPackageId: number,
    status: string,
    userId: number,
  ) {
    await tx
      .update(groupPackages)
      .set({
        status,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      })
      .where(eq(groupPackages.id, groupPackageId));
  }

  async getActiveTopLevelGroupsForDispatch() {
    const nestedGroupIds = await this.getActiveChildGroupIds();
    const whereConditions = [
      eq(groupPackages.warehouseId, WarehouseIds.WAREHOUSE_2),
      eq(groupPackages.status, GROUP_PACKAGE_STATUS.ACTIVE),
    ];

    if (nestedGroupIds.length) {
      whereConditions.push(notInArray(groupPackages.id, nestedGroupIds));
    }

    return db.query.groupPackages.findMany({
      where: and(...whereConditions),
      with: {
        members: {
          where: isNull(groupPackageMembers.removedAt),
          with: {
            package: {
              columns: {
                id: true,
                packageCode: true,
                packageWeightAtReceived: true,
              },
              with: {
                entry: {
                  columns: { weight: true },
                  with: {
                    customer: { columns: { customerCode: true, id: true } },
                  },
                },
              },
            },
            childGroupPackage: {
              columns: { id: true, groupPackageCode: true },
            },
          },
        },
      },
      orderBy: [desc(groupPackages.createdAt)],
    });
  }

  async getActiveMembers(groupPackageId: number) {
    return db.query.groupPackageMembers.findMany({
      where: and(
        eq(groupPackageMembers.groupPackageId, groupPackageId),
        isNull(groupPackageMembers.removedAt),
      ),
      with: {
        package: true,
        childGroupPackage: true,
      },
    });
  }

  async findAvailablePackages(destinationArea?: string) {
    const groupedPackageIds = await this.getActivePackageIds();
    const whereConditions = [
      isNotNull(packages.receivedAt),
      eq(packages.packageStatusId, PackageStatusIds.READY_TO_DISPATCH),
    ];

    if (groupedPackageIds.length) {
      whereConditions.push(notInArray(packages.id, groupedPackageIds));
    }
    if (destinationArea) {
      whereConditions.push(eq(packages.packageDestinationAtReceived, destinationArea));
    }

    return db.query.packages.findMany({
      where: and(...whereConditions),
      with: {
        entry: {
          with: {
            customer: { columns: { customerCode: true } },
          },
        },
      },
      orderBy: [desc(packages.receivedAt)],
    });
  }

  async findAvailableGroups(destinationArea?: string, excludeGroupId?: number) {
    const nestedGroupIds = await this.getActiveChildGroupIds();
    const whereConditions = [
      eq(groupPackages.warehouseId, WarehouseIds.WAREHOUSE_2),
      eq(groupPackages.status, GROUP_PACKAGE_STATUS.ACTIVE),
    ];

    if (destinationArea) {
      whereConditions.push(eq(groupPackages.destinationArea, destinationArea));
    }
    if (excludeGroupId) {
      whereConditions.push(sql`${groupPackages.id} <> ${excludeGroupId}`);
    }
    if (nestedGroupIds.length) {
      whereConditions.push(notInArray(groupPackages.id, nestedGroupIds));
    }

    return db.query.groupPackages.findMany({
      where: and(...whereConditions),
      orderBy: [desc(groupPackages.createdAt)],
    });
  }

  async getTopLevelGroupsForManagement(search?: string) {
    const nestedGroupIds = await this.getActiveChildGroupIds();
    const whereConditions = [
      eq(groupPackages.warehouseId, WarehouseIds.WAREHOUSE_2),
      eq(groupPackages.status, GROUP_PACKAGE_STATUS.ACTIVE),
    ];

    if (nestedGroupIds.length) {
      whereConditions.push(notInArray(groupPackages.id, nestedGroupIds));
    }

    const searchCondition = createSearchCondition(
      ["groupPackageCode", "destinationArea"],
      groupPackages,
      search,
    );
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }

    return db.query.groupPackages.findMany({
      where: and(...whereConditions),
      with: {
        members: {
          where: isNull(groupPackageMembers.removedAt),
          with: {
            package: {
              columns: {
                id: true,
                packageCode: true,
                binLocationAtReceived: true,
                packageDestinationAtReceived: true,
                packageWeightAtReceived: true,
                receivedAt: true,
              },
              with: {
                entry: {
                  with: {
                    customer: { columns: { customerCode: true } },
                  },
                },
              },
            },
            childGroupPackage: {
              columns: { id: true, groupPackageCode: true },
            },
          },
        },
      },
      orderBy: [desc(groupPackages.createdAt)],
    });
  }
}

export default GroupPackagesRepository;
