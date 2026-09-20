import env from "@/config/env.config";

/** Safe identifier for logs: host + database name only (no credentials). */
export function getDatabaseFingerprint(): string {
  try {
    const url = new URL(env.DATABASE_URL);
    const dbName = url.pathname.replace(/^\//, "") || "postgres";
    return `${url.hostname}/${dbName}`;
  } catch {
    return "unknown";
  }
}
