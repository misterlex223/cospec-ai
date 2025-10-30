// createFile.js - Function to create a new markdown file with the specified content

const fs = require('fs').promises;
const path = require('path');

const MARKDOWN_DIR = process.env.MARKDOWN_DIR || path.join(__dirname, '..', 'markdown');

const parameters = {
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
};

module.exports = {
  name: 'create_file',
  description: 'Create a new markdown file with the specified content',
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
};