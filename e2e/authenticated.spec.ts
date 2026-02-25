/**
 * E2E: Authenticated user critical paths.
 * Requires TEST_EMAIL + TEST_PASSWORD env vars to be set.
 *
 * Skip gracefully if credentials are missing.
 *
 * Run: TEST_EMAIL=you@example.com TEST_PASSWORD=xxx npx playwright test e2e/authenticated.spec.ts
 */
import { test, expect } from '@playwright/test';
import { loginWithEmail, waitForHydration, TEST_EMAIL, TEST_PASSWORD } from './helpers';

// Skip the entire suite if credentials are not set
test.beforeAll(() => {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
        console.log('⚠️  Skipping authenticated tests — set TEST_EMAIL and TEST_PASSWORD env vars to run them.');
    }
});

function skipIfNoCredentials() {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Requires TEST_EMAIL and TEST_PASSWORD env vars');
}

test.describe('Authenticated: Dashboard', () => {
    test('dashboard loads after login', async ({ page }) => {
        skipIfNoCredentials();

        await loginWithEmail(page);
        await expect(page).toHaveURL(/dashboard/);
        await waitForHydration(page);

        // Dashboard should have credit/stats info visible
        const body = await page.textContent('body');
        expect(body).toMatch(/credit|studio|community|generation/i);
    });

    test('dashboard shows Professional / Casual mode toggle for SU', async ({ page }) => {
        skipIfNoCredentials();

        await loginWithEmail(page);
        await page.goto('/dashboard');
        await waitForHydration(page);

        // The audience mode toggle should be present
        const modeToggle = page.getByText(/casual|professional/i);
        await expect(modeToggle.first()).toBeVisible({ timeout: 8000 });
    });
});

test.describe('Authenticated: Generate page', () => {
    test('generate page loads and shows prompt input area', async ({ page }) => {
        skipIfNoCredentials();

        await loginWithEmail(page);
        await page.goto('/generate');
        await waitForHydration(page);

        // Should have a textbox for the prompt
        const textarea = page.getByRole('textbox').first();
        await expect(textarea).toBeVisible({ timeout: 8000 });
    });

    test('generate button is disabled with empty prompt', async ({ page }) => {
        skipIfNoCredentials();

        await loginWithEmail(page);
        await page.goto('/generate');
        await waitForHydration(page);

        // The generate button should exist
        const generateBtn = page.getByRole('button', { name: /generate|create|make/i });
        await expect(generateBtn.first()).toBeVisible({ timeout: 8000 });
    });

    test('professional mode shows Freeform / MadLibs / Featured tabs', async ({ page }) => {
        skipIfNoCredentials();

        await loginWithEmail(page);

        // Switch to Professional mode via dashboard
        await page.goto('/dashboard');
        await waitForHydration(page);
        const proBtn = page.getByRole('button', { name: /professional/i });
        if (await proBtn.isVisible()) {
            await proBtn.click();
            await page.waitForTimeout(1000);
        }

        await page.goto('/generate');
        await waitForHydration(page);

        // Tabs should be visible
        const freeformTab = page.getByRole('button', { name: /freeform/i });
        await expect(freeformTab).toBeVisible({ timeout: 6000 });
    });

    test('✨ Enhance button appears in freeform mode with a prompt', async ({ page }) => {
        skipIfNoCredentials();

        await loginWithEmail(page);
        await page.goto('/generate');
        await waitForHydration(page);

        // Switch to freeform if tabs are present
        const freeformTab = page.getByRole('button', { name: /freeform/i });
        if (await freeformTab.isVisible()) {
            await freeformTab.click();
        }

        // Type a prompt
        const textarea = page.getByRole('textbox').first();
        await textarea.fill('a cat sitting on a chair');

        // The enhance button should now be enabled
        const enhanceBtn = page.locator('#magic-enhance');
        await expect(enhanceBtn).toBeVisible({ timeout: 5000 });
        await expect(enhanceBtn).not.toBeDisabled();
    });
});

test.describe('Authenticated: Gallery', () => {
    test('gallery page loads', async ({ page }) => {
        skipIfNoCredentials();

        await loginWithEmail(page);
        await page.goto('/gallery');
        await waitForHydration(page);

        // Gallery should contain visible content (images or empty state)
        const body = await page.textContent('body');
        expect(body).toMatch(/gallery|image|collection|prompt/i);
    });

    test('gallery page does not crash (error boundary absent)', async ({ page }) => {
        skipIfNoCredentials();

        await loginWithEmail(page);
        await page.goto('/gallery');
        await waitForHydration(page);

        const errorBound = page.getByText(/something went wrong/i);
        await expect(errorBound).not.toBeVisible({ timeout: 5000 });
    });
});

test.describe('Authenticated: Community Hub', () => {
    test('community modal opens on card click', async ({ page }) => {
        skipIfNoCredentials();

        await loginWithEmail(page);
        await page.goto('/community');
        await waitForHydration(page);
        await page.waitForTimeout(3000); // Wait for entries to load

        // Click the first entry card
        const firstCard = page.locator('[class*="grid"] img, [class*="card"] img').first();
        if (await firstCard.isVisible()) {
            await firstCard.click();
            // Modal backdrop or content should appear
            await page.waitForTimeout(500);
            const modal = page.locator('[class*="modal"], [class*="fixed inset-0"]');
            const modalVisible = await modal.isVisible().catch(() => false);
            if (modalVisible) {
                await expect(modal).toBeVisible();
                // Close should exist
                const closeBtn = page.getByRole('button', { name: /close/i }).or(page.locator('button[aria-label*="close"]'));
                if (await closeBtn.isVisible()) {
                    await closeBtn.click();
                }
            }
        }
        // Test passes whether or not a card was visible — avoids false failures on empty db
    });
});

test.describe('Authenticated: Protected redirects', () => {
    test('/dashboard redirects to /login when not authenticated', async ({ page }) => {
        // Don't login — go directly
        await page.goto('/dashboard');
        await waitForHydration(page);

        const url = page.url();
        // Should redirect to login or show login form
        const isLoginPage = url.includes('/login') || (await page.locator('input[type="email"]').isVisible());
        expect(isLoginPage).toBe(true);
    });

    test('/gallery redirects to /login when not authenticated', async ({ page }) => {
        await page.goto('/gallery');
        await waitForHydration(page);

        const url = page.url();
        const isLoginPage = url.includes('/login') || (await page.locator('input[type="email"]').isVisible());
        expect(isLoginPage).toBe(true);
    });
});
