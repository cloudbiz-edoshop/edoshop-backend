import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/group-packages/group-packages.handler";
import * as routes from "@/modules/group-packages/group-packages.route";

const router = createRouter();

router.openapi(routes.listAvailablePackages, handlers.listAvailablePackages);
router.openapi(routes.listAvailableGroups, handlers.listAvailableGroups);
router.openapi(routes.listDispatchReadyGroups, handlers.listDispatchReadyGroups);
router.openapi(routes.listGroupPackages, handlers.listGroupPackages);
router.openapi(routes.createGroupPackage, handlers.createGroupPackage);
router.openapi(routes.getGroupPackage, handlers.getGroupPackage);
router.openapi(routes.addGroupPackageMembers, handlers.addGroupPackageMembers);
router.openapi(routes.removeGroupPackageMember, handlers.removeGroupPackageMember);
router.openapi(routes.printGroupPackageLabel, handlers.printGroupPackageLabel);
router.openapi(routes.dispatchGroupPackage, handlers.dispatchGroupPackage);

export default router;
