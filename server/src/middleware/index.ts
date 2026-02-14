/**
 * Middleware exports
 */

export interface ExpressRequest {
  path: string;
  headers: Record<string, string>;
  params: Record<string, unknown>;
  query: Record<string, unknown>;
  body: unknown;
}

export interface ExpressResponse {
  status(code: number): ExpressResponse;
  json(data: unknown): ExpressResponse;
  setHeader(name: string, value: string | string[]): ExpressResponse;
}

export interface NextFunction {
  (error?: unknown): void;
}

export interface CorsConfig {
  origin: string | string[];
  methods?: string[];
  credentials?: boolean;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
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

export interface ValidationConfig {
  stripUnknown?: boolean;
  strictArrays?: boolean;
  strictBooleans?: boolean;
}

export interface AuthConfig {
  skipPaths?: string[];
  apiKeyHeader?: string;
}

export interface MiddlewareConfig {
  cors?: CorsConfig;
  rateLimit?: RateLimitOptions;
  security?: SecurityConfig;
  validation?: ValidationConfig;
  auth?: AuthConfig;
}

export function applyMiddleware(
  _app: any,
  _config: MiddlewareConfig = {}
): void {
  // Middleware setup
  // Implementation depends on Express app structure
  // TODO: Complete implementation
}

export {};
