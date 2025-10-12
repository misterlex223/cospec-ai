import { test, expect } from '@playwright/test';

test('RequirementsView component displays correctly', async ({ page }) => {
  // Start the app
  await page.goto('/');

  // Create a requirements file to test the component
  await page.locator('button[aria-label="Create new file"]').click();
  await page.locator('input[placeholder="New file name"]').fill('test_requirements.md');
  await page.locator('button:has-text("Create")').click();

  // Add some requirements content to trigger the RequirementsView
  const editor = page.locator('.vditor-reset');
  await editor.click();
  await page.keyboard.type('# Requirements\n\n### REQ-001: Test Requirement\n\nThis is a test requirement description.\n\nstatus: draft\n\n### REQ-002: Another Requirement\n\nAnother requirement description.\n\nstatus: approved');

  // Wait for the requirements view to appear
  await expect(page.locator('text=Requirements Tracker')).toBeVisible();
  await expect(page.locator('text=REQ-001: Test Requirement')).toBeVisible();
  await expect(page.locator('text=REQ-002: Another Requirement')).toBeVisible();
});

test('SystemDesignView component displays correctly', async ({ page }) => {
  // Start the app
  await page.goto('/');

  // Create a system design file to test the component
  await page.locator('button[aria-label="Create new file"]').click();
  await page.locator('input[placeholder="New file name"]').fill('system_design.md');
  await page.locator('button:has-text("Create")').click();

  // Add some system design content to trigger the SystemDesignView
  const editor = page.locator('.vditor-reset');
  await editor.click();
  await page.keyboard.type('# System Design\n\n### Component: User Service\n- Type: service\n- Description: Handles user authentication and management\n\n### Component: Database\n- Type: database\n- Description: Stores user data and application state');

  // Wait for the system design view to appear
  await expect(page.locator('text=System Design Tools')).toBeVisible();
  await expect(page.locator('text=User Service')).toBeVisible();
  await expect(page.locator('text=Database')).toBeVisible();
});

test('RequirementsView allows adding new requirements', async ({ page }) => {
  await page.goto('/');

  // Create a requirements file
  await page.locator('button[aria-label="Create new file"]').click();
  await page.locator('input[placeholder="New file name"]').fill('add_req_test.md');
  await page.locator('button:has-text("Create")').click();

  // Add initial requirements content
  const editor = page.locator('.vditor-reset');
  await editor.click();
  await page.keyboard.type('# Requirements\n\n### REQ-001: Initial Requirement\n\nInitial requirement description.\n\nstatus: draft');

  // Wait for the requirements view to appear
  await expect(page.locator('text=Requirements Tracker')).toBeVisible();

  // Click the "Add Req" button to show the form
  await page.locator('button:has-text("Add Req")').click();

  // Fill in the new requirement form
  await page.locator('input[placeholder="Requirement Title"]').fill('New Test Requirement');
  await page.locator('textarea[placeholder="Requirement Description"]').fill('This is a new test requirement');
  await page.locator('button:has-text("Add Requirement")').click();

  // Verify the new requirement appears
  await expect(page.locator('text=New Test Requirement')).toBeVisible();
});

test('SystemDesignView allows adding new components', async ({ page }) => {
  await page.goto('/');

  // Create a system design file
  await page.locator('button[aria-label="Create new file"]').click();
  await page.locator('input[placeholder="New file name"]').fill('add_component_test.md');
  await page.locator('button:has-text("Create")').click();

  // Add initial system design content
  const editor = page.locator('.vditor-reset');
  await editor.click();
  await page.keyboard.type('# System Design\n\n### Component: Initial Service\n- Type: service\n- Description: Initial service component');

  // Wait for the system design view to appear
  await expect(page.locator('text=System Design Tools')).toBeVisible();

  // Switch to the components tab
  await page.locator('button:has-text("Components")').click();

  // Fill in the new component form
  await page.locator('input[placeholder="Component Name"]').fill('New Component');
  await page.locator('textarea[placeholder="Description"]').fill('New component description');
  await page.locator('button:has-text("Add Component")').click();

  // Verify the new component appears
  await expect(page.locator('text=New Component')).toBeVisible();
});

test('RequirementsView status updates work correctly', async ({ page }) => {
  await page.goto('/');

  // Create a requirements file
  await page.locator('button[aria-label="Create new file"]').click();
  await page.locator('input[placeholder="New file name"]').fill('status_test.md');
  await page.locator('button:has-text("Create")').click();

  // Add requirements with different statuses
  const editor = page.locator('.vditor-reset');
  await editor.click();
  await page.keyboard.type('# Requirements\n\n### REQ-001: Status Test Requirement\n\nThis is a test requirement for status changes.\n\nstatus: draft');

  // Wait for the requirements view to appear
  await expect(page.locator('text=Requirements Tracker')).toBeVisible();

  // Change the status of the requirement
  const statusSelect = page.locator('select');
  await statusSelect.selectOption('approved');

  // Verify the status has been updated in the UI
  await expect(page.locator('select').nth(0)).toHaveValue('approved');
});

test('SystemDesignView diagram tab displays components properly', async ({ page }) => {
  await page.goto('/');

  // Create a system design file
  await page.locator('button[aria-label="Create new file"]').click();
  await page.locator('input[placeholder="New file name"]').fill('diagram_test.md');
  await page.locator('button:has-text("Create")').click();

  // Add system design content
  const editor = page.locator('.vditor-reset');
  await editor.click();
  await page.keyboard.type('# System Design\n\n### Component: API Gateway\n- Type: api\n- Description: Handles incoming requests\n\n### Component: Authentication Service\n- Type: service\n- Description: Handles user authentication');

  // Wait for the system design view to appear
  await expect(page.locator('text=System Design Tools')).toBeVisible();

  // Verify components are displayed in the diagram tab (default)
  await expect(page.locator('text=API Gateway')).toBeVisible();
  await expect(page.locator('text=Authentication Service')).toBeVisible();

  // Switch to components tab and back to verify persistence
  await page.locator('button:has-text("Components")').click();
  await expect(page.locator('text=Existing Components')).toBeVisible();

  await page.locator('button:has-text("Diagram")').click();
  await expect(page.locator('text=API Gateway')).toBeVisible();
});