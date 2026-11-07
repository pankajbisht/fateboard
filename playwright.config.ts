import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests (Playwright). They run against a production-like bundle built with
 * `--mode e2e` (identical to production plus the read-only `window.__fateboard` hook) and
 * served by `vite preview`. Run: `npm run e2e` (report: `npm run e2e:report`).
 */
const PORT = 4173;
/** Firefox runs in CI; locally opt in with E2E_FIREFOX=1 (needs `npx playwright install firefox`). */
const withFirefox = !!process.env.CI || !!process.env.E2E_FIREFOX;

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI
        ? [['github'], ['html', { open: 'never' }]]
        : [['list'], ['html', { open: 'never' }]],
    timeout: 30_000,
    expect: { timeout: 5_000 },
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'desktop-chromium',
            use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
        },
        // second engine (Gecko): every spec runs in Firefox too (production readiness P1)
        ...(withFirefox
            ? [
                  {
                      name: 'desktop-firefox',
                      use: {
                          ...devices['Desktop Firefox'],
                          viewport: { width: 1440, height: 900 },
                      },
                  },
              ]
            : []),
        {
            // narrow laptop: toolbars must wrap / overflow, nothing cut off
            name: 'laptop-chromium',
            use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 700 } },
            testMatch: /layout\.spec\.ts/,
        },
    ],
    webServer: {
        command: `npm run build:e2e && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
