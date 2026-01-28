// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Site Management E2E Tests
 * Tests: Task 9, Task 12 (A1, A2)
 */

test.describe('Site Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display sites list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sites/i })).toBeVisible();

    // Should have add site button (Admin only)
    await expect(page.getByRole('button', { name: /add site/i })).toBeVisible();
  });

  test('should add a new WordPress site (A1)', async ({ page }) => {
    // Click add site button
    await page.getByRole('button', { name: /add site/i }).click();

    // Fill form
    await page.getByLabel(/site name/i).fill('Test WordPress Site');
    await page.getByLabel(/live url/i).fill('https://test-wp.example.com');

    // Select connection type
    await page.getByLabel(/connection type/i).selectOption('sftp');

    // Fill SFTP credentials
    await page.getByLabel(/host/i).fill('test-wp.example.com');
    await page.getByLabel(/username/i).fill('wpuser');
    await page.getByLabel(/password/i).fill('wppass123');
    await page.getByLabel(/path/i).fill('/var/www/html');

    // Fill database credentials
    await page.getByLabel(/database host/i).fill('localhost');
    await page.getByLabel(/database name/i).fill('wordpress');
    await page.getByLabel(/database user/i).fill('wpdbuser');
    await page.getByLabel(/database password/i).fill('wpdbpass123');

    // Submit
    await page.getByRole('button', { name: /save/i }).click();

    // Should show success message
    await expect(page.getByText(/site added successfully/i)).toBeVisible();

    // Should appear in sites list
    await expect(page.getByText('Test WordPress Site')).toBeVisible();
    await expect(page.getByText(/never pulled/i)).toBeVisible();
  });

  test('should show error when adding WordPress site without DB credentials (A2)', async ({ page }) => {
    await page.getByRole('button', { name: /add site/i }).click();

    await page.getByLabel(/site name/i).fill('Invalid WordPress Site');
    await page.getByLabel(/live url/i).fill('https://test-wp.example.com');
    await page.getByLabel(/connection type/i).selectOption('sftp');
    await page.getByLabel(/host/i).fill('test-wp.example.com');
    await page.getByLabel(/username/i).fill('wpuser');
    await page.getByLabel(/password/i).fill('wppass123');

    // Don't fill database credentials

    await page.getByRole('button', { name: /save/i }).click();

    // Should show error
    await expect(page.getByText(/database credentials required for wordpress/i)).toBeVisible();
  });

  test('should add a static HTML site', async ({ page }) => {
    await page.getByRole('button', { name: /add site/i }).click();

    await page.getByLabel(/site name/i).fill('Test Static Site');
    await page.getByLabel(/live url/i).fill('https://static.example.com');
    await page.getByLabel(/connection type/i).selectOption('sftp');
    await page.getByLabel(/host/i).fill('static.example.com');
    await page.getByLabel(/username/i).fill('staticuser');
    await page.getByLabel(/password/i).fill('staticpass123');
    await page.getByLabel(/path/i).fill('/var/www/html');

    // No database credentials needed

    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText(/site added successfully/i)).toBeVisible();
    await expect(page.getByText('Test Static Site')).toBeVisible();
  });

  test('should delete a site (Admin only)', async ({ page }) => {
    // Assume site exists from previous tests
    // Find delete button for a site
    const deleteButton = page.getByRole('button', { name: /delete.*test/i }).first();
    await deleteButton.click();

    // Confirm deletion
    await page.getByRole('button', { name: /confirm/i }).click();

    // Should show success message
    await expect(page.getByText(/site deleted successfully/i)).toBeVisible();
  });

  test('should show staging URL for each site', async ({ page }) => {
    // Assuming a site exists
    const stagingLink = page.getByRole('link', { name: /staging\.yourdomain\.com/i }).first();
    await expect(stagingLink).toBeVisible();
    await expect(stagingLink).toHaveAttribute('href', /https:\/\/staging\.yourdomain\.com/);
  });
});
