// listFiles.js - Function to list all markdown files in the system

const { glob } = require('glob');
const path = require('path');

const MARKDOWN_DIR = process.env.MARKDOWN_DIR || path.join(__dirname, '..', 'markdown');

const parameters = {
  type: 'object',
  properties: {},
  required: []
};

module.exports = {
  name: 'list_files',
  description: 'List all markdown files in the system',
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
};