/**
 * Lightweight API smoke test against a running Edoshop backend.
 *
 * Usage:
 *   API_BASE_URL=https://api.edoshop.online/v1 npx tsx scripts/api-smoke.ts
 *   API_BASE_URL=http://localhost:9999/v1 ADMIN_TOKEN=... npx tsx scripts/api-smoke.ts
 */
import { createDiscountRequestSchema } from "../src/modules/discounts/discounts.schema";

const baseUrl = (process.env.API_BASE_URL || "http://localhost:9999/v1").replace(
  /\/$/,
  "",
);
const adminToken = process.env.ADMIN_TOKEN?.trim();

type CheckResult = { name: string; ok: boolean; status?: number; detail?: string };

async function request(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let body: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { status: response.status, body };
}

async function run(): Promise<void> {
  const results: CheckResult[] = [];

  const healthRoot = baseUrl.replace(/\/v1$/, "");
  try {
    const health = await fetch(`${healthRoot}/health`);
    results.push({
      name: "GET /health",
      ok: health.ok,
      status: health.status,
    });
  } catch (error) {
    results.push({
      name: "GET /health",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  const publicPaths = [
    "/public/products?limit=1",
    "/public/categories?limit=1",
    "/public/banners?limit=1",
    "/public/home-banner-display",
    "/public/promo-cards",
    "/public/faqs?limit=1",
  ];

  for (const path of publicPaths) {
    try {
      const { status, body } = await request("GET", path);
      const success =
        status === 200 &&
        typeof body === "object" &&
        body !== null &&
        (body as { success?: boolean }).success !== false;
      results.push({
        name: `GET ${path.split("?")[0]}`,
        ok: success,
        status,
        detail: success
          ? undefined
          : JSON.stringify(body).slice(0, 160),
      });
    } catch (error) {
      results.push({
        name: `GET ${path}`,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const discountPayload = {
    targetType: "products" as const,
    productIds: [1],
    discountRate: 20,
    isPermanent: false,
    endsAt: new Date(Date.now() + 86400000).toISOString(),
    retailerOnly: false,
  };

  const parsed = createDiscountRequestSchema.safeParse(discountPayload);
  results.push({
    name: "discount create schema (local)",
    ok: parsed.success,
    detail: parsed.success
      ? undefined
      : JSON.stringify(parsed.error.issues).slice(0, 200),
  });

  if (adminToken) {
    const authedPaths = [
      "/discounts/form-options",
      "/discounts?page=1&limit=1",
    ];
    for (const path of authedPaths) {
      const { status, body } = await request("GET", path, { token: adminToken });
      const ok =
        status === 200 &&
        typeof body === "object" &&
        body !== null &&
        (body as { success?: boolean }).success === true;
      results.push({
        name: `GET ${path.split("?")[0]} (auth)`,
        ok,
        status,
        detail: ok ? undefined : JSON.stringify(body).slice(0, 160),
      });
    }

    const create = await request("POST", "/discounts", {
      token: adminToken,
      body: discountPayload,
    });
    const createOk =
      create.status === 201 &&
      typeof create.body === "object" &&
      create.body !== null &&
      (create.body as { success?: boolean }).success === true;
    results.push({
      name: "POST /discounts (auth dry-run)",
      ok: createOk,
      status: create.status,
      detail: createOk ? undefined : JSON.stringify(create.body).slice(0, 240),
    });
  } else {
    const unauth = await request("POST", "/discounts", { body: discountPayload });
    results.push({
      name: "POST /discounts (expect 401 without token)",
      ok: unauth.status === 401,
      status: unauth.status,
    });
  }

  const failed = results.filter((r) => !r.ok);
  for (const row of results) {
    const mark = row.ok ? "OK" : "FAIL";
    console.log(
      `[${mark}] ${row.name}${row.status ? ` (${row.status})` : ""}${
        row.detail ? ` — ${row.detail}` : ""
      }`,
    );
  }

  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
