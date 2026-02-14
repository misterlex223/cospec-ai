/**
 * Security headers configuration
 */

export interface ExpressResponse {
  setHeader(name: string, value: string | string[]): ExpressResponse;
}

export interface NextFunction {
  (error?: unknown): void;
}

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
  return (
    _req: unknown,
    res: ExpressResponse,
    next: NextFunction
  ): void => {
    // Set security headers
    if (config.contentSecurityPolicy) {
      const directives = config.contentSecurityPolicy.directives || {};
      const defaultSrc = directives.defaultSrc || ['\'self\''];
      const styleSrc = directives.styleSrc || ['\'self\'', '\'unsafe-inline\''];
      const scriptSrc = directives.scriptSrc || ['\'self\''];

      const policy = [
        `default-src ${defaultSrc.join(' ')}`,
        `style-src ${styleSrc.join(' ')}`,
        `script-src ${scriptSrc.join(' ')}`
      ].join('; ');

      res.setHeader('Content-Security-Policy', policy);
    }

    if (config.hsts) {
      const maxAge = config.hsts.maxAge || 31536000;
      res.setHeader('Strict-Transport-Security', `max-age=${maxAge}; includeSubDomains`);
    }

    if (config.crossOriginEmbedderPolicy) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    if (config.xssFilter ?? true) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    if (config.noSniff ?? true) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    next();
  };
}

export {};
