import { test, expect } from '@playwright/test';
import { BASE_URL, waitForHydration, loginWithEmail, TEST_EMAIL, TEST_PASSWORD } from './helpers';

test.describe('Credits Overdraft and Oxygen Tank', () => {

    test.beforeEach(async ({ page }) => {
        if (!TEST_EMAIL || !TEST_PASSWORD) {
            test.skip();
        }
        // Mock credit config
        await page.route('**/api/admin/credits/config**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    packs: [
                        { id: 'pack-1', name: 'Starter', credits: 10, priceCents: 100 },
                        { id: 'pack-2', name: 'Pro', credits: 50, priceCents: 400, isMostPopular: true }
                    ]
                })
            });
        });
    });

    async function ensureGenerator(page: any) {
        // Set localStorage to bypass onboarding
        await page.addInitScript(() => {
            window.localStorage.setItem('pskill_userLevel', 'master');
        });

        await page.goto('/generate');
        await waitForHydration(page);

        // Wait for prompt input to be visible - 60s for slow dev server compilation
        await page.waitForSelector('#prompt-input', { state: 'visible', timeout: 60000 });
    }

    test('should show RefillModal when balance is 0 and Oxygen is not authorized', async ({ page }) => {
        // Mock nanobanana
        await page.route('**/api/generate/nanobanana', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, compiledPrompt: 'Mocked weave' }) });
        });

        await loginWithEmail(page);

        // Setup OVERRIDE: 0 balance, Oxygen unauthorized
        await page.addInitScript((credits: any) => {
            (window as any).__PR_CREDITS_OVERRIDE__ = credits;
        }, {
            balance: 0,
            isOxygenAuthorized: false,
            maxOverdraft: 5
        });

        // Initial state
        await ensureGenerator(page);
        await expect(page.locator('#tour-energy-button')).toContainText(/0/i);

        // 1. Fill prompt and generate
        await page.locator('#prompt-input').fill('Test low energy modal');
        await page.locator('#manifest-button').click();
        await page.getByRole('button', { name: /weave masterpiece/i }).click();

        // Should show RefillModal because 0 < 1 and Oxygen is unauthorized
        await expect(page.locator('[data-testid="refill-modal"]')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/energy low/i)).toBeVisible();
    });

    test('should allow generation if Oxygen Tank is armed and within limit', async ({ page }) => {
        // Mock success
        await page.route('**/api/generate/nanobanana', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, compiledPrompt: 'Oxygen test' }) });
        });
        await page.route('**/api/generate', async (route) => {
            await route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'data: {"type": "complete", "images": [{"url": "https://example.com/oxygen.png"}]}\n\ndata: [DONE]\n\n' });
        });

        await loginWithEmail(page);

        // Setup: 0 balance, Oxygen authorized
        await page.addInitScript((credits: any) => {
            (window as any).__PR_CREDITS_OVERRIDE__ = credits;
        }, {
            balance: 0,
            isOxygenAuthorized: true,
            maxOverdraft: 5
        });

        await ensureGenerator(page);
        await expect(page.locator('#tour-energy-button')).toContainText(/0/i);

        // Perform Generation
        await page.locator('#prompt-input').fill('Oxygen tank test');
        await page.locator('#manifest-button').click();
        await page.getByRole('button', { name: /weave masterpiece/i }).click();

        // Should NOT show modal, should deduct to -1
        await expect(page.locator('#tour-energy-button')).toContainText(/-1/i, { timeout: 15000 });
    });

    test('should show RefillModal when Oxygen Tank is armed but cost exceeds limit', async ({ page }) => {
        // Mock nanobanana
        await page.route('**/api/generate/nanobanana', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, compiledPrompt: 'Mocked weave 3' }) });
        });

        await loginWithEmail(page);

        // Setup: 0 balance, Oxygen authorized, but cost is higher than overdraft
        await page.addInitScript((credits: any) => {
            (window as any).__PR_CREDITS_OVERRIDE__ = credits;
        }, {
            balance: 0,
            isOxygenAuthorized: true,
            maxOverdraft: 2 // Tiny overdraft
        });

        await ensureGenerator(page);
        await expect(page.locator('#tour-energy-button')).toContainText(/0/i);

        // Perform Generation
        await page.locator('#prompt-input').fill('Exceed limit test');

        // Toggle settings to select High Quality (Cost: 3)
        const engineeringCore = page.locator('text=Engineering Core');
        await engineeringCore.click();
        await page.selectOption('select:near(label:text("Quality"))', 'high');

        await page.locator('#manifest-button').click();
        await page.getByRole('button', { name: /weave masterpiece/i }).click();

        // Should show RefillModal because 3 > 2 (limit)
        await expect(page.locator('[data-testid="refill-modal"]')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/energy low/i)).toBeVisible();
        await expect(page.getByText(/oxygen tank depleted/i)).toBeVisible();
    });

    test('should verify full cycle of overdraft use and recovery through purchase', async ({ page }) => {
        // Mock endpoints
        await page.route('**/api/generate/nanobanana', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, compiledPrompt: 'Recovery test' }) });
        });
        await page.route('**/api/generate', async (route) => {
            await route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'data: {"type": "complete", "images": [{"url": "https://example.com/recovery.png"}]}\n\ndata: [DONE]\n\n' });
        });

        await loginWithEmail(page);

        // 1. Setup OVERRIDE: 0 balance, Oxygen authorized
        await page.addInitScript((credits: any) => {
            (window as any).__PR_CREDITS_OVERRIDE__ = credits;
        }, {
            balance: 0,
            isOxygenAuthorized: true,
            maxOverdraft: 5
        });

        await ensureGenerator(page);
        await expect(page.locator('#tour-energy-button')).toContainText(/0/i);

        // 2. Perform Generation
        await page.locator('#prompt-input').fill('Cycle test');
        await page.locator('#manifest-button').click();
        await page.getByRole('button', { name: /weave masterpiece/i }).click();

        // 3. Verify debt state in UI
        await expect(page.locator('#tour-energy-button')).toContainText(/-1/i, { timeout: 15000 });

        // 4. Trigger Modal by clicking Refill
        await page.locator('#tour-refill-link').click();

        // Should show RefillModal
        await expect(page.locator('[data-testid="refill-modal"]')).toBeVisible();
        await expect(page.getByText(/overdraft detected/i)).toBeVisible();
        await expect(page.getByText(/automatically recover 1 credits/i)).toBeVisible();

        // Click a pack to verify it mentions "Starter" (from mock config in beforeEach)
        await expect(page.getByText(/Starter/i)).toBeVisible();
    });
});
