import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Ratchet: CI fails if coverage drops below today's level (raised 2026-11-09). Raise these as coverage grows; target
// floor is 60% (docs/TESTING.md "Coverage"). scripts/guardrails reads this literal: keep it one object.
const ratchet = { thresholds: { statements: 52, branches: 45, functions: 54, lines: 54 } };

// A shard (`--shard=i/n`, CI) holds only part of the coverage, so it must not check the ratchet: the merge step
// (`npm run test:merge`, all shards together) checks it (docs/TESTING.md "Speed").
const sharded = process.argv.some((arg) => arg.startsWith('--shard'));

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: 'src/setupTests.ts',
        // VITE_SITE_URL is configuration (.env / CI). Tests use a placeholder origin on purpose, so nothing
        // can depend on the real domain.
        env: { VITE_SITE_URL: 'https://fateboard.test' },
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            // text = console table, html = coverage/index.html (browse per file / per line),
            // json-summary = coverage/coverage-summary.json (totals for the health report)
            reporter: ['text-summary', 'html', 'json-summary'],
            reportsDirectory: 'coverage',
            thresholds: sharded ? {} : ratchet.thresholds,
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/__tests__/**',
                'src/**/*.{test,spec}.{ts,tsx}',
                'src/test/**',
                'src/**/*.d.ts',
            ],
        },
    },
});
