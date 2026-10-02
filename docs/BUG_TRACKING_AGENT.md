# Edoshop bug-tracking agent (AI workflow)

Use this with **Cursor Agent**, **Bugbot**, or **GitHub Issues** so future bugs are captured consistently across backend, admin, and storefront.

## Repos

| Repo | GitHub | Scope |
|------|--------|--------|
| `edoshop-backend` | cloudbiz-edoshop/edoshop-backend | API, auth, EWMS, orders |
| `edoshop-admin` | cloudbiz-edoshop/edoshop-admin | Admin UI |
| `edoshop` | cloudbiz-edoshop/edoshop | Storefront |

## When to file a bug

- Regressions after deploy
- Steve / QA reports in WhatsApp (paste summary + screenshot path)
- Failed CI on `main`
- Security or data-integrity issues (priority **P0**)

## How agents should log bugs

1. **Confirm** repro steps on the right repo (don't mix storefront vs admin).
2. **Search** open issues: `gh issue list --repo cloudbiz-edoshop/<repo> --search "<keyword>"`.
3. **Create** if none exists:

```bash
gh issue create --repo cloudbiz-edoshop/edoshop-backend \
  --title "bug: <short title>" \
  --label bug \
  --body "$(cat <<'EOF'
## Summary
<what breaks>

## Environment
- [ ] Production / Staging / Local
- Repo: backend | admin | storefront

## Steps to reproduce
1.

## Expected vs actual

## Notes
- Screenshot / chat ref:
EOF
)"
```

4. **Link** related PRs in the issue when fixing.

## Labels (create once per repo)

- `bug` — defect
- `regression` — worked before
- `p0` / `p1` / `p2` — severity

## Cursor rule

Project rule `.cursor/rules/bug-tracking.mdc` reminds agents to open or update GitHub issues when they find or fix bugs.

## Optional: Cursor Automation

Trigger: new issue labeled `bug` on any Edoshop repo → agent triages, assigns repo, suggests owner from `CODEOWNERS` or path (`Frontend/` → admin).

Configure in Cursor **Automations** using this doc as the system prompt appendix.
