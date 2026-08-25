export type ClientPlatform = "desktop" | "mobile" | "tablet" | "unknown";

export function classifyClientPlatform(
  userAgent?: string | null,
): ClientPlatform {
  if (!userAgent || userAgent === "unknown") {
    return "unknown";
  }

  const ua = userAgent.toLowerCase();

  if (
    /ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)
  ) {
    return "tablet";
  }

  if (
    /mobile|iphone|ipod|android|blackberry|iemobile|opera mini|webos|whatsapp/.test(
      ua,
    )
  ) {
    return "mobile";
  }

  return "desktop";
}

export function formatClientPlatformLabel(platform: string) {
  switch (platform) {
    case "desktop":
      return "Desktop";
    case "mobile":
      return "Mobile";
    case "tablet":
      return "Tablet";
    default:
      return "Unknown";
  }
}
