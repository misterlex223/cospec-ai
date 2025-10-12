import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  // Start the app
  await page.goto('/');

  // Expect a title "Vditor Markdown Editor" or similar
  await expect(page).toHaveTitle(/Vditor|CoSpec|Markdown/);
});

test('show welcome message', async ({ page }) => {
  await page.goto('/');

  // Check for welcome text
  await expect(page.locator('text=Welcome to Vditor Markdown Editor')).toBeVisible();
});

test('show sidebar with CoSpec AI', async ({ page }) => {
  await page.goto('/');

  // Check for CoSpec AI in the sidebar
  await expect(page.locator('text=CoSpec AI')).toBeVisible();
});

test('show AI assistant button', async ({ page }) => {
  await page.goto('/');

  // Check that the AI assistant button is present
  await expect(page.locator('.ai-assistant-toggle')).toBeVisible();
});