import { Buffer } from "node:buffer";
import { Client } from "minio";

import env from "@/config/env.config";
import { AppError } from "@/core/errors";

export interface FileInfo {
  id: number;
  fileName: string;
  size: number;
  contentType: string | null;
  lastModified: string;
  url: string;
}

export class StorageService {
  private readonly client: Client;
  private readonly bucketName: string;

  constructor() {
    this.client = new Client({
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: env.MINIO_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });
    this.bucketName = env.MINIO_BUCKET_NAME;
    void this.initBucket();
  }

  private async initBucket() {
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName, "us-east-1");
      }

      // Set public policy
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
          },
        ],
      };
      await this.client.setBucketPolicy(this.bucketName, JSON.stringify(policy));
    } catch (error) {
      console.error("Error initializing bucket:", error);
    }
  }

  private getPublicUrl(fileName: string): string {
    const protocol = env.MINIO_USE_SSL ? "https" : "http";
    const portStr = (env.MINIO_PORT === 80 || env.MINIO_PORT === 443) ? "" : `:${env.MINIO_PORT}`;
    return `${protocol}://${env.MINIO_ENDPOINT}${portStr}/${this.bucketName}/${fileName}`;
  }

  private getObjectName(fileNameOrUrl: string): string {
    try {
      const url = new URL(fileNameOrUrl);
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts[0] === this.bucketName) {
        return decodeURIComponent(pathParts.slice(1).join("/"));
      }
    } catch {
      // The value is already an object name rather than a URL.
    }

    return fileNameOrUrl;
  }

  async uploadFile(file: File, fileName: string): Promise<string> {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      await this.client.putObject(this.bucketName, fileName, buffer, file.size, {
        "Content-Type": file.type,
      });

      return this.getPublicUrl(fileName);
    } catch (error) {
      console.error("Upload error:", error);
      throw new AppError("Failed to upload file", 500);
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucketName, this.getObjectName(fileName));
    } catch (error) {
      console.error("Delete error:", error);
      throw new AppError("Failed to delete file", 500);
    }
  }

  async getFileInfo(fileName: string): Promise<FileInfo> {
    try {
      const stat = await this.client.statObject(this.bucketName, fileName);
      return {
        id: 0,
        fileName,
        size: stat.size,
        contentType: stat.metaData?.["content-type"] ?? null,
        lastModified: stat.lastModified.toISOString(),
        url: this.getPublicUrl(fileName),
      };
    } catch (error) {
      console.error("Get file info error:", error);
      throw new AppError("File not found", 404);
    }
  }

  async fileExists(fileName: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucketName, fileName);
      return true;
    } catch {
      return false;
    }
  }

  async getPresignedUrl(fileName: string, expiry: number = 3600): Promise<string> {
    try {
      return await this.client.presignedPutObject(this.bucketName, fileName, expiry);
    } catch (error) {
      console.error("Presigned URL error:", error);
      throw new AppError("Failed to generate presigned URL", 500);
    }
  }

  async listFiles(prefix?: string): Promise<FileInfo[]> {
    try {
      const files: FileInfo[] = [];
      const stream = this.client.listObjects(this.bucketName, prefix, true);
      let counter = 0;

      return new Promise((resolve, reject) => {
        stream.on("data", (obj) => {
          if (obj.name && obj.size !== undefined && obj.lastModified) {
            files.push({
              id: ++counter,
              fileName: obj.name,
              size: obj.size,
              contentType: null, // listObjects doesn't provide content-type
              lastModified: obj.lastModified.toISOString(),
              url: this.getPublicUrl(obj.name),
            });
          }
        });
        stream.on("end", () => resolve(files));
        stream.on("error", (error) => reject(error));
      });
    } catch (error) {
      console.error("List files error:", error);
      throw new AppError("Failed to list files", 500);
    }
  }
}

export const storageService = new StorageService();
