/**
 * Logger service - centralized logging
 */

export interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string | undefined;
  error?: unknown;
}

export class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  private format(entry: LogEntry): string {
    if (this.config.format === 'json') {
      return JSON.stringify(entry);
    }
    const { timestamp, level, message } = entry;
    const contextStr = entry.context ? `[${entry.context}] ` : '';
    return `${timestamp} ${level} ${contextStr}${message}`;
  }

  debug(message: string, context?: string, error?: unknown): void {
    if (this.config.level === 'debug') {
      console.log(this.format({
        timestamp: new Date().toISOString(),
        level: 'DEBUG',
        message,
        context: context === undefined ? undefined : context,
        error,
      }));
    }
  }

  info(message: string, context?: string, error?: unknown): void {
    if (this.config.level === 'debug' || this.config.level === 'info') {
      console.log(this.format({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message,
        context: context === undefined ? undefined : context,
        error,
      }));
    }
  }

  warn(message: string, context?: string, error?: unknown): void {
    if (this.config.level === 'debug' || this.config.level === 'info' || this.config.level === 'warn') {
      console.warn(this.format({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message,
        context: context === undefined ? undefined : context,
        error,
      }));
    }
  }

  error(message: string, context?: string, error?: unknown): void {
    console.error(this.format({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      context: context === undefined ? undefined : context,
      error,
    }));
  }
}

// Default logger instance
export const logger = new Logger({
  level: (process.env.LOG_LEVEL as LoggerConfig['level']) || 'info',
  format: (process.env.LOG_FORMAT as LoggerConfig['format']) || 'json',
});

export {};
