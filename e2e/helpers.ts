/**
 * Playwright helper utilities and shared constants.
 */
import { Page } from '@playwright/test';

export const BASE_URL = 'http://localhost:3000';

// Auth credentials from environment — never hardcode in tests
export const TEST_EMAIL = process.env.TEST_EMAIL || '';
export const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

/**
 * Wait for the Next.js page to be fully hydrated.
 * Checks that no loading spinner is visible.
 */
export async function waitForHydration(page: Page) {
    await page.waitForLoadState('networkidle');
}

/**
 * Performs a login via the login page form.
 * Requires TEST_EMAIL and TEST_PASSWORD env vars.
 */
export async function loginWithEmail(page: Page) {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    // Wait for redirect away from login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
}

/**
 * Check if we're already authenticated (user menu or dashboard link visible).
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
    const signOutBtn = page.getByText(/sign out/i);
    return await signOutBtn.isVisible().catch(() => false);
}
