// tests/ai-function-calling.test.js
// Tests for AI Function Calling functionality

const { functionRegistry } = require('../server/functions');
const fs = require('fs').promises;
const path = require('path');

// Mock MARKDOWN_DIR for testing
const TEST_MARKDOWN_DIR = '/tmp/test-markdown';
process.env.MARKDOWN_DIR = TEST_MARKDOWN_DIR;

// Create test directory
beforeAll(async () => {
  await fs.mkdir(TEST_MARKDOWN_DIR, { recursive: true });
});

// Clean up test files after tests
afterAll(async () => {
  // In a real scenario, you would clean up test files here
});

describe('AI Function Calling - Function Registry', () => {
  test('should have all expected functions in the registry', () => {
    const expectedFunctions = [
      'list_files',
      'read_file',
      'write_file',
      'create_file',
      'delete_file',
      'search_content',
      'get_requirements',
      'get_system_design'
    ];

    for (const funcName of expectedFunctions) {
      expect(functionRegistry[funcName]).toBeDefined();
      expect(functionRegistry[funcName].name).toBe(funcName);
      expect(functionRegistry[funcName].description).toBeDefined();
      expect(functionRegistry[funcName].parameters).toBeDefined();
      expect(typeof functionRegistry[funcName].implementation).toBe('function');
    }
  });

  test('should have proper parameter schemas', () => {
    for (const [name, func] of Object.entries(functionRegistry)) {
      expect(func.parameters).toMatchObject({
        type: 'object',
        properties: expect.any(Object)
      });
    }
  });
});

describe('list_files function', () => {
  test('should return an empty array when no files exist', async () => {
    const result = await functionRegistry.list_files.implementation({});
    expect(result.success).toBe(true);
    expect(Array.isArray(result.files)).toBe(true);
    expect(result.count).toBe(0);
  });

  test('should handle validation errors', async () => {
    // Pass invalid parameters to trigger validation
    const result = await functionRegistry.list_files.implementation({ invalidParam: 'test' });
    expect(result.success).toBe(true); // list_files doesn't require parameters, so this should succeed
  });
});

describe('read_file function', () => {
  test('should validate required parameters', async () => {
    const result = await functionRegistry.read_file.implementation({});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required parameter: filePath');
  });

  test('should validate file path', async () => {
    const result = await functionRegistry.read_file.implementation({
      filePath: '../../../etc/passwd' // Attempted path traversal
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('directory traversal detected');
  });
});

describe('write_file function', () => {
  test('should validate required parameters', async () => {
    const result = await functionRegistry.write_file.implementation({ filePath: 'test.md' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required parameter: content');
  });

  test('should validate file path', async () => {
    const result = await functionRegistry.write_file.implementation({
      filePath: '../../../etc/passwd',
      content: 'test content'
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('directory traversal detected');
  });

  test('should validate content size', async () => {
    const largeContent = 'a'.repeat(11 * 1024 * 1024); // 11MB content
    const result = await functionRegistry.write_file.implementation({
      filePath: 'large-file.md',
      content: largeContent
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Content too large');
  });
});

describe('create_file function', () => {
  test('should validate required parameters', async () => {
    const result = await functionRegistry.create_file.implementation({});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required parameter: filePath');
  });

  test('should validate file path', async () => {
    const result = await functionRegistry.create_file.implementation({
      filePath: '../../../etc/passwd',
      content: 'test content'
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('directory traversal detected');
  });
});

describe('delete_file function', () => {
  test('should validate required parameters', async () => {
    const result = await functionRegistry.delete_file.implementation({});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required parameter: filePath');
  });

  test('should validate file path', async () => {
    const result = await functionRegistry.delete_file.implementation({
      filePath: '../../../etc/passwd'
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('directory traversal detected');
  });
});

describe('search_content function', () => {
  test('should validate required parameters', async () => {
    const result = await functionRegistry.search_content.implementation({});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required parameter: query');
  });

  test('should validate query length', async () => {
    const longQuery = 'a'.repeat(1001); // More than max length of 1000
    const result = await functionRegistry.search_content.implementation({ query: longQuery });
    expect(result.success).toBe(false);
    expect(result.error).toContain('must be no more than 1000 characters long');
  });
});

describe('get_requirements function', () => {
  test('should validate required parameters', async () => {
    const result = await functionRegistry.get_requirements.implementation({});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required parameter: filePath');
  });
});

describe('get_system_design function', () => {
  test('should validate required parameters', async () => {
    const result = await functionRegistry.get_system_design.implementation({});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required parameter: filePath');
  });
});

console.log('AI Function Calling tests defined successfully');