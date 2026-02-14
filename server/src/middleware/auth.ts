/**
 * Authentication middleware (placeholder)
 */

import type { ExpressRequest, ExpressResponse, NextFunction } from '../../types/express.js';

export interface AuthConfig {
  skipPaths?: string[];
  apiKeyHeader?: string;
}

export function createAuthMiddleware(config: AuthConfig = {}) {
  const skipPaths = new Set(config.skipPaths || []);

  return (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    // Check if path should be skipped
    if (skipPaths.has(req.path)) {
      return next();
    }

    // TODO: Implement proper authentication
    // For now, just pass through
    next();
  };
}
