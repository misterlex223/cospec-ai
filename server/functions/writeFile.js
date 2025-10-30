// writeFile.js - Function to write content to a specific markdown file

const fs = require('fs').promises;
const path = require('path');

const MARKDOWN_DIR = process.env.MARKDOWN_DIR || path.join(__dirname, '..', 'markdown');

const parameters = {
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
};

module.exports = {
  name: 'write_file',
  description: 'Write content to a specific markdown file',
  parameters: parameters,
  implementation: async (params) => {
    try {
      // Validate parameters
      const { validateParameters } = require('../validation');
      const validationErrors = validateParameters(params, parameters);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: `Validation errors: ${validationErrors.join(', ')}`
        };
      }

      // Validate and sanitize path
      const { validateAndSanitizePath } = require('../validation');
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
};