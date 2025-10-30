// validation.js - Validation utilities for function parameters and paths

const path = require('path');

const MARKDOWN_DIR = process.env.MARKDOWN_DIR || path.join(__dirname, '..', 'markdown');

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

module.exports = {
  validateAndSanitizePath,
  validateParameters
};