/**
 * Cloudflare Worker API for file operations
 * 
 * This module handles file operations for the Markdown editor:
 * - List files
 * - Read file content
 * - Write file content
 * - Create new files
 * - Delete files
 * - Rename files
 */

// Helper function to generate response
function generateResponse(data, options = {}) {
  const status = options.status || 200;
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  
  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}
// Helper function to get file path from request
function getFilePath(request) {
  const url = new URL(request.url);
  const pathMatch = url.pathname.match(/^\/api\/files\/(.*)/);
  return pathMatch ? decodeURIComponent(pathMatch[1]) : null;
}

/**
 * List all Markdown files
 */
export async function listFiles(env) {
  try {
    // List all objects in the R2 bucket with .md extension
    const objects = await env.COSPEC_STORAGE.list({ prefix: 'files/', delimiter: '/' });
    
    // Transform R2 objects to file list format
    const files = objects.objects
      .filter(obj => obj.key.endsWith('.md'))
      .map(obj => {
        const path = obj.key.replace('files/', '');
        return {
          path,
          name: path.split('/').pop(),
          size: obj.size,
          lastModified: obj.uploaded
        };
      });
    
    return generateResponse(files);
  } catch (error) {
    console.error('Error listing files:', error);
    return generateResponse({ error: 'Failed to list files' }, { status: 500 });
  }
}

/**
 * Read file content
 */
export async function getFile(request, env) {
  try {
    const filePath = getFilePath(request);
    if (!filePath) {
      return generateResponse({ error: 'Invalid file path' }, { status: 400 });
    }
    
    // Get file from R2
    const object = await env.COSPEC_STORAGE.get(`files/${filePath}`);
    if (!object) {
      return generateResponse({ error: `File not found: ${filePath}` }, { status: 404 });
    }
    
    // Read file content
    const content = await object.text();
    
    return generateResponse({ path: filePath, content });
  } catch (error) {
    console.error('Error reading file:', error);
    return generateResponse({ error: 'Failed to read file' }, { status: 500 });
  }
}

/**
 * Save file content
 */
export async function saveFile(request, env) {
  try {
    const filePath = getFilePath(request);
    if (!filePath) {
      return generateResponse({ error: 'Invalid file path' }, { status: 400 });
    }
    
    // Parse request body
    const { content } = await request.json();
    if (content === undefined) {
      return generateResponse({ error: 'Content is required' }, { status: 400 });
    }
    
    // Save file to R2
    await env.COSPEC_STORAGE.put(`files/${filePath}`, content);
    
    // Send notification about file change
    await sendNotification('FILE_CHANGED', filePath, env);
    
    // Update file metadata in D1
    const fileKey = `files/${filePath}`;
    const now = Date.now();
    
    // Check if file exists in D1
    const existingFile = await env.COSPEC_DB.prepare(
      'SELECT id FROM Files WHERE r2_key = ?'
    ).bind(fileKey).first();
    
    if (existingFile) {
      // Update existing file
      await env.COSPEC_DB.prepare(
        'UPDATE Files SET updated_at = ?, size = ? WHERE r2_key = ?'
      ).bind(now, content.length, fileKey).run();
    } else {
      // Insert new file
      await env.COSPEC_DB.prepare(
        'INSERT INTO Files (id, project_id, name, path, r2_key, size, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        crypto.randomUUID(),
        'default', // Default project ID
        filePath.split('/').pop(),
        filePath,
        fileKey,
        content.length,
        'system', // Default user ID
        'system', // Default user ID
        now,
        now
      ).run();
    }
    
    return generateResponse({ success: true, path: filePath });
  } catch (error) {
    console.error('Error saving file:', error);
    return generateResponse({ error: 'Failed to save file' }, { status: 500 });
  }
}

/**
 * Create new file
 */
export async function createFile(request, env) {
  try {
    const filePath = getFilePath(request);
    if (!filePath) {
      return generateResponse({ error: 'Invalid file path' }, { status: 400 });
    }
    
    // Check if file already exists
    const existingObject = await env.COSPEC_STORAGE.head(`files/${filePath}`);
    if (existingObject) {
      return generateResponse({ error: `File already exists: ${filePath}` }, { status: 409 });
    }
    
    // Parse request body
    const { content = '' } = await request.json();
    
    // Create file in R2
    await env.COSPEC_STORAGE.put(`files/${filePath}`, content);
    
    // Send notification about file creation
    await sendNotification('FILE_ADDED', filePath, env);
    
    // Add file metadata to D1
    const fileKey = `files/${filePath}`;
    const now = Date.now();
    
    await env.COSPEC_DB.prepare(
      'INSERT INTO Files (id, project_id, name, path, r2_key, size, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      crypto.randomUUID(),
      'default', // Default project ID
      filePath.split('/').pop(),
      filePath,
      fileKey,
      content.length,
      'system', // Default user ID
      'system', // Default user ID
      now,
      now
    ).run();
    
    return generateResponse({ success: true, path: filePath }, { status: 201 });
  } catch (error) {
    console.error('Error creating file:', error);
    return generateResponse({ error: 'Failed to create file' }, { status: 500 });
  }
}

/**
 * Delete file
 */
export async function deleteFile(request, env) {
  try {
    const filePath = getFilePath(request);
    if (!filePath) {
      return generateResponse({ error: 'Invalid file path' }, { status: 400 });
    }
    
    // Check if file exists
    const existingObject = await env.COSPEC_STORAGE.head(`files/${filePath}`);
    if (!existingObject) {
      return generateResponse({ error: `File not found: ${filePath}` }, { status: 404 });
    }
    
    // Delete file from R2
    await env.COSPEC_STORAGE.delete(`files/${filePath}`);
    
    // Send notification about file deletion
    await sendNotification('FILE_DELETED', filePath, env);
    
    // Delete file metadata from D1
    await env.COSPEC_DB.prepare(
      'DELETE FROM Files WHERE r2_key = ?'
    ).bind(`files/${filePath}`).run();
    
    return generateResponse({ success: true, path: filePath });
  } catch (error) {
    console.error('Error deleting file:', error);
    return generateResponse({ error: 'Failed to delete file' }, { status: 500 });
  }
}

/**
 * Rename file
 */
export async function renameFile(request, env) {
  try {
    const filePath = getFilePath(request);
    if (!filePath) {
      return generateResponse({ error: 'Invalid file path' }, { status: 400 });
    }
    
    // Parse request body
    const { newPath } = await request.json();
    if (!newPath) {
      return generateResponse({ error: 'New path is required' }, { status: 400 });
    }
    
    // Check if source file exists
    const sourceObject = await env.COSPEC_STORAGE.get(`files/${filePath}`);
    if (!sourceObject) {
      return generateResponse({ error: `File not found: ${filePath}` }, { status: 404 });
    }
    
    // Check if target file already exists
    const targetObject = await env.COSPEC_STORAGE.head(`files/${newPath}`);
    if (targetObject) {
      return generateResponse({ error: `Target file already exists: ${newPath}` }, { status: 409 });
    }
    
    // Get source file content
    const content = await sourceObject.text();
    
    // Create new file
    await env.COSPEC_STORAGE.put(`files/${newPath}`, content);
    
    // Delete old file
    await env.COSPEC_STORAGE.delete(`files/${filePath}`);
    
    // Send notification about file rename
    await sendNotification('FILE_RENAMED', newPath, env);
    
    // Update file metadata in D1
    const now = Date.now();
    
    await env.COSPEC_DB.prepare(
      'UPDATE Files SET path = ?, name = ?, r2_key = ?, updated_at = ? WHERE r2_key = ?'
    ).bind(
      newPath,
      newPath.split('/').pop(),
      `files/${newPath}`,
      now,
      `files/${filePath}`
    ).run();
    
    return generateResponse({ success: true, oldPath: filePath, newPath });
  } catch (error) {
    console.error('Error renaming file:', error);
    return generateResponse({ error: 'Failed to rename file' }, { status: 500 });
  }
}

/**
 * Refresh file cache
 */
export async function refreshFileCache(env) {
  try {
    // List all objects in the R2 bucket with .md extension
    const objects = await env.COSPEC_STORAGE.list({ prefix: 'files/', delimiter: '/' });
    
    // Transform R2 objects to file list format
    const files = objects.objects
      .filter(obj => obj.key.endsWith('.md'))
      .map(obj => {
        const path = obj.key.replace('files/', '');
        return {
          path,
          name: path.split('/').pop(),
          size: obj.size,
          lastModified: obj.uploaded
        };
      });
    
    return generateResponse({ success: true, fileCount: files.length });
  } catch (error) {
    console.error('Error refreshing file cache:', error);
    return generateResponse({ error: 'Failed to refresh file cache' }, { status: 500 });
  }
}
