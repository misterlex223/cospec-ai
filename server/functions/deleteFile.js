// deleteFile.js - Function to delete a specific markdown file

const fs = require('fs').promises;
const path = require('path');

const MARKDOWN_DIR = process.env.MARKDOWN_DIR || '/markdown';

const parameters = {
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
};

module.exports = {
  name: 'delete_file',
  description: 'Delete a specific markdown file',
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
};