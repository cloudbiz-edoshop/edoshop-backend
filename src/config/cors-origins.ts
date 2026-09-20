import env from "./env.config";
import { appConfig } from "./app.config";

const normalizeOrigin = (value: string | undefined): string | null => {
  if (!value?.trim()) return null;
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
};

const addOriginVariants = (origins: Set<string>, origin: string) => {
  origins.add(origin);
  try {
    const url = new URL(origin);
    if (url.hostname.startsWith("www.")) {
      origins.add(`${url.protocol}//${url.hostname.slice(4)}`);
    } else {
      origins.add(`${url.protocol}//www.${url.hostname}`);
    }
  } catch {
    // ignore invalid URL
  }
};

/**
 * Allowed browser origins for CORS (production only).
 * Dev/test uses wildcard in create-app.
 */
export function getCorsAllowedOrigins(): string[] {
  const origins = new Set<string>([
    "https://edoshop.online",
    "https://admin.edoshop.online",
  ]);

  for (const url of [env.STOREFRONT_URL, env.ADMIN_PANEL_URL]) {
    const origin = normalizeOrigin(url);
    if (origin) {
      addOriginVariants(origins, origin);
    }
  }

  if (env.CORS_ORIGINS?.trim()) {
    for (const part of env.CORS_ORIGINS.split(",")) {
      const trimmed = part.trim();
      if (trimmed) {
        origins.add(trimmed);
      }
    }
  }

  return [...origins];
}

export function resolveCorsOrigin():
  | string[]
  | "*"
  | ((origin: string, c: unknown) => string | null | undefined) {
  if (!appConfig.isProduction) {
    return "*";
  }

  const allowed = getCorsAllowedOrigins();

  return (origin) => {
    if (!origin) {
      return allowed[0];
    }
    if (allowed.includes(origin)) {
      return origin;
    }
    return undefined;
  };
}
