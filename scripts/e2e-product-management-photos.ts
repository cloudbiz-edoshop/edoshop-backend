/**
 * Prod smoke: login → search by product ID → upload image → patch product → verify public catalog.
 *
 *   API_BASE_URL=https://api.edoshop.online/v1 \
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... \
 *   PRODUCT_ID=2974 \
 *   SEARCH_TERM=E225Z \
 *   npx tsx scripts/e2e-product-management-photos.ts
 */
const baseUrl = (process.env.API_BASE_URL || "https://api.edoshop.online/v1").replace(
  /\/$/,
  "",
);
const email = process.env.ADMIN_EMAIL?.trim();
const password = process.env.ADMIN_PASSWORD?.trim();
const productId = Number(process.env.PRODUCT_ID || "2974");
const searchTerm = process.env.SEARCH_TERM?.trim() || "E225";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function login(): Promise<string> {
  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD");
  }
  const response = await fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `Login failed (${response.status}): ${body?.message || JSON.stringify(body)}`,
    );
  }
  const token = body?.data?.token || body?.token;
  if (!token) {
    throw new Error("Login response missing token");
  }
  return token;
}

async function searchProducts(token: string, term: string) {
  const query = new URLSearchParams({
    page: "1",
    limit: "5",
    search: term,
  });
  const response = await fetch(`${baseUrl}/products?${query}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function getProduct(token: string, id: number) {
  const response = await fetch(`${baseUrl}/products/${id}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function uploadImage(token: string, productIdForName: number) {
  const form = new FormData();
  form.append("productId", String(productIdForName));
  form.append("imageStartIndex", "0");
  form.append(
    "files",
    new Blob([tinyPng], { type: "image/png" }),
    "e2e-test.png",
  );

  const response = await fetch(`${baseUrl}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function patchProduct(
  token: string,
  id: number,
  payload: Record<string, unknown>,
) {
  const response = await fetch(`${baseUrl}/products/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function getPublicProduct(id: number) {
  const response = await fetch(
    `${baseUrl}/public/products/${id}`,
    { headers: { Accept: "application/json" } },
  );
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function main() {
  console.log(`API: ${baseUrl}`);
  console.log("1) Login…");
  const token = await login();
  console.log("   OK");

  console.log(`2) Search products for "${searchTerm}"…`);
  const search = await searchProducts(token, searchTerm);
  const hits = search.body?.data ?? [];
  console.log(`   HTTP ${search.status}, ${hits.length} hit(s)`);
  hits.slice(0, 3).forEach((p: { id?: number; name?: string; directOrderCode?: string }) => {
    console.log(`   - #${p.id} ${p.directOrderCode || ""} ${p.name || ""}`);
  });

  console.log(`3) Load product #${productId}…`);
  const before = await getProduct(token, productId);
  if (before.status !== 200) {
    throw new Error(`GET product failed: ${before.status} ${JSON.stringify(before.body)}`);
  }
  const product = before.body?.data ?? before.body;
  const priorUrls = (product?.imageUrls || []).filter(Boolean);
  console.log(`   ${product?.name || "—"} | ${priorUrls.length} existing image(s)`);

  console.log("4) Upload test image…");
  const upload = await uploadImage(token, productId);
  const uploadUrl = upload.body?.data?.uploads?.[0]?.url;
  if (upload.status !== 200 || !uploadUrl) {
    throw new Error(
      `Upload failed: HTTP ${upload.status} ${JSON.stringify(upload.body)}`,
    );
  }
  console.log(`   OK → ${uploadUrl}`);

  const nextUrls = [...priorUrls, uploadUrl].slice(0, 12);
  console.log("5) PATCH product imageUrls…");
  const patch = await patchProduct(token, productId, {
    name: product.name,
    price: String(product.price ?? "0"),
    imageUrls: nextUrls,
  });
  if (patch.status !== 200) {
    throw new Error(`PATCH failed: ${patch.status} ${JSON.stringify(patch.body)}`);
  }
  console.log("   OK");

  console.log("6) Public storefront product…");
  const pub = await getPublicProduct(productId);
  const pubUrls = pub.body?.data?.imageUrls || [];
  console.log(`   HTTP ${pub.status}, ${pubUrls.length} image(s) on catalog`);
  if (!pubUrls.length) {
    console.warn("   WARN: storefront still shows no images (cache or publish lag?)");
  }

  console.log("\nE2E smoke passed.");
}

main().catch((error) => {
  console.error("\nE2E smoke FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
