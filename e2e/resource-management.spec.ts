import { test, expect } from '@playwright/test';
import { loginWithEmail, waitForHydration, TEST_EMAIL, TEST_PASSWORD } from './helpers';

/**
 * E2E: Resource Management & Burst Protocol (Oxygen Tank)
 * 
 * Verifies that the dashboard correctly reflects resource usage, 
 * handles quota warnings, and manages the burst credit activation flow.
 */
test.describe('Resource Management & Oxygen Tank Protocol', () => {

    test.beforeEach(async ({ page }) => {
        if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) {
            console.error('ERROR: TEST_EMAIL or TEST_PASSWORD not set in environment.');
            throw new Error('E2E credentials missing');
        }
        await loginWithEmail(page);
    });

    test('should display "Arm Oxygen Tank" button when usage is > 80%', async ({ page }) => {
        // Mock usage API - 85% of 100GB = 85GB
        await page.route('**/api/user/usage', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    usage: { storageBytes: 85 * 1024 * 1024 * 1024, dbWritesDaily: 10, cpuTimeMsPerMonth: 500 },
                    quotas: { storageBytes: 100 * 1024 * 1024 * 1024, dbWritesDaily: 1000, cpuTimeMsPerMonth: 300000, burstAllowanceBytes: 1024 * 1024 * 1024 },
                    burstUsed: false,
                    burstAuthorized: false,
                    tier: 'pro'
                })
            });
        });

        await page.goto('/dashboard');
        await waitForHydration(page);


        // 1. Verify button is visible
        const armBtn = page.getByRole('button', { name: /arm oxygen tank/i });
        await expect(armBtn).toBeVisible({ timeout: 15000 });

        // 2. Mock activation API success
        await page.route('**/api/user/activate-burst', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, status: 'Armed' }) });
        });

        // 3. Click Arming
        await armBtn.click();

        // 4. Verify toast and UI change (Badge should appear)
        await expect(page.getByText(/Oxygen Tank Armed/i)).toBeVisible();
    });

    test('should show critical red animation when usage hits 100%', async ({ page }) => {
        // Mock usage API - 101% of 100GB = 101GB
        await page.route('**/api/user/usage', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    usage: { storageBytes: 101 * 1024 * 1024 * 1024, dbWritesDaily: 0, cpuTimeMsPerMonth: 0 },
                    quotas: { storageBytes: 100 * 1024 * 1024 * 1024, dbWritesDaily: 1000, cpuTimeMsPerMonth: 300000, burstAllowanceBytes: 1024 * 1024 * 1024 },
                    burstUsed: true, // Burst already used
                    burstAuthorized: false,
                    tier: 'pro'
                })
            });
        });

        await page.goto('/dashboard');
        await waitForHydration(page);

        // 1. Verify "Depleted" badge is visible
        await expect(page.getByText(/Oxygen Tank Depleted/i)).toBeVisible({ timeout: 15000 });

        // 2. Verify critical status in progress bar (Check for the red color)
        const storageBar = page.locator('.bg-red-500');
        await expect(storageBar.first()).toBeVisible();
    });

    test('should display descriptive error toast on generation quota exceeded (429)', async ({ page }) => {
        // Mock 429 error on generation
        await page.route('**/api/generate', async route => {
            await route.fulfill({
                status: 429,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: "QUOTA_EXCEEDED: You have reached your Storage Space limit for the pro plan."
                })
            });
        });

        // Mock nanobanana to prevent blocking
        await page.route('**/api/generate/nanobanana', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, compiledPrompt: "compiled prompt" })
            });
        });

        // Set master level in localStorage to skip onboarding
        await page.addInitScript(() => {
            window.localStorage.setItem('pskill_userLevel', 'master');
            window.localStorage.setItem('pskill_onboarding_completed', 'true');
        });

        await page.goto('/generate');
        await waitForHydration(page);

        // Wait for the generator UI to actually load
        await expect(page.locator('h1', { hasText: 'Studio Generator' })).toBeVisible({ timeout: 15000 });

        // Trigger generation
        const promptInput = page.locator('#prompt-input-empty:visible').first();
        await expect(promptInput).toBeVisible();
        await promptInput.fill('test generation under pressure');

        // 1. Click initial "Generate"
        const generateBtn = page.getByRole('button', { name: /generate units/i });
        await generateBtn.first().click();

        // 2. Click "Weave Masterpiece" in the Review Modal
        const weaveBtn = page.getByRole('button', { name: /weave masterpiece/i });
        await weaveBtn.click();

        // Verify descriptive toast is shown
        const toast = page.getByText(/You have reached your Storage Space limit/i);
        await expect(toast).toBeVisible();
    });

    test('should allow SU to toggle between Personal and Global pulse views', async ({ page }) => {
        await page.route('**/api/user/usage', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    usage: { storageBytes: 10 * 1024 * 1024 * 1024, dbWritesDaily: 10, cpuTimeMsPerMonth: 500 },
                    quotas: { storageBytes: 100 * 1024 * 1024 * 1024, dbWritesDaily: 1000, cpuTimeMsPerMonth: 300000, burstAllowanceBytes: 1024 * 1024 * 1024 },
                    burstUsed: false,
                    burstAuthorized: false,
                    tier: 'pro'
                })
            });
        });

        await page.goto('/dashboard');
        await waitForHydration(page);

        // 1. Check if View Switcher exists - wait for it
        const globalBtn = page.getByRole('button', { name: 'Global' });

        // Wait for it to become visible first, which happens for SU after profile loads
        await expect(globalBtn).toBeVisible({ timeout: 15000 });

        // Mock global pulse
        await page.route('**/api/admin/resource-pulse', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    pulse: {
                        storageBytes: 50 * 1024 * 1024 * 1024,
                        dbWritesDaily: 5000,
                        cpuTimeMsPerMonth: 1500000
                    },
                    capacity: {
                        totalStorageBytes: 100 * 1024 * 1024 * 1024,
                        activeUsersCount: 42,
                        totalUsersCount: 150,
                        tierCounts: { pro: 10, standard: 20, free: 120 }
                    }
                })
            });
        });

        await globalBtn.click();
        await expect(page.getByText(/Global Infrastructure Pulse/i)).toBeVisible();

        const personalBtn = page.getByRole('button', { name: 'My Feed' });
        await personalBtn.click();
        await expect(page.getByText(/Storage Space/i)).toBeVisible();
    });
});
