/**
 * Middleware exports
 */

import type { ExpressRequest, ExpressResponse, NextFunction } from '../../types/express.js';
import { createCorsMiddleware, type CorsConfig } from './cors.js';
import { createRateLimiter, type RateLimitOptions } from './rateLimit.js';
import { createSecurityMiddleware, type SecurityConfig } from './security.js';
import { createValidationMiddleware, type ValidationConfig } from './validation.js';
import { createAuthMiddleware, type AuthConfig } from './auth.js';

export interface MiddlewareConfig {
  cors?: CorsConfig;
  rateLimit?: RateLimitOptions;
  security?: SecurityConfig;
  validation?: ValidationConfig;
  auth?: AuthConfig;
}

export function applyMiddleware(
  app: any,
  config: MiddlewareConfig = {}
): void {
  // CORS
  if (config.cors !== false) {
    app.use(createCorsMiddleware(config.cors || {}));
  }

  // Rate limiting
  if (config.rateLimit) {
    const limiter = createRateLimiter(config.rateLimit);
    app.use('/api/', limiter);
  }

  // Security
  if (config.security !== false) {
    app.use(createSecurityMiddleware(config.security || {}));
  }

  // Validation
  if (config.validation) {
    app.use(createValidationMiddleware(config.validation || {}));
  }

  // Authentication
  if (config.auth) {
    app.use(createAuthMiddleware(config.auth || {}));
  }
}

export {
  createCorsMiddleware,
  type CorsConfig,
  createRateLimiter,
  type RateLimitOptions,
  createSecurityMiddleware,
  type SecurityConfig,
  createValidationMiddleware,
  type ValidationConfig,
  createAuthMiddleware,
  type AuthConfig,
  applyMiddleware,
  type MiddlewareConfig,
}
