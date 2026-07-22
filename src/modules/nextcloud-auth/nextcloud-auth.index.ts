import { createRouter } from "@/lib/create-app";
import {
  completeNextcloudOAuth,
  startNextcloudOAuth,
} from "@/modules/nextcloud-auth/nextcloud-auth.handler";

const router = createRouter();

router.get("/auth/nextcloud/start", startNextcloudOAuth);
router.get("/auth/nextcloud/callback", completeNextcloudOAuth);

export default router;
