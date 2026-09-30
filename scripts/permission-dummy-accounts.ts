/* eslint-disable no-console */
/**
 * Creates QA employee accounts with scoped roles and verifies API access.
 *
 * Usage (local):
 *   DATABASE_URL=... npx tsx scripts/permission-dummy-accounts.ts
 *
 * Env:
 *   API_URL=http://localhost:9999/v1
 *   ADMIN_EMAIL=admin@edoshop.online
 *   ADMIN_PASSWORD=...
 *   QA_DUMMY_PASSWORD=QaDummyPerm2026!
 */
import { EntityType, OperationType } from "../src/constants/index.ts";
import {
  STORE_ENTITIES,
  buildPermissionKeys,
  buildSectionAccess,
  formatPermissionKey,
} from "../src/constants/permissions.constants.ts";
import { TICKETING_PAGE_READ_PERMISSIONS } from "../src/constants/ticketing-pages.constants.ts";

const API = (process.env.API_URL ?? "http://localhost:9999/v1").replace(/\/$/, "");
const QA_PASSWORD = process.env.QA_DUMMY_PASSWORD ?? "QaDummyPerm2026!";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@edoshop.online";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "QaTest1234!";

type Json = Record<string, unknown>;

type EntityRow = { id: number; name: string };
type OperationRow = { id: number; name: string };

type Persona = {
  key: string;
  roleName: string;
  fullName: string;
  email: string;
  username: string;
  permissionKeys: string[];
  checks: Array<{
    name: string;
    method: "GET" | "POST";
    path: string;
    expectStatus: number;
  }>;
  expectSections?: Partial<Record<string, boolean>>;
  expectPermissions?: string[];
};

async function request(
  method: string,
  path: string,
  options: {
    token?: string;
    body?: unknown;
    expectStatus?: number;
    label?: string;
  } = {},
) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let body: Json = {};
  if (text) {
    try {
      body = JSON.parse(text) as Json;
    } catch {
      body = { raw: text };
    }
  }

  const expected = options.expectStatus ?? 200;
  const ok = response.status === expected;
  if (!ok) {
    throw new Error(
      `${options.label ?? `${method} ${path}`} expected HTTP ${expected}, got ${response.status}: ${text}`,
    );
  }
  return { ok, status: response.status, body, expected, label: options.label ?? path };
}

async function login(identifier: { email?: string; phoneNumber?: string; username?: string }, password: string) {
  const result = await request("POST", "/login", {
    body: { ...identifier, password },
    expectStatus: 200,
    label: `login ${identifier.email ?? identifier.username ?? identifier.phoneNumber}`,
  });
  const data = result.body.data as {
    accessToken: string;
    accessProfile: {
      permissions: string[];
      sections: Record<string, boolean>;
      role: { name: string } | null;
    };
  };
  return {
    token: data.accessToken,
    accessProfile: data.accessProfile,
  };
}

function keysToPermissionPairs(
  keys: string[],
  entityMap: Map<string, number>,
  operationMap: Map<string, number>,
) {
  return keys
    .map((key) => {
      const [entity, operation] = key.split(":");
      const entityId = entityMap.get(entity);
      const operationId = operationMap.get(operation);
      if (!entityId || !operationId) return null;
      return { entityId, operationId };
    })
    .filter(Boolean) as Array<{ entityId: number; operationId: number }>;
}

const storeFullKeys = buildPermissionKeys(
  STORE_ENTITIES,
  [
    OperationType.CREATE,
    OperationType.READ,
    OperationType.UPDATE,
    OperationType.DELETE,
  ],
);

const storeMarketingKeys = storeFullKeys;

const ticketRequesterKeys = [
  ...TICKETING_PAGE_READ_PERMISSIONS.filter(
    (p) =>
      p.entity === EntityType.TICKET_PAGE_CREATE
      || p.entity === EntityType.TICKET_PAGE_MY_REQUESTS,
  ).map((p) => formatPermissionKey(p.entity, p.operation)),
  formatPermissionKey(EntityType.TICKETING, OperationType.CREATE),
  formatPermissionKey(EntityType.TICKETING, OperationType.UPDATE),
];

const ticketApproverKeys = [
  formatPermissionKey(EntityType.TICKET_PAGE_REQUESTS_TO_APPROVE, OperationType.READ),
  formatPermissionKey(EntityType.TICKET_PAGE_MY_APPROVALS, OperationType.READ),
  formatPermissionKey(EntityType.TICKET_APPROVER, OperationType.READ),
  formatPermissionKey(EntityType.TICKETING, OperationType.UPDATE),
];

const ticketOperatorKeys = [
  formatPermissionKey(EntityType.TICKET_PAGE_TAKEOUT_QUEUE, OperationType.READ),
  formatPermissionKey(EntityType.TICKET_PAGE_RETURN_QUEUE, OperationType.READ),
  formatPermissionKey(EntityType.TICKET_PAGE_BORROWED_PRODUCTS, OperationType.READ),
  formatPermissionKey(EntityType.WAREHOUSE_1, OperationType.READ),
  formatPermissionKey(EntityType.WAREHOUSE_1, OperationType.UPDATE),
  formatPermissionKey(EntityType.TICKETING, OperationType.UPDATE),
];

const ticketMgmtOnlyKeys = [
  formatPermissionKey(EntityType.TICKET_PAGE_MANAGEMENT, OperationType.READ),
];

const PERSONAS: Persona[] = [
  {
    key: "store_full",
    roleName: "qa_perm_store_full",
    fullName: "QA Store Full",
    email: "qa-perm-store-full@edoshop.test",
    username: "qapermstorefull",
    permissionKeys: storeMarketingKeys,
    expectSections: { store: true, ticketing: false },
    expectPermissions: [
      formatPermissionKey(EntityType.PRODUCTS, OperationType.CREATE),
      formatPermissionKey(EntityType.STORES, OperationType.READ),
    ],
    checks: [
      { name: "dashboard metrics", method: "GET", path: "/dashboard/metrics?weeks=4", expectStatus: 200 },
      { name: "categories", method: "GET", path: "/categories?limit=5", expectStatus: 200 },
      { name: "stores", method: "GET", path: "/stores", expectStatus: 200 },
      { name: "products list", method: "GET", path: "/products?limit=5", expectStatus: 200 },
      { name: "ewms items (optional)", method: "GET", path: "/entries/items/ids", expectStatus: 403 },
      { name: "suppliers (optional)", method: "GET", path: "/suppliers?limit=5&page=1", expectStatus: 403 },
    ],
  },
  {
    key: "ticket_requester",
    roleName: "qa_perm_ticket_requester",
    fullName: "QA Ticket Requester",
    email: "qa-perm-ticket-requester@edoshop.test",
    username: "qapermticketreq",
    permissionKeys: ticketRequesterKeys,
    expectSections: { ticketing: true, store: false },
    checks: [
      { name: "list tickets", method: "GET", path: "/warehouse-tickets?limit=5", expectStatus: 200 },
      { name: "dashboard metrics", method: "GET", path: "/dashboard/metrics?weeks=4", expectStatus: 403 },
    ],
  },
  {
    key: "ticket_approver",
    roleName: "qa_perm_ticket_approver",
    fullName: "QA Ticket Approver",
    email: "qa-perm-ticket-approver@edoshop.test",
    username: "qapermticketappr",
    permissionKeys: ticketApproverKeys,
    expectSections: { ticketing: true },
    checks: [
      { name: "list tickets", method: "GET", path: "/warehouse-tickets?limit=5", expectStatus: 200 },
    ],
  },
  {
    key: "ticket_operator",
    roleName: "qa_perm_ticket_operator",
    fullName: "QA Ticket Operator",
    email: "qa-perm-ticket-operator@edoshop.test",
    username: "qapermticketop",
    permissionKeys: ticketOperatorKeys,
    expectSections: { ticketing: true, ewms_w1: true },
    checks: [
      { name: "list tickets", method: "GET", path: "/warehouse-tickets?limit=5", expectStatus: 200 },
    ],
  },
  {
    key: "ticket_mgmt_only",
    roleName: "qa_perm_ticket_mgmt",
    fullName: "QA Ticket Management",
    email: "qa-perm-ticket-mgmt@edoshop.test",
    username: "qapermticketmgmt",
    permissionKeys: ticketMgmtOnlyKeys,
    expectSections: { ticketing: true },
    expectPermissions: [
      formatPermissionKey(EntityType.TICKET_PAGE_MANAGEMENT, OperationType.READ),
    ],
    checks: [
      { name: "list tickets", method: "GET", path: "/warehouse-tickets?limit=5", expectStatus: 200 },
    ],
  },
];

async function ensureRole(
  adminToken: string,
  persona: Persona,
  entityMap: Map<string, number>,
  operationMap: Map<string, number>,
) {
  const list = await request("GET", `/roles?search=${encodeURIComponent(persona.roleName)}&limit=20`, {
    token: adminToken,
  });
  const roles = ((list.body.data as Json)?.data as Array<Json>) ?? (list.body.data as Array<Json>) ?? [];
  const existing = roles.find((r) => r.name === persona.roleName);

  const permissions = keysToPermissionPairs(
    persona.permissionKeys,
    entityMap,
    operationMap,
  );

  if (!permissions.length) {
    throw new Error(`No permissions resolved for role ${persona.roleName}`);
  }

  if (existing?.id) {
    await request("PATCH", `/roles/${existing.id}`, {
      token: adminToken,
      body: {
        name: persona.roleName,
        description: `QA permissions persona ${persona.key}`,
        permissions,
      },
      expectStatus: 200,
    });
    return Number(existing.id);
  }

  const created = await request("POST", "/roles", {
    token: adminToken,
    body: {
      name: persona.roleName,
      description: `QA permissions persona ${persona.key}`,
      permissions,
    },
    expectStatus: 201,
  });
  const role = created.body.data as Json;
  return Number(role.id);
}

async function ensureEmployee(
  adminToken: string,
  persona: Persona,
  roleId: number,
) {
  const list = await request("GET", `/employees?search=${encodeURIComponent(persona.email)}&limit=10`, {
    token: adminToken,
  });
  const employees =
    ((list.body.data as Json)?.data as Array<Json>) ?? (list.body.data as Array<Json>) ?? [];
  const existing = employees.find(
    (e) => (e.user as Json)?.email === persona.email,
  );

  if (existing?.id) {
    await request("PATCH", `/employees/${existing.id}`, {
      token: adminToken,
      body: {
        roleId,
        password: QA_PASSWORD,
      },
      expectStatus: 200,
    });
    return;
  }

  await request("POST", "/employees", {
    token: adminToken,
    body: {
      email: persona.email,
      fullName: persona.fullName,
      username: persona.username,
      password: QA_PASSWORD,
      roleId,
    },
    expectStatus: 201,
  });
}

async function main() {
  console.log(`API: ${API}`);
  console.log("Provisioning QA permission dummy accounts...\n");

  const health = await fetch(API.replace(/\/v1$/, "/health"));
  if (!health.ok) {
    throw new Error("Backend is not reachable. Start API on port 9999 first.");
  }

  const admin = await login({ email: ADMIN_EMAIL }, ADMIN_PASSWORD);
  const adminToken = admin.token;

  const entitiesRes = await request("GET", "/entities?limit=500", { token: adminToken });
  const operationsRes = await request("GET", "/operations?limit=50", { token: adminToken });

  const entityRows =
    ((entitiesRes.body.data as Json)?.data as EntityRow[])
    ?? (entitiesRes.body.data as EntityRow[])
    ?? [];
  const operationRows =
    ((operationsRes.body.data as Json)?.data as OperationRow[])
    ?? (operationsRes.body.data as OperationRow[])
    ?? [];

  const entityMap = new Map(entityRows.map((e) => [e.name, e.id]));
  const operationMap = new Map(operationRows.map((o) => [o.name.toLowerCase(), o.id]));

  const report: Array<{ persona: string; check: string; ok: boolean; detail: string }> = [];
  const credentials: Array<{ persona: string; email: string; password: string; role: string }> = [];

  for (const persona of PERSONAS) {
    const roleId = await ensureRole(adminToken, persona, entityMap, operationMap);
    await ensureEmployee(adminToken, persona, roleId);

    const session = await login({ email: persona.email }, QA_PASSWORD);
    const token = session.token;
    const profile = session.accessProfile;
    const computedSections = buildSectionAccess(profile.permissions);

    credentials.push({
      persona: persona.key,
      email: persona.email,
      password: QA_PASSWORD,
      role: persona.roleName,
    });

    for (const key of persona.expectPermissions ?? []) {
      const has = profile.permissions.includes(key);
      report.push({
        persona: persona.key,
        check: `permission ${key}`,
        ok: has,
        detail: has ? "present" : "missing",
      });
    }

    for (const [section, expected] of Object.entries(persona.expectSections ?? {})) {
      const actual = profile.sections[section] ?? computedSections[section as keyof typeof computedSections];
      report.push({
        persona: persona.key,
        check: `section ${section}`,
        ok: actual === expected,
        detail: `expected ${expected}, got ${actual}`,
      });
    }

    for (const check of persona.checks) {
      try {
        const result = await request(check.method, check.path, {
          token,
          expectStatus: check.expectStatus,
          label: check.name,
        });
        report.push({
          persona: persona.key,
          check: check.name,
          ok: true,
          detail: `HTTP ${result.status}`,
        });
      } catch (error) {
        report.push({
          persona: persona.key,
          check: check.name,
          ok: false,
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  console.log("\n--- QA login credentials (admin panel) ---");
  for (const row of credentials) {
    console.log(
      `${row.persona}: email=${row.email} password=${row.password} role=${row.role}`,
    );
  }

  console.log("\n--- Verification ---");
  let failed = 0;
  for (const row of report) {
    const mark = row.ok ? "PASS" : "FAIL";
    if (!row.ok) failed += 1;
    console.log(`${mark} [${row.persona}] ${row.check} — ${row.detail}`);
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed.`);
    process.exit(1);
  }

  console.log(`\nAll ${report.length} checks passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
