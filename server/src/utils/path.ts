/**
 * Path sanitization utilities
 */

import path from 'node:path';

export class PathValidationError extends Error {
  constructor(
    message: string,
    public code: string = 'PATH_VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'PathValidationError';
  }
}

/**
 * Sanitize a file path to prevent directory traversal attacks
 */
export function sanitizePath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new PathValidationError('Invalid path: path is required and must be a string');
  }

  try {
    // Decode URI components
    const decodedPath = decodeURIComponent(inputPath);

    // Normalize the path to resolve any relative components
    const normalizedPath = path.normalize(decodedPath);

    // Check for directory traversal attempts
    if (normalizedPath.includes('../') || normalizedPath.includes('..\\')) {
      throw new PathValidationError('Invalid path: directory traversal detected');
    }

    // Prevent common path traversal patterns
    const suspiciousPatterns = [
      '..',
      '%2e',
      '%2f',
      '%5c',
      '%2e%2e',
      '%2e%2f',
      '%2e%5c',
      '%c0%af',
    ];

    const lowerPath = normalizedPath.toLowerCase();
    for (const pattern of suspiciousPatterns) {
      if (lowerPath.includes(pattern.toLowerCase())) {
        throw new PathValidationError('Invalid path: suspicious pattern detected');
      }
    }

    return normalizedPath;
  } catch (e) {
    if (e instanceof URIError) {
      throw new PathValidationError('Invalid path: malformed URI');
    }
    throw e;
  }
}

/**
 * Validate markdown file extension
 */
export function validateMarkdownPath(filePath: string): void {
  if (!filePath.toLowerCase().endsWith('.md')) {
    throw new PathValidationError('Only markdown files are allowed');
  }
}

/**
 * Resolve a safe path within a base directory
 */
export function resolveSafePath(baseDir: string, sanitizedPath: string): string {
  const filePath = path.join(baseDir, sanitizedPath);
  const resolvedPath = path.resolve(filePath);
  const resolvedBaseDir = path.resolve(baseDir);

  if (!resolvedPath.startsWith(resolvedBaseDir)) {
    throw new PathValidationError('Invalid file path: outside allowed directory');
  }

  return filePath;
}

/**
 * Get relative path from base directory
 */
export function getRelativePath(baseDir: string, filePath: string): string {
  return path.relative(baseDir, filePath);
}

/**
 * Check if path is absolute
 */
export function isAbsolute(p: string): boolean {
  return path.isAbsolute(p);
}

/**
 * Join path segments
 */
export function joinPath(...segments: string[]): string {
  return path.join(...segments);
}

/**
 * Parse directory from file path
 */
export function parseDir(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * Parse file name from path
 */
export function parseName(filePath: string): string {
  return path.basename(filePath);
}
