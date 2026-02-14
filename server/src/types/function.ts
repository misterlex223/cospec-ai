/**
 * Function calling types
 */

import type { ValidationError } from './error.js';

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: FunctionParameter[];
  returnType: string;
}

export interface FunctionParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  defaultValue?: unknown;
}

export interface FunctionCallRequest {
  functionName: string;
  parameters: Record<string, unknown>;
  context?: string;
}

export interface FunctionCallResponse {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTime?: number;
}

export interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  enum?: unknown[];
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export {};
