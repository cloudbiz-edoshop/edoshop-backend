import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/packages/packages.handler";
import * as routes from "@/modules/packages/packages.route";

const router = createRouter();

router.openapi(routes.createPackage, handlers.createPackage);
router.openapi(routes.editPackage, handlers.editPackage);
router.openapi(routes.getPackageInfoForShippingLabel, handlers.getPackageInfoForShippingLabel);
router.openapi(routes.createShippingLabel, handlers.createShippingLabel);
router.openapi(routes.editShippingLabel, handlers.editShippingLabel);
router.openapi(routes.printShippingLabel, handlers.printShippingLabel);
router.openapi(routes.getPackageManagementW1, handlers.getPackageManagementW1);
router.openapi(routes.getPackageManagementW2, handlers.getPackageManagementW2);
router.openapi(routes.createPackageWithItems, handlers.createPackageWithItems);
router.openapi(routes.listShippingLabels, handlers.listShippingLabels);
router.openapi(routes.getPackedPackagesThatAreBeingReceived, handlers.getPackedPackagesThatAreBeingReceived);
router.openapi(routes.receiveAPackageFromW1, handlers.receiveAPackageFromW1);
router.openapi(routes.editReceivedPackageFromW1, handlers.editReceivedPackageFromW1);
router.openapi(routes.updateReceivedPackageStatus, handlers.updateReceivedPackageStatus);
router.openapi(routes.receivedPackageDispatchManagement, handlers.receivedPackageDispatchManagement);
router.openapi(routes.dispatchPackages, handlers.dispatchPackages);
router.openapi(routes.getAllPackageStatuses, handlers.getAllPackageStatuses);
router.openapi(routes.getShippingTypes, handlers.getShippingTypes);
router.openapi(routes.getShippingPriorityCodes, handlers.getShippingPriorityCodes);
export default router;
