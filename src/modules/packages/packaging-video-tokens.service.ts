import { randomBytes } from "node:crypto";

import { and, eq, gt } from "drizzle-orm";

import { NotFoundError } from "@/core/errors";
import db from "@/db";
import { packagePackagingVideoTokens, packages } from "@/db/models";
import { PackagingVideosService } from "./packaging-videos.service";

const TOKEN_TTL_MINUTES = 30;

export class PackagingVideoTokensService {
  private readonly packagingVideosService = new PackagingVideosService();

  async getPackageOrThrow(packageId: number) {
    const pkg = await db.query.packages.findFirst({
      where: eq(packages.id, packageId),
    });
    if (!pkg) {
      throw new NotFoundError("Package not found");
    }
    return pkg;
  }

  async createUploadToken(packageId: number) {
    const pkg = await this.getPackageOrThrow(packageId);

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + TOKEN_TTL_MINUTES * 60 * 1000,
    ).toISOString();

    await db.insert(packagePackagingVideoTokens).values({
      token,
      packageId: pkg.id,
      expiresAt,
    });

    return { token, packageId: pkg.id, packageCode: pkg.packageCode, expiresAt };
  }

  private async resolveTokenOrThrow(token: string) {
    const record = await db.query.packagePackagingVideoTokens.findFirst({
      where: and(
        eq(packagePackagingVideoTokens.token, token),
        gt(packagePackagingVideoTokens.expiresAt, new Date().toISOString()),
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
    const video = await this.packagingVideosService.getByPackageId(pkg.id);

    return {
      packageId: pkg.id,
      packageCode: pkg.packageCode,
      hasVideo: Boolean(video),
      videoUrl: video?.videoUrl ?? null,
      expiresAt: record.expiresAt,
    };
  }

  async uploadPackagingVideoWithToken(
    token: string,
    file: File,
    durationSeconds?: number | null,
  ) {
    const record = await this.resolveTokenOrThrow(token);
    return this.packagingVideosService.uploadPackagingVideo({
      packageId: record.packageId,
      file,
      durationSeconds,
      recordedBy: null,
    });
  }
}

export default PackagingVideoTokensService;
