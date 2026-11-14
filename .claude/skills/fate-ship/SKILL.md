---
name: fate-ship
description: Ship the working tree of the fateboard repo - create a conventionally named branch, stage all changes, write an enterprise-grade Conventional Commit message, commit through the git hooks and push to origin. Use when asked to commit, push, "ship it", "create a branch and commit", "save my work to git", or to prepare changes for a pull request in this repo.
---

# Ship: branch → add all → commit → push

Conventions: docs/CONVENTIONS.md "Git: branches and commits" (read that section). Every name and message goes
through `node .claude/skills/fate-ship/scripts/validate.mjs`; fix what it reports, never work around it.
Arguments (optional): a type, a ticket (`BUG-204`, `R-03`) or a short summary, e.g. `/fate-ship fix BUG-204`.

## 1. Look before you touch (read-only)

```bash
git status -sb                      # branch, ahead/behind, changed + untracked
git diff --stat HEAD | tail -5      # size of the change
git log --oneline -5                # recent style
git fetch origin --quiet && git rev-list --left-right --count origin/main...HEAD
```

- Nothing to commit → say so and stop.
- On `main` (or any protected branch) → a new branch is required (step 2). Never commit to `main`.
- Already on a work branch → reuse it (say which). Do not rename a branch that is already pushed, even if it
  does not follow the convention; just note it.
- Local `main` behind `origin/main` → say it; the new branch starts from the current `HEAD` (uncommitted work
  moves with it). Do not rebase or pull without asking.
- Read the diff by area (`git diff --stat`, then `git diff -- <path>` for the parts you need, untracked files
  with `git status --porcelain | grep '^??'`) until you can say **what** changed and **why**. Do not print the
  whole diff of a large tree (CLAUDE.md "Token budget").

## 2. Name the branch

`<type>/<ticket>-<short-description>`, lowercase kebab-case, ≤ 60 chars, ticket optional:
`fix/bug-204-slider-late-input`, `feat/gallery-tutorial-pages`, `refactor/r-03-split-layers-panel`,
`chore/claude-ship-skill`, `release/1.4.0`. Type = the main commit's type (`hotfix` for an urgent production fix).

```bash
node .claude/skills/fate-ship/scripts/validate.mjs branch <name>
```

## 3. Write the commit message (Conventional Commits 1.0)

```
<type>(<scope>): <subject>              ← ≤ 72 chars, imperative, lowercase, no period

<body: what changed and WHY, wrapped at ~72 (max 100). Not a file list;
the diff already shows that. Mention behaviour changes, risks, follow-ups.>

Refs: BUG-204, R-03                     ← trackers touched (BUGS.md / CODE_REVIEW.md ids)
BREAKING CHANGE: <what callers must do> ← only if a public API / store key changed (owner approved)
<attribution trailer, if the session gives one>
```

- **type**: `feat` new user-visible capability · `fix` bug fix · `perf` · `refactor` (no behaviour change) ·
  `test` · `docs` · `build` (deps, Vite, Docker) · `ci` (`.github/`) · `chore` (tooling, `.claude/`) ·
  `style` (formatting only) · `revert`.
- **scope**: the area, from the folder map in CLAUDE.md: `store`, `canvas`, `board`, `layers`, `animation`,
  `export`, `import`, `seo`, `router`, `gallery`, `ui`, `storage`, `e2e`, `deps`, `claude`. Several areas → the
  dominant one, or leave it out.
- `!` after the scope (`feat(store)!:`) + a `BREAKING CHANGE:` footer for a breaking change.
- Subject completes "If applied, this commit will …". Good: `fix(slider): ignore late input after release in
  Firefox`. Bad: `Fixed bug`, `updates`, `WIP`, `changes to files`.

Write it to a file in the scratchpad and validate it:

```bash
node .claude/skills/fate-ship/scripts/validate.mjs message <scratchpad>/COMMIT_MSG
```

**One commit or several?** The default is one commit with everything (the owner asked to add all). If the tree
mixes clearly unrelated changes (say, an SEO feature + agent tooling + a CI fix), offer a split in step 4:
one commit per area, each with its own message, staged with `git add <paths>`, in dependency order.

## 4. Confirm once (push is outward-facing)

Show, in one message: branch name, the commit message(s), the file count per area, gates you will run, and the
push target (`origin/<branch>`). Ask once (AskUserQuestion: "Ship as planned" / "Split into N commits" /
"Change the message"). Do not ask again for each step after that.

## 5. Gates (never commit red; CLAUDE.md "Never do")

Summary output only:

```bash
npm run check 2>&1 | grep -E "error|✖|problems|warning|Code style" | tail -5
npm run test:run 2>&1 | grep -E "FAIL|×|Test Files|Tests "
npm run build 2>&1 | grep -E "error|built in" | tail -3     # when src/, index.html, public/ or vite.config.ts changed
```

- Only Markdown outside `src/` changed → gates may be skipped; say so in the report.
- A gate fails → stop, report the root cause; fix it only if it is part of this work (otherwise ask). Never use
  `--no-verify`, `.skip`, a raised limit or `@ts-ignore` to get green.

## 6. Branch, stage, check, commit

```bash
git switch -c <branch>               # only when a new branch is needed
git add -A
node .claude/skills/fate-ship/scripts/validate.mjs staged
git commit -F <scratchpad>/COMMIT_MSG
```

- `staged` prints ✗ (a `.env`, a key, build output, a personal Claude file) → `git restore --staged <file>`,
  add it to `.gitignore` if it belongs there, tell the owner. ⚠ large file → ask before keeping it.
- The pre-commit hook (husky → lint-staged: Prettier + ESLint on staged `src/**`) fails → nothing was committed.
  Fix the cause, `git add` again, commit again with the same message. Never `--amend` a commit that is already
  pushed.

## 7. Push

```bash
git push -u origin <branch>          # asks the owner (settings.json "ask")
```

- Rejected because the remote branch moved → `git fetch` and report; never force. If the owner explicitly
  agrees to overwrite, only `--force-with-lease` (the guard hook blocks `--force`).
- Never push to `main`; changes reach `main` through a pull request and the `CI passed` check.

## 8. Report

Branch, commit hash(es) and header(s) (`git log --oneline -n <N>`), files committed, gate results, push result,
and the PR link `https://github.com/<owner>/<repo>/compare/<branch>?expand=1` (from `git remote get-url origin`).
Offer to open the PR with `gh pr create --base main` and a body that follows `.github/pull_request_template.md`;
only create it when asked.
