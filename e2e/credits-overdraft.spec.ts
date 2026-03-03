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

        // Wait for prompt input to be visible
        await page.waitForSelector('#prompt-input', { state: 'visible', timeout: 15000 });
    }

    test('should show RefillModal when balance is 0 and Oxygen is not authorized', async ({ page }) => {
        // Mock nanobanana
        await page.route('**/api/generate/nanobanana', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, compiledPrompt: 'Mocked weave' }) });
        });

        await loginWithEmail(page);

        // 1. Setup OVERRIDE before generator
        await page.addInitScript((credits: any) => {
            (window as any).__PR_CREDITS_OVERRIDE__ = credits;
        }, {
            balance: 0,
            isOxygenAuthorized: false,
            maxOverdraft: 3,
            autoRefillEnabled: false,
            dailyAllowance: 0,
            dailyAllowanceUsed: 0
        });

        await ensureGenerator(page);

        // Verify balance 0 is reflected
        await expect(page.getByText('0 Energy')).toBeVisible();

        // Fill prompt
        await page.locator('#prompt-input').fill('A test generation');
        await expect(page.locator('#manifest-button')).not.toBeDisabled();

        // Click generate
        await page.locator('#manifest-button').click();

        // Wait for Review Modal
        await expect(page.locator('[data-testid="review-modal"]')).toBeVisible({ timeout: 15000 });

        // Click the final generate button in the modal
        await page.getByRole('button', { name: /weave masterpiece/i }).click();

        // Check for RefillModal
        await expect(page.locator('[data-testid="refill-modal"]')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/energy low/i)).toBeVisible();
        await expect(page.getByText(/oxygen tank offline/i)).toBeVisible();
    });

    test('should allow generation if Oxygen Tank is armed and within limit', async ({ page }) => {
        // Mock both endpoints
        await page.route('**/api/generate/nanobanana', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, compiledPrompt: 'Mocked weave 2' }) });
        });
        await page.route('**/api/generate', async (route) => {
            // Delay the SSE response so generation state is visible in the UI
            await new Promise(resolve => setTimeout(resolve, 2000));
            await route.fulfill({
                status: 200,
                contentType: 'text/event-stream',
                body: [
                    'data: {"type": "progress", "message": "Inbound payload detected...", "current": 0, "total": 1}\n\n',
                    'data: {"type": "complete", "images": [{"url": "https://example.com/test.png", "prompt": "test"}]}\n\n',
                    'data: [DONE]\n\n'
                ].join('')
            });
        });

        await loginWithEmail(page);

        // 1. Setup OVERRIDE
        await page.addInitScript((credits: any) => {
            (window as any).__PR_CREDITS_OVERRIDE__ = credits;
        }, {
            balance: 1,
            isOxygenAuthorized: true,
            maxOverdraft: 5,
            dailyAllowance: 0,
            dailyAllowanceUsed: 0
        });

        await ensureGenerator(page);

        // Verify balance
        await expect(page.getByText('1 Energy')).toBeVisible();

        // Fill prompt
        await page.locator('#prompt-input').fill('Oxygen tank test');
        await expect(page.locator('#manifest-button')).not.toBeDisabled();

        // Click generate — opens review modal
        await page.locator('#manifest-button').click();
        await expect(page.locator('[data-testid="review-modal"]')).toBeVisible({ timeout: 15000 });

        // Click confirm in review modal — triggers handleGenerate
        await page.getByRole('button', { name: /weave masterpiece/i }).click();

        // Verify: review modal should close after clicking
        await expect(page.locator('[data-testid="review-modal"]')).not.toBeVisible({ timeout: 10000 });

        // Verify: generation should be in progress — button text changes to "Cancel Synthesis"
        // OR the generation message "Initializing generation pipeline..." appears
        const cancelBtn = page.getByText(/cancel synthesis/i);
        const initMsg = page.getByText(/initializing generation pipeline/i);
        const progressMsg = page.getByText(/inbound payload detected/i);

        // Wait for any of these indicators that generation started
        await expect(cancelBtn.or(initMsg).or(progressMsg).first()).toBeVisible({ timeout: 15000 });
    });

    test('should show RefillModal when Oxygen Tank is armed but cost exceeds limit', async ({ page }) => {
        // Mock nanobanana
        await page.route('**/api/generate/nanobanana', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, compiledPrompt: 'Mocked weave 3' }) });
        });

        await loginWithEmail(page);

        // 1. Setup OVERRIDE
        await page.addInitScript((credits: any) => {
            (window as any).__PR_CREDITS_OVERRIDE__ = credits;
        }, {
            balance: 0,
            isOxygenAuthorized: true,
            maxOverdraft: 2, // Set to 2 so cost of 3 (High) fails
            dailyAllowance: 0,
            dailyAllowanceUsed: 0
        });

        await ensureGenerator(page);

        // Verify balance
        await expect(page.getByText('0 Energy')).toBeVisible();

        // Fill prompt
        await page.locator('#prompt-input').fill('High cost test');

        // Toggle settings to select High Quality
        const engineeringCore = page.locator('text=Engineering Core');
        await engineeringCore.click();

        // Select High (Cost: 3)
        await page.selectOption('select:near(label:text("Quality"))', 'high');

        // Click generate
        await page.locator('#manifest-button').click();
        await expect(page.locator('[data-testid="review-modal"]')).toBeVisible({ timeout: 15000 });

        // Click final generate
        await page.getByRole('button', { name: /weave masterpiece/i }).click();

        // Should show RefillModal because 3 > 2 (limit)
        await expect(page.locator('[data-testid="refill-modal"]')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/energy low/i)).toBeVisible();
        await expect(page.getByText(/oxygen tank depleted/i)).toBeVisible();
    });
});
