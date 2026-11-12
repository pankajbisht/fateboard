---
paths:
    - '**/__tests__/**'
    - '**/*.test.ts'
    - '**/*.test.tsx'
    - 'e2e/**'
    - 'src/test/**'
---

# Tests

Full guide: docs/TESTING.md (strategy, mocking Fabric, coverage ratchet, Playwright plan, health report).

- Test first: the new test must fail for the right reason before the fix, then pass.
- Unit / RTL: Vitest + jsdom, next to the code in `__tests__/`. Slices with `src/test/sliceHarness.ts`, the canvas
  with `src/test/fakeCanvas.ts`. Query by role and accessible name (what users and screen readers see), not by
  class or test id unless there is no role.
- Real Fabric runs in jsdom (e.g. `fabric.loadSVGFromString`); prefer it to mocks when the behaviour is Fabric's.
- User flows get a Playwright spec in `e2e/` (Chromium; Firefox in CI). Assert on what the user sees; no fixed
  `waitForTimeout` except to prove that something does *not* happen. Fail on `pageerror`.
- Many unrelated E2E timeouts at once usually mean machine load: check `uptime`, rerun with `--workers=2`.
- Guard tests in `src/__tests__/` enforce architecture. When a rule matters, add a guard test, not just a sentence.
  Changing a guard needs a reason in the PR (raising a ceiling or a lint ratchet is never silent).
- Coverage thresholds in `vitest.config.ts` only go up.
- Never `it.skip` / `test.only` to get green; known bugs go in `e2e/known-bugs.spec.ts` as expected failures.
