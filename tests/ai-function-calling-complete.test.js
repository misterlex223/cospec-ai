// Complete test for AI Function Calling implementation
// This tests the complete flow from function registry to response

const { functionRegistry } = require('../server/functions');

describe('Complete AI Function Calling Flow', () => {
  // Create a test markdown file for testing
  const testFilePath = 'test-function-calling.md';
  const testContent = `# Test Document

This is a test document for function calling.

## Requirements
- REQ-001: Test requirement 1 - Description of requirement 1
- REQ-002: Test requirement 2 - Description of requirement 2

## System Design
### Component: TestComponent
- Type: service
- Description: This is a test component

### Component: AnotherComponent
- Type: database
- Description: This is another test component
`;

  beforeAll(async () => {
    // Create a test file for our tests
    await functionRegistry.create_file.implementation({
      filePath: testFilePath,
      content: testContent
    });
  });

  afterAll(async () => {
    // Clean up the test file
    try {
      await functionRegistry.delete_file.implementation({ filePath: testFilePath });
    } catch (e) {
      // File might not exist, that's fine
    }
  });

  test('list_files function works correctly', async () => {
    const result = await functionRegistry.list_files.implementation({});
    expect(result.success).toBe(true);
    expect(Array.isArray(result.files)).toBe(true);
    expect(typeof result.count).toBe('number');
    expect(result.files.length).toBeGreaterThanOrEqual(1); // At least our test file
  });

  test('read_file function works correctly', async () => {
    const result = await functionRegistry.read_file.implementation({ filePath: testFilePath });
    expect(result.success).toBe(true);
    expect(result.filePath).toBe(testFilePath);
    expect(result.content).toContain('# Test Document');
  });

  test('write_file function works correctly', async () => {
    const newContent = '# Updated Test Document\n\nUpdated content for testing.';
    const result = await functionRegistry.write_file.implementation({
      filePath: testFilePath,
      content: newContent
    });
    expect(result.success).toBe(true);

    // Verify the content was updated
    const readResult = await functionRegistry.read_file.implementation({ filePath: testFilePath });
    expect(readResult.content).toBe(newContent);
  });

  test('search_content function works correctly', async () => {
    const result = await functionRegistry.search_content.implementation({ query: 'Test Document' });
    expect(result.success).toBe(true);
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(1); // Should find our test file
  });

  test('get_requirements function works correctly', async () => {
    // First, reset the content to include requirements
    await functionRegistry.write_file.implementation({
      filePath: testFilePath,
      content: testContent
    });

    const result = await functionRegistry.get_requirements.implementation({ filePath: testFilePath });
    expect(result.success).toBe(true);
    expect(Array.isArray(result.requirements)).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(2); // Should find at least 2 requirements

    // Check if requirements were extracted correctly
    const requirementIds = result.requirements.map(req => req.id);
    expect(requirementIds).toContain('REQ-001');
    expect(requirementIds).toContain('REQ-002');
  });

  test('get_system_design function works correctly', async () => {
    // Reset content to include system design
    await functionRegistry.write_file.implementation({
      filePath: testFilePath,
      content: testContent
    });

    const result = await functionRegistry.get_system_design.implementation({ filePath: testFilePath });
    expect(result.success).toBe(true);
    expect(Array.isArray(result.components)).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(2); // Should find at least 2 components

    // Check if components were extracted correctly
    const componentNames = result.components.map(comp => comp.name);
    expect(componentNames).toContain('TestComponent');
    expect(componentNames).toContain('AnotherComponent');
  });

  test('create_file and delete_file functions work correctly', async () => {
    const newFilePath = 'temp-test-file.md';

    // Test create
    const createResult = await functionRegistry.create_file.implementation({
      filePath: newFilePath,
      content: '# Temporary Test File\n\nThis is a temporary file for testing.'
    });
    expect(createResult.success).toBe(true);

    // Verify file exists
    const readResult = await functionRegistry.read_file.implementation({ filePath: newFilePath });
    expect(readResult.success).toBe(true);

    // Test delete
    const deleteResult = await functionRegistry.delete_file.implementation({ filePath: newFilePath });
    expect(deleteResult.success).toBe(true);

    // Verify file is deleted
    const readAfterDeleteResult = await functionRegistry.read_file.implementation({ filePath: newFilePath });
    expect(readAfterDeleteResult.success).toBe(false);
  });

  test('function parameter validation works correctly', async () => {
    // Test missing required parameters
    const result = await functionRegistry.read_file.implementation({});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required parameter: filePath');

    // Test path traversal protection
    const traversalResult = await functionRegistry.read_file.implementation({
      filePath: '../../../etc/passwd'
    });
    expect(traversalResult.success).toBe(false);
    expect(traversalResult.error).toContain('directory traversal detected');

    // Test content size validation
    const largeContent = 'a'.repeat(11 * 1024 * 1024); // 11MB
    const sizeResult = await functionRegistry.write_file.implementation({
      filePath: 'large-file.md',
      content: largeContent
    });
    expect(sizeResult.success).toBe(false);
    expect(sizeResult.error).toContain('Content too large');
  });

  test('function schema validation works correctly', () => {
    const { validateParameters } = require('../server/functions');

    const testSchema = {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          minLength: 1,
          maxLength: 500
        },
        content: {
          type: 'string',
          maxLength: 10000000 // 10MB
        }
      },
      required: ['filePath']
    };

    // Valid parameters
    const validParams = { filePath: 'test.md', content: 'test content' };
    expect(validateParameters(validParams, testSchema)).toHaveLength(0);

    // Missing required parameter
    const invalidParams = { content: 'test content' };
    const errors = validateParameters(invalidParams, testSchema);
    expect(errors).toContain('Missing required parameter: filePath');
  });
});

console.log('Complete AI Function Calling tests defined successfully');