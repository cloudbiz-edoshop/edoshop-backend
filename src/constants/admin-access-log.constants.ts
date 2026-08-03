export const ADMIN_ACCESS_AUTH_METHODS = {
  NEXTCLOUD_APP_PASSWORD: "nextcloud_app_password",
  LOCAL_PASSWORD: "local_password",
  NEXTCLOUD_OAUTH: "nextcloud_oauth",
} as const;

export type AdminAccessAuthMethod =
  (typeof ADMIN_ACCESS_AUTH_METHODS)[keyof typeof ADMIN_ACCESS_AUTH_METHODS];

export const ADMIN_ACCESS_AUTH_METHOD_LABELS: Record<
  AdminAccessAuthMethod,
  string
> = {
  [ADMIN_ACCESS_AUTH_METHODS.NEXTCLOUD_APP_PASSWORD]:
    "Edoshop Drive (App Password)",
  [ADMIN_ACCESS_AUTH_METHODS.LOCAL_PASSWORD]: "WebApp Password",
  [ADMIN_ACCESS_AUTH_METHODS.NEXTCLOUD_OAUTH]: "Edoshop Drive (OAuth)",
};
