import { PackagingVideosService } from "@/modules/packages/packaging-videos.service";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export function startPackagingAmendmentWindowJob() {
  const service = new PackagingVideosService();

  const run = () => {
    service.processExpiredAmendmentWindows().catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Packaging amendment window job failed:", error);
    });
  };

  setTimeout(run, 60_000);
  setInterval(run, CHECK_INTERVAL_MS);
}
