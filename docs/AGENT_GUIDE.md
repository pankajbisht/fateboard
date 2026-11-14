# Agent guide: how to use the skills, agents and commands

A hands-on guide to the AI tooling in this repo: **what to type, when, and what you get back**. The design behind
it (roles, hooks, guardrails) is in [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md); the rules are in `CLAUDE.md`.

## 1. The three ways to get help

| You type | What happens | Example |
|---|---|---|
| A plain request | Claude picks the matching skill by itself (each skill's `description` says when it applies) | "fix BUG-204", "commit and push my work" |
| `/<skill-name> [args]` | Runs that skill's procedure exactly | `/fate-task BUG-204`, `/fate-ship` |
| "use the `<agent>` agent on …" | Starts a read-only specialist in its own context; it reports back, the main session acts | "use fate-reviewer on src/store/slices/createLayerSlice.ts" |

- **Skills** are procedures that run in your session and may edit files (`.claude/skills/<name>/SKILL.md`).
- **Agents** are read-only specialists with a fresh context (`.claude/agents/<name>.md`). They cost more tokens
  (they start cold), so use them for big or risky work and **always tell them which files changed**.
- **Hooks and rules** run without you asking (section 5).

## 2. "I want to …" cheat sheet

| I want to … | Use | Type |
|---|---|---|
| Fix a bug or build a feature | skill `fate-task` | `/fate-task BUG-204` or "add a lasso tool" |
| Find why something is broken (cause unknown) | agent `fate-debugger`, then `fate-task` | "use fate-debugger: the slider jumps back in Firefox" |
| Add store state / actions | skill `fate-new-slice` (inside `fate-task`) | `/fate-new-slice` "for macro recordings" |
| Split a huge file | skill `fate-refactor` (+ agent `fate-architect`) | `/fate-refactor R-03` |
| Review my change, a branch or a PR | skill `fate-review` or agent `fate-reviewer` | `/fate-review`, `/fate-review feature/x`, `/fate-review #14` |
| Run every quality gate with root causes | agent `fate-verifier` | "use fate-verifier on the files I changed" |
| Check SEO after a page / route change | skill `fate-seo` | `/fate-seo` |
| Check loading speed / bundle size | skill `fate-perf` | `/fate-perf` |
| Know if we can deploy | skill `fate-readiness` | `/fate-readiness` or "can we deploy?" |
| Branch, commit and push my work | skill `fate-ship` | `/fate-ship` or `/fate-ship fix BUG-204` |
| See the app running | built-in `/run` | `/run` "open /draw and add a rectangle" |
| A second opinion on bugs in the diff | built-in `/code-review` | `/code-review medium` |
| Clean up the diff (reuse, simpler code) | built-in `/simplify` | `/simplify` |
| A security pass on the branch | built-in `/security-review` | `/security-review` |

## 3. Project skills (`/fate-…`)

### `fate-task`: any bug fix or feature
- **When:** you start any change. It is the Definition of done in `CLAUDE.md` as steps.
- **Type:** `/fate-task BUG-204`, `/fate-task R-05`, or just describe the feature.
- **Flow:** restate → read the doc sections → **plan** (stops to ask if a public store key or a Q1–Q13 decision is
  touched) → failing test → fix → gates → docs (bug row moved to `BUGS_ARCHIVE.md`) → report.
- **You get:** a working, tested, documented change and a report with files changed and commands run. No commit
  (use `fate-ship`).

### `fate-ship`: branch → add all → commit → push
- **When:** the work is done and you want it on GitHub.
- **Type:** `/fate-ship`, `/fate-ship fix BUG-204`, `/fate-ship feat gallery tutorials`, or "commit and push".
- **Flow:** reads `git status` and the diff → proposes a branch name (`fix/bug-204-slider-late-input`) and a
  Conventional Commit message → **asks you once** (ship / split into several commits / change the message) →
  runs `npm run check`, `test:run` (+ `build` if app code changed) → `git switch -c`, `git add -A` → scans the
  staged files (`.env`, keys, build output, big files) → commits through the husky hook → `git push -u origin` →
  prints the PR link.
- **Rules it follows:** [CONVENTIONS.md "Git: branches and commits"](CONVENTIONS.md). Never commits to `main`,
  never `--no-verify`, never force-pushes. You can check a name yourself:

  ```bash
  node .claude/skills/fate-ship/scripts/validate.mjs branch fix/bug-204-slider-late-input
  echo "fix(slider): ignore late input" | node .claude/skills/fate-ship/scripts/validate.mjs message -
  ```
- **Want a PR too?** Say "and open a PR" (uses `gh pr create` with the PR template).

### `fate-review`: code review
- **Type:** `/fate-review` (your branch + working tree), `/fate-review <branch>`, `/fate-review #<PR>`,
  `/fate-review src/components/organisms/board/`.
- **You get:** ranked findings (P0 – P3) with `file:line` evidence. It does not edit unless you ask
  ("fix the P0 and P1 findings").

### `fate-refactor`: split a big file safely
- **Type:** `/fate-refactor R-03` (a row from `docs/CODE_REVIEW.md`) or `/fate-refactor src/…/LayersPanel.tsx`.
- **Flow:** `fate-architect` plan → characterization tests → small extraction steps → gates → lower the file's
  size ceiling. Behaviour must not change.

### `fate-new-slice`: new store state
- **Type:** `/fate-new-slice` + what the state is for.
- **Flow:** checks whether a new slice is really needed → unique keys → failing test → slice → registered before
  `createAnimationSlice` → `docs/STATE.md`.

### `fate-seo` and `fate-perf`: public pages and loading speed
- **`/fate-seo`** after any route, public page, `index.html` or `public/` change: builds and audits titles,
  canonical, robots, Open Graph, one `h1`, sitemap.
- **`/fate-perf`** after a new route, dependency, heavy import or images: measures bundle size before and after
  (`scripts/bundle-report.mjs --save` / `--compare`) and reports the change.
- `fate-task` calls both when the change needs them; you can also run them alone.

### `fate-readiness`: can we deploy?
- **Type:** `/fate-readiness` or "can we deploy?".
- **You get:** every gate run, a scorecard, and the same **Deploy YES / NO** report every time;
  `docs/PRODUCTION_READINESS.md` refreshed.

## 4. Project agents (read-only specialists)

Ask for them by name. Give them the **list of changed files** (`git diff --name-only`) so they don't read the
whole tree.

| Agent | Ask like this | Returns |
|---|---|---|
| `fate-debugger` | "use fate-debugger: export to MP4 hangs at 90%" | Root cause at a line, the failing test to write, the minimal fix |
| `fate-architect` | "use fate-architect to plan splitting createPagesSlice.ts" | Step-by-step module plan; no edits |
| `fate-reviewer` | "use fate-reviewer on these files: …" | Verified, ranked findings with evidence |
| `fate-verifier` | "use fate-verifier before I ship; changed files: …" | Lint, type-check, format, unit + coverage, build, E2E results with the root cause of each failure |

Agents never edit files. The main session reads their report, checks it, and makes the change.

## 5. What runs without asking

| Piece | When | What you notice |
|---|---|---|
| `guard.mjs` hook | before every edit / shell command | A **block** (edits to `.env`, `node_modules`, `dist/`, lockfile, `^` versions, credentials, `--no-verify`, force push) or a **permission prompt** when a guardrail is loosened (lint limit, coverage, size ceiling, `.skip`, `@ts-ignore`, removed store key) |
| `post-edit.mjs` hook | after each edit in `src/` / `e2e/` | Prettier + ESLint on that file (~2 s) |
| `stop-check.mjs` hook | end of a turn that edited TypeScript | Type-check + related tests (~10 s); a failure makes Claude keep fixing |
| `.claude/rules/*.md` | when Claude opens matching files | Area checklists load by themselves (store, canvas, components, tests, SEO) |
| Permissions (`settings.json`) | always | Gates and read-only git run freely; `git push`, `reset --hard`, `npm install` ask; reading `.env`, force push, `npm publish` are denied |

Personal overrides (not committed): `.claude/settings.local.json` (e.g. you already allow `git add` /
`git commit` without a prompt there) and `CLAUDE.local.md` for personal instructions.

## 6. Built-in Claude Code commands worth knowing

| Command | Use it for |
|---|---|
| `/help` | All commands |
| `/clear` | Start fresh between tasks (CLAUDE.md: one task per session) |
| `/compact` | Shrink a long conversation without losing the thread |
| `/context` | See what is using the context window |
| `/memory` | Edit `CLAUDE.md` / personal memory |
| `/agents`, `/hooks`, `/permissions` | View or change agents, hooks and permission rules |
| `/model`, `/fast` | Switch model / fast mode |
| `/resume` | Continue an earlier session |
| `/run` | Launch the app and drive it to see a change working |
| `/code-review [low…xhigh]` | Bug-focused review of the diff (`--fix` applies fixes). `ultra` is a paid multi-agent cloud review you start yourself |
| `/simplify` | Reuse / simplification cleanups on the changed code |
| `/security-review` | Security review of the branch |
| `/loop`, `/schedule` | Repeat a prompt on an interval / run a cloud agent on a schedule |
| `/fewer-permission-prompts` | Suggests an allowlist from the commands you approve often |

Do **not** run `/init`: it would overwrite the hand-written `CLAUDE.md`.

## 7. Recipes

- **Fix a reported bug:** "use fate-debugger on BUG-212" → `/fate-task BUG-212` → `/fate-ship`.
- **New feature with a new page:** `/fate-task` "add a /templates page" (it runs `fate-perf` + `fate-seo`) →
  "use fate-reviewer on the changed files" → `/fate-ship` → "open a PR".
- **Big risky change:** `/fate-task …` → "use fate-verifier and fate-reviewer on the changed files" → fix
  CONFIRMED findings → `/fate-ship`.
- **Review someone's PR:** `/fate-review #15`.
- **Release:** `/fate-readiness` → if Deploy YES, merge the PR; CI deploys.

## 8. Tips and troubleshooting

- **Save tokens:** one task per session (`/clear` between), name the files or bug id, ask for agents only when the
  change is big. Claude reads docs by section, not whole files.
- **"[fateboard guard] …" block:** the action breaks a rule in `CLAUDE.md` "Never do". Fix the cause; do not look
  for a way around it.
- **"[fateboard guardrail] … Approve only if you (the owner) want this.":** a quality bar would be lowered.
  Approve only if you really want that.
- **Commit rejected by the pre-commit hook:** lint-staged (Prettier + ESLint) failed on a staged file; nothing was
  committed. Ask Claude to fix it and run `/fate-ship` again.
- **Many unrelated E2E timeouts:** the machine is busy. Check `uptime`, rerun with `--workers=2`.
- **The stop hook keeps reporting a failure:** it retries once, then reports instead of looping. Read the
  reported error; it is usually a real type error or a broken related test.
