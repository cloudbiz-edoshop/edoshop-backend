import { createRouter } from "@/lib/create-app";

import * as handlers from "./customer-wallets.handler";
import * as routes from "./customer-wallets.route";

const router = createRouter();

router.openapi(routes.getPublicWalletSettingsRoute, handlers.getPublicWalletSettings);
router.openapi(routes.getAdminSettingsRoute, handlers.getAdminWalletSettings);
router.openapi(routes.patchAdminSettingsRoute, handlers.patchAdminWalletSettings);
router.openapi(routes.getMyWalletRoute, handlers.getMyWallet);
router.openapi(routes.getMyTransactionsRoute, handlers.getMyWalletTransactions);
router.openapi(routes.createDepositRoute, handlers.createMyDeposit);
router.openapi(routes.createWithdrawalRoute, handlers.createMyWithdrawal);
router.openapi(routes.syncDepositRoute, handlers.syncMyDeposit);
router.openapi(routes.listAdminWalletsRoute, handlers.listAdminWallets);
router.openapi(routes.manualAdjustRoute, handlers.manualAdjustWallet);
router.openapi(routes.listWithdrawalsRoute, handlers.listWithdrawalRequests);
router.openapi(routes.approveWithdrawalRoute, handlers.approveWithdrawal);
router.openapi(routes.rejectWithdrawalRoute, handlers.rejectWithdrawal);

export default router;
