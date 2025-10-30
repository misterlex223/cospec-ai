// functions.js - Registry of available functions for AI function calling

const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

const MARKDOWN_DIR = process.env.MARKDOWN_DIR || path.join(__dirname, '..', 'markdown');

// Function registry with JSON Schema definitions
const functionRegistry = {
  list_files: {
    name: 'list_files',
    description: 'List all markdown files in the system',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    implementation: async (params) => {
      try {
        // Validate parameters
        const validationErrors = validateParameters(params, this.parameters);
        if (validationErrors.length > 0) {
          return {
            success: false,
            error: `Validation errors: ${validationErrors.join(', ')}`
          };
        }

        const files = await glob(`${MARKDOWN_DIR}/**/*.md`, {
          ignore: [`${MARKDOWN_DIR}/**/node_modules/**`]
        });

        const relativePaths = files.map(file => path.relative(MARKDOWN_DIR, file));

        return {
          success: true,
          files: relativePaths,
          count: relativePaths.length
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },

  read_file: {
    name: 'read_file',
    description: 'Read the content of a specific markdown file',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'The path of the file to read (relative to markdown directory)',
          minLength: 1,
          maxLength: 500
        }
      },
      required: ['filePath']
    },
    implementation: async (params) => {
      try {
        // Validate parameters
        const validationErrors = validateParameters(params, this.parameters);
        if (validationErrors.length > 0) {
          return {
            success: false,
            error: `Validation errors: ${validationErrors.join(', ')}`
          };
        }

        // Validate and sanitize path
        const sanitizedPath = validateAndSanitizePath(params.filePath);

        if (!sanitizedPath.toLowerCase().endsWith('.md')) {
          return {
            success: false,
            error: 'Only markdown files are allowed'
          };
        }

        const filePath = path.join(MARKDOWN_DIR, sanitizedPath);

        // Ensure path is within MARKDOWN_DIR
        const resolvedPath = path.resolve(filePath);
        const resolvedMarkdownDir = path.resolve(MARKDOWN_DIR);
        if (!resolvedPath.startsWith(resolvedMarkdownDir)) {
          return {
            success: false,
            error: 'Invalid file path: outside allowed directory'
          };
        }

        const content = await fs.readFile(filePath, 'utf-8');

        return {
          success: true,
          filePath: sanitizedPath,
          content: content
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },

  write_file: {
    name: 'write_file',
    description: 'Write content to a specific markdown file',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'The path of the file to write to (relative to markdown directory)',
          minLength: 1,
          maxLength: 500
        },
        content: {
          type: 'string',
          description: 'The content to write to the file',
          maxLength: 10000000 // 10MB limit
        }
      },
      required: ['filePath', 'content']
    },
    implementation: async (params) => {
      try {
        // Validate parameters
        const validationErrors = validateParameters(params, this.parameters);
        if (validationErrors.length > 0) {
          return {
            success: false,
            error: `Validation errors: ${validationErrors.join(', ')}`
          };
        }

        // Validate and sanitize path
        const sanitizedPath = validateAndSanitizePath(params.filePath);

        if (!sanitizedPath.toLowerCase().endsWith('.md')) {
          return {
            success: false,
            error: 'Only markdown files are allowed'
          };
        }

        // Check content size (10MB limit)
        if (Buffer.byteLength(params.content, 'utf8') > 10 * 1024 * 1024) {
          return {
            success: false,
            error: 'Content too large (max 10MB)'
          };
        }

        const filePath = path.join(MARKDOWN_DIR, sanitizedPath);

        // Ensure path is within MARKDOWN_DIR
        const resolvedPath = path.resolve(filePath);
        const resolvedMarkdownDir = path.resolve(MARKDOWN_DIR);
        if (!resolvedPath.startsWith(resolvedMarkdownDir)) {
          return {
            success: false,
            error: 'Invalid file path: outside allowed directory'
          };
        }

        // Ensure directory exists
        const dirPath = path.dirname(filePath);
        await fs.mkdir(dirPath, { recursive: true });

        await fs.writeFile(filePath, params.content, 'utf-8');

        return {
          success: true,
          filePath: sanitizedPath,
          message: 'File written successfully'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },

  create_file: {
    name: 'create_file',
    description: 'Create a new markdown file with the specified content',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'The path of the file to create (relative to markdown directory)',
          minLength: 1,
          maxLength: 500
        },
        content: {
          type: 'string',
          description: 'The content to write to the new file (optional, defaults to empty string)',
          maxLength: 10000000 // 10MB limit
        }
      },
      required: ['filePath']
    },
    implementation: async (params) => {
      try {
        // Validate parameters
        const validationErrors = validateParameters(params, this.parameters);
        if (validationErrors.length > 0) {
          return {
            success: false,
            error: `Validation errors: ${validationErrors.join(', ')}`
          };
        }

        // Validate and sanitize path
        const sanitizedPath = validateAndSanitizePath(params.filePath);

        if (!sanitizedPath.toLowerCase().endsWith('.md')) {
          return {
            success: false,
            error: 'Only markdown files are allowed'
          };
        }

        const filePath = path.join(MARKDOWN_DIR, sanitizedPath);
        const content = params.content || '';

        // Check content size (10MB limit)
        if (Buffer.byteLength(content, 'utf8') > 10 * 1024 * 1024) {
          return {
            success: false,
            error: 'Content too large (max 10MB)'
          };
        }

        // Ensure path is within MARKDOWN_DIR
        const resolvedPath = path.resolve(filePath);
        const resolvedMarkdownDir = path.resolve(MARKDOWN_DIR);
        if (!resolvedPath.startsWith(resolvedMarkdownDir)) {
          return {
            success: false,
            error: 'Invalid file path: outside allowed directory'
          };
        }

        // Check if file already exists
        try {
          await fs.access(filePath);
          return {
            success: false,
            error: `File already exists: ${sanitizedPath}`
          };
        } catch (error) {
          // File doesn't exist, proceed with creation
        }

        // Ensure directory exists
        const dirPath = path.dirname(filePath);
        await fs.mkdir(dirPath, { recursive: true });

        await fs.writeFile(filePath, content, 'utf-8');

        return {
          success: true,
          filePath: sanitizedPath,
          message: 'File created successfully'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },

  delete_file: {
    name: 'delete_file',
    description: 'Delete a specific markdown file',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'The path of the file to delete (relative to markdown directory)',
          minLength: 1,
          maxLength: 500
        }
      },
      required: ['filePath']
    },
    implementation: async (params) => {
      try {
        // Validate parameters
        const validationErrors = validateParameters(params, this.parameters);
        if (validationErrors.length > 0) {
          return {
            success: false,
            error: `Validation errors: ${validationErrors.join(', ')}`
          };
        }

        // Validate and sanitize path
        const sanitizedPath = validateAndSanitizePath(params.filePath);

        if (!sanitizedPath.toLowerCase().endsWith('.md')) {
          return {
            success: false,
            error: 'Only markdown files are allowed'
          };
        }

        const filePath = path.join(MARKDOWN_DIR, sanitizedPath);

        // Ensure path is within MARKDOWN_DIR
        const resolvedPath = path.resolve(filePath);
        const resolvedMarkdownDir = path.resolve(MARKDOWN_DIR);
        if (!resolvedPath.startsWith(resolvedMarkdownDir)) {
          return {
            success: false,
            error: 'Invalid file path: outside allowed directory'
          };
        }

        // Check if file exists
        try {
          await fs.access(filePath);
        } catch (error) {
          return {
            success: false,
            error: `File not found: ${sanitizedPath}`
          };
        }

        await fs.unlink(filePath);

        return {
          success: true,
          filePath: sanitizedPath,
          message: 'File deleted successfully'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },

  search_content: {
    name: 'search_content',
    description: 'Search for content across all markdown files',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The text to search for',
          minLength: 1,
          maxLength: 1000
        }
      },
      required: ['query']
    },
    implementation: async (params) => {
      try {
        // Validate parameters
        const validationErrors = validateParameters(params, this.parameters);
        if (validationErrors.length > 0) {
          return {
            success: false,
            error: `Validation errors: ${validationErrors.join(', ')}`
          };
        }

        // Basic query sanitization to prevent regex injection
        const sanitizedQuery = params.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const query = sanitizedQuery.toLowerCase();

        const files = await glob(`${MARKDOWN_DIR}/**/*.md`, {
          ignore: [`${MARKDOWN_DIR}/**/node_modules/**`]
        });

        const results = [];

        for (const file of files) {
          try {
            const content = await fs.readFile(file, 'utf-8');
            if (content.toLowerCase().includes(query)) {
              const relativePath = path.relative(MARKDOWN_DIR, file);
              results.push({
                filePath: relativePath,
                content: content.substring(0, 200) + (content.length > 200 ? '...' : '') // First 200 chars
              });
            }
          } catch (error) {
            // Skip files that can't be read
            continue;
          }
        }

        return {
          success: true,
          query: params.query,
          results: results,
          count: results.length
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },

  get_requirements: {
    name: 'get_requirements',
    description: 'Extract requirements from a markdown file',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'The path of the file to extract requirements from (relative to markdown directory)',
          minLength: 1,
          maxLength: 500
        }
      },
      required: ['filePath']
    },
    implementation: async (params) => {
      try {
        // Validate parameters
        const validationErrors = validateParameters(params, this.parameters);
        if (validationErrors.length > 0) {
          return {
            success: false,
            error: `Validation errors: ${validationErrors.join(', ')}`
          };
        }

        // First read the file
        const readResult = await functionRegistry.read_file.implementation(params);

        if (!readResult.success) {
          return readResult;
        }

        // Extract requirements using regex patterns
        const content = readResult.content;
        const requirements = [];

        // Pattern 1: REQ-ID: Title - Description
        const pattern1 = /(REQ-\d+):\s*(.*?)\s*-\s*(.*?)(?=\n\n|Requirements|$)/g;
        let match;
        while ((match = pattern1.exec(content)) !== null) {
          requirements.push({
            id: match[1],
            title: match[2].trim(),
            description: match[3].trim()
          });
        }

        // Pattern 2: Headers followed by requirement content
        const pattern2 = /###\s*(REQ-\d+):\s*(.*?)(?=\n###\s*REQ-|$)/gs;
        while ((match = pattern2.exec(content)) !== null) {
          const reqId = match[1];
          const title = match[2].trim();
          const reqContent = match[0];
          const description = reqContent.substring(match[0].indexOf(title) + title.length)
            .replace(/^(REQ-\d+):\s*/, '')
            .replace(/^\s*-\s*/, '')
            .trim();

          requirements.push({
            id: reqId,
            title: title,
            description: description
          });
        }

        // Pattern 3: List items with REQ-ID
        const pattern3 = /-\s*(REQ-\d+):\s*(.*?)(?=\n-\s*REQ-|\n\n|$)/gs;
        while ((match = pattern3.exec(content)) !== null) {
          requirements.push({
            id: match[1],
            title: match[2].trim(),
            description: match[2].trim()
          });
        }

        return {
          success: true,
          filePath: params.filePath,
          requirements: requirements,
          count: requirements.length
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },

  get_system_design: {
    name: 'get_system_design',
    description: 'Extract system design components from a markdown file',
    parameters: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'The path of the file to extract system design components from (relative to markdown directory)',
          minLength: 1,
          maxLength: 500
        }
      },
      required: ['filePath']
    },
    implementation: async (params) => {
      try {
        // Validate parameters
        const validationErrors = validateParameters(params, this.parameters);
        if (validationErrors.length > 0) {
          return {
            success: false,
            error: `Validation errors: ${validationErrors.join(', ')}`
          };
        }

        // First read the file
        const readResult = await functionRegistry.read_file.implementation(params);

        if (!readResult.success) {
          return readResult;
        }

        // Extract system design components using regex patterns
        const content = readResult.content;
        const components = [];

        // Format 1: ### Component: Name
        const format1 = /###\s*Component:\s*(.*?)\r?\n(.*?)(?=\r?\n###\s*Component:|$)/gs;
        let match;
        while ((match = format1.exec(content)) !== null) {
          const name = match[1]?.trim() || 'Unknown';
          let description = match[2]?.trim() || 'No description';

          // Extract type if specified in the description
          const typeMatch = description.match(/- Type: (.*?)\r?\n/i);
          const type = typeMatch ? typeMatch[1].trim() : 'service';

          // Clean up description by removing type and other metadata
          description = description
            .replace(/- Type: .*\r?\n?/i, '')
            .replace(/- Description: /i, '')
            .replace(/^\s*-\s*/gm, '') // Remove list item prefixes
            .trim();

          components.push({
            name: name,
            description: description || 'No description',
            type: type
          });
        }

        // Format 2: ## Component Name with type and description
        const format2 = /##\s*(.*?)\r?\n- Type: (.*?)\r?\n- Description: (.*?)(?=\r?\n##\s*|$)/gs;
        while ((match = format2.exec(content)) !== null) {
          components.push({
            name: match[1]?.trim() || 'Unknown',
            type: match[2]?.trim() || 'service',
            description: match[3]?.trim() || 'No description'
          });
        }

        // Format 3: Simple list format with component indicators
        const format3 = /-\s*\*\*Component:\s*(.*?)\*\*.*?\r?\n\s*- Type: (.*?)\r?\n\s*- Description: (.*?)(?=\r?\n-\s*\*\*Component:|$)/gs;
        while ((match = format3.exec(content)) !== null) {
          components.push({
            name: match[1]?.trim() || 'Unknown',
            type: match[2]?.trim() || 'service',
            description: match[3]?.trim() || 'No description'
          });
        }

        return {
          success: true,
          filePath: params.filePath,
          components: components,
          count: components.length
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  }
};

// Enhanced path validation and security function
function validateAndSanitizePath(inputPath, allowRelative = false) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Invalid path: path is required and must be a string');
  }

  try {
    // Decode URI components
    const decodedPath = decodeURIComponent(inputPath);

    // Normalize the path to resolve any relative components
    const normalizedPath = path.normalize(decodedPath);

    // Check for directory traversal attempts
    if (normalizedPath.includes('../') || normalizedPath.includes('..\\')) {
      throw new Error('Invalid path: directory traversal detected');
    }

    // Additional check for absolute path attempts if not allowed
    if (!allowRelative && path.isAbsolute(normalizedPath)) {
      // If it's an absolute path, ensure it's within our allowed directory
      const resolvedPath = path.resolve(normalizedPath);
      const resolvedMarkdownDir = path.resolve(MARKDOWN_DIR);
      if (!resolvedPath.startsWith(resolvedMarkdownDir)) {
        throw new Error('Invalid path: outside allowed directory');
      }
    }

    // Prevent common path traversal patterns
    const suspiciousPatterns = ['..', '%2e%2e', '..%2f', '..%5c', '%2e%2e%2f', '%2e%2e%5c'];
    for (const pattern of suspiciousPatterns) {
      if (normalizedPath.toLowerCase().includes(pattern.toLowerCase())) {
        throw new Error('Invalid path: suspicious pattern detected');
      }
    }

    return normalizedPath;
  } catch (e) {
    if (e instanceof URIError) {
      throw new Error('Invalid path: malformed URI');
    }
    throw e;
  }
}

// Validate function parameters based on schema
function validateParameters(params, schema) {
  const errors = [];

  // Check required parameters
  if (schema.required) {
    for (const requiredParam of schema.required) {
      if (!(requiredParam in params)) {
        errors.push(`Missing required parameter: ${requiredParam}`);
      }
    }
  }

  // Validate parameter types and values
  if (schema.properties) {
    for (const [paramName, paramSpec] of Object.entries(schema.properties)) {
      if (paramName in params) {
        const value = params[paramName];
        const expectedType = paramSpec.type;

        // Type validation
        if (expectedType === 'string' && typeof value !== 'string') {
          errors.push(`Parameter ${paramName} must be a string`);
        } else if (expectedType === 'number' && typeof value !== 'number') {
          errors.push(`Parameter ${paramName} must be a number`);
        } else if (expectedType === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Parameter ${paramName} must be a boolean`);
        } else if (expectedType === 'object' && typeof value !== 'object') {
          errors.push(`Parameter ${paramName} must be an object`);
        } else if (expectedType === 'array' && !Array.isArray(value)) {
          errors.push(`Parameter ${paramName} must be an array`);
        }

        // Additional validation based on parameter specification
        if (paramSpec.minLength && typeof value === 'string' && value.length < paramSpec.minLength) {
          errors.push(`Parameter ${paramName} must be at least ${paramSpec.minLength} characters long`);
        }

        if (paramSpec.maxLength && typeof value === 'string' && value.length > paramSpec.maxLength) {
          errors.push(`Parameter ${paramName} must be no more than ${paramSpec.maxLength} characters long`);
        }

        if (paramSpec.pattern && typeof value === 'string' && !new RegExp(paramSpec.pattern).test(value)) {
          errors.push(`Parameter ${paramName} does not match required pattern`);
        }
      }
    }
  }

  return errors;
}

// Export the function registry and validation functions
module.exports = {
  functionRegistry,
  validateAndSanitizePath,
  validateParameters
};