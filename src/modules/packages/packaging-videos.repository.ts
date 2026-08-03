import { eq } from "drizzle-orm";

import db from "@/db";
import {
  customers,
  orderItems,
  orders,
  packageItems,
  packagePackagingVideos,
  packages,
} from "@/db/models";

export class PackagingVideosRepository {
  async getByPackageId(packageId: number) {
    return db.query.packagePackagingVideos.findFirst({
      where: eq(packagePackagingVideos.packageId, packageId),
    });
  }

  async getById(id: number) {
    return db.query.packagePackagingVideos.findFirst({
      where: eq(packagePackagingVideos.id, id),
    });
  }

  async create(data: {
    packageId: number;
    videoUrl: string;
    durationSeconds?: number | null;
    recordedBy: number;
  }) {
    const now = new Date().toISOString();
    const [row] = await db
      .insert(packagePackagingVideos)
      .values({
        packageId: data.packageId,
        videoUrl: data.videoUrl,
        durationSeconds: data.durationSeconds ?? null,
        recordedBy: data.recordedBy,
        recordedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return row;
  }

  async replace(data: {
    packageId: number;
    videoUrl: string;
    durationSeconds?: number | null;
    recordedBy: number;
  }) {
    const existing = await this.getByPackageId(data.packageId);
    const now = new Date().toISOString();

    if (existing) {
      const [row] = await db
        .update(packagePackagingVideos)
        .set({
          videoUrl: data.videoUrl,
          durationSeconds: data.durationSeconds ?? null,
          recordedBy: data.recordedBy,
          recordedAt: now,
          customerConfirmedAt: null,
          customerDisputeMessage: null,
          customerRespondedAt: null,
          updatedAt: now,
        })
        .where(eq(packagePackagingVideos.id, existing.id))
        .returning();
      return row;
    }

    return this.create(data);
  }

  async updateCustomerResponse(
    id: number,
    data: {
      confirmed: boolean;
      disputeMessage?: string | null;
    },
  ) {
    const now = new Date().toISOString();
    const [row] = await db
      .update(packagePackagingVideos)
      .set({
        customerConfirmedAt: data.confirmed ? now : null,
        customerDisputeMessage: data.confirmed ? null : (data.disputeMessage ?? null),
        customerRespondedAt: now,
        updatedAt: now,
      })
      .where(eq(packagePackagingVideos.id, id))
      .returning();
    return row;
  }

  async getCustomerUserIdForPackage(packageId: number) {
    const row = await db
      .select({
        userId: customers.userId,
      })
      .from(packages)
      .innerJoin(packageItems, eq(packageItems.packageId, packages.id))
      .innerJoin(orderItems, eq(orderItems.id, packageItems.orderItemId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(eq(packages.id, packageId))
      .limit(1);

    return row[0]?.userId ?? null;
  }

  async getPrimaryOrderCodeForPackage(packageId: number) {
    const row = await db
      .select({
        orderCode: orders.orderCode,
      })
      .from(packages)
      .innerJoin(packageItems, eq(packageItems.packageId, packages.id))
      .innerJoin(orderItems, eq(orderItems.id, packageItems.orderItemId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(eq(packages.id, packageId))
      .limit(1);

    return row[0]?.orderCode ?? null;
  }

  async getVideosForOrder(orderId: number) {
    return db
      .select({
        id: packagePackagingVideos.id,
        packageId: packagePackagingVideos.packageId,
        packageCode: packages.packageCode,
        videoUrl: packagePackagingVideos.videoUrl,
        durationSeconds: packagePackagingVideos.durationSeconds,
        recordedAt: packagePackagingVideos.recordedAt,
        customerConfirmedAt: packagePackagingVideos.customerConfirmedAt,
        customerDisputeMessage: packagePackagingVideos.customerDisputeMessage,
        customerRespondedAt: packagePackagingVideos.customerRespondedAt,
      })
      .from(packagePackagingVideos)
      .innerJoin(packages, eq(packages.id, packagePackagingVideos.packageId))
      .innerJoin(packageItems, eq(packageItems.packageId, packages.id))
      .innerJoin(orderItems, eq(orderItems.id, packageItems.orderItemId))
      .where(eq(orderItems.orderId, orderId));
  }

  async getVideoForCustomer(userId: number, videoId: number) {
    const customer = await db.query.customers.findFirst({
      where: eq(customers.userId, userId),
      columns: { id: true },
    });
    if (!customer) return null;

    const rows = await db
      .select({
        id: packagePackagingVideos.id,
        packageId: packagePackagingVideos.packageId,
        packageCode: packages.packageCode,
        videoUrl: packagePackagingVideos.videoUrl,
        durationSeconds: packagePackagingVideos.durationSeconds,
        recordedAt: packagePackagingVideos.recordedAt,
        customerConfirmedAt: packagePackagingVideos.customerConfirmedAt,
        customerDisputeMessage: packagePackagingVideos.customerDisputeMessage,
        customerRespondedAt: packagePackagingVideos.customerRespondedAt,
        orderCustomerId: orders.customerId,
      })
      .from(packagePackagingVideos)
      .innerJoin(packages, eq(packages.id, packagePackagingVideos.packageId))
      .innerJoin(packageItems, eq(packageItems.packageId, packages.id))
      .innerJoin(orderItems, eq(orderItems.id, packageItems.orderItemId))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(eq(packagePackagingVideos.id, videoId))
      .limit(1);

    const video = rows[0];
    if (!video || video.orderCustomerId !== customer.id) {
      return null;
    }

    return {
      id: video.id,
      packageId: video.packageId,
      packageCode: video.packageCode,
      videoUrl: video.videoUrl,
      durationSeconds: video.durationSeconds,
      recordedAt: video.recordedAt,
      customerConfirmedAt: video.customerConfirmedAt,
      customerDisputeMessage: video.customerDisputeMessage,
      customerRespondedAt: video.customerRespondedAt,
    };
  }
}

export default PackagingVideosRepository;
