import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Crack Your Exam')).toBeVisible();
  });

  test('should show exam options', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('UPSC')).toBeVisible();
    await expect(page.getByText('JEE')).toBeVisible();
  });

  test('should navigate to login', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Log in');
    await expect(page).toHaveURL('/login');
  });

  test('should navigate to register', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Start Free');
    await expect(page).toHaveURL('/register');
  });
});
