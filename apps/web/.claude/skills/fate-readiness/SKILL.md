---
name: fate-readiness
description: Production-readiness audit and deploy go/no-go for the fateboard repo. Use when asked whether the app is ready to ship or deploy ("can we deploy?", "production readiness", "release check", "go/no-go", "is it safe to ship"), or to refresh docs/PRODUCTION_READINESS.md. Ends with the same plain-English Deploy YES / NO report every time.
---

# Production readiness audit

Output: an updated `docs/PRODUCTION_READINESS.md` (verdict, scorecard, checklist, known limits) backed by
evidence from this run, and the owner report in section 5. Never mark an area ✅ without evidence produced or read
in this session.

## 1. Run the gates (record each result; summaries only, CLAUDE.md "Token budget")

```
uptime                                   # load > ~6: E2E with --workers=2 (memory: e2e-machine-load)
npm run --silent check 2>&1 | grep -E "✖|error TS|Code style" | tail -3          # lint ratchet + types + format
npm run --silent test:coverage 2>&1 | grep -E "FAIL|Test Files|Tests " | tail -5
node -e "const s=require('./coverage/coverage-summary.json').total;for(const k of ['lines','statements','functions','branches'])console.log(k,s[k].pct)"
npm run --silent build 2>&1 | grep -iE "error|built in" | tail -3
E2E_FIREFOX=1 npm run e2e -- --workers=2 --reporter=line 2>&1 | grep -E "passed|failed|flaky|skipped|✘" | tail -8
npm audit --omit=dev --audit-level=high 2>&1 | tail -2
node .claude/skills/fate-review/scripts/metrics.mjs | tail -1
```

CI and deploy (no `gh` needed; the repo is public):

```
curl -sL "https://api.github.com/repos/<owner>/<repo>/actions/runs?branch=main&event=push&per_page=1"   # newest main run
curl -sL "https://api.github.com/repos/<owner>/<repo>/actions/runs/<id>/jobs"                           # job results
git status --short | wc -l                                                                               # unshipped local work
```

Take `<owner>/<repo>` from `git remote get-url origin`. A gate that cannot run here (sandbox, missing browser,
CI-only secret, no network) is **not verified**, with why, and goes to the owner checklist. It is never reported
as passing. A Firefox failure that matches an open E2E bug (BUG-204 / 205) is a known flake, not a new blocker;
rerun that spec alone to confirm.

## 2. Score each area (✅ / ⚠️ / ❌ + evidence)

| Area | What to check |
|---|---|
| Core flows | E2E count and result; known-bugs spec empty |
| Data safety | open storage / autosave / load bugs (`grep -n "storage\|autosave\|load" docs/BUGS.md`); persistent storage request |
| Architecture | guard tests (store keys, serialize path, storage boundary, file budget); open R-xx P1 items |
| Robustness | error boundary, failed chunk load, broken files, storage failures surfaced |
| Performance | route chunks, `/draw` startup size from the build output, many-objects spec |
| Accessibility | axe specs |
| Browsers | Chromium / Firefox / WebKit status (CI vs local) |
| Tests | coverage numbers vs ratchet (`vitest.config.ts` thresholds); hotspots without tests |
| Code quality | lint warnings vs ratchet, strict-island folders, files over budget |
| Security | XSS sinks, opened-file validation, CSP / security headers, audit |
| Operations | newest `main` pipeline + deploy job, error reporting, rollback path, local work not yet in CI |
| Docs | docs updated for every change |

## 3. Verdict

One sentence a non-engineer understands, then the blocking items (owner actions first). Distinguish:
**blocking** (data loss, crash, security, broken deploy), **accepted limits** (documented decisions), and
**improvements** (roadmap). Link each item to its BUG-xxx or R-xx. Two separate answers:
- **What is deployed now** (newest green `main` run) — is it safe to keep live?
- **The local working tree** — may it be deployed? Never "yes" while it is uncommitted / not through CI.

## 4. Update the docs

`docs/PRODUCTION_READINESS.md`: a dated review paragraph at the top, the verdict and scorecard numbers updated (keep
older review paragraphs, shortened). New findings as `open` rows in `docs/BUGS.md` (next ID after "Highest ID").

## 5. Owner report (always this shape, in the chat)

```
Deploy: YES / NO / YES, after <step>
Live site (main, <date>): <safe / not safe> — <one line>
Local changes: <n files, not in CI> — <what must happen first>

| Area | Status | Evidence (numbers) |   ← the scorecard, one line per area

Blocking (fix before deploy):   <items with BUG-xxx, or "none">
Owner actions:                  <numbered steps>
Should fix soon (not blocking): <top 3 with BUG-xxx>
Not verified:                   <gates that could not run, and why>
```

Then the commands run with results and the files changed. Plain words: the owner is not reading the docs.
