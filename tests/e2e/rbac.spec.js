// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Role-Based Access Control E2E Tests
 * Tests: Task 6 (A11, A15, A16)
 */

test.describe('RBAC - Developer Role', () => {
  test.beforeEach(async ({ page }) => {
    // Login as developer
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('developer@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should see sites list', async ({ page }) => {
    await expect(page.getByText(/sites/i)).toBeVisible();
  });

  test('should be able to pull sites', async ({ page }) => {
    await page.getByText('Test WordPress Site').click();
    await expect(page.getByRole('button', { name: /pull from live/i })).toBeVisible();
  });

  test('should NOT see push button (A11)', async ({ page }) => {
    await page.getByText('Test WordPress Site').click();
    await expect(page.getByRole('button', { name: /push to live/i })).not.toBeVisible();
  });

  test('should NOT see delete site button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /delete/i })).not.toBeVisible();
  });

  test('should NOT see archives section', async ({ page }) => {
    await page.getByText('Test WordPress Site').click();
    await expect(page.getByText(/archives/i)).not.toBeVisible();
  });

  test('should NOT access user management (A16)', async ({ page }) => {
    // Try to navigate directly
    await page.goto('/users');

    // Should show 403 or redirect
    await expect(page.getByText(/access denied|forbidden/i)).toBeVisible();
  });
});

test.describe('RBAC - Project Manager Role', () => {
  test.beforeEach(async ({ page }) => {
    // Login as project manager
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('pm@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should see pull button', async ({ page }) => {
    await page.getByText('Test WordPress Site').click();
    await expect(page.getByRole('button', { name: /pull from live/i })).toBeVisible();
  });

  test('should see push button (A11)', async ({ page }) => {
    await page.getByText('Test WordPress Site').click();
    await expect(page.getByRole('button', { name: /push to live/i })).toBeVisible();
  });

  test('should see archives section', async ({ page }) => {
    await page.getByText('Test WordPress Site').click();
    await expect(page.getByText(/archives/i)).toBeVisible();
  });

  test('should NOT see delete site button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /delete/i })).not.toBeVisible();
  });

  test('should NOT access user management (A16)', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByText(/access denied|forbidden/i)).toBeVisible();
  });
});

test.describe('RBAC - Admin Role', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should have full access - pull, push, archives, delete (A15)', async ({ page }) => {
    await page.getByText('Test WordPress Site').click();

    await expect(page.getByRole('button', { name: /pull from live/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /push to live/i })).toBeVisible();
    await expect(page.getByText(/archives/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /delete/i })).toBeVisible();
  });

  test('should access user management (A15)', async ({ page }) => {
    await page.goto('/users');

    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add user/i })).toBeVisible();
  });

  test('should be able to create users', async ({ page }) => {
    await page.goto('/users');

    await page.getByRole('button', { name: /add user/i }).click();
    await page.getByLabel(/email/i).fill('newuser@example.com');
    await page.getByLabel(/password/i).fill('newpass123');
    await page.getByLabel(/role/i).selectOption('Developer');
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText('newuser@example.com')).toBeVisible();
  });
});
