## What and why

<!-- One or two sentences. Link the bug or roadmap item: BUG-xxx / R-xx. -->

## How it was verified

<!-- Commands run and results; what you checked by hand in `npm run dev` for UI changes. -->

## Definition of done

- [ ] Root cause fixed; related issues added to `docs/BUGS.md` as `open`, not silently fixed
- [ ] A test that failed before and passes now (unit/RTL; Playwright for user flows)
- [ ] `npm run check`, `npm run test:run`, `npm run build` pass; E2E for the area passes
- [ ] No file over its size ceiling (`fileBudget.test.ts`); no new `any`; folders that pass strict mode added to `tsconfig.strict.json`
- [ ] Public slice keys/actions unchanged (`storeApi.test.ts`), or the rename was approved: label `api-change`
- [ ] No ratchet loosened (lint limit, coverage, size ceilings, no `.skip` / `@ts-ignore` / reasonless `eslint-disable`), or the owner approved it: label `ratchet-change`
- [ ] `docs/` updated; bug marked `fixed` in `docs/BUGS.md`; decisions in `docs/DECISIONS.md`
- [ ] Reviewed with `fate-review` (or the `fate-reviewer` agent); CONFIRMED P0–P2 findings fixed
