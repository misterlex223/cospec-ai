// readFile.js - Function to read the content of a specific markdown file

const fs = require('fs').promises;
const path = require('path');

const MARKDOWN_DIR = process.env.MARKDOWN_DIR || '/markdown';

const parameters = {
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
};

module.exports = {
  name: 'read_file',
  description: 'Read the content of a specific markdown file',
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
};