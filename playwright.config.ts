import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({ path: path.resolve(__dirname, 'e2e', '.env') });

/**
 * Playwright E2E configuration.
 * Tests run against the local dev server (npm run dev).
 * Run with: npx playwright test
 */
export default defineConfig({
    testDir: './e2e',
    fullyParallel: false, // Run sequentially since tests share local server state
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1, // 1 retry locally to handle cold-start flakes
    workers: 1,
    timeout: 60000, // 60s per test — generous for cold-start scenarios
    reporter: [['html', { outputFolder: 'playwright-report' }], ['line']],
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        navigationTimeout: 30000, // 30s for page.goto — handles slow compilations
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // Auto-start dev server if not already running; reuse if it is.
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120000, // Wait up to 2 min for server startup + compilation
    },
});
