/**
 * Document Profile Types
 *
 * Types for the document profile feature that allows defining required
 * documents and folders with AI generation capabilities.
 */

/**
 * A document in the profile
 */
export interface ProfileDocument {
  /** Display name of the document */
  name: string;
  /** Path relative to markdown directory (e.g., "SPEC.md" or "requirements/api.md") */
  path: string;
  /** Description of the document's purpose */
  description: string;
  /** Path to prompt file relative to profile directory (e.g., "prompts/api-spec.md") */
  promptFile?: string;
  /** Prompt text for generation */
  promptText?: string;
  /** Command to execute for generation (supports variables: {filePath}, {promptFile}, {promptText}) */
  command?: string;
  /** Whether the file exists in the markdown directory */
  exists?: boolean;
}

/**
 * A folder in the profile containing related documents
 */
export interface ProfileFolder {
  /** Display name of the folder */
  name: string;
  /** Path relative to markdown directory (e.g., "requirements/") */
  path: string;
  /** Description of the folder's purpose */
  description: string;
  /** Type of documents in this folder */
  documentType: string;
  /** Path to prompt file for the folder */
  promptFile?: string;
  /** Documents within this folder */
  documents: ProfileDocument[];
}

/**
 * Complete profile configuration
 */
export interface Profile {
  /** Profile name */
  name: string;
  /** Profile version */
  version: string;
  /** Profile description */
  description: string;
  /** Top-level required documents */
  documents: ProfileDocument[];
  /** Folders with their documents */
  folders: ProfileFolder[];
}

/**
 * Profile metadata attached to files
 */
export interface ProfileMetadata {
  /** Whether this file is required by the profile */
  required: boolean;
  /** Document name from profile */
  documentName: string;
  /** Document description */
  description: string;
  /** Whether the document has a prompt file */
  hasPrompt: boolean;
  /** Whether the document has a generation command */
  hasCommand: boolean;
}

/**
 * File info extended with profile metadata
 */
export interface FileInfoWithProfile {
  /** File path relative to markdown directory */
  path: string;
  /** File name */
  name: string;
  /** Whether the file exists */
  exists?: boolean;
  /** Profile metadata if file is part of a profile */
  profileMetadata?: ProfileMetadata;
}

/**
 * Response from GET /api/profile
 */
export interface ProfileResponse {
  /** Profile configuration (null if no profile loaded) */
  profile: Profile | null;
  /** Name of the loaded profile */
  profileName?: string;
  /** Path to the profile directory */
  profilePath?: string;
}

/**
 * Response from GET /api/profile/prompt/:path
 */
export interface PromptContentResponse {
  /** Relative path to prompt file */
  path: string;
  /** Absolute path to prompt file */
  absolutePath: string;
  /** Prompt file content */
  content: string;
}

/**
 * Response from POST /api/profile/generate/:path
 */
export interface GenerationResponse {
  /** Whether generation started successfully */
  success: boolean;
  /** Message about generation status */
  message: string;
}

/**
 * WebSocket event for generation output
 */
export interface GenerationOutputEvent {
  /** File path being generated */
  path: string;
  /** Output text */
  output: string;
  /** Whether this is error output */
  isError: boolean;
}

/**
 * WebSocket event for generation completion
 */
export interface GenerationCompleteEvent {
  /** File path that was generated */
  path: string;
  /** Whether generation succeeded */
  success: boolean;
  /** Complete output */
  output?: string;
  /** Exit code of the command */
  exitCode?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Profile validation result
 */
export interface ProfileValidation {
  /** Whether the profile is valid */
  valid: boolean;
  /** Warning messages */
  warnings: string[];
  /** Error messages */
  errors: string[];
}

/**
 * Generation state for a single file
 */
export interface GenerationState {
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Output buffer */
  output: string[];
  /** Whether generation completed successfully */
  success: boolean | null;
  /** Error message if failed */
  error: string | null;
}

// Convenience type aliases
export type Document = ProfileDocument;
export type Folder = ProfileFolder;
