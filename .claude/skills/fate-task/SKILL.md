---
name: fate-task
description: The end-to-end workflow for any bug fix or feature in the fateboard repo, from plan to verified, documented change. Use when starting work on a bug (BUG-xxx), a feature, or a roadmap item in this repo.
---

# Deliver one change in fateboard

This is CLAUDE.md "How we work" + "Definition of done" as steps. One task per session.

## 1. Understand
- Restate the task in one or two sentences. Find its BUG-xxx / R-xx / roadmap row.
- Read only the `docs/` **sections** for the area (STATE for slices, CANVAS for Fabric, COMPONENTS for panels,
  ARCHITECTURE "Storage layer" for persistence): `grep -n '^## ' docs/STATE.md` or `grep -n '<keyword>' docs/*.md`,
  then Read those lines with offset / limit. Bugs: `grep -n "BUG-0xx" docs/BUGS*.md`. Never read DECISIONS.md or
  BUGS_ARCHIVE.md whole.
- Reproduce or locate the root cause. Symptom patches are not accepted.

## 2. Plan (before editing)
Files to touch, tests to add, risks, docs to update. **Stop and ask** if the plan renames/removes a public slice
key or action, touches a decision Q1–Q13 in `docs/DECISIONS.md`, adds a dependency, or shows the user a new
prompt/permission. For a large refactor use skill `fate-refactor` (and the `fate-architect` agent for the plan).

## 3. Test first
Write the test that fails today: unit/RTL in the nearest `__tests__/`, Playwright in `e2e/` for user flows. Run
it and see it fail for the right reason.

## 4. Implement
Smallest correct diff, following the rules in CLAUDE.md. New logic goes in a focused module (size budget), not
into a file that is already over budget. Related problems you notice: add them to `docs/BUGS.md` as `open`,
don't fix them silently.

## 5. Verify
`npm run check`, `npm run test:run` (or `test:coverage`), `npm run build`, and the E2E specs for the area, each
with summary-only output (CLAUDE.md "Token budget"). For a change over several areas or a risky one, also hand it
to the `fate-verifier` and `fate-reviewer` agents **with the list of files you changed** (they must not review the
whole working tree); fix CONFIRMED P0–P2 findings. A small, well-tested change does not need them.

## 6. Document and report
- `docs/` updated; the bug's row → `fixed (<date>): <how> (<tests>)` and moved to `docs/BUGS_ARCHIVE.md`; a new
  bug takes the next ID after "Highest ID" in BUGS.md (update it); decisions logged.
- Final report: what changed and why, files changed, commands run with results, what was not verified, open
  follow-ups. Commit only when the user asks (branch first if on `main`).
