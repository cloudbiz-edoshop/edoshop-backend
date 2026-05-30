import { EntryImagesService } from "../entry-images/entry-images.service";
import { UploadTokensService } from "../upload-tokens/upload-tokens.service";

export class MobileUploadService {
  private readonly uploadTokensService: UploadTokensService;
  private readonly entryImagesService: EntryImagesService;

  constructor() {
    this.uploadTokensService = new UploadTokensService();
    this.entryImagesService = new EntryImagesService();
  }

  async uploadImages(token: string, files: File[]) {
    // Validate token - throws if invalid/expired
    const tokenRecord =
      await this.uploadTokensService.validateTokenOrThrow(token);

    // Delegate to the entry images service which handles max image checks
    return this.entryImagesService.uploadImages(tokenRecord.entryId, files);
  }

  async listImages(token: string) {
    // Validate token - throws if invalid/expired
    const tokenRecord =
      await this.uploadTokensService.validateTokenOrThrow(token);

    return this.entryImagesService.listImages(tokenRecord.entryId);
  }

  async deleteImages(token: string, fileNames: string[]) {
    const tokenRecord =
      await this.uploadTokensService.validateTokenOrThrow(token);

    return this.entryImagesService.deleteImages(tokenRecord.entryId, fileNames);
  }
}
