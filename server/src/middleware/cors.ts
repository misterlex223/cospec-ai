/**
 * CORS configuration
 */

export interface ExpressRequest {
  headers: Record<string, string>;
}

export interface ExpressResponse {
  setHeader(name: string, value: string | string[]): ExpressResponse;
}

export interface NextFunction {
  (error?: unknown): void;
}

export interface CorsConfig {
  origin?: string | string[];
  methods?: string[];
  credentials?: boolean;
}

const DEFAULT_CORS_ORIGIN = '*';

export function createCorsMiddleware(config: CorsConfig = {}): (
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
) => void {
  const origin = config.origin ?? DEFAULT_CORS_ORIGIN;
  const methods = config.methods ?? ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
  const credentials = config.credentials ?? false;

  res.setHeader('Access-Control-Allow-Origin', Array.isArray(origin) ? origin.join(', ') : origin);
  res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
  if (credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
}

export {};
