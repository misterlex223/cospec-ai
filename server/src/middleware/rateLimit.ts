/**
 * Rate limiting configuration
 */

import rateLimit from 'express-rate-limit';
import type { ExpressRequest } from '../../types/express.js';
import type { MiddlewareConfig } from './index.js';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: ExpressRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export function createRateLimiter(options: RateLimitOptions) {
  const limiter = rateLimit.rateLimit({
    windowMs: options.windowMs || 60000,
    max: options.max || 100,
    message: options.message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    skipFailedRequests: options.skipFailedRequests ?? false,
    keyGenerator: options.keyGenerator || ((req: ExpressRequest) => req.ip),
  });

  return limiter;
}
