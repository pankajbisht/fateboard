---
name: fate-readiness
description: Production-readiness audit for the fateboard repo. Use when asked whether the app is ready to ship, for a release check, a go/no-go, or to refresh docs/PRODUCTION_READINESS.md.
---

# Production readiness audit

Output: an updated `docs/PRODUCTION_READINESS.md` (verdict, scorecard, checklist, known limits) backed by
evidence from this run. Never mark an area ✅ without evidence produced or read in this session.

## 1. Run the gates (record each result)

```
uptime                                   # load > ~6: E2E with --workers=2 (memory: e2e-machine-load)
npm run check                            # lint ratchet + type-check (incl. strict island) + format
npm run test:coverage                    # unit tests + coverage ratchet
npm run build
npm run e2e -- --workers=2               # Chromium; E2E_FIREFOX=1 for Firefox when the sandbox allows
npm audit --omit=dev --audit-level=high
node .claude/skills/fate-review/scripts/metrics.mjs | tail -1
```

A gate that cannot run here (sandbox, missing browser, CI-only secret) is reported as **not verified**, with
why, and goes to the owner checklist. It is never reported as passing.

## 2. Score each area (✅ / ⚠️ / ❌ + evidence)

| Area | What to check |
|---|---|
| Core flows | E2E count and result; known-bugs spec empty |
| Data safety | `docs/BUGS.md` open storage/autosave/load bugs; storage tests; persistent storage request |
| Architecture | guard tests (store keys, serialize path, storage boundary, file budget); open R-xx P1 items |
| Robustness | error boundary, failed chunk load, broken files, storage failures surfaced |
| Performance | route chunks, `/draw` startup size from the build output, many-objects spec |
| Accessibility | axe specs |
| Browsers | Chromium / Firefox / WebKit status (CI vs local) |
| Tests | coverage numbers vs ratchet; hotspots without tests |
| Code quality | lint warnings vs ratchet, strict-island folders, files over budget |
| Security | XSS sinks, opened-file validation, CSP / security headers, audit |
| Operations | deploy pipeline last result, error reporting, rollback path |
| Docs | docs updated for every change |

## 3. Verdict

One sentence a non-engineer understands, then the blocking items (owner actions first). Distinguish:
**blocking** (data loss, crash, security, broken deploy), **accepted limits** (documented decisions), and
**improvements** (roadmap). Link each item to its BUG-xxx or R-xx.

## 4. Update the docs

`docs/PRODUCTION_READINESS.md` (add a dated review paragraph, update the scorecard numbers), new findings as
`open` rows in `docs/BUGS.md`. Report: verdict, blockers, commands run with results, files changed.
