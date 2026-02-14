/**
 * Environment configuration with validation
 */

export const config = {
  // Server
  port: intFromEnv('PORT', 9280),
  nodeEnv: stringFromEnv('NODE_ENV', 'development'),

  // Paths
  markdownDir: stringFromEnv('MARKDOWN_DIR', '/home/flexy/workspace/markdown'),
  distPath: stringFromEnv('DIST_PATH', '/home/flexy/workspace/app-react/dist'),
  rootDistPath: stringFromEnv('ROOT_DIST_PATH', '/home/flexy/workspace/dist'),

  // Security
  apiKey: stringFromEnv('API_KEY', 'demo-api-key'),
  rateLimitWindowMs: intFromEnv('RATE_LIMIT_WINDOW_MS', 60000),
  rateLimitMax: intFromEnv('RATE_LIMIT_MAX', 100),

  // Content limits
  maxContentSize: intFromEnv('MAX_CONTENT_SIZE', 10 * 1024 * 1024), // 10MB

  // Kai Context
  kaiBackendUrl: stringFromEnv('KAI_BACKEND_URL', ''),
  kaiProjectId: stringFromEnv('KAI_PROJECT_ID', ''),

  // Profile
  profileEditorMode: boolFromEnv('PROFILE_EDITOR_MODE', false),
  profileName: stringFromEnv('PROFILE_NAME', ''),

  // File watcher
  watcherDebounceMs: intFromEnv('WATCHER_DEBOUNCE_MS', 3000),

  // File sync
  syncMetadataDir: '.cospec-sync',
  syncMetadataFile: 'sync-metadata.json',
} as const;

export type Config = typeof config;

function stringFromEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value ?? defaultValue;
}

function intFromEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function boolFromEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value === 'true' || value === '1';
}
