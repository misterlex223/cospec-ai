/**
 * Request validation middleware
 */

import type { ExpressRequest, ExpressResponse, NextFunction } from '../../types/express.js';
import type { ValidationError } from '../../types/error.js';
import type { FileRequest, ProfileRequest, GitRequest } from '../../types/index.js';

export interface ValidationConfig {
  stripUnknown?: boolean;
  strictArrays?: boolean;
  strictBooleans?: boolean;
}

export function validatePath(input: string): void {
  if (!input || typeof input !== 'string') {
    throw new ValidationError('Path is required');
  }
  if (input.includes('../')) {
    throw new ValidationError('Path cannot traverse parent directories');
  }
  if (input.includes('..\\')) {
    throw new ValidationError('Path cannot traverse parent directories (Windows)');
  }
}

export function validateMarkdownPath(path: string): void {
  if (!path?.toLowerCase().endsWith('.md')) {
    throw new ValidationError('Only markdown files are allowed');
  }
}

export function validateContentLength(content: string, maxSize: number): void {
  if (Buffer.byteLength(content, 'utf8') > maxSize) {
    throw new ValidationError(`Content too large. Maximum size: ${maxSize} bytes`);
  }
}

export function createValidationMiddleware(config: ValidationConfig = {}) {
  return (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    try {
      // Validate path parameter
      if (req.params) {
        for (const value of Object.values(req.params)) {
          if (typeof value === 'string') {
                validatePath(value);
          }
        }
      }

      // Validate query parameters
      if (req.query) {
        for (const [key, value] of Object.entries(req.query)) {
          if (key === 'path' || key === 'oldPath' || key === 'newPath') {
                if (typeof value === 'string') {
                  validatePath(value);
                }
          }
        }
      }

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          details: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'INTERNAL_ERROR',
          details: 'An unexpected error occurred',
        });
      }
    }
  };
}
