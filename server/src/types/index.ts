/**
 * Central type exports
 */

export type { ExpressRequest, ExpressResponse, ExpressRouter, NextFunction } from './express.js';
export type { AuthenticatedRequest } from './express.js';
export type { FileRequest } from './express.js';
export type { ProfileRequest } from './express.js';
export type { GitRequest } from './express.js';
export type { AgentRequestBody } from './express.js';

export type {
  AgentType,
  AgentExecution,
  ChatMessage,
  Conversation,
  SuggestionTemplate,
} from './agent.js';

export type {
  ProfileDocument,
  ProfileFolder,
  Profile,
  ProfileMetadata,
  FileWithMetadata,
  ProfileValidationResult,
} from './profile.js';

export type {
  GitStatusChar,
  GitStatusResult,
  GitStatusEntry,
  GitLogEntry,
  GitLogResult,
  GitDiffResult,
  GitCommit,
} from './git.js';

export type {
  FileEntry,
  FileContent,
  FileSyncStatus,
  FileWatcherEvent,
  FileCacheEntry,
  FileWriteOptions,
} from './file.js';

export type {
  SocketData,
  AgentProgressUpdate,
  FileChangeUpdate,
  ServerNotification,
  SocketEventData,
} from './websocket.js';

export type {
  DatabaseConfig,
  ServiceOptions,
  CacheOptions,
  WatcherOptions,
  SyncOptions,
} from './service.js';

export type {
  AppError,
  ValidationError,
  FileSystemError,
  ServiceError,
} from './error.js';

export type {
  ApiErrorDetail,
  ApiResponse,
  PaginatedResponse,
  FileListResponse,
  AgentListResponse,
  ProfileListResponse,
  GitStatusResponse,
} from './api.js';

export type {
  FunctionDefinition,
  FunctionParameter,
  FunctionCallRequest,
  FunctionCallResponse,
  ParameterSchema,
  ValidationResult,
} from './function.js';
