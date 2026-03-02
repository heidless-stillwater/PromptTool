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
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: [['html', { outputFolder: 'playwright-report' }], ['line']],
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // Dev server must already be running — we don't auto-start it in tests
    // to avoid double-starting alongside the existing dev session.
    // webServer: { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true },
});
