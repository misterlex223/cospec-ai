/**
 * Profile management types
 */

export interface ProfileDocument {
  name: string;
  path?: string;
  description?: string;
  promptFile?: string;
  promptText?: string;
  command?: string;
  required?: boolean;
}

export interface ProfileFolder {
  name: string;
  path: string;
  documents?: ProfileDocument[];
}

export interface Profile {
  name: string;
  version?: string;
  description?: string;
  documents?: ProfileDocument[];
  folders?: ProfileFolder[];
}

export interface ProfileMetadata {
  required: boolean;
  documentName?: string;
  description?: string;
  hasPrompt: boolean;
  hasCommand: boolean;
}

export interface FileWithMetadata {
  path: string;
  name: string;
  exists?: boolean;
  profileMetadata?: ProfileMetadata;
}

export interface ProfileValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export {};
