/**
 * Authentication middleware (placeholder)
 */

export interface AuthConfig {
  skipPaths?: string[];
  apiKeyHeader?: string;
}

export interface ExpressRequest {
  path: string;
  headers: Record<string, string>;
}

export interface ExpressResponse {
  status(code: number): ExpressResponse;
  json(data: unknown): ExpressResponse;
}

export interface NextFunction {
  (error?: unknown): void;
}

export function createAuthMiddleware(config: AuthConfig = {}) {
  const skipPaths = new Set(config.skipPaths || []);

  return (req: ExpressRequest, _res: ExpressResponse, next: NextFunction) => {
    // Check if path should be skipped
    if (skipPaths.has(req.path)) {
      return next();
    }

    // TODO: Implement proper authentication
    // For now, just pass through
    next();
  };
}

export {};
