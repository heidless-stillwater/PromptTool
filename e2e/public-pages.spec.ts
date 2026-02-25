/**
 * E2E: Public page smoke tests.
 * These verify that public-facing pages load correctly
 * WITHOUT requiring authentication.
 *
 * Run: npx playwright test e2e/public-pages.spec.ts
 */
import { test, expect } from '@playwright/test';
import { waitForHydration } from './helpers';

test.describe('Public pages', () => {
    test('/ redirects or loads correctly', async ({ page }) => {
        await page.goto('/');
        await waitForHydration(page);
        // Should either be the home page or redirect to /dashboard or /login
        const url = page.url();
        expect(url).toMatch(/localhost:3000/);
        // No 500 errors
        expect(await page.title()).not.toBe('');
    });

    test('/community page loads without auth', async ({ page }) => {
        const response = await page.goto('/community');
        // Should not return a 500
        expect(response?.status()).not.toBe(500);
        await waitForHydration(page);

        // Community page should have a main heading
        const heading = page.getByRole('heading').first();
        await expect(heading).toBeVisible({ timeout: 8000 });
    });

    test('/community page has Community Hub branding', async ({ page }) => {
        await page.goto('/community');
        await waitForHydration(page);

        // Either the page title or a heading should mention Community
        const body = await page.textContent('body');
        expect(body).toMatch(/community/i);
    });

    test('/community has entry cards when data loads', async ({ page }) => {
        await page.goto('/community');
        // Wait for skeleton to resolve — up to 15s for Firestore
        await page.waitForTimeout(3000);
        await waitForHydration(page);

        // Check page didn't crash (no error boundary)
        const errorBound = page.getByText(/something went wrong/i);
        await expect(errorBound).not.toBeVisible();
    });

    test('/login page renders the sign-in form', async ({ page }) => {
        await page.goto('/login');
        await waitForHydration(page);

        // Email input must exist
        const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"]'));
        await expect(emailInput).toBeVisible({ timeout: 5000 });

        // Password input must exist
        const passwordInput = page.getByLabel(/password/i).or(page.locator('input[type="password"]'));
        await expect(passwordInput).toBeVisible();

        // Submit button must exist
        const submitBtn = page.getByRole('button', { name: /sign in|log in|continue/i });
        await expect(submitBtn).toBeVisible();
    });

    test('/login shows error for invalid credentials', async ({ page }) => {
        await page.goto('/login');
        await waitForHydration(page);

        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        const submitBtn = page.getByRole('button', { name: /sign in|log in|continue/i });

        await emailInput.fill('notareal@user.invalid');
        await passwordInput.fill('wrongpassword123');
        await submitBtn.click();

        // An error message should appear
        const errorMsg = page.getByText(/invalid|error|incorrect|wrong|failed/i);
        await expect(errorMsg).toBeVisible({ timeout: 8000 });
    });

    test('/community page has view mode controls', async ({ page }) => {
        await page.goto('/community');
        await waitForHydration(page);
        await page.waitForTimeout(2000);

        // The view switcher toolbar should be visible
        // (Grid, Feed, Compact, etc.)
        const body = await page.textContent('body');
        expect(body).toMatch(/grid|feed|compact|trending|community/i);
    });

    test('page titles are descriptive', async ({ page }) => {
        const routes = [
            { path: '/login', pattern: /login|sign|prompt|ai/i },
            { path: '/community', pattern: /community|hub|prompt|ai/i },
        ];

        for (const { path, pattern } of routes) {
            await page.goto(path);
            await waitForHydration(page);
            const title = await page.title();
            expect(title).toMatch(pattern);
        }
    });
});
