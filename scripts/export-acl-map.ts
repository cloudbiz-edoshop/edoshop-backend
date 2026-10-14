/* eslint-disable no-console */
/**
 * Dumps the permission rule of every /v1 API endpoint, read from the live
 * middleware stack (no database access needed).
 *
 * Usage: npx tsx scripts/export-acl-map.ts [outFile]
 */
import { writeFileSync } from "node:fs";

import type { AclMetadata } from "../src/core/middlewares/roles-and-permissions.ts";

import app from "../src/app.ts";

type AclRoute = {
  method: string;
  path: string;
  acl: AclMetadata[];
};

const byKey = new Map<string, AclRoute>();

for (const route of app.routes) {
  if (!route.path.startsWith("/v1/")) continue;
  const method = route.method.toUpperCase();
  if (method === "ALL") continue;

  const key = `${method} ${route.path}`;
  const entry = byKey.get(key) ?? { method, path: route.path.slice(3), acl: [] };
  const acl = (route.handler as { acl?: AclMetadata }).acl;
  if (acl) entry.acl.push(acl);
  byKey.set(key, entry);
}

const routes = [...byKey.values()].sort((a, b) =>
  `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`),
);

const outFile = process.argv[2] ?? "acl-map.json";
writeFileSync(outFile, `${JSON.stringify(routes, null, 2)}\n`);
console.log(`Wrote ${routes.length} routes (${routes.filter((r) => r.acl.length).length} with ACL) to ${outFile}`);
process.exit(0);
