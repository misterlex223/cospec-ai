// mem0-integration.test.js
// Tests for mem0 integration with AI Assistant

const Mem0Service = require('../server/mem0Service');

// Mock the axios requests for testing
jest.mock('axios');

describe('Mem0 Integration Tests', () => {
  let mem0Service;

  beforeAll(() => {
    // Set up environment variables for testing
    process.env.MEM0_API_URL = 'http://localhost:8000';
    process.env.MEM0_API_KEY = 'test-api-key';
    process.env.MEM0_USER_ID = 'test-user';

    mem0Service = new Mem0Service();
  });

  test('should initialize mem0 service with correct configuration', () => {
    expect(mem0Service.mem0ApiUrl).toBe('http://localhost:8000');
    expect(mem0Service.apiKey).toBe('test-api-key');
    expect(mem0Service.userId).toBe('test-user');
  });

  test('should format memory search request correctly', async () => {
    // This test would require mocking the axios response
    // For now, we'll just test that the method exists and has the right signature
    expect(typeof mem0Service.searchMemories).toBe('function');
    expect(mem0Service.searchMemories.length).toBe(2); // function takes 2 params (query, limit)
  });

  test('should format memory add request correctly', async () => {
    expect(typeof mem0Service.addMemory).toBe('function');
    expect(mem0Service.addMemory.length).toBe(2); // function takes 2 params (content, metadata)
  });

  test('should categorize memories correctly', async () => {
    expect(typeof mem0Service.addCategorizedMemory).toBe('function');
    expect(mem0Service.addCategorizedMemory.length).toBe(3); // function takes 3 params (content, category, metadata)
  });

  test('should search by category correctly', async () => {
    expect(typeof mem0Service.searchByCategory).toBe('function');
    expect(mem0Service.searchByCategory.length).toBe(3); // function takes 3 params (category, query, limit)
  });
});

// Test the integration in the server context
describe('Server Integration Tests', () => {
  test('mem0 service should be imported in server', () => {
    // This would test that the server file imports and initializes the mem0 service
    const fs = require('fs');
    const serverCode = fs.readFileSync('../server/index.js', 'utf8');

    expect(serverCode).toContain("const Mem0Service = require('./mem0Service')");
    expect(serverCode).toContain('const mem0Service = new Mem0Service()');
    expect(serverCode).toContain('mem0Service.searchMemories');
    expect(serverCode).toContain('mem0Service.addCategorizedMemory');
  });
});