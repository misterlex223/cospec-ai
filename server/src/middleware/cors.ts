/**
 * CORS configuration
 */

import type { ExpressRequest, ExpressResponse, NextFunction } from '../../types/express.js';

export interface CorsConfig {
  origin: string | string[];
  methods?: string[];
  credentials?: boolean;
}

const DEFAULT_CORS_ORIGIN = '*';

export function createCorsMiddleware(config: CorsConfig = {}) {
  const {
    origin = DEFAULT_CORS_ORIGIN,
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials = false,
    ...config,
  } = config;

  return (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', Array.isArray(origin) ? origin.join(', ') : origin);
    res.setHeader('Access-Control-Allow-Methods', methods?.join(', ') || 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    next();
  };
}
