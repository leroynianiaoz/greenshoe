// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Pull Workflow E2E Tests
 * Tests: Task 14-19 (A3, A4, A5, A6, A25, A26)
 */

test.describe('Pull Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should pull WordPress site successfully (A3)', async ({ page }) => {
    // Navigate to a WordPress site
    await page.getByText('Test WordPress Site').click();

    // Click pull button
    await page.getByRole('button', { name: /pull from live/i }).click();

    // Confirm pull
    await page.getByRole('button', { name: /confirm/i }).click();

    // Should show progress bar (A6)
    await expect(page.getByRole('progressbar')).toBeVisible();
    await expect(page.getByText(/pulling/i)).toBeVisible();

    // Wait for pull to complete (may take several minutes)
    await expect(page.getByText(/pull completed successfully/i)).toBeVisible({
      timeout: 5 * 60 * 1000 // 5 minutes max
    });

    // Status should update
    await expect(page.getByText(/staging active/i)).toBeVisible();

    // Last pulled timestamp should be updated
    await expect(page.getByText(/last pulled: just now/i)).toBeVisible();
  });

  test('should pull static HTML site successfully (A4)', async ({ page }) => {
    await page.getByText('Test Static Site').click();

    await page.getByRole('button', { name: /pull from live/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();

    await expect(page.getByRole('progressbar')).toBeVisible();

    await expect(page.getByText(/pull completed successfully/i)).toBeVisible({
      timeout: 5 * 60 * 1000
    });

    await expect(page.getByText(/staging active/i)).toBeVisible();
  });

  test('should show error for invalid credentials (A5)', async ({ page }) => {
    // Create a site with invalid credentials
    await page.getByRole('button', { name: /add site/i }).click();
    await page.getByLabel(/site name/i).fill('Invalid Credentials Site');
    await page.getByLabel(/live url/i).fill('https://invalid.example.com');
    await page.getByLabel(/connection type/i).selectOption('sftp');
    await page.getByLabel(/host/i).fill('invalid.example.com');
    await page.getByLabel(/username/i).fill('wronguser');
    await page.getByLabel(/password/i).fill('wrongpass');
    await page.getByLabel(/path/i).fill('/var/www/html');
    await page.getByRole('button', { name: /save/i }).click();

    // Navigate to site and try to pull
    await page.getByText('Invalid Credentials Site').click();
    await page.getByRole('button', { name: /pull from live/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();

    // Should show error
    await expect(page.getByText(/connection failed/i)).toBeVisible({
      timeout: 60 * 1000
    });
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test('should update progress bar during pull (A6)', async ({ page }) => {
    await page.getByText('Test WordPress Site').click();
    await page.getByRole('button', { name: /pull from live/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();

    const progressBar = page.getByRole('progressbar');
    await expect(progressBar).toBeVisible();

    // Progress should increase over time
    const initialProgress = await progressBar.getAttribute('aria-valuenow');

    // Wait a bit
    await page.waitForTimeout(5000);

    const laterProgress = await progressBar.getAttribute('aria-valuenow');

    // Progress should have increased (or completed)
    expect(parseInt(laterProgress || '0')).toBeGreaterThanOrEqual(parseInt(initialProgress || '0'));
  });

  test('should reject sites larger than 2GB (A25)', async ({ page }) => {
    // This test requires a mock large site
    await page.getByText('Large Test Site').click();
    await page.getByRole('button', { name: /pull from live/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();

    // Should show size error
    await expect(page.getByText(/site exceeds 2GB limit/i)).toBeVisible({
      timeout: 2 * 60 * 1000
    });
  });

  test('should handle timeout after 30 minutes (A26)', async ({ page }) => {
    // This test requires a mock slow site
    await page.getByText('Slow Test Site').click();
    await page.getByRole('button', { name: /pull from live/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();

    // Should show timeout error
    await expect(page.getByText(/operation timed out/i)).toBeVisible({
      timeout: 31 * 60 * 1000 // Just over 30 minutes
    });
  }, { timeout: 32 * 60 * 1000 }); // Set test timeout to 32 minutes

  test('should prevent concurrent pulls on same site', async ({ page }) => {
    await page.getByText('Test WordPress Site').click();

    // Start first pull
    await page.getByRole('button', { name: /pull from live/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();

    await expect(page.getByRole('progressbar')).toBeVisible();

    // Pull button should be disabled
    await expect(page.getByRole('button', { name: /pulling/i })).toBeDisabled();
  });
});
