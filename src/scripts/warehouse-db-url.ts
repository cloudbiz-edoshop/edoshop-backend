/** Replace hostname in a postgres URL (for SSH tunnels from a laptop). */
export const rewriteDatabaseUrlHost = (databaseUrl: string, host: string) => {
  const trimmed = databaseUrl.trim();
  const match = trimmed.match(
    /^(postgres(?:ql)?:\/\/)([^@]+@)([^:/]+)(:\d+)?(\/.*)?$/i,
  );
  if (!match) {
    return trimmed;
  }
  const [, scheme, auth, , port = ":5432", path = ""] = match;
  return `${scheme}${auth}${host}${port}${path}`;
};

const applyConnectHostOverride = (databaseUrl: string) => {
  const connectHost = process.env.DB_CONNECT_HOST?.trim();
  if (!connectHost) {
    return databaseUrl;
  }
  return rewriteDatabaseUrlHost(databaseUrl, connectHost);
};

/**
 * Build a Postgres URL from .env (DATABASE_URL or DB_* fields).
 * Dotenv values in this project sometimes include stray spaces around "=".
 */
export const resolveWarehouseDatabaseUrl = (args: string[] = process.argv.slice(2)) => {
  const useLocal = args.includes("--local");
  const useProd = args.includes("--prod") || !useLocal;

  if (useLocal && !useProd) {
    const localUrl =
      process.env.LOCAL_DATABASE_URL?.trim()
      || process.env.DATABASE_URL?.trim()
      || "postgresql://steve:cloudbiz123@127.0.0.1:5432/edoshop";
    return applyConnectHostOverride(localUrl);
  }

  const prodUrl =
    process.env.PROD_DATABASE_URL?.trim()
    || process.env.DATABASE_URL?.trim();
  if (useProd && prodUrl) {
    return applyConnectHostOverride(prodUrl);
  }

  const host = process.env.DB_CONNECT_HOST?.trim() || process.env.DB_HOST?.trim();
  const user = process.env.DB_USER?.trim();
  const password = encodeURIComponent(process.env.DB_PASSWORD?.trim() || "");
  const name = process.env.DB_NAME?.trim();
  const port = String(process.env.DB_PORT || "5432").trim();

  if (!host || !user || !name) {
    throw new Error(
      "Missing database settings. Set DATABASE_URL or DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in .env",
    );
  }

  return `postgresql://${user}:${password}@${host}:${port}/${name}`;
};
