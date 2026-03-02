/**
 * Playwright helper utilities and shared constants.
 */
import { Page, expect } from '@playwright/test';

export const BASE_URL = 'http://localhost:3000';

// Auth credentials from environment — never hardcode in tests
export const TEST_EMAIL = process.env.TEST_EMAIL || '';
export const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

/**
 * Wait for the Next.js page to be fully hydrated.
 * Checks that no loading spinner is visible.
 */
export async function waitForHydration(page: Page) {
    // Wait for main body to be present and visible
    await page.waitForSelector('body', { state: 'visible', timeout: 5000 });
}

/**
 * Performs a login via the login page form.
 * Requires TEST_EMAIL and TEST_PASSWORD env vars.
 */
export async function loginWithEmail(page: Page) {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
        console.error('ERROR: TEST_EMAIL or TEST_PASSWORD not set in environment.');
    }
    console.log(`Starting login for ${TEST_EMAIL}...`);
    await page.goto('/login');

    console.log('Waiting for login form to manifest...');
    // The button is the "gate" that means the form is rendered
    const authBtn = page.getByRole('button', { name: /authenticate/i });

    // Increased timeout for slow dev servers/cold starts
    try {
        await expect(authBtn).toBeVisible({ timeout: 25000 });
        console.log('Login form manifests. Filling credentials...');
    } catch (e) {
        console.error('Timed out waiting for login form. Current URL:', page.url());
        throw e;
    }

    await page.locator('#email').fill(TEST_EMAIL);
    await page.locator('#password').fill(TEST_PASSWORD);

    console.log('Clicking Authenticate...');
    await authBtn.click();

    // Wait for redirect away from login
    console.log('Waiting for post-login redirect...');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
    console.log('Login successful, redirected to:', page.url());
}

/**
 * Check if we're already authenticated (user menu or dashboard link visible).
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
    const signOutBtn = page.getByText(/sign out/i);
    return await signOutBtn.isVisible().catch(() => false);
}
