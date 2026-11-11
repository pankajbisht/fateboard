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
| `scripts/metrics.mjs` | tool | no | Same size/responsibility numbers for every review |

Only the main session edits files. Agents are read-only on purpose: their output is advice the main session
checks, so one agent's mistake cannot land in the code unreviewed.

## Typical flows

- **Bug fix:** `/fate-task BUG-174` → plan (ask the owner if a public API or decision is touched) → failing test →
  fix → `fate-verifier` → `fate-reviewer` → fix CONFIRMED findings → docs → report.
- **Refactor a god file:** `/fate-refactor` with a roadmap row from `docs/CODE_REVIEW.md` → `fate-architect` plan →
  characterization tests → extract in small steps → `fate-verifier` → lower the file's ceiling in
  `fileBudget.test.ts` → update the roadmap row.
- **Review someone's branch or PR:** `/fate-review <branch|PR|path>` (or the `fate-reviewer` agent).
- **Before a release:** `/fate-readiness`.

## Guardrails (enforced by tests and CI, not by agents)

| Guard | Where |
|---|---|
| One store, unique keys | `src/__tests__/storeKeys.test.ts` |
| One serialize path / one loader | `oneSerializeList.test.ts`, `oneLoader.test.ts` |
| Storage only through `@/lib/storage` | `storageBoundary.test.ts` |
| File size budget (may shrink, never grow) | `fileBudget.test.ts` |
| Strict TypeScript island | `tsconfig.strict.json` via `npm run type-check` |
| No new `any` | `eslint --max-warnings 254` |
| Coverage does not drop | `vitest.config.ts` thresholds |
| Definition of done on every PR | `.github/pull_request_template.md` |

Agents follow rules; tests enforce them. When a rule matters, add a guard test, not just a sentence in a prompt.

## Extending the framework

- New repeatable procedure → a skill in `.claude/skills/<name>/SKILL.md` (frontmatter `name`, `description` that
  says when to use it). Keep project rules in `CLAUDE.md` and point to them; don't copy them.
- New specialist → an agent in `.claude/agents/<name>.md` with the fewest tools it needs. Prefer read-only.
- New architecture rule → a guard test in `src/__tests__/`, then a line in `fate-review`'s checklist.
