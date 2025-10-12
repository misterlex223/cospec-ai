// getRequirements.js - Function to extract requirements from a markdown file

const parameters = {
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
};

module.exports = {
  name: 'get_requirements',
  description: 'Extract requirements from a markdown file',
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

      // First read the file
      const readFile = require('./readFile');
      const readResult = await readFile.implementation(params);

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
};