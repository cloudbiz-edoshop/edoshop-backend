/* eslint-disable no-console */
/**
 * ACL matrix: for every admin page, every role template, every entity with
 * full CRUD, and every single permission, check that each API the page calls
 * is allowed by the backend for the same grants that let the UI open the page.
 *
 * Needs the admin repo checked out next to this one (../Frontend) or
 * FRONTEND_DIR. No database access.
 *
 * Usage: npx tsx scripts/acl-matrix.ts [--report=acl-matrix-report.md] [--strict]
 *   --strict  also fail on single-permission personas (default: report only)
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { AclMetadata } from "../src/core/middlewares/roles-and-permissions.ts";

import app from "../src/app.ts";
import { aclAllows } from "../src/core/middlewares/roles-and-permissions.ts";
import { OperationType } from "../src/constants/operations.constants.ts";
import {
  ALL_ENTITY_TYPES,
  buildSectionAccess,
} from "../src/constants/permissions.constants.ts";
import { RoleType } from "../src/constants/roles.constants.ts";
import { getRolePermissionTemplate } from "../src/modules/permissions/permissions.service.ts";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value] as const;
  }),
);
const STRICT = args.has("strict");
const REPORT_FILE = args.get("report") ?? "acl-matrix-report.md";
const FRONTEND_DIR = path.resolve(
  process.env.FRONTEND_DIR ?? path.join(import.meta.dirname, "../../Frontend"),
);
const SRC = path.join(FRONTEND_DIR, "src");

if (!existsSync(path.join(SRC, "constants/permissions.js"))) {
  console.error(`Admin repo not found at ${FRONTEND_DIR}. Set FRONTEND_DIR.`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Backend ACL map
// ---------------------------------------------------------------------------

type BackendRoute = { method: string; path: string; segments: string[]; acl: AclMetadata[] };

const backendRoutes: BackendRoute[] = (() => {
  const byKey = new Map<string, BackendRoute>();
  for (const route of app.routes) {
    if (!route.path.startsWith("/v1/")) continue;
    const method = route.method.toUpperCase();
    if (method === "ALL") continue;
    const routePath = route.path.slice(3);
    const key = `${method} ${routePath}`;
    const entry = byKey.get(key)
      ?? { method, path: routePath, segments: routePath.split("/").filter(Boolean), acl: [] };
    const acl = (route.handler as { acl?: AclMetadata }).acl;
    if (acl) entry.acl.push(acl);
    byKey.set(key, entry);
  }
  return [...byKey.values()];
})();

const matchBackendRoute = (method: string, callPath: string) => {
  const segments = callPath.split("/").filter(Boolean);
  let best: { route: BackendRoute; score: number } | null = null;
  for (const route of backendRoutes) {
    if (route.method !== method || route.segments.length !== segments.length) continue;
    let score = 0;
    let ok = true;
    for (let i = 0; i < segments.length; i += 1) {
      const routeSeg = route.segments[i];
      const callSeg = segments[i];
      if (routeSeg.startsWith(":")) {
        score += callSeg === ":p" ? 2 : 1;
      } else if (callSeg === routeSeg) {
        score += 3;
      } else {
        ok = false;
        break;
      }
    }
    if (ok && (!best || score > best.score)) best = { route, score };
  }
  return best?.route ?? null;
};

const backendAllows = (route: BackendRoute, grants: Set<string>, pathname: string) => {
  const pageWarehouse = pathname.match(/^\/warehouse\/(\d)\b/)?.[1];
  return route.acl.every((acl) => {
    if (!acl.warehouseScoped || !pageWarehouse) return aclAllows(grants, acl);
    const permissions = acl.permissions.filter(
      ({ entity }) => !/^warehouse_\d$/.test(entity) || entity === `warehouse_${pageWarehouse}`,
    );
    return aclAllows(grants, { ...acl, permissions });
  });
};

// ---------------------------------------------------------------------------
// Frontend source analysis
// ---------------------------------------------------------------------------

const fileCache = new Map<string, string>();
const readSource = (file: string) => {
  if (!fileCache.has(file)) fileCache.set(file, readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  return fileCache.get(file)!;
};

const resolveImport = (fromFile: string, spec: string): string | null => {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const candidate of [
    base,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, "index.js"),
    path.join(base, "index.jsx"),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
};

type ImportBinding = { local: string; imported: string; file: string };

const parseImports = (file: string): ImportBinding[] => {
  const text = readSource(file);
  const bindings: ImportBinding[] = [];
  const importRe = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(importRe)) {
    const target = resolveImport(file, match[2]);
    if (!target || !/\.jsx?$/.test(target)) continue;
    const clause = match[1].trim();
    const defaultMatch = clause.match(/^([A-Za-z_$][\w$]*)/);
    if (defaultMatch && !clause.startsWith("{") && !clause.startsWith("*")) {
      bindings.push({ local: defaultMatch[1], imported: "default", file: target });
    }
    const named = clause.match(/\{([\s\S]*?)\}/);
    if (named) {
      for (const part of named[1].split(",")) {
        const [imported, local = imported] = part.trim().split(/\s+as\s+/);
        if (imported) bindings.push({ local: local.trim(), imported: imported.trim(), file: target });
      }
    }
  }
  return bindings;
};

/** Follow barrel re-exports to the file that actually defines an export. */
const resolveExport = (file: string, name: string, depth = 0): string => {
  if (depth > 6) return file;
  const text = readSource(file);
  const reExportRe = /export\s+\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(reExportRe)) {
    for (const part of match[1].split(",")) {
      const [imported, exported = imported] = part.trim().split(/\s+as\s+/).map((s) => s.trim());
      if (exported === name) {
        const target = resolveImport(file, match[2]);
        if (target) return resolveExport(target, imported, depth + 1);
      }
    }
  }
  for (const match of text.matchAll(/export\s+\*\s+from\s+['"]([^'"]+)['"]/g)) {
    const target = resolveImport(file, match[1]);
    if (target && new RegExp(`export\\s+(?:const|function|class)\\s+${name}\\b`).test(readSource(target))) {
      return target;
    }
  }
  const importedHere = parseImports(file).find((b) => b.local === name);
  if (importedHere && new RegExp(`export\\s*\\{[^}]*\\b${name}\\b`).test(text)) {
    return resolveExport(importedHere.file, importedHere.imported, depth + 1);
  }
  return file;
};

/** `silent` = Get(url, token, showAlert, skipForbiddenHandling=true): a 403 is expected and hidden. */
type ApiCall = { method: string; path: string | null; raw: string; fn: string | null; silent: boolean };

const VERB_TO_METHOD: Record<string, string> = {
  Get: "GET",
  Post: "POST",
  Patch: "PATCH",
  Put: "PUT",
  Delete: "DELETE",
};

/** Text of the first call argument starting at `start` (just after the opening paren). */
const firstArgument = (text: string, start: number) => {
  let depth = 0;
  let inTemplate = false;
  let quote: string | null = null;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (inTemplate) {
      if (ch === "\\") i += 1;
      else if (ch === "`") inTemplate = false;
      else if (ch === "$" && text[i + 1] === "{") {
        let braces = 0;
        for (; i < text.length; i += 1) {
          if (text[i] === "{") braces += 1;
          else if (text[i] === "}") {
            braces -= 1;
            if (braces === 0) break;
          }
        }
      }
      continue;
    }
    if (ch === "'" || ch === '"') quote = ch;
    else if (ch === "`") inTemplate = true;
    else if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    else if (ch === ")" || ch === "]" || ch === "}") {
      if (depth === 0) return text.slice(start, i).trim();
      depth -= 1;
    } else if (ch === "," && depth === 0) return text.slice(start, i).trim();
  }
  return text.slice(start).trim();
};

const resolveUrlExpression = (
  expr: string,
  scope: string,
  constants: Map<string, string>,
  depth = 0,
): string | null => {
  if (depth > 4) return null;
  const e = expr.trim();
  const base = e.match(/^BaseURL\(\s*([\s\S]*)\)$/);
  if (base) return literalToPath(base[1], scope, constants, depth);
  if (/^[`'"]/.test(e)) return literalToPath(e, scope, constants, depth);
  if (/^[A-Za-z_$][\w$]*$/.test(e)) {
    if (constants.has(e)) return constants.get(e)!;
    const local = scope.match(new RegExp(`(?:const|let)\\s+${e}\\s*=\\s*([^;\\n]+)`));
    if (local) {
      const branches = [
        ...local[1].matchAll(/`[^`]*`|'[^']*'|"[^"]*"|BaseURL\([^)]*\)|\b[A-Z_][A-Z0-9_]*\b/g),
      ].map((m) => m[0]);
      for (const branch of [local[1], ...branches]) {
        const resolved = resolveUrlExpression(branch, scope, constants, depth + 1);
        if (resolved) return resolved;
      }
    }
  }
  const inner = e.match(/BaseURL\(\s*([`'"][\s\S]*?[`'"])\s*\)/);
  if (inner) return literalToPath(inner[1], scope, constants, depth);
  return null;
};

const literalToPath = (
  literal: string,
  scope: string,
  constants: Map<string, string>,
  depth: number,
): string | null => {
  let body = literal.trim();
  if (!/^[`'"]/.test(body)) return resolveUrlExpression(body, scope, constants, depth + 1);
  body = body.slice(1, -1);
  body = body.replace(/\$\{\s*BaseURL\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\}/g, (_, base) => base.replace(/^\/+/, ""));
  body = body.replace(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g, (whole, name) =>
    constants.has(name) ? constants.get(name)! : "${}",
  );
  body = body.replace(/\$\{[^}]*\}/g, "${}");
  body = body.split("?")[0];
  body = body.replace(/([^/])(?:\$\{\})+$/, "$1");
  if (/^\$\{\}$/.test(body) || /^\$\{\}\//.test(body)) return null;
  const segments = body
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .map((seg) => (seg.includes("${}") ? ":p" : seg));
  if (!segments.length) return null;
  return `/${segments.join("/")}`;
};

/** Split a module into named top-level-ish function chunks. */
const functionChunks = (text: string) => {
  const re = /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?(?:function\s+([A-Za-z_$][\w$]*)|const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:useCallback\(\s*)?(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)/g;
  const marks = [...text.matchAll(re)].map((m) => ({ name: m[1] ?? m[2], index: m.index ?? 0 }));
  return marks.map((mark, i) => ({
    name: mark.name,
    text: text.slice(mark.index, marks[i + 1]?.index ?? text.length),
  }));
};

const callsCache = new Map<string, ApiCall[]>();
const extractCalls = (file: string): ApiCall[] => {
  if (callsCache.has(file)) return callsCache.get(file)!;
  const text = readSource(file);
  const constants = new Map<string, string>();
  for (const m of text.matchAll(/const\s+([A-Z_][A-Z0-9_]*)\s*=\s*BaseURL\(\s*['"`]([^'"`]+)['"`]\s*\)/g)) {
    constants.set(m[1], `/${m[2].replace(/^\/+/, "").split("?")[0]}`);
  }
  const calls: ApiCall[] = [];
  const chunks = functionChunks(text);
  const owner = (index: number) => {
    let name: string | null = null;
    let offset = 0;
    for (const chunk of chunks) {
      const start = text.indexOf(chunk.text, offset);
      if (start <= index) name = chunk.name;
      offset = start + 1;
    }
    return name;
  };
  for (const m of text.matchAll(/\b(Get|Post|Patch|Put|Delete)\(/g)) {
    const index = m.index ?? 0;
    const argsStart = index + m[0].length;
    const arg = firstArgument(text, argsStart);
    if (!/BaseURL|URL|url|Url|[`'"]/.test(arg)) continue;
    const callArgs: string[] = [];
    for (let cursor = argsStart; callArgs.length < 4;) {
      const next = firstArgument(text, cursor);
      callArgs.push(next);
      cursor = text.indexOf(next, cursor) + next.length;
      if (text[cursor] !== ",") break;
      cursor += 1;
    }
    const fn = owner(index);
    const scope = chunks.find((c) => c.name === fn)?.text ?? text;
    calls.push({
      method: VERB_TO_METHOD[m[1]],
      path: resolveUrlExpression(arg, scope, constants),
      raw: arg.replace(/\s+/g, " ").slice(0, 90),
      fn,
      silent: m[1] === "Get" && /^(true|skipForbiddenHandling)$/.test(callArgs[3] ?? ""),
    });
  }
  callsCache.set(file, calls);
  return calls;
};

const isModuleFile = (file: string) =>
  /[\\/]src[\\/](apis|services|hooks)[\\/]/.test(file) || /[\\/]use[A-Z]\w*\.js$/.test(file);

const GLOBAL_EXCLUDES = [/[\\/]src[\\/]layout[\\/]/, /[\\/]components[\\/](Sidebar|Navbar)[\\/]/];

/** All API calls reachable from a component file (imports followed transitively). */
const collectPageCalls = (entryFile: string, includeGlobal = false) => {
  const seen = new Set<string>();
  const calls: Array<ApiCall & { file: string }> = [];
  const visit = (file: string, usedNames: Set<string> | null) => {
    const key = `${file}|${usedNames ? [...usedNames].sort().join(",") : "*"}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (!includeGlobal && GLOBAL_EXCLUDES.some((re) => re.test(file))) return;

    for (const call of extractCalls(file)) {
      if (usedNames && call.fn && !usedNames.has(call.fn)) continue;
      calls.push({ ...call, file });
    }

    const text = readSource(file);
    const byTarget = new Map<string, Set<string> | null>();
    for (const binding of parseImports(file)) {
      if (!new RegExp(`\\b${binding.local.replace(/\$/g, "\\$")}\\b`).test(
        text.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"]/g, ""),
      )) continue;
      const target = binding.imported === "default"
        ? binding.file
        : resolveExport(binding.file, binding.imported);
      if (isModuleFile(target)) {
        const moduleFns = new Set(functionChunks(readSource(target)).map((c) => c.name));
        const used = new Set<string>();
        for (const fn of moduleFns) {
          if (new RegExp(`\\b${fn}\\b`).test(text)) used.add(fn);
        }
        if (binding.imported !== "default") used.add(binding.imported);
        const prev = byTarget.get(target);
        byTarget.set(target, new Set([...(prev ?? []), ...used]));
        // A hook module may call other modules (e.g. a hook wrapping an api file).
        for (const fn of used) {
          const chunk = functionChunks(readSource(target)).find((c) => c.name === fn);
          if (chunk) moduleFns.add(fn);
        }
      } else {
        byTarget.set(target, null);
      }
    }
    for (const [target, used] of byTarget) visit(target, used);
  };
  visit(entryFile, null);
  return calls;
};

// ---------------------------------------------------------------------------
// Pages from the router
// ---------------------------------------------------------------------------

const ROUTER = path.join(SRC, "routers/Routers.jsx");
const routerText = readSource(ROUTER);
const routerImports = parseImports(ROUTER);

type Page = { path: string; component: string; file: string };

const WRAPPERS = new Set(["ProtectedRoute", "LayoutWrapper", "Navigate", "Route"]);
const componentsIn = (jsx: string) => [
  ...[...jsx.matchAll(/Page=\{([A-Z]\w*)\}/g)].map((m) => m[1]),
  ...[...jsx.matchAll(/<([A-Z]\w*)[\s/>]/g)].map((m) => m[1]),
].filter((name) => !WRAPPERS.has(name));

/** Router-local wrapper components (e.g. `const XRoute = () => <X .../>`) resolve to what they render. */
const resolveRouterComponent = (name: string, depth = 0): string | null => {
  const binding = routerImports.find((b) => b.local === name);
  if (binding) {
    return binding.imported === "default" ? binding.file : resolveExport(binding.file, binding.imported);
  }
  if (depth > 3) return null;
  const local = functionChunks(routerText).find((chunk) => chunk.name === name);
  for (const inner of local ? componentsIn(local.text) : []) {
    const file = resolveRouterComponent(inner, depth + 1);
    if (file) return file;
  }
  return null;
};

const pages: Page[] = [];
const routeChunks = routerText.split(/(?=<Route\b)/).slice(1);
for (const chunk of routeChunks) {
  const pathMatch = chunk.match(/^<Route\s+path="([^"]+)"/);
  if (!pathMatch || !chunk.includes("ProtectedRoute")) continue;
  for (const component of componentsIn(chunk)) {
    const file = resolveRouterComponent(component);
    if (file) {
      pages.push({ path: pathMatch[1], component, file });
      break;
    }
  }
}

/** App shell loaded on every page, for every logged-in employee. */
const GLOBAL_PAGE = "(every page: app shell, navbar, sidebar)";
const globalCalls = [
  ...extractCalls(path.join(SRC, "App.jsx")).map((call) => ({ ...call, file: path.join(SRC, "App.jsx") })),
  ...["layout/SideAndNavbarLayout", "layout/AuthenticatedShell", "components/Navbar/index.jsx", "components/Sidebar/index.jsx"]
    .map((rel) => resolveImport(path.join(SRC, "x.js"), `./${rel}`))
    .filter((file): file is string => Boolean(file))
    .flatMap((file) => collectPageCalls(file, true)),
];

const skippedRoutes = [...routerText.matchAll(/path="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((routePath) => !pages.some((page) => page.path === routePath));

const concretePaths = (routePath: string) => {
  const variants = routePath.includes(":warehouseId") ? ["1", "2"] : ["1"];
  return variants.flatMap((warehouseId) => {
    const other = warehouseId === "1" ? "2" : "1";
    const transferTypes = routePath.includes(":transferType")
      ? [`send-to-warehouse-${other}`, `receive-from-warehouse-${other}`]
      : [""];
    return transferTypes.map((transferType) =>
      routePath
        .replace(":warehouseId", warehouseId)
        .replace(":transferType", transferType)
        .replace(":type", "bundle")
        .replace(/:[A-Za-z]+/g, "1"),
    );
  });
};

// ---------------------------------------------------------------------------
// Frontend page access (same logic as usePermissions.canAccessRoute)
// ---------------------------------------------------------------------------

const fe = await import(pathToFileURL(path.join(SRC, "constants/permissions.js")).href);

const frontendCanOpen = (pathname: string, grants: Set<string>) => {
  const rule = fe.resolveRouteAccess(pathname, "");
  if (!rule || rule.allowAllLoggedIn) return true;
  if (rule.deny) return false;
  const hasPermission = (entity: string, operation = "read") => grants.has(`${entity}:${operation}`);
  if (rule.ticketingPage) {
    return fe.canAccessTicketingPage(rule.ticketingPage, hasPermission, { isSuperAdmin: false });
  }
  if (rule.permissionAny || rule.entity) {
    return fe.satisfiesRoutePermission(rule, hasPermission, { isSuperAdmin: false, isAdminRole: false });
  }
  const sections = buildSectionAccess([...grants]) as Record<string, boolean>;
  return !rule.section || Boolean(sections[rule.section]);
};

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

const OPERATIONS = [OperationType.CREATE, OperationType.READ, OperationType.UPDATE, OperationType.DELETE];
type Persona = { family: "template" | "module" | "single"; name: string; grants: Set<string> };

const personas: Persona[] = [];
for (const role of Object.values(RoleType)) {
  if (role === RoleType.SUPER_ADMIN || role === RoleType.ADMIN) continue;
  const grants = new Set(getRolePermissionTemplate(role));
  if (grants.size) personas.push({ family: "template", name: role, grants });
}
for (const entity of ALL_ENTITY_TYPES) {
  personas.push({
    family: "module",
    name: `${entity}:*`,
    grants: new Set(OPERATIONS.map((op) => `${entity}:${op}`)),
  });
  for (const op of OPERATIONS) {
    personas.push({ family: "single", name: `${entity}:${op}`, grants: new Set([`${entity}:${op}`]) });
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

type Failure = {
  family: Persona["family"];
  persona: string;
  page: string;
  call: string;
  backendRule: string;
  source: string;
};

const pageCalls = new Map<string, ReturnType<typeof collectPageCalls>>();
const unresolved = new Map<string, Set<string>>();
const unmatched = new Map<string, Set<string>>();

for (const page of pages) {
  const calls = collectPageCalls(page.file);
  pageCalls.set(page.path, calls);
  for (const call of calls) {
    const where = path.relative(SRC, call.file);
    if (!call.path) {
      if (!unresolved.has(where)) unresolved.set(where, new Set());
      unresolved.get(where)!.add(`${call.method} ${call.raw}`);
    } else if (!matchBackendRoute(call.method, call.path)) {
      if (!unmatched.has(`${call.method} ${call.path}`)) unmatched.set(`${call.method} ${call.path}`, new Set());
      unmatched.get(`${call.method} ${call.path}`)!.add(where);
    }
  }
}

const describeRule = (route: BackendRoute) =>
  route.acl
    .map(({ permissions, checkType }) =>
      permissions.map((p) => `${p.entity}:${p.operation}`).join(checkType === "ANY" ? " | " : " & "),
    )
    .join(" ; ");

/** Which calls must pass for a page opened with a given operation. */
const callIsRequired = (method: string, pageOperation: string | undefined) => {
  if (method === "GET") return true;
  if (pageOperation === "create") return method === "POST";
  if (pageOperation === "update") return method === "PATCH" || method === "PUT";
  return false;
};

const failures: Failure[] = [];
const openedPages = new Map<string, number>();

for (const persona of personas) {
  for (const call of globalCalls) {
    if (!call.path || call.silent || call.method !== "GET") continue;
    const route = matchBackendRoute(call.method, call.path);
    if (!route || backendAllows(route, persona.grants, "/")) continue;
    failures.push({
      family: persona.family,
      persona: persona.name,
      page: GLOBAL_PAGE,
      call: `${call.method} ${route.path}`,
      backendRule: describeRule(route),
      source: `${path.relative(SRC, call.file)}${call.fn ? `#${call.fn}` : ""}`,
    });
  }
  for (const page of pages) {
    for (const pathname of concretePaths(page.path)) {
      if (!frontendCanOpen(pathname, persona.grants)) continue;
      openedPages.set(persona.name, (openedPages.get(persona.name) ?? 0) + 1);
      const pageOperation = fe.resolveRouteAccess(pathname, "")?.operation;
      for (const call of pageCalls.get(page.path) ?? []) {
        if (!call.path || call.silent || !callIsRequired(call.method, pageOperation)) continue;
        const route = matchBackendRoute(call.method, call.path);
        if (!route || backendAllows(route, persona.grants, pathname)) continue;
        failures.push({
          family: persona.family,
          persona: persona.name,
          page: pathname,
          call: `${call.method} ${route.path}`,
          backendRule: describeRule(route),
          source: `${path.relative(SRC, call.file)}${call.fn ? `#${call.fn}` : ""}`,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const dedupe = (rows: Failure[]) => {
  const groups = new Map<string, { row: Failure; personas: Set<string>; pages: Set<string> }>();
  for (const row of rows) {
    const key = `${row.call}|${row.source}`;
    const group = groups.get(key) ?? { row, personas: new Set(), pages: new Set() };
    group.personas.add(row.persona);
    group.pages.add(row.page);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.personas.size - a.personas.size);
};

const lines: string[] = [];
const families: Array<Persona["family"]> = ["template", "module", "single"];
const familyTitle = {
  template: "Role templates (production roles)",
  module: "One module with full access (e.g. all of Entries)",
  single: "One single permission (e.g. Entries → Create only)",
};

lines.push("# ACL matrix report", "");
lines.push(`- Pages analysed: ${pages.length}`);
lines.push(`- API calls traced: ${[...pageCalls.values()].reduce((n, calls) => n + calls.length, 0)} on pages, ${globalCalls.length} in the app shell`);
lines.push(`- Backend endpoints: ${backendRoutes.length}`);
lines.push(`- Personas: ${personas.length} (${families.map((f) => `${personas.filter((p) => p.family === f).length} ${f}`).join(", ")})`);
lines.push("");

for (const family of families) {
  const rows = failures.filter((f) => f.family === family);
  const groups = dedupe(rows);
  lines.push(`## ${familyTitle[family]} — ${groups.length} broken API calls`, "");
  for (const group of groups) {
    lines.push(`- \`${group.row.call}\` needs \`${group.row.backendRule}\``);
    lines.push(`  - called from \`${group.row.source}\` on ${[...group.pages].slice(0, 4).join(", ")}${group.pages.size > 4 ? ` (+${group.pages.size - 4})` : ""}`);
    lines.push(`  - breaks for: ${[...group.personas].slice(0, 8).join(", ")}${group.personas.size > 8 ? ` (+${group.personas.size - 8})` : ""}`);
  }
  lines.push("");
}

lines.push(`## Calls the analyser could not resolve (${[...unresolved.values()].reduce((n, s) => n + s.size, 0)})`, "");
for (const [file, calls] of unresolved) lines.push(`- ${file}: ${[...calls].join(" · ")}`);
lines.push("", `## Router paths not analysed (${skippedRoutes.length})`, "");
for (const routePath of skippedRoutes) lines.push(`- ${routePath}`);
lines.push("", `## Frontend calls with no backend route (${unmatched.size})`, "");
for (const [call, files] of unmatched) lines.push(`- \`${call}\` from ${[...files].join(", ")}`);

writeFileSync(REPORT_FILE, `${lines.join("\n")}\n`);

const counts = Object.fromEntries(families.map((f) => [f, dedupe(failures.filter((x) => x.family === f)).length]));
console.log(`Pages: ${pages.length}  Endpoints: ${backendRoutes.length}  Personas: ${personas.length}`);
console.log(`Broken calls — templates: ${counts.template}, modules: ${counts.module}, single permissions: ${counts.single}`);
console.log(`Report: ${REPORT_FILE}`);

const blocking = counts.template + counts.module + (STRICT ? counts.single : 0);
process.exit(blocking > 0 ? 1 : 0);
