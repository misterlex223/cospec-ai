/**
 * Express type extensions
 */

import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction,
  Router as ExpressRouter,
} from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role?: string;
      };
    }
    interface Response {
      success(data: unknown): this;
      error(message: string, statusCode?: number): this;
    }
  }
}

export interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: string;
    role?: string;
  };
}

export interface FileRequest extends ExpressRequest {
  params: {
    path: string;
  };
}

export interface ProfileRequest extends ExpressRequest {
  params: {
    name: string;
    path?: string;
  };
}

export interface GitRequest extends ExpressRequest {
  query: {
    pathA?: string;
    pathB?: string;
    limit?: string;
    offset?: string;
  };
}

export interface AgentRequestBody {
  agentType: string;
  targetFiles: string[];
  customPrompt?: string;
  outputPath?: string;
}

export type { ExpressRouter, ExpressRequest, ExpressResponse, NextFunction };
