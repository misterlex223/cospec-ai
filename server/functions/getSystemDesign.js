// getSystemDesign.js - Function to extract system design components from a markdown file

const parameters = {
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
};

module.exports = {
  name: 'get_system_design',
  description: 'Extract system design components from a markdown file',
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
};