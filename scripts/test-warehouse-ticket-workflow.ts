/* eslint-disable no-console */
/**
 * End-to-end warehouse ticket workflow test against a running local API.
 * Run: tsx scripts/test-warehouse-ticket-workflow.ts
 */
const API = process.env.API_URL ?? "http://localhost:9999/v1";
const PASSWORD = process.env.TEST_USER_PASSWORD ?? "CurlTest123!";

type Json = Record<string, unknown>;

async function request(
  method: string,
  path: string,
  options: {
    token?: string;
    body?: unknown;
    expectStatus?: number;
  } = {},
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const payload = text ? ((JSON.parse(text) as Json)) : ({} as Json);
  const expected = options.expectStatus ?? 200;

  if (response.status !== expected) {
    throw new Error(
      `${method} ${path} expected ${expected}, got ${response.status}: ${text || response.statusText}`,
    );
  }

  return payload;
}

async function login(email: string) {
  const result = await request("POST", "/login", {
    body: { email, password: PASSWORD },
  });
  if (!result.success) {
    throw new Error(`Login failed for ${email}`);
  }
  const data = result.data as { accessToken: string; user: { id: number } };
  return { token: data.accessToken, userId: data.user.id };
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function itemSummary(ticket: Json) {
  const items = (ticket.items as Array<Json>) ?? [];
  return items.reduce(
    (summary, item) => ({
      requested: summary.requested + Number(item.quantity ?? 0),
      issued: summary.issued + Number(item.transferredQuantity ?? 0),
      returned: summary.returned + Number(item.returnedQuantity ?? 0),
      remaining:
        summary.remaining
        + Math.max(
          0,
          Number(item.transferredQuantity ?? 0) - Number(item.returnedQuantity ?? 0),
        ),
    }),
    { requested: 0, issued: 0, returned: 0, remaining: 0 },
  );
}

async function main() {
  const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
  const pass = (name: string, detail?: string) => {
    results.push({ name, ok: true, detail });
    console.log(`✅ ${name}${detail ? ` — ${detail}` : ""}`);
  };
  const fail = (name: string, error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, detail });
    console.error(`❌ ${name} — ${detail}`);
  };

  let requesterToken = "";
  let approverToken = "";
  let ticketId = 0;
  let itemId = 0;
  const idempotencyKey = crypto.randomUUID();

  try {
    const requester = await login("manager1@gmail.com");
    const approver = await login("admin@edoshop.online");
    requesterToken = requester.token;
    approverToken = approver.token;
    pass("Login requester and approver");
  } catch (error) {
    fail("Login requester and approver", error);
    printSummary(results);
    process.exit(1);
  }

  // Resolve a warehouse entry for ticket items
  let warehouseId = 2;
  let entryId = 1;
  try {
    const options = await request(
      "GET",
      `/warehouse-tickets/entry-options?warehouseId=${warehouseId}&limit=5`,
      { token: requesterToken },
    );
    const rows = (options.data as Array<Json>) ?? [];
    assert(rows.length > 0, "No entry options found for warehouse");
    entryId = Number(rows[0].entryId);
    pass("Load entry options", `entryId=${entryId}`);
  } catch (error) {
    fail("Load entry options", error);
  }

  // TEST 1 — CREATE
  try {
    const created = await request("POST", "/warehouse-tickets", {
      token: requesterToken,
      body: {
        warehouseId,
        reason: "E2E workflow test ticket",
        items: [{ entryId, quantity: 10, notes: "automated test" }],
      },
      expectStatus: 201,
    });
    const ticket = created.data as Json;
    ticketId = Number(ticket.id);
    itemId = Number((ticket.items as Array<Json>)?.[0]?.id);
    assert(ticket.status === "pending_approval", "Expected pending_approval");
    assert(Number(ticket.requesterId) > 0, "Missing requester");
    pass("TEST 1 — Create ticket", ticket.ticketCode as string);
  } catch (error) {
    fail("TEST 1 — Create ticket", error);
  }

  // Requester list (my requests filter)
  try {
    const list = await request(
      "GET",
      `/warehouse-tickets?page=1&limit=10&filters=${encodeURIComponent(JSON.stringify({ requesterId: (await login("manager1@gmail.com")).userId }))}`,
      { token: requesterToken },
    );
    const rows = (list.data as Array<Json>) ?? [];
    assert(rows.some((row) => Number(row.id) === ticketId), "Ticket missing from requester list");
    pass("Requester list shows submitted ticket");
  } catch (error) {
    fail("Requester list shows submitted ticket", error);
  }

  // TEST 2 — APPROVAL
  try {
    const approved = await request("POST", `/warehouse-tickets/${ticketId}/approve`, {
      token: approverToken,
    });
    assert((approved.data as Json).status === "approved", "Expected approved");
    pass("TEST 2 — Approve ticket");
  } catch (error) {
    fail("TEST 2 — Approve ticket", error);
  }

  // Self-approval should fail
  try {
    const created2 = await request("POST", "/warehouse-tickets", {
      token: approverToken,
      body: {
        warehouseId,
        reason: "Self-approval guard test",
        items: [{ entryId, quantity: 1 }],
      },
      expectStatus: 201,
    });
    const selfTicketId = Number((created2.data as Json).id);
    await request("POST", `/warehouse-tickets/${selfTicketId}/approve`, {
      token: approverToken,
      expectStatus: 403,
    });
    pass("Permission — requester cannot approve own ticket");
    await request("DELETE", `/warehouse-tickets/${selfTicketId}`, {
      token: approverToken,
      expectStatus: 204,
    });
  } catch (error) {
    fail("Permission — requester cannot approve own ticket", error);
  }

  // Approvals queue
  try {
    const approvals = await request(
      "GET",
      `/warehouse-tickets?page=1&limit=20&filters=${encodeURIComponent(JSON.stringify({ queue: "delivery" }))}`,
      { token: approverToken },
    );
    const rows = (approvals.data as Array<Json>) ?? [];
    assert(rows.some((row) => Number(row.id) === ticketId), "Missing from delivery queue");
    pass("Approved ticket appears in delivery queue");
  } catch (error) {
    fail("Approved ticket appears in delivery queue", error);
  }

  // TEST 3/4 — ISSUE ITEMS
  try {
    const confirmed = await request("POST", `/warehouse-tickets/${ticketId}/confirm`, {
      token: approverToken,
      body: { items: [{ itemId, transferredQuantity: 10 }] },
    });
    const ticket = confirmed.data as Json;
    assert(ticket.status === "ready_for_pickup", "Expected ready_for_pickup");
    const summary = itemSummary(ticket);
    assert(summary.issued === 10 && summary.returned === 0 && summary.remaining === 10, "Issue quantities wrong");
    pass("TEST 4 — Issue 10 items", `issued=${summary.issued}, remaining=${summary.remaining}`);
  } catch (error) {
    fail("TEST 4 — Issue 10 items", error);
  }

  // TEST — collect / borrow
  try {
    const completed = await request("POST", `/warehouse-tickets/${ticketId}/complete`, {
      token: requesterToken,
    });
    assert((completed.data as Json).status === "completed", "Expected completed");
    pass("Requester marks ticket collected");
  } catch (error) {
    fail("Requester marks ticket collected", error);
  }

  // TEST 5 — PARTIAL RETURN
  try {
    const partial = await request("POST", `/warehouse-tickets/${ticketId}/return`, {
      token: requesterToken,
      body: {
        requesterId: (await login("manager1@gmail.com")).userId,
        idempotencyKey,
        items: [{ itemId, returnedQuantity: 5 }],
      },
    });
    const summary = itemSummary(partial.data as Json);
    assert(summary.returned === 5 && summary.remaining === 5, "Partial return quantities wrong");
    pass("TEST 5 — Partial return 5", `returned=${summary.returned}, remaining=${summary.remaining}`);
  } catch (error) {
    fail("TEST 5 — Partial return 5", error);
  }

  // Returns queue
  try {
    const returnsQueue = await request(
      "GET",
      `/warehouse-tickets?page=1&limit=20&filters=${encodeURIComponent(JSON.stringify({ queue: "returns" }))}`,
      { token: approverToken },
    );
    const rows = (returnsQueue.data as Array<Json>) ?? [];
    assert(rows.some((row) => Number(row.id) === ticketId), "Missing from returns queue");
    pass("Outstanding ticket appears in returns queue");
  } catch (error) {
    fail("Outstanding ticket appears in returns queue", error);
  }

  // TEST 8 — INVALID RETURNS
  for (const [label, qty, status] of [
    ["return 11 (> outstanding)", 11, 400],
    ["return 0", 0, 422],
    ["return -1", -1, 422],
  ] as const) {
    try {
      await request("POST", `/warehouse-tickets/${ticketId}/return`, {
        token: requesterToken,
        body: {
          requesterId: (await login("manager1@gmail.com")).userId,
          items: [{ itemId, returnedQuantity: qty }],
        },
        expectStatus: status,
      });
      pass(`TEST 8 — Reject invalid return: ${label}`);
    } catch (error) {
      fail(`TEST 8 — Reject invalid return: ${label}`, error);
    }
  }

  // TEST 10 — DUPLICATE SUBMISSION
  try {
    await request("POST", `/warehouse-tickets/${ticketId}/return`, {
      token: requesterToken,
      body: {
        requesterId: (await login("manager1@gmail.com")).userId,
        idempotencyKey,
        items: [{ itemId, returnedQuantity: 1 }],
      },
      expectStatus: 400,
    });
    pass("TEST 10 — Duplicate return blocked by idempotency key");
  } catch (error) {
    fail("TEST 10 — Duplicate return blocked by idempotency key", error);
  }

  // TEST 6 — FINAL RETURN (3 more => total 8, then 2 more => 10)
  try {
    await request("POST", `/warehouse-tickets/${ticketId}/return`, {
      token: requesterToken,
      body: {
        requesterId: (await login("manager1@gmail.com")).userId,
        items: [{ itemId, returnedQuantity: 3 }],
      },
    });
    const finalReturn = await request("POST", `/warehouse-tickets/${ticketId}/return`, {
      token: requesterToken,
      body: {
        requesterId: (await login("manager1@gmail.com")).userId,
        items: [{ itemId, returnedQuantity: 2 }],
      },
    });
    const summary = itemSummary(finalReturn.data as Json);
    assert(summary.returned === 10 && summary.remaining === 0, "Final return quantities wrong");
    pass("TEST 6/7 — Multiple partial returns complete", `returned=${summary.returned}, remaining=${summary.remaining}`);
  } catch (error) {
    fail("TEST 6/7 — Multiple partial returns complete", error);
  }

  // TEST 11 — REFRESH / GET BY ID
  try {
    const fresh = await request("GET", `/warehouse-tickets/${ticketId}`, {
      token: requesterToken,
    });
    const summary = itemSummary(fresh.data as Json);
    assert(summary.returned === 10 && summary.remaining === 0, "Stale state after refresh");
    pass("TEST 11 — Ticket detail persists correct quantities after refresh");
  } catch (error) {
    fail("TEST 11 — Ticket detail persists correct quantities after refresh", error);
  }

  printSummary(results);
  if (results.some((row) => !row.ok)) {
    process.exit(1);
  }
}

function printSummary(results: Array<{ name: string; ok: boolean; detail?: string }>) {
  const passed = results.filter((row) => row.ok).length;
  const failed = results.length - passed;
  console.log("\n--- Summary ---");
  console.log(`Passed: ${passed}/${results.length}`);
  if (failed > 0) {
    console.log("Failed:");
    results.filter((row) => !row.ok).forEach((row) => {
      console.log(`  - ${row.name}: ${row.detail}`);
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
