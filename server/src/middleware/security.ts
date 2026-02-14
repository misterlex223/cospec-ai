/**
 * Security headers configuration
 */

import helmet from 'helmet';
import type { ExpressRequest, ExpressResponse, NextFunction } from '../../types/express.js';

export interface SecurityConfig {
  contentSecurityPolicy?: {
    directives?: {
      defaultSrc?: string[];
      styleSrc?: string[];
      scriptSrc?: string[];
    };
  };
  hsts?: {
    maxAge?: number;
    includeSubDomains?: boolean | string[];
  };
  crossOriginEmbedderPolicy?: boolean;
  xssFilter?: boolean;
  noSniff?: boolean;
}

export function createSecurityMiddleware(config: SecurityConfig = {}) {
  const helmetConfig: helmet.Po = {
    contentSecurityPolicy: config.contentSecurityPolicy || {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
      },
    },
    hsts: config.hsts || false,
    crossOriginEmbedderPolicy: config.crossOriginEmbedderPolicy || false,
    xssFilter: config.xssFilter ?? true,
    noSniff: config.noSniff ?? true,
  };

  return (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    helmet(helmetConfig)(req, res, next);
  };
}
