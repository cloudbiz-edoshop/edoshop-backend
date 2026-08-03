import {
  and,
  eq,
  isNotNull,
  notInArray,
} from "drizzle-orm";

import type { CommonQueryParams } from "@/lib/openapi/schemas/query-params-schema";

import { GROUP_PACKAGE_EVENT_ACTION, GROUP_PACKAGE_STATUS } from "@/constants/group-packages.constants";
import { PackageStatusIds } from "@/constants/package-statuses.constants";
import { WarehouseIds } from "@/constants/warehouses.constants";
import { NotFoundError, ValidationError } from "@/core/errors";
import db from "@/db";
import { groupPackages, packages } from "@/db/models";
import { generateGroupLabelPdf } from "@/lib/pdf-label.utils";

import type { GroupPackageResponse, W2ManagementRow } from "./group-packages.schema";
import GroupPackagesRepository from "./group-packages.repository";

const SHIPPED_OR_DISPATCHED = [
  PackageStatusIds.DISPATCHED,
  PackageStatusIds.SHIPPED,
  PackageStatusIds.DELIVERED,
];

export class GroupPackagesService {
  private readonly repository = new GroupPackagesRepository();

  private mapGroup(row: NonNullable<Awaited<ReturnType<GroupPackagesRepository["getGroupPackageById"]>>>): GroupPackageResponse {
    return {
      id: row.id,
      groupPackageCode: row.groupPackageCode,
      warehouseId: row.warehouseId,
      destinationArea: row.destinationArea,
      packageWeight: row.packageWeight?.toString() ?? null,
      binLocation: row.binLocation ?? null,
      customerCode: row.customerCode ?? null,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      members: row.members?.map((member) => ({
        id: member.id,
        packageId: member.packageId,
        childGroupPackageId: member.childGroupPackageId,
        packageCode: member.package?.packageCode ?? null,
        childGroupPackageCode: member.childGroupPackage?.groupPackageCode ?? null,
        customerCode: member.package?.entry?.customer?.customerCode ?? null,
        addedAt: member.addedAt,
      })),
      events: row.events?.map((event) => ({
        id: event.id,
        action: event.action,
        details: event.details,
        createdAt: event.createdAt,
        createdByName: event.createdByUser?.fullName || event.createdByUser?.email || null,
      })),
    };
  }

  async list(params: CommonQueryParams) {
    const result = await this.repository.listGroupPackages({
      ...params,
      warehouseId: WarehouseIds.WAREHOUSE_2,
    });

    return {
      ...result,
      data: result.data.map((group) => ({
        id: group.id,
        groupPackageCode: group.groupPackageCode,
        warehouseId: group.warehouseId,
        destinationArea: group.destinationArea,
        packageWeight: group.packageWeight?.toString() ?? null,
        binLocation: group.binLocation ?? null,
        customerCode: group.customerCode ?? null,
        status: group.status,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        members: group.members.map((member) => ({
          id: member.id,
          packageId: member.packageId,
          childGroupPackageId: member.childGroupPackageId,
          packageCode: member.package?.packageCode ?? null,
          childGroupPackageCode: member.childGroupPackage?.groupPackageCode ?? null,
          customerCode: member.package?.entry?.customer?.customerCode ?? null,
          addedAt: member.addedAt,
        })),
      })),
    };
  }

  async getById(groupPackageId: number) {
    const group = await this.repository.getGroupPackageById(groupPackageId);
    if (!group) {
      throw new NotFoundError("Group package not found");
    }
    return this.mapGroup(group);
  }

  async create(
    data: {
      destinationArea?: string;
      packageWeight: number;
      binLocation: string;
      customerCode: string;
      packageIds?: number[];
      childGroupPackageIds?: number[];
    },
    userId: number,
  ) {
    const packageIds = data.packageIds ?? [];
    const childGroupPackageIds = data.childGroupPackageIds ?? [];

    if (!packageIds.length && !childGroupPackageIds.length) {
      throw new ValidationError("Add at least one package or existing group package");
    }

    const destinationArea = data.destinationArea?.trim()
      || await this.resolveDestinationArea(packageIds, childGroupPackageIds);

    return db.transaction(async (tx) => {
      const code = await this.repository.nextGroupPackageCode(tx);
      const group = await this.repository.createGroupPackage(tx, {
        groupPackageCode: code,
        warehouseId: WarehouseIds.WAREHOUSE_2,
        destinationArea,
        packageWeight: data.packageWeight.toFixed(2),
        binLocation: data.binLocation.trim(),
        customerCode: data.customerCode.trim(),
        createdBy: userId,
        updatedBy: userId,
      });

      await this.repository.recordEvent(tx, {
        groupPackageId: group.id,
        action: GROUP_PACKAGE_EVENT_ACTION.CREATED,
        details: `Created ${code} for destination ${destinationArea}`,
        createdBy: userId,
      });

      await this.addMembersInternal(tx, group.id, packageIds, childGroupPackageIds, userId, destinationArea);

      const created = await this.repository.getGroupPackageById(group.id);
      return this.mapGroup(created!);
    });
  }

  private async resolveDestinationArea(
    packageIds: number[],
    childGroupPackageIds: number[],
  ) {
    if (packageIds.length) {
      const [pkg] = await this.repository.getPackagesByIds([packageIds[0]!]);
      if (pkg?.packageDestinationAtReceived) {
        return pkg.packageDestinationAtReceived;
      }
    }

    if (childGroupPackageIds.length) {
      const [childGroup] = await this.repository.getGroupsByIds([childGroupPackageIds[0]!]);
      if (childGroup?.destinationArea) {
        return childGroup.destinationArea;
      }
    }

    throw new ValidationError("Unable to determine destination area from selected packages or groups");
  }

  async addMembers(
    groupPackageId: number,
    data: {
      packageIds?: number[];
      childGroupPackageIds?: number[];
    },
    userId: number,
  ) {
    const group = await this.repository.getGroupPackageById(groupPackageId);
    if (!group) {
      throw new NotFoundError("Group package not found");
    }
    if (group.status !== GROUP_PACKAGE_STATUS.ACTIVE) {
      throw new ValidationError("Cannot modify a group that is not active");
    }

    const packageIds = data.packageIds ?? [];
    const childGroupPackageIds = data.childGroupPackageIds ?? [];
    if (!packageIds.length && !childGroupPackageIds.length) {
      throw new ValidationError("Add at least one package or group package");
    }

    return db.transaction(async (tx) => {
      await this.addMembersInternal(
        tx,
        groupPackageId,
        packageIds,
        childGroupPackageIds,
        userId,
        group.destinationArea,
      );

      const updated = await this.repository.getGroupPackageById(groupPackageId);
      return this.mapGroup(updated!);
    });
  }

  private async addMembersInternal(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    groupPackageId: number,
    packageIds: number[],
    childGroupPackageIds: number[],
    userId: number,
    destinationArea: string,
  ) {
    const groupedPackageIds = await this.repository.getActivePackageIds();
    const nestedGroupIds = await this.repository.getActiveChildGroupIds();

    for (const packageId of packageIds) {
      if (groupedPackageIds.includes(packageId)) {
        throw new ValidationError(`Package ${packageId} is already grouped`);
      }

      const [pkg] = await this.repository.getPackagesByIds([packageId]);
      if (!pkg) {
        throw new NotFoundError(`Package ${packageId} not found`);
      }
      if (!pkg.receivedAt) {
        throw new ValidationError(`Package ${pkg.packageCode} has not been received in W2`);
      }
      if (pkg.packageStatusId !== PackageStatusIds.READY_TO_DISPATCH) {
        throw new ValidationError(`Package ${pkg.packageCode} must be Ready to Dispatch`);
      }
      if (
        pkg.packageDestinationAtReceived
        && pkg.packageDestinationAtReceived !== destinationArea
      ) {
        throw new ValidationError(
          `Package ${pkg.packageCode} destination does not match the group destination`,
        );
      }

      await this.repository.addMember(tx, {
        groupPackageId,
        packageId,
        addedBy: userId,
      });
      await this.repository.updatePackageStatus(tx, packageId, PackageStatusIds.GROUPED, userId);
      await this.repository.recordEvent(tx, {
        groupPackageId,
        action: GROUP_PACKAGE_EVENT_ACTION.MEMBER_ADDED,
        details: `Added package ${pkg.packageCode}`,
        createdBy: userId,
      });
    }

    for (const childGroupPackageId of childGroupPackageIds) {
      if (childGroupPackageId === groupPackageId) {
        throw new ValidationError("A group package cannot be added to itself");
      }
      if (nestedGroupIds.includes(childGroupPackageId)) {
        throw new ValidationError(`Group package ${childGroupPackageId} is already nested`);
      }

      const [childGroup] = await this.repository.getGroupsByIds([childGroupPackageId]);
      if (!childGroup) {
        throw new NotFoundError(`Group package ${childGroupPackageId} not found`);
      }
      if (childGroup.status !== GROUP_PACKAGE_STATUS.ACTIVE) {
        throw new ValidationError(`Group ${childGroup.groupPackageCode} is not active`);
      }
      if (childGroup.destinationArea !== destinationArea) {
        throw new ValidationError(
          `Group ${childGroup.groupPackageCode} destination does not match`,
        );
      }

      await this.repository.addMember(tx, {
        groupPackageId,
        childGroupPackageId,
        addedBy: userId,
      });
      await this.repository.recordEvent(tx, {
        groupPackageId,
        action: GROUP_PACKAGE_EVENT_ACTION.NESTED_GROUP_ADDED,
        details: `Added nested group ${childGroup.groupPackageCode}`,
        createdBy: userId,
      });
    }

    await tx
      .update(groupPackages)
      .set({ updatedAt: new Date().toISOString(), updatedBy: userId })
      .where(eq(groupPackages.id, groupPackageId));
  }

  async removeMember(groupPackageId: number, memberId: number, userId: number) {
    const group = await this.repository.getGroupPackageById(groupPackageId);
    if (!group) {
      throw new NotFoundError("Group package not found");
    }
    if (group.status !== GROUP_PACKAGE_STATUS.ACTIVE) {
      throw new ValidationError("Cannot modify a group that is not active");
    }

    const member = await this.repository.getMemberById(memberId);
    if (!member || member.groupPackageId !== groupPackageId || member.removedAt) {
      throw new NotFoundError("Group member not found");
    }

    return db.transaction(async (tx) => {
      await this.repository.removeMember(tx, memberId, userId);

      if (member.packageId) {
        const [pkg] = await this.repository.getPackagesByIds([member.packageId]);
        if (pkg && !SHIPPED_OR_DISPATCHED.includes(pkg.packageStatusId)) {
          await this.repository.updatePackageStatus(
            tx,
            member.packageId,
            PackageStatusIds.READY_TO_DISPATCH,
            userId,
          );
        }
      }

      await this.repository.recordEvent(tx, {
        groupPackageId,
        action: GROUP_PACKAGE_EVENT_ACTION.MEMBER_REMOVED,
        details: member.packageId
          ? `Removed package member #${member.packageId}`
          : `Removed nested group member #${member.childGroupPackageId}`,
        createdBy: userId,
      });

      const updated = await this.repository.getGroupPackageById(groupPackageId);
      return this.mapGroup(updated!);
    });
  }

  async getAvailablePackages(destinationArea?: string) {
    const rows = await this.repository.findAvailablePackages(destinationArea);
    return rows.map((row) => ({
      id: row.id,
      packageCode: row.packageCode,
      customerCode: row.entry?.customer?.customerCode ?? "Unknown",
      destination: row.packageDestinationAtReceived ?? "Unknown",
      packageWeight: row.packageWeightAtReceived?.toString() ?? row.entry?.weight?.toString() ?? "0",
      binLocation: row.binLocationAtReceived ?? row.binLocation ?? "Unknown",
      receivedAt: row.receivedAt,
    }));
  }

  async getAvailableGroups(destinationArea?: string, excludeGroupId?: number) {
    const rows = await this.repository.findAvailableGroups(destinationArea, excludeGroupId);
    return rows.map((row) => ({
      id: row.id,
      groupPackageCode: row.groupPackageCode,
      destinationArea: row.destinationArea,
      packageWeight: row.packageWeight?.toString() ?? null,
      binLocation: row.binLocation ?? null,
      customerCode: row.customerCode ?? null,
      status: row.status,
    }));
  }

  async logLabelPrint(groupPackageId: number, userId: number) {
    const group = await this.repository.getGroupPackageById(groupPackageId);
    if (!group) {
      throw new NotFoundError("Group package not found");
    }

    await db.transaction(async (tx) => {
      await this.repository.recordEvent(tx, {
        groupPackageId,
        action: GROUP_PACKAGE_EVENT_ACTION.LABEL_PRINTED,
        details: `Label printed for ${group.groupPackageCode}`,
        createdBy: userId,
      });
    });

    return { success: true };
  }

  private async collectGroupContents(groupPackageId: number) {
    const members = await this.repository.getActiveMembers(groupPackageId);
    const packageIds: number[] = [];
    const nestedGroupIds: number[] = [];
    const packageCodes: string[] = [];
    let totalWeight = 0;

    for (const member of members) {
      if (member.packageId && member.package) {
        packageIds.push(member.packageId);
        packageCodes.push(member.package.packageCode);
        totalWeight += Number(member.package.packageWeightAtReceived ?? 0) || 0;
      } else if (member.childGroupPackageId) {
        nestedGroupIds.push(member.childGroupPackageId);
        const nested = await this.collectGroupContents(member.childGroupPackageId);
        packageIds.push(...nested.packageIds);
        nestedGroupIds.push(...nested.nestedGroupIds);
        packageCodes.push(...nested.packageCodes);
        totalWeight += nested.totalWeight;
      }
    }

    return { packageIds, nestedGroupIds, packageCodes, totalWeight };
  }

  async generateGroupLabelPdf(groupPackageId: number): Promise<Buffer> {
    const group = await this.repository.getGroupPackageById(groupPackageId);
    if (!group) {
      throw new NotFoundError("Group package not found");
    }

    const contents = await this.collectGroupContents(groupPackageId);
    const memberSummary = contents.packageCodes.slice(0, 6).join(" | ")
      || group.groupPackageCode;
    const totalWeight = group.packageWeight?.toString()
      || contents.totalWeight.toFixed(2);

    return generateGroupLabelPdf({
      groupPackageCode: group.groupPackageCode,
      destinationArea: group.destinationArea,
      memberSummary,
      totalWeight: totalWeight ? `${totalWeight} kg` : "N/A",
      memberCount: contents.packageIds.length,
    });
  }

  async printGroupLabel(groupPackageId: number, userId: number): Promise<Buffer> {
    const pdfBuffer = await this.generateGroupLabelPdf(groupPackageId);
    await this.logLabelPrint(groupPackageId, userId);
    return pdfBuffer;
  }

  async listDispatchReadyGroups() {
    const groups = await this.repository.getActiveTopLevelGroupsForDispatch();

    const results = await Promise.all(
      groups.map(async (group) => {
        const contents = await this.collectGroupContents(group.id);
        return {
          id: group.id,
          groupPackageCode: group.groupPackageCode,
          destinationArea: group.destinationArea,
          memberCount: contents.packageIds.length,
          packageCodes: contents.packageCodes,
          totalWeight: contents.totalWeight > 0
            ? contents.totalWeight.toFixed(2)
            : "0",
        };
      }),
    );

    return results.filter((group) => group.memberCount > 0);
  }

  async dispatchGroupPackage(
    groupPackageId: number,
    data: {
      driverId: number;
      driverName: string;
      packageDestination: string;
      additionalNotes?: string;
      deliverToDriver?: string;
    },
    userId: number,
  ) {
    const group = await this.repository.getGroupPackageById(groupPackageId);
    if (!group) {
      throw new NotFoundError("Group package not found");
    }
    if (group.status !== GROUP_PACKAGE_STATUS.ACTIVE) {
      throw new ValidationError("Group package is not active");
    }

    const nestedGroupIds = await this.repository.getActiveChildGroupIds();
    if (nestedGroupIds.includes(groupPackageId)) {
      throw new ValidationError("Nested group packages must be dispatched via their parent group");
    }

    const contents = await this.collectGroupContents(groupPackageId);
    if (!contents.packageIds.length) {
      throw new ValidationError("Group package has no packages to dispatch");
    }

    const dispatchTime = new Date().toISOString();
    const allGroupIds = [groupPackageId, ...contents.nestedGroupIds];

    await db.transaction(async (tx) => {
      for (const packageId of contents.packageIds) {
        await this.repository.updatePackageStatus(
          tx,
          packageId,
          PackageStatusIds.DISPATCHED,
          userId,
        );
      }

      for (const nestedGroupId of allGroupIds) {
        await this.repository.updateGroupStatus(
          tx,
          nestedGroupId,
          GROUP_PACKAGE_STATUS.DISPATCHED,
          userId,
        );
        await this.repository.recordEvent(tx, {
          groupPackageId: nestedGroupId,
          action: GROUP_PACKAGE_EVENT_ACTION.DISPATCHED,
          details: nestedGroupId === groupPackageId
            ? `Dispatched to driver ${data.driverName} (${data.driverId})`
            : `Dispatched via parent group ${group.groupPackageCode}`,
          createdBy: userId,
        });
      }
    });

    return {
      groupPackageId,
      driverId: data.driverId,
      driverName: data.driverName,
      packageDestination: data.packageDestination,
      additionalNotes: data.additionalNotes ?? null,
      dispatchTime,
      dispatchedPackageIds: contents.packageIds,
    };
  }

  async buildW2ManagementRows(search?: string): Promise<W2ManagementRow[]> {
    const groupedPackageIds = await this.repository.getActivePackageIds();
    const whereConditions = [isNotNull(packages.receivedAt)];
    if (groupedPackageIds.length) {
      whereConditions.push(notInArray(packages.id, groupedPackageIds));
    }

    const ungroupedPackages = await db.query.packages.findMany({
      where: and(...whereConditions),
      with: {
        entry: {
          with: {
            customer: { columns: { customerCode: true } },
          },
        },
        packageStatus: { columns: { name: true } },
      },
    });

    const groups = await this.repository.getTopLevelGroupsForManagement(search);

    const packageRows: W2ManagementRow[] = ungroupedPackages
      .filter((row) => {
        if (!search) return true;
        const term = search.toLowerCase();
        return row.packageCode.toLowerCase().includes(term)
          || (row.entry?.customer?.customerCode ?? "").toLowerCase().includes(term);
      })
      .map((row) => ({
        rowType: "package" as const,
        id: row.id,
        packageId: row.id,
        groupPackageId: null,
        packageCode: row.packageCode,
        groupPackageCode: null,
        customerCode: row.entry?.customer?.customerCode ?? "Unknown",
        binLocation: row.binLocationAtReceived ?? row.binLocation ?? "Unknown",
        destination: row.packageDestinationAtReceived ?? "Unknown",
        packageWeight: row.packageWeightAtReceived?.toString() ?? row.entry?.weight?.toString() ?? "0",
        packagingStatus: row.packageStatus.name,
        receivedAt: row.receivedAt,
      }));

    const groupRows: W2ManagementRow[] = groups.map((group) => {
      const packageCodes: string[] = [];
      const customerCodes: string[] = [];

      for (const member of group.members) {
        if (member.package?.packageCode) {
          packageCodes.push(member.package.packageCode);
          customerCodes.push(member.package.entry?.customer?.customerCode ?? "Unknown");
        } else if (member.childGroupPackage?.groupPackageCode) {
          packageCodes.push(member.childGroupPackage.groupPackageCode);
          customerCodes.push("Nested group");
        }
      }

      const firstPackageMember = group.members.find((member) => member.package);
      return {
        rowType: "group" as const,
        id: group.id,
        packageId: null,
        groupPackageId: group.id,
        packageCode: null,
        groupPackageCode: group.groupPackageCode,
        packageCodes,
        customerCode: customerCodes[0] ?? "—",
        customerCodes,
        binLocation: group.binLocation ?? firstPackageMember?.package?.binLocationAtReceived ?? "—",
        destination: group.destinationArea,
        packageWeight: group.packageWeight?.toString() ?? "—",
        packagingStatus: "Grouped",
        receivedAt: firstPackageMember?.package?.receivedAt ?? group.createdAt,
      };
    });

    return [...groupRows, ...packageRows].sort((a, b) => {
      const aCode = a.groupPackageCode ?? a.packageCode ?? "";
      const bCode = b.groupPackageCode ?? b.packageCode ?? "";
      return bCode.localeCompare(aCode);
    });
  }
}

export default GroupPackagesService;
