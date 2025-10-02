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

// Import notification functions
import { sendNotification } from './notifications.js';

// Helper function to check if user has access to project
async function hasProjectAccess(env, projectId, userId) {
  const projectUser = await env.COSPEC_DB.prepare(
    'SELECT role FROM Project_Users WHERE project_id = ? AND user_id = ?'
  ).bind(projectId, userId).first();
  
  if (projectUser) {
    return { hasAccess: true, role: projectUser.role };
  }
  
  // Check if user has organization-level access
  const project = await env.COSPEC_DB.prepare(
    'SELECT organization_id FROM Projects WHERE id = ?'
  ).bind(projectId).first();
  
  if (!project) {
    return { hasAccess: false };
  }
  
  const orgUser = await env.COSPEC_DB.prepare(
    'SELECT role FROM Organization_Users WHERE organization_id = ? AND user_id = ?'
  ).bind(project.organization_id, userId).first();
  
  return { 
    hasAccess: !!orgUser,
    role: orgUser ? (orgUser.role === 'admin' ? 'admin' : 'viewer') : null,
    orgRole: orgUser ? orgUser.role : null
  };
}

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
 * List files for a project
 */
export async function listProjectFiles(request, env, user, projectId) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has access to project
    const { hasAccess } = await hasProjectAccess(env, projectId, user.id);
    if (!hasAccess) {
      return generateResponse({ error: 'Project not found or access denied' }, { status: 404 });
    }
    
    // Get files from database
    const files = await env.COSPEC_DB.prepare(`
      SELECT id, name, path, size, git_status, last_commit_hash, created_at, updated_at
      FROM Files
      WHERE project_id = ?
      ORDER BY path
    `).bind(projectId).all();
    
    return generateResponse({ files: files.results || [] });
  } catch (error) {
    console.error('Error listing files:', error);
    return generateResponse({ error: 'Failed to list files' }, { status: 500 });
  }
}

/**
 * List all Markdown files (legacy API)
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
 * Get file content for a project
 */
export async function getProjectFile(request, env, user, projectId, fileId) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has access to project
    const { hasAccess } = await hasProjectAccess(env, projectId, user.id);
    if (!hasAccess) {
      return generateResponse({ error: 'Project not found or access denied' }, { status: 404 });
    }
    
    // Get file metadata
    const file = await env.COSPEC_DB.prepare(`
      SELECT id, name, path, r2_key, size, git_status, last_commit_hash, created_at, updated_at
      FROM Files
      WHERE id = ? AND project_id = ?
    `).bind(fileId, projectId).first();
    
    if (!file) {
      return generateResponse({ error: 'File not found' }, { status: 404 });
    }
    
    // Get file content from R2
    const object = await env.COSPEC_STORAGE.get(file.r2_key);
    if (!object) {
      return generateResponse({ error: 'File content not found' }, { status: 404 });
    }
    
    // Read file content
    const content = await object.text();
    
    return generateResponse({
      id: file.id,
      name: file.name,
      path: file.path,
      content,
      size: file.size,
      git_status: file.git_status,
      last_commit_hash: file.last_commit_hash,
      created_at: file.created_at,
      updated_at: file.updated_at
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return generateResponse({ error: 'Failed to read file' }, { status: 500 });
  }
}

/**
 * Read file content (legacy API)
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
 * Save file content for a project
 */
export async function saveProjectFile(request, env, user, projectId, fileId) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has write access to project
    const { hasAccess, role } = await hasProjectAccess(env, projectId, user.id);
    if (!hasAccess) {
      return generateResponse({ error: 'Project not found or access denied' }, { status: 404 });
    }
    
    if (role === 'viewer') {
      return generateResponse({ error: 'Write access required' }, { status: 403 });
    }
    
    // Get file metadata
    const file = await env.COSPEC_DB.prepare(`
      SELECT id, name, path, r2_key
      FROM Files
      WHERE id = ? AND project_id = ?
    `).bind(fileId, projectId).first();
    
    if (!file) {
      return generateResponse({ error: 'File not found' }, { status: 404 });
    }
    
    // Parse request body
    const { content } = await request.json();
    if (content === undefined) {
      return generateResponse({ error: 'Content is required' }, { status: 400 });
    }
    
    // Save file to R2
    await env.COSPEC_STORAGE.put(file.r2_key, content);
    
    // Update file metadata
    const now = Date.now();
    await env.COSPEC_DB.prepare(`
      UPDATE Files
      SET updated_at = ?, updated_by = ?, size = ?
      WHERE id = ?
    `).bind(now, user.id, content.length, fileId).run();
    
    // Create file version
    const versionId = crypto.randomUUID();
    const versionKey = `${file.r2_key}_versions/${versionId}`;
    
    // Save version to R2
    await env.COSPEC_STORAGE.put(versionKey, content);
    
    // Get latest version number
    const latestVersion = await env.COSPEC_DB.prepare(`
      SELECT MAX(version) as max_version
      FROM File_Versions
      WHERE file_id = ?
    `).bind(fileId).first();
    
    const versionNumber = (latestVersion && latestVersion.max_version) ? latestVersion.max_version + 1 : 1;
    
    // Create version record
    await env.COSPEC_DB.prepare(`
      INSERT INTO File_Versions (id, file_id, version, r2_key, size, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      versionId,
      fileId,
      versionNumber,
      versionKey,
      content.length,
      user.id,
      now
    ).run();
    
    // Send notification
    await sendNotification('FILE_CHANGED', file.path, env);
    
    return generateResponse({
      id: fileId,
      updated_at: now,
      version: versionNumber
    });
  } catch (error) {
    console.error('Error saving file:', error);
    return generateResponse({ error: 'Failed to save file' }, { status: 500 });
  }
}

/**
 * Save file content (legacy API)
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
 * Create new file in a project
 */
export async function createProjectFile(request, env, user, projectId) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has write access to project
    const { hasAccess, role } = await hasProjectAccess(env, projectId, user.id);
    if (!hasAccess) {
      return generateResponse({ error: 'Project not found or access denied' }, { status: 404 });
    }
    
    if (role === 'viewer') {
      return generateResponse({ error: 'Write access required' }, { status: 403 });
    }
    
    // Parse request body
    const { name, path, content = '' } = await request.json();
    
    // Validate input
    if (!name) {
      return generateResponse({ error: 'File name is required' }, { status: 400 });
    }
    
    // Normalize path
    const filePath = path ? `${path}/${name}` : name;
    
    // Check if file already exists
    const existingFile = await env.COSPEC_DB.prepare(`
      SELECT id
      FROM Files
      WHERE project_id = ? AND path = ?
    `).bind(projectId, filePath).first();
    
    if (existingFile) {
      return generateResponse({ error: `File already exists: ${filePath}` }, { status: 409 });
    }
    
    // Generate file ID and R2 key
    const fileId = crypto.randomUUID();
    const r2Key = `${projectId}/${filePath}`;
    const now = Date.now();
    
    // Create file in R2
    await env.COSPEC_STORAGE.put(r2Key, content);
    
    // Add file metadata to D1
    await env.COSPEC_DB.prepare(`
      INSERT INTO Files (
        id, project_id, name, path, r2_key, size,
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      fileId,
      projectId,
      name,
      filePath,
      r2Key,
      content.length,
      user.id,
      user.id,
      now,
      now
    ).run();
    
    // Send notification
    await sendNotification('FILE_ADDED', filePath, env);
    
    return generateResponse({
      id: fileId,
      name,
      path: filePath,
      size: content.length,
      created_at: now,
      updated_at: now
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating file:', error);
    return generateResponse({ error: 'Failed to create file' }, { status: 500 });
  }
}

/**
 * Create new file (legacy API)
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
