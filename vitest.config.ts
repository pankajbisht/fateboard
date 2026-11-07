import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: 'src/setupTests.ts',
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            // text = console table, html = coverage/index.html (browse per file / per line),
            // json-summary = coverage/coverage-summary.json (totals for the health report)
            reporter: ['text-summary', 'html', 'json-summary'],
            reportsDirectory: 'coverage',
            // Ratchet: CI fails if coverage drops below today's level (2026-11-07). Raise these
            // as coverage grows; target floor is 60% (docs/TESTING.md "Coverage").
            thresholds: { statements: 46, branches: 39, functions: 47, lines: 47 },
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
