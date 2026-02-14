/**
 * Central type exports
 */

export type {
  ExpressRequest,
  ExpressResponse,
  AuthenticatedRequest,
  FileRequest,
  ProfileRequest,
  GitRequest,
  AgentRequestBody,
} from './express.js';

export type {
  AgentType,
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
  ApiError,
} from './error.js';

export type {
  ApiResponse,
  ApiErrorDetail,
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

export type {
  DatabaseConfig,
  SqliteResult,
  AgentRecord,
  AgentExecution,
  ConversationRecord,
  ChatMessageRecord,
} from './database.js';
