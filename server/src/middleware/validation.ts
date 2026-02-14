/**
 * Request validation middleware
 */

export interface ExpressRequest {
  params: Record<string, unknown>;
  query: Record<string, unknown>;
  body: unknown;
}

export interface ExpressResponse {
  status(code: number): ExpressResponse;
  json(data: unknown): ExpressResponse;
}

export interface NextFunction {
  (error?: unknown): void;
}

export interface ValidationConfig {
  stripUnknown?: boolean;
  strictArrays?: boolean;
  strictBooleans?: boolean;
}

export function validatePath(input: string): void {
  if (!input || typeof input !== 'string') {
    throw new Error('Path is required');
  }
  if (input.includes('..')) {
    throw new Error('Path cannot traverse parent directories');
  }
  if (input.includes('..\\')) {
    throw new Error('Path cannot traverse parent directories (Windows)');
  }
}

export function validateMarkdownPath(path: string): void {
  if (!path?.toLowerCase().endsWith('.md')) {
    throw new Error('Only markdown files are allowed');
  }
}

export function validateContentLength(content: string, maxSize: number): void {
  if (Buffer.byteLength(content, 'utf8') > maxSize) {
    throw new Error(`Content too large. Maximum size: ${maxSize} bytes`);
  }
}

export function createValidationMiddleware(_config: ValidationConfig = {}): (
  _req: ExpressRequest,
  _res: ExpressResponse,
  next: NextFunction
) => void {
  // TODO: Implement full validation logic
  next();
}

export {};
