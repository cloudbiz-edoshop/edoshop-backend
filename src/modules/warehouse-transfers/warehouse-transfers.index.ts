import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/warehouse-transfers/warehouse-transfers.handler";
import * as routes from "@/modules/warehouse-transfers/warehouse-transfers.route";

const router = createRouter();

router.openapi(
  routes.getAllTransfersForAWarehouse,
  handlers.getAllTransfersForAWarehouse,
);

router.openapi(
  routes.getTransferableEntriesList,
  handlers.getTransferableEntriesList,
);
router.openapi(
  routes.sendTransferableEntries,
  handlers.sendTransferableEntries,
);
router.openapi(
  routes.getReversibleEntriesList,
  handlers.getReversibleEntriesList,
);

router.openapi(routes.reverseSentEntries, handlers.reverseSentEntries);
router.openapi(routes.getPendingReceiptsList, handlers.getPendingReceiptsList);
router.openapi(routes.receiveTransfers, handlers.receiveTransfers);
router.openapi(routes.getReceivedEntriesList, handlers.getReceivedEntriesList);
router.openapi(routes.undoReceivedEntries, handlers.undoReceivedEntries);

router.openapi(
  routes.getAllBinLocationsForWarehouse,
  handlers.getAllBinLocationsForWarehouse,
);

router.openapi(
  routes.updateBinLocationsForWarehouseTransfers,
  handlers.updateBinLocationsForWarehouseTransfers,
);

router.openapi(
  routes.assignEntryToBin,
  handlers.assignEntryToBin,
);

router.openapi(
  routes.getAllBinsMovementHistory,
  handlers.getAllBinsMovementHistory,
);

router.openapi(
  routes.getStockView,
  handlers.getStockView,
);

export default router;
