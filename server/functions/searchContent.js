// searchContent.js - Function to search for content across all markdown files

const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

const MARKDOWN_DIR = process.env.MARKDOWN_DIR || '/markdown';

const parameters = {
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
};

module.exports = {
  name: 'search_content',
  description: 'Search for content across all markdown files',
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

      // Basic query sanitization to prevent regex injection
      const sanitizedQuery = params.query.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');
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
};