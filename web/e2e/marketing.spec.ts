import { test, expect } from '@playwright/test';

test.describe('Marketing Pages', () => {
  test('about page renders', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByText(/our mission/i)).toBeVisible();
  });

  test('pricing page renders with plans', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText('Free')).toBeVisible();
    await expect(page.getByText('Pro')).toBeVisible();
    await expect(page.getByText('Premium')).toBeVisible();
  });

  test('exam detail page renders for UPSC', async ({ page }) => {
    await page.goto('/exams/upsc');
    await expect(page.getByText('UPSC')).toBeVisible();
  });
});
