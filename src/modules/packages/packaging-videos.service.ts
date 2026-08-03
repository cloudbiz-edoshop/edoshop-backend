import { randomUUID } from "node:crypto";

import { NotificationTypeIds } from "@/constants/notification-types.constants";
import { StorageService } from "@/common/services/storage.service";
import { NotFoundError, ValidationError } from "@/core/errors";
import { NotificationDeliveryService } from "@/modules/notifications/notification-delivery.service";
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
    recordedBy: number;
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

    await this.notifyCustomerPackagingComplete(params.packageId, pkg.packageCode);

    return this.toResponse(video);
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

    if (!params.confirmed && !params.disputeMessage?.trim()) {
      throw new ValidationError("Please describe the missing or incorrect items");
    }

    const updated = await this.repository.updateCustomerResponse(params.videoId, {
      confirmed: params.confirmed,
      disputeMessage: params.disputeMessage?.trim() ?? null,
    });

    return this.toResponse(updated);
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
      status: video.customerDisputeMessage
        ? "disputed"
        : video.customerConfirmedAt
          ? "confirmed"
          : "pending_review",
    }));
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
      message: `We recorded your packaging video for package ${packageCode}. Review the video in your account and confirm everything is included.`,
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
      status: video.customerDisputeMessage
        ? "disputed"
        : video.customerConfirmedAt
          ? "confirmed"
          : "pending_review",
    };
  }
}

export default PackagingVideosService;
