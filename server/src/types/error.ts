/**
 * Error types
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'APP_ERROR',
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class FileSystemError extends Error {
  constructor(
    message: string,
    public code: string = 'FS_ERROR',
    public path?: string
  ) {
    super(message);
    this.name = 'FileSystemError';
  }
}

export class ServiceError extends Error {
  constructor(
    message: string,
    public service: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
  timestamp: string;
}
