# Agent workflow

How AI agents (Claude Code) work on this repo. The rules are in `CLAUDE.md`; this file says **who does what** and
**which procedure** to follow. Everything here lives in the repo (`.claude/`), so every session and every
contributor gets the same behaviour.

## Roles

```
                    ┌────────────────────────────── main session (orchestrator) ──────────────────────────────┐
 user request ───▶  │ skill fate-task: understand → plan → failing test → implement → verify → document → report │
                    └───────┬───────────────────────────┬──────────────────────────────┬──────────────────────┘
                            │ plan a split / new module  │ review the diff              │ run all gates
                            ▼                            ▼                              ▼
                  agent fate-architect        agent fate-reviewer             agent fate-verifier
                  (skill fate-refactor)       (skill fate-review)             (gates + root causes)
                  read-only, returns plan     read-only, returns findings     read-only, returns results
```

| Piece | Kind | Edits code? | Use it for |
|---|---|---|---|
| `fate-task` | skill | yes (main session) | Any bug fix or feature: the Definition of done as steps |
| `fate-review` | skill | no | Reviewing a diff, file or folder; the checklist and report format |
| `fate-refactor` | skill | yes (main session) | Splitting a god file without changing behaviour |
| `fate-readiness` | skill | docs only | Go/no-go audit, refreshing `docs/PRODUCTION_READINESS.md` |
| `fate-reviewer` | agent | no | Independent review after implementing (fresh eyes, no author bias) |
| `fate-architect` | agent | no | Plans for refactors over ~800 lines or changes that cross layers |
| `fate-verifier` | agent | no | Full quality gate with failure root causes, before "done" or a PR |
| `fate-new-slice` | skill | yes (main session) | Adding store state / actions: keys, test first, registration order, STATE.md |
| `fate-debugger` | agent | no | Root cause of a reported bug: reproduce, trace to the line, propose the failing test + minimal fix |
| `scripts/metrics.mjs` | tool | no | Same size/responsibility numbers for every review |

Only the main session edits files. Agents are read-only on purpose: their output is advice the main session
checks, so one agent's mistake cannot land in the code unreviewed.

## What runs automatically (`.claude/settings.json`)

Instructions can be forgotten; hooks cannot. Three hooks enforce the rules at the moment they matter, all plain
Node scripts in `.claude/hooks/` (no extra tools, guarded by `src/__tests__/claudeSetup.test.ts`):

| Hook | When | What it does | Cost |
|---|---|---|---|
| `guard.mjs` | before Edit / Write / Bash | Blocks edits to `.env*` (not `.env.example`), `node_modules`, build output, `package-lock.json`; `^` / `~` versions in `package.json`; credentials in any file; skipping git hooks, force push, `npm publish`, reading `.env` from the shell, `rm -rf` of a root / home / project path. Heredoc text and `echo` are data, not commands | < 50 ms |
| `post-edit.mjs` | after each edit in `src/` or `e2e/` | Prettier on the file; ESLint on it (errors block, warnings do not); records the file for the Stop hook | ≈ 2 s |
| `stop-check.mjs` | when Claude ends a turn that edited TypeScript | `npm run type-check` (all four configs) + `vitest related` on the edited files; failure keeps Claude working, a second failure is reported instead of looping | ≈ 10 s |

Permissions: the quality-gate commands and read-only git run without prompts; `git push`, `reset --hard`, `clean` and
`npm install` ask; reading or editing the real `.env`, force push and `npm publish` are denied.
To change or disable a hook for yourself, use `.claude/settings.local.json` (gitignored) or `/hooks`.

## Guardrails: the bar only goes up

Every gate can be "passed" by lowering it: raise the lint limit, drop a coverage threshold, raise a size ceiling,
skip a test, add `@ts-ignore`, remove a store key the tests complained about. Guardrails make each of those a
visible decision by the owner, at three layers (shared logic: `scripts/guardrails/ratchets.mjs`):

| Layer | Catches | How the owner approves |
|---|---|---|
| Claude, before the edit (`guard.mjs`) | The file as it would be after the edit is compared with now: a looser ratchet, a removed store key, an added `.only` / `.skip` / `xit`, `@ts-ignore` / `@ts-nocheck`, `@ts-expect-error` or `eslint-disable` without a reason; shell writes to guarded config (`sed -i`, `>`); deleting tests | Permission prompt with the reason |
| Claude, protected config (`settings.json` `ask`) | Any edit to CI, git hooks, ESLint / Vitest / Playwright / TS config, `package.json`, the Claude hooks and settings, the guardrails themselves | Permission prompt |
| Repo tests (every run, everyone) | `guardrails.test.ts`: no focused / skipped tests, no `@ts-ignore`, reasons on `@ts-expect-error`, reasonless `eslint-disable` ≤ 96 (ratchet). `storeApi.test.ts`: every public store key in `storeApi.baseline.json` still exists; new keys are recorded with `UPDATE_STORE_API=1 npx vitest run src/__tests__/storeApi.test.ts` (adds only) | Hand edit of the baseline / ceiling |
| CI on pull requests (`check-ratchets.mjs`, Quality job) | Compares the PR with its base: lint `--max-warnings` up, a coverage threshold down, a file budget or size ceiling up / a new over-budget file, the `eslint-disable` ceiling up, a store key removed | PR label `ratchet-change` or `api-change`, then re-run the job |

Tightening is always free: lower the lint limit, raise coverage, lower a ceiling, add a reason to an `eslint-disable`.

## Rules loaded by path (`.claude/rules/`)

Short checklists that Claude loads only when it works on matching files, so `CLAUDE.md` stays small. Each points to
the full doc and names the guard test that enforces the rule:

| Rule | Loaded for |
|---|---|
| `zustand-slices.md` | `src/store/**` |
| `fabric-canvas.md` | slices, `lib/canvas`, `lib/serialization.ts`, `lib/utils`, import, animation, the board |
| `react-components.md` | `src/components/**`, `src/hooks/**` |
| `testing.md` | tests, `e2e/`, `src/test/` |

Personal, uncommitted instructions go in `CLAUDE.local.md` (gitignored).

## Typical flows

- **Bug with an unknown cause:** `fate-debugger` agent first (root cause + failing test), then `/fate-task`.
- **New store state:** `/fate-new-slice` inside `/fate-task`.
- **Bug fix:** `/fate-task BUG-174` → plan (ask the owner if a public API or decision is touched) → failing test →
  fix → gates (summary output) → for multi-area / risky work `fate-verifier` + `fate-reviewer` **given the changed
  files** → fix CONFIRMED findings → docs (row moved to BUGS_ARCHIVE.md) → report.
- **Refactor a god file:** `/fate-refactor` with a roadmap row from `docs/CODE_REVIEW.md` → `fate-architect` plan →
  characterization tests → extract in small steps → `fate-verifier` → lower the file's ceiling in
  `fileBudget.test.ts` → update the roadmap row.
- **Review someone's branch or PR:** `/fate-review <branch|PR|path>` (or the `fate-reviewer` agent).
- **Before a release:** `/fate-readiness`.

## Token budget (2026-11-13)

Every request carries CLAUDE.md, and every subagent starts cold, so cost grows with what is read and printed:

- Docs are read by section (`grep -n '^## '`, then Read with offset / limit). Fixed bugs live in
  `docs/BUGS_ARCHIVE.md`, so `docs/BUGS.md` (open bugs + highest ID) stays about 16 KB instead of 120 KB.
- Commands print summaries (`| grep -E "FAIL|×|Tests "`, `--reporter=line`); a failing file is rerun alone.
- `fate-reviewer` / `fate-verifier` get the list of changed files. Their scope rule stops them from reading a whole
  uncommitted tree (a 1 MB+ working tree made reviews overflow their context and fail).
- Area rules live in `.claude/rules/` and load only for matching paths, so CLAUDE.md keeps just the global rules.

## Guardrails (enforced by tests and CI, not by agents)

| Guard | Where |
|---|---|
| One store, unique keys | `src/__tests__/storeKeys.test.ts` |
| One serialize path / one loader | `oneSerializeList.test.ts`, `oneLoader.test.ts` |
| Storage only through `@/lib/storage` | `storageBoundary.test.ts` |
| File size budget (may shrink, never grow) | `fileBudget.test.ts` |
| Strict TypeScript island | `tsconfig.strict.json` via `npm run type-check` |
| No new `any` | `eslint --max-warnings 249` (ratchet) |
| Coverage does not drop | `vitest.config.ts` thresholds |
| Definition of done on every PR | `.github/pull_request_template.md` |
| The Claude setup itself (hooks, settings, rules, skills, agents) | `claudeSetup.test.ts` |
| No hidden failures; ratchets only tighten; store API stable | `guardrails.test.ts`, `storeApi.test.ts`, `scripts/guardrails/check-ratchets.mjs` in CI |

Agents follow rules; tests enforce them. When a rule matters, add a guard test, not just a sentence in a prompt.

## Extending the framework

- New repeatable procedure → a skill in `.claude/skills/<name>/SKILL.md` (frontmatter `name`, `description` that
  says when to use it). Keep project rules in `CLAUDE.md` and point to them; don't copy them.
- New specialist → an agent in `.claude/agents/<name>.md` with the fewest tools it needs. Prefer read-only.
- New architecture rule → a guard test in `src/__tests__/`, then a line in `fate-review`'s checklist and, if it is
  path-specific, in the matching `.claude/rules/*.md`.
- Something that must happen every time (format, block, check) → a hook script in `.claude/hooks/` with a case in
  `claudeSetup.test.ts`. Keep per-edit hooks under a few seconds; put slow checks in the Stop hook.
- Skip: an MCP server without a concrete need (each one widens what the agent can reach), a second reviewer
  agent (extend `fate-review` instead), rules that copy docs (point to them).
