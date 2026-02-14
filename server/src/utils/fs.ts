/**
 * File system utilities
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveSafePath, sanitizePath, validateMarkdownPath } from './path.js';

export class FileNotFoundError extends Error {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`);
    this.name = 'FileNotFoundError';
  }
}

export class FileAlreadyExistsError extends Error {
  constructor(filePath: string) {
    super(`File already exists: ${filePath}`);
    this.name = 'FileAlreadyExistsError';
  }
}

/**
 * Ensure a file exists
 */
export async function ensureFileExists(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch (error) {
    throw new FileNotFoundError(path.basename(filePath));
  }
}

/**
 * Ensure a file does not exist
 */
export async function ensureFileDoesNotExist(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
    throw new FileAlreadyExistsError(path.basename(filePath));
  } catch (error) {
    if (error instanceof FileAlreadyExistsError) {
      throw error;
    }
    // File doesn't exist, which is what we want
  }
}

/**
 * Read file content as UTF-8 string
 */
export async function readFileContent(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}

/**
 * Write file content as UTF-8 string
 */
export async function writeFileContent(
  filePath: string,
  content: string
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Validate content size
 */
export function validateContentSize(
  content: string,
  maxSize: number
): void {
  if (typeof content !== 'string') {
    throw new TypeError('Content must be a string');
  }
  if (Buffer.byteLength(content, 'utf8') > maxSize) {
    throw new Error('Content too large');
  }
}

/**
 * Safe file read within base directory
 */
export async function safeReadFile(
  baseDir: string,
  filePath: string
): Promise<string> {
  const sanitizedPath = sanitizePath(filePath);
  validateMarkdownPath(sanitizedPath);
  const fullPath = resolveSafePath(baseDir, sanitizedPath);
  await ensureFileExists(fullPath);
  return readFileContent(fullPath);
}

/**
 * Safe file write within base directory
 */
export async function safeWriteFile(
  baseDir: string,
  filePath: string,
  content: string,
  maxSize: number
): Promise<string> {
  const sanitizedPath = sanitizePath(filePath);
  validateMarkdownPath(sanitizedPath);
  validateContentSize(content, maxSize);
  const fullPath = resolveSafePath(baseDir, sanitizedPath);
  await writeFileContent(fullPath, content);
  return sanitizedPath;
}

/**
 * Safe file creation within base directory
 */
export async function safeCreateFile(
  baseDir: string,
  filePath: string,
  content: string,
  maxSize: number
): Promise<string> {
  const sanitizedPath = sanitizePath(filePath);
  validateMarkdownPath(sanitizedPath);
  validateContentSize(content, maxSize);
  const fullPath = resolveSafePath(baseDir, sanitizedPath);
  await ensureFileDoesNotExist(fullPath);
  await writeFileContent(fullPath, content);
  return sanitizedPath;
}

/**
 * Delete a file
 */
export async function safeDeleteFile(
  baseDir: string,
  filePath: string
): Promise<string> {
  const sanitizedPath = sanitizePath(filePath);
  validateMarkdownPath(sanitizedPath);
  const fullPath = resolveSafePath(baseDir, sanitizedPath);
  await ensureFileExists(fullPath);
  await fs.unlink(fullPath);
  return sanitizedPath;
}

/**
 * Rename/move a file
 */
export async function safeRenameFile(
  baseDir: string,
  oldPath: string,
  newPath: string
): Promise<{ oldPath: string; newPath: string }> {
  const sanitizedOldPath = sanitizePath(oldPath);
  const sanitizedNewPath = sanitizePath(newPath);

  validateMarkdownPath(sanitizedOldPath);
  validateMarkdownPath(sanitizedNewPath);

  const fullOldPath = resolveSafePath(baseDir, sanitizedOldPath);
  const fullNewPath = resolveSafePath(baseDir, sanitizedNewPath);

  await ensureFileExists(fullOldPath);
  await ensureFileDoesNotExist(fullNewPath);

  await fs.mkdir(path.dirname(fullNewPath), { recursive: true });
  await fs.rename(fullOldPath, fullNewPath);

  return { oldPath: sanitizedOldPath, newPath: sanitizedNewPath };
}

/**
 * List markdown files in directory using glob
 */
export async function listMarkdownFiles(
  baseDir: string,
  globFn: (pattern: string, options: unknown) => Promise<string[]>
): Promise<Array<{ path: string; name: string }>> {
  try {
    await fs.access(baseDir);
  } catch {
    throw new Error(`Markdown directory not found: ${baseDir}`);
  }

  const files = await globFn('**/*.md', {
    cwd: baseDir,
    absolute: true,
    ignore: ['**/node_modules/**'],
  });

  return files.map((file) => ({
    path: path.relative(baseDir, file),
    name: path.basename(file),
  }));
}

/**
 * Check if a directory exists
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
