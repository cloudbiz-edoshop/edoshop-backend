export const LOGIN_ERROR_MESSAGES = {
  NEXTCLOUD_DISABLED:
    "Edoshop Drive sign-in is not enabled on this server. Use email and password instead.",
  NEXTCLOUD_INVALID:
    "Incorrect Edoshop Drive username/email or password. Use your Edoshop Drive login password, or generate a new App Password under Security → App passwords (changing your login password does not update existing App Passwords).",
  NOT_ADMIN_PANEL_MEMBER:
    "This account is not registered as an Edoshop team member. Ask an administrator to add you under Settings → Edoshop Team.",
  /** @deprecated Use NOT_ADMIN_PANEL_MEMBER */
  NEXTCLOUD_NOT_LINKED:
    "This account is not registered as an Edoshop team member. Ask an administrator to add you under Settings → Edoshop Team.",
  LOCAL_INVALID: "Incorrect email or password.",
  LOCAL_NO_PASSWORD:
    "This account uses Edoshop Drive sign-in. Switch to the Edoshop Drive tab and sign in with your App Password.",
} as const;
