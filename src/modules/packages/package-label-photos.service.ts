import { randomUUID, randomBytes } from "node:crypto";

import { and, eq, gt } from "drizzle-orm";

import { StorageService } from "@/common/services/storage.service";
import { NotFoundError, ValidationError } from "@/core/errors";
import db from "@/db";
import { packageLabelPhotoTokens, packages } from "@/db/models";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const TOKEN_TTL_MINUTES = 30;

const ALLOWED_IMAGE_BASE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const normalizeMimeType = (type: string | undefined | null) =>
  String(type ?? "").split(";")[0]?.trim().toLowerCase() ?? "";

const resolveExtension = (type: string | undefined | null) => {
  const baseType = normalizeMimeType(type);
  if (baseType.includes("png")) return "png";
  if (baseType.includes("webp")) return "webp";
  if (baseType.includes("heic")) return "heic";
  if (baseType.includes("heif")) return "heif";
  return "jpg";
};

export class PackageLabelPhotosService {
  private readonly storageService = new StorageService();

  async getPackageOrThrow(packageId: number) {
    const pkg = await db.query.packages.findFirst({
      where: eq(packages.id, packageId),
    });
    if (!pkg) {
      throw new NotFoundError("Package not found");
    }
    return pkg;
  }

  async getLabelPhoto(packageId: number) {
    const pkg = await this.getPackageOrThrow(packageId);

    return {
      packageId: pkg.id,
      packageCode: pkg.packageCode,
      labelPhotoUrl: pkg.labelPhotoUrl ?? null,
      labelPhotoUploadedAt: pkg.labelPhotoUploadedAt ?? null,
    };
  }

  async uploadLabelPhoto(params: { packageId: number; file: File }) {
    const pkg = await this.getPackageOrThrow(params.packageId);

    if (!params.file || params.file.size === 0) {
      throw new ValidationError("No image uploaded");
    }

    if (params.file.size > MAX_PHOTO_BYTES) {
      throw new ValidationError("Image exceeds the 15MB limit");
    }

    const baseType = normalizeMimeType(params.file.type);
    if (baseType && !ALLOWED_IMAGE_BASE_TYPES.has(baseType)) {
      throw new ValidationError("Unsupported image format. Use JPG, PNG or WEBP.");
    }

    const extension = resolveExtension(params.file.type);
    const uploadType = baseType || `image/${extension}`;
    const uploadFile = params.file.type
      ? params.file
      : new File([await params.file.arrayBuffer()], `label-photo.${extension}`, {
          type: uploadType,
        });

    const objectName = `package-label-photos/${params.packageId}/${randomUUID()}.${extension}`;
    const labelPhotoUrl = await this.storageService.uploadFile(
      uploadFile,
      objectName,
    );
    const uploadedAt = new Date().toISOString();

    await db
      .update(packages)
      .set({ labelPhotoUrl, labelPhotoUploadedAt: uploadedAt, updatedAt: uploadedAt })
      .where(eq(packages.id, params.packageId));

    return {
      packageId: pkg.id,
      packageCode: pkg.packageCode,
      labelPhotoUrl,
      labelPhotoUploadedAt: uploadedAt,
    };
  }

  async createUploadToken(packageId: number) {
    const pkg = await this.getPackageOrThrow(packageId);

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + TOKEN_TTL_MINUTES * 60 * 1000,
    ).toISOString();

    await db.insert(packageLabelPhotoTokens).values({
      token,
      packageId: pkg.id,
      expiresAt,
    });

    return { token, packageId: pkg.id, packageCode: pkg.packageCode, expiresAt };
  }

  private async resolveTokenOrThrow(token: string) {
    const record = await db.query.packageLabelPhotoTokens.findFirst({
      where: and(
        eq(packageLabelPhotoTokens.token, token),
        gt(packageLabelPhotoTokens.expiresAt, new Date().toISOString()),
      ),
    });

    if (!record) {
      throw new NotFoundError("Upload link is invalid or expired");
    }

    return record;
  }

  async getTokenContext(token: string) {
    const record = await this.resolveTokenOrThrow(token);
    const pkg = await this.getPackageOrThrow(record.packageId);

    return {
      packageId: pkg.id,
      packageCode: pkg.packageCode,
      labelPhotoUrl: pkg.labelPhotoUrl ?? null,
      expiresAt: record.expiresAt,
    };
  }

  async uploadLabelPhotoWithToken(token: string, file: File) {
    const record = await this.resolveTokenOrThrow(token);
    return this.uploadLabelPhoto({ packageId: record.packageId, file });
  }
}

export default PackageLabelPhotosService;
