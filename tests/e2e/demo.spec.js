// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Demo Test - Shows Playwright in action
 * This test demonstrates Playwright features without needing the app running
 */

test.describe('Playwright Demo', () => {
  test('should navigate to example.com and verify title', async ({ page }) => {
    // Navigate to a public website
    await page.goto('https://example.com');

    // Verify the title
    await expect(page).toHaveTitle(/Example Domain/);

    // Verify heading is visible
    await expect(page.getByRole('heading', { name: 'Example Domain' })).toBeVisible();

    // Verify the page contains specific text
    await expect(page.getByText('This domain is for use in illustrative examples')).toBeVisible();
  });

  test('should interact with GitHub homepage', async ({ page }) => {
    await page.goto('https://github.com');

    // Should see GitHub logo
    await expect(page.getByRole('link', { name: /github/i }).first()).toBeVisible();

    // Should have a search input
    const searchButton = page.getByRole('button', { name: /search/i }).first();
    await expect(searchButton).toBeVisible();
  });

  test('should demonstrate screenshot capability', async ({ page }) => {
    await page.goto('https://example.com');

    // Take a screenshot
    await page.screenshot({ path: 'test-results/example-screenshot.png' });

    // Verify content
    await expect(page.locator('h1')).toContainText('Example Domain');
  });
});
