import { randomUUID } from "node:crypto";

import { NotificationTypeIds } from "@/constants/notification-types.constants";
import { NotificationAudience } from "@/constants/notification-audience.constants";
import { EntityType } from "@/constants/entities.constants";
import { OperationType } from "@/constants/operations.constants";
import { PackageStatusIds } from "@/constants/package-statuses.constants";
import { StorageService } from "@/common/services/storage.service";
import { NotFoundError, ValidationError } from "@/core/errors";
import db from "@/db";
import { users } from "@/db/models";
import { and, eq } from "drizzle-orm";
import { NotificationDeliveryService } from "@/modules/notifications/notification-delivery.service";
import {
  amendmentDeadlineFrom,
  customerAmendmentNotice,
  isAmendmentWindowOpen,
  staffAmendmentNotice,
  staffConfirmationNotice,
  staffSilenceNotice,
} from "./packaging-amendment";
import { PackagingVideosRepository } from "./packaging-videos.repository";
import { PackagesRepository } from "./packages.repository";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const ALLOWED_VIDEO_BASE_TYPES = new Set([
  "video/webm",
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
]);

const normalizeVideoMimeType = (type: string | undefined | null) =>
  String(type ?? "").split(";")[0]?.trim().toLowerCase() ?? "";

const isAllowedVideoType = (type: string | undefined | null) => {
  const baseType = normalizeVideoMimeType(type);
  // Browser MediaRecorder often omits type on Blob; filename uses .webm in that case.
  if (!baseType) return true;
  return ALLOWED_VIDEO_BASE_TYPES.has(baseType);
};

const resolveVideoExtension = (type: string | undefined | null) => {
  const baseType = normalizeVideoMimeType(type);
  if (baseType.includes("mp4")) return "mp4";
  if (baseType.includes("quicktime")) return "mov";
  return "webm";
};

const notificationDeliveryService = new NotificationDeliveryService();

export class PackagingVideosService {
  private readonly repository = new PackagingVideosRepository();
  private readonly packagesRepository = new PackagesRepository();
  private readonly storageService = new StorageService();

  async assertPackagingVideoRecorded(packageId: number) {
    const video = await this.repository.getByPackageId(packageId);
    if (!video) {
      throw new ValidationError(
        "Packaging video must be recorded before creating or printing the shipping label.",
      );
    }
  }

  async getByPackageId(packageId: number) {
    const pkg = await this.packagesRepository.getPackageById(packageId);
    if (!pkg) {
      throw new NotFoundError("Package not found");
    }

    const video = await this.repository.getByPackageId(packageId);
    if (!video) {
      return null;
    }

    return this.toResponse(video);
  }

  async uploadPackagingVideo(params: {
    packageId: number;
    file: File;
    durationSeconds?: number | null;
    recordedBy?: number | null;
  }) {
    const pkg = await this.packagesRepository.getPackageById(params.packageId);
    if (!pkg) {
      throw new NotFoundError("Package not found");
    }

    if (!params.file || params.file.size === 0) {
      throw new ValidationError("No video file uploaded");
    }

    if (params.file.size > MAX_VIDEO_BYTES) {
      throw new ValidationError("Video file exceeds the 100MB limit");
    }

    if (!isAllowedVideoType(params.file.type)) {
      throw new ValidationError("Unsupported video format. Use WebM or MP4.");
    }

    const extension = resolveVideoExtension(params.file.type);
    const uploadType = normalizeVideoMimeType(params.file.type) || `video/${extension}`;
    const uploadFile = params.file.type
      ? params.file
      : new File([await params.file.arrayBuffer()], `packaging.${extension}`, {
          type: uploadType,
        });

    const objectName = `packaging-videos/${params.packageId}/${randomUUID()}.${extension}`;
    const videoUrl = await this.storageService.uploadFile(uploadFile, objectName);

    const video = await this.repository.replace({
      packageId: params.packageId,
      videoUrl,
      durationSeconds: params.durationSeconds ?? null,
      recordedBy: params.recordedBy,
    });

    const released = await this.releaseVideoToCustomer(params.packageId, pkg.packageCode);
    return this.toResponse(released ?? video);
  }

  /**
   * Sends the packaging video to the customer and starts the 24-hour
   * amendment window. Safe to call again: an already-released video is left as-is.
   */
  private async releaseVideoToCustomer(packageId: number, packageCode: string) {
    const current = await this.repository.getByPackageId(packageId);
    if (!current) return null;
    if (current.releasedToCustomerAt) return current;

    const releasedAt = new Date();
    const released = await this.repository.markReleasedToCustomer(
      packageId,
      releasedAt.toISOString(),
      amendmentDeadlineFrom(releasedAt).toISOString(),
    );
    await this.notifyCustomerPackagingComplete(packageId, packageCode);
    return released;
  }

  async completeW1Fulfillment(packageId: number) {
    const pkg = await this.packagesRepository.getPackageById(packageId);
    if (!pkg) {
      throw new NotFoundError("Package not found");
    }

    if (pkg.hasShippingLabel !== 1) {
      throw new ValidationError(
        "Shipping label must be created before fulfillment can be completed.",
      );
    }

    if (!pkg.labelPhotoUrl) {
      throw new ValidationError(
        "Upload a photo of the package with the label attached before completing fulfillment.",
      );
    }

    // The packaging video is optional in the current W1 flow. When one exists
    // it is released to the customer; otherwise completion is tracked on the
    // package itself.
    const existing = await this.repository.getByPackageId(packageId);

    if (pkg.fulfillmentCompletedAt) {
      return {
        packageId,
        packageCode: pkg.packageCode,
        fulfillmentCompletedAt: pkg.fulfillmentCompletedAt,
        packagingVideo: existing
          ? this.toResponse({ ...existing, packageCode: pkg.packageCode })
          : null,
      };
    }

    const completedAt = new Date().toISOString();
    const completed = await this.packagesRepository.markFulfillmentCompleted(
      packageId,
      completedAt,
    );
    if (!completed) {
      throw new NotFoundError("Package not found");
    }

    let packagingVideo: ReturnType<PackagingVideosService["toResponse"]> | null = null;
    if (existing) {
      const released = await this.releaseVideoToCustomer(packageId, pkg.packageCode);
      if (released) {
        packagingVideo = this.toResponse({ ...released, packageCode: pkg.packageCode });
      }
    }

    return {
      packageId,
      packageCode: pkg.packageCode,
      fulfillmentCompletedAt: completed.fulfillmentCompletedAt ?? completedAt,
      packagingVideo,
    };
  }

  /**
   * Cancels the fulfillment work done on a package. The order itself is left
   * untouched so it can be picked up and fulfilled again.
   */
  async cancelW1Fulfillment(packageId: number, userId: number) {
    const pkg = await this.packagesRepository.getPackageById(packageId);
    if (!pkg) {
      throw new NotFoundError("Package not found");
    }

    if (pkg.packageStatusId === PackageStatusIds.CANCELLED) {
      throw new ValidationError("This fulfillment has already been cancelled.");
    }

    if (pkg.receivedAt) {
      throw new ValidationError(
        "This package has already been received in Warehouse 2 and can no longer be cancelled here.",
      );
    }

    await this.packagesRepository.cancelPackageFulfillment(packageId, userId);
    await this.repository.clearReleasedToCustomer(packageId);

    return { packageId, packageCode: pkg.packageCode, cancelled: true };
  }

  async respondToPackagingVideo(params: {
    userId: number;
    videoId: number;
    confirmed: boolean;
    disputeMessage?: string;
  }) {
    const video = await this.repository.getVideoForCustomer(params.userId, params.videoId);
    if (!video) {
      throw new NotFoundError("Packaging video not found");
    }

    if (video.customerRespondedAt) {
      throw new ValidationError("You have already responded to this packaging video");
    }

    if (!isAmendmentWindowOpen(video.amendmentDeadlineAt)) {
      throw new ValidationError(
        "The 24-hour window to send amendments has closed.",
      );
    }

    if (!params.confirmed && !params.disputeMessage?.trim()) {
      throw new ValidationError("Please describe the missing or incorrect items");
    }

    const updated = await this.repository.updateCustomerResponse(params.videoId, {
      confirmed: params.confirmed,
      disputeMessage: params.disputeMessage?.trim() ?? null,
    });

    const pkg = await this.packagesRepository.getPackageById(video.packageId);
    const packageCode = video.packageCode ?? pkg?.packageCode ?? String(video.packageId);
    if (!params.confirmed) {
      await this.notifyStaffToCompletePackaging({
        videoId: video.id,
        packageId: video.packageId,
        packageCode,
        message: staffAmendmentNotice(packageCode, params.disputeMessage?.trim() ?? ""),
      });
    } else if (!pkg?.fulfillmentCompletedAt) {
      await this.notifyStaffToCompletePackaging({
        videoId: video.id,
        packageId: video.packageId,
        packageCode,
        message: staffConfirmationNotice(packageCode),
      });
    }

    return this.toResponse(updated);
  }

  /**
   * After 24 hours with no customer reply, tell warehouse staff to finish
   * packaging for packages that are not completed yet.
   */
  async processExpiredAmendmentWindows() {
    const now = new Date().toISOString();
    const due = await this.repository.listVideosAwaitingStaffAfterSilence(now);
    for (const video of due) {
      await this.notifyStaffToCompletePackaging({
        videoId: video.id,
        packageId: video.packageId,
        packageCode: video.packageCode,
        message: staffSilenceNotice(video.packageCode),
      });
    }
    return due.length;
  }

  async getVideosForOrder(orderId: number) {
    const videos = await this.repository.getVideosForOrder(orderId);
    const uniqueByPackage = new Map<number, typeof videos[number]>();
    for (const video of videos) {
      uniqueByPackage.set(video.packageId, video);
    }

    return [...uniqueByPackage.values()].map((video) => ({
      id: video.id,
      packageId: video.packageId,
      packageCode: video.packageCode,
      videoUrl: video.videoUrl,
      durationSeconds: video.durationSeconds,
      recordedAt: video.recordedAt,
      customerConfirmedAt: video.customerConfirmedAt,
      customerDisputeMessage: video.customerDisputeMessage,
      customerRespondedAt: video.customerRespondedAt,
      amendmentDeadlineAt: video.amendmentDeadlineAt,
      status: video.customerDisputeMessage
        ? "disputed"
        : video.customerConfirmedAt
          ? "confirmed"
          : "pending_review",
    }));
  }

  private async notifyStaffToCompletePackaging(params: {
    videoId: number;
    packageId: number;
    packageCode: string;
    message: string;
  }) {
    const permissionUserIds = await notificationDeliveryService.listEmployeeUserIdsByPermission(
      EntityType.WAREHOUSE_1,
      OperationType.UPDATE,
    );
    const adminRows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.isAdmin, true), eq(users.isDeleted, false)));
    const userIds = [...new Set([...permissionUserIds, ...adminRows.map((row) => row.id)])];
    const notifiedAt = new Date().toISOString();

    await Promise.all(
      userIds.map((userId) =>
        notificationDeliveryService.deliverToUser({
          userId,
          title: "Complete packaging",
          message: params.message,
          notificationTypeId: NotificationTypeIds.WARNING,
          channels: ["webapp"],
          actionUrl: "/warehouse/1/fulfillments/management",
          referenceType: "package_packaging",
          referenceId: params.packageId,
          audience: NotificationAudience.STAFF,
        }),
      ),
    );

    await this.repository.markStaffCompletionNotified(params.videoId, notifiedAt);
  }

  private async notifyCustomerPackagingComplete(packageId: number, packageCode: string) {
    const userId = await this.repository.getCustomerUserIdForPackage(packageId);
    const orderCode = await this.repository.getPrimaryOrderCodeForPackage(packageId);

    if (!userId) return;

    const actionUrl = orderCode
      ? `/orders/order/${encodeURIComponent(orderCode)}`
      : "/orders";

    await notificationDeliveryService.deliverToUser({
      userId,
      title: "Your order packaging is complete",
      message: customerAmendmentNotice(packageCode),
      notificationTypeId: NotificationTypeIds.PACKAGING_VIDEO_READY,
      actionUrl,
      referenceType: "package",
      referenceId: packageId,
    });
  }

  private toResponse(video: {
    id: number;
    packageId: number;
    videoUrl: string;
    durationSeconds?: number | null;
    recordedAt: string;
    customerConfirmedAt?: string | null;
    customerDisputeMessage?: string | null;
    customerRespondedAt?: string | null;
    amendmentDeadlineAt?: string | null;
    packageCode?: string;
  }) {
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
      amendmentDeadlineAt: video.amendmentDeadlineAt ?? null,
      status: video.customerDisputeMessage
        ? "disputed"
        : video.customerConfirmedAt
          ? "confirmed"
          : "pending_review",
    };
  }
}

export default PackagingVideosService;
