// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Authentication E2E Tests
 * Tests: Task 5, Task 8 (A15, A16)
 */

test.describe('User Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show login page for unauthenticated users', async ({ page }) => {
    await expect(page).toHaveTitle(/GreenShoe/);
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
  });

  test('should login with valid credentials (A15)', async ({ page }) => {
    // Fill login form
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('password123');

    // Submit
    await page.getByRole('button', { name: /login/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/sites/i)).toBeVisible();
  });

  test('should show error for invalid credentials (A15)', async ({ page }) => {
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');

    await page.getByRole('button', { name: /login/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /login/i }).click();

    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Logout
    await page.getByRole('button', { name: /logout/i }).click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing protected route (A16)', async ({ page }) => {
    // Try to access dashboard directly without login
    await page.goto('/dashboard');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });
});
