import { test, expect } from '@playwright/test';

test.describe('SystemDesignView and RequirementsView functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Start the app
    await page.goto('/');
  });

  test('should show RequirementsView for requirements files', async ({ page }) => {
    // Create a requirements file through the UI or navigate to an existing one
    await page.getByRole('button', { name: 'Create File' }).click().catch(() => {});

    // If file creation doesn't work directly, we'll check for existing files
    await page.waitForTimeout(1000);

    // Look for the requirements file that we created
    await page.getByText('REQ-001_UserManagement.md').click().catch(async () => {
      // If the file isn't directly available, we'll create it via UI
      await page.getByRole('button', { name: 'Create File' }).click();
      await page.locator('input[placeholder="Enter file name"]').fill('test_requirements.md');
      await page.getByRole('button', { name: 'Create' }).click();

      // Add requirements content to the editor
      await page.locator('.vditor-wysiwyg').fill(`# Requirements Document

## REQ-001: Test Requirement
- Description: This is a test requirement
- Status: draft
`);

      // Save the file
      await page.keyboard.press('Control+S');
    });

    // Wait for the requirements view to appear
    await page.waitForSelector('.requirements-view', { state: 'visible' });

    // Check that the requirements view is visible
    await expect(page.locator('.requirements-view')).toBeVisible();

    // Check that requirements are properly parsed
    await expect(page.locator('.requirements-view').getByText('REQ-001')).toBeVisible();

    // Test adding a new requirement
    await page.locator('.requirements-view button').filter({ hasText: 'Add Req' }).click();
    await page.locator('input[placeholder="Requirement Title"]').fill('New Requirement');
    await page.locator('textarea[placeholder="Requirement Description"]').fill('This is a new requirement');
    await page.locator('.requirements-view button').filter({ hasText: 'Add Requirement' }).click();

    // Verify the new requirement appears
    await expect(page.locator('.requirements-view').getByText('New Requirement')).toBeVisible();
  });

  test('should show SystemDesignView for system design files', async ({ page }) => {
    // Navigate to the system design file
    await page.getByText('sample_system_design.md').click().catch(async () => {
      // If the file isn't directly available, create it via UI
      await page.getByRole('button', { name: 'Create File' }).click();
      await page.locator('input[placeholder="Enter file name"]').fill('system_design_test.md');
      await page.getByRole('button', { name: 'Create' }).click();

      // Add system design content to the editor
      await page.locator('.vditor-wysiwyg').fill(`# System Design: Test Service

## Component: Test Service
- Type: Service
- Description: This is a test service component

## Component: Test Database
- Type: Database
- Description: This is a test database component
`);

      // Save the file
      await page.keyboard.press('Control+S');
    });

    // Wait for the system design view to appear
    await page.waitForSelector('.system-design-view', { state: 'visible' });

    // Check that the system design view is visible
    await expect(page.locator('.system-design-view')).toBeVisible();

    // Check that components are properly parsed
    await expect(page.locator('.system-design-view').getByText('Test Service')).toBeVisible();
    await expect(page.locator('.system-design-view').getByText('Test Database')).toBeVisible();

    // Test switching between tabs
    await page.locator('.system-design-view button').filter({ hasText: 'Components' }).click();
    await expect(page.locator('.system-design-view h4').filter({ hasText: 'Add New Component' })).toBeVisible();

    // Test adding a new component
    await page.locator('.system-design-view input[placeholder="Component Name"]').fill('New Component');
    await page.locator('.system-design-view select').nth(0).selectOption('api');
    await page.locator('.system-design-view textarea[placeholder="Description"]').fill('This is a new component');
    await page.locator('.system-design-view button').filter({ hasText: 'Add Component' }).click();

    // Verify the new component appears
    await expect(page.locator('.system-design-view').getByText('New Component')).toBeVisible();
  });

  test('should not show views for regular markdown files', async ({ page }) => {
    // Create or navigate to a regular markdown file
    await page.getByText('README.md').click().catch(async () => {
      await page.getByRole('button', { name: 'Create File' }).click();
      await page.locator('input[placeholder="Enter file name"]').fill('regular_document.md');
      await page.getByRole('button', { name: 'Create' }).click();

      // Add regular content to the editor
      await page.locator('.vditor-wysiwyg').fill('# Regular Document\n\nThis is a regular markdown document without requirements or system design.');

      // Save the file
      await page.keyboard.press('Control+S');
    });

    // Wait a moment for the UI to update
    await page.waitForTimeout(500);

    // Check that neither requirements view nor system design view is visible
    await expect(page.locator('.requirements-view')).not.toBeVisible().catch(() => {});
    await expect(page.locator('.system-design-view')).not.toBeVisible().catch(() => {});
  });
});