import { createRouter } from "@/lib/create-app";
import * as handlers from "@/modules/users/users.handler";
import * as routes from "@/modules/users/users.route";

const router = createRouter();

router.openapi(routes.loginRoute, handlers.login);
router.openapi(routes.getAllUserNames, handlers.getAllUserNames);
router.openapi(routes.getAllEmails, handlers.getAllEmails);
router.openapi(routes.forgotPasswordRoute, handlers.forgotPassword);
router.openapi(routes.verifyOtpRoute, handlers.verifyOtp);
router.openapi(routes.resetPasswordRoute, handlers.resetPassword);
router.openapi(routes.refreshTokenRoute, handlers.refreshToken);
router.openapi(routes.updatePasswordRoute, handlers.updatePassword);
router.openapi(
  routes.registerUserWithoutRolesRoute,
  handlers.registerUserWithoutRoles,
);

export default router;
