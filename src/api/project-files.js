/**
 * Project file operations API for CoSpec SaaS platform
 */

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

/**
 * Delete file from a project
 */
export async function deleteProjectFile(request, env, user, projectId, fileId) {
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
    
    // Delete file from R2
    await env.COSPEC_STORAGE.delete(file.r2_key);
    
    // Delete file versions from R2
    const versions = await env.COSPEC_DB.prepare(`
      SELECT r2_key
      FROM File_Versions
      WHERE file_id = ?
    `).bind(fileId).all();
    
    if (versions.results && versions.results.length > 0) {
      for (const version of versions.results) {
        await env.COSPEC_STORAGE.delete(version.r2_key);
      }
    }
    
    // Delete file versions from D1
    await env.COSPEC_DB.prepare(`
      DELETE FROM File_Versions
      WHERE file_id = ?
    `).bind(fileId).run();
    
    // Delete file from D1
    await env.COSPEC_DB.prepare(`
      DELETE FROM Files
      WHERE id = ?
    `).bind(fileId).run();
    
    // Send notification
    await sendNotification('FILE_DELETED', file.path, env);
    
    return generateResponse({
      success: true,
      id: fileId,
      path: file.path
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return generateResponse({ error: 'Failed to delete file' }, { status: 500 });
  }
}

/**
 * Rename file in a project
 */
export async function renameProjectFile(request, env, user, projectId, fileId) {
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
    const { newName, newPath } = await request.json();
    
    if (!newName && !newPath) {
      return generateResponse({ error: 'New name or path is required' }, { status: 400 });
    }
    
    // Determine new file path
    let filePath = file.path;
    let fileName = file.name;
    
    if (newName) {
      fileName = newName;
      // If only name is changing, update the last part of the path
      if (!newPath) {
        const pathParts = filePath.split('/');
        pathParts[pathParts.length - 1] = newName;
        filePath = pathParts.join('/');
      }
    }
    
    if (newPath) {
      filePath = newPath.endsWith('/') ? `${newPath}${fileName}` : `${newPath}/${fileName}`;
    }
    
    // Check if target file already exists
    const existingFile = await env.COSPEC_DB.prepare(`
      SELECT id
      FROM Files
      WHERE project_id = ? AND path = ? AND id != ?
    `).bind(projectId, filePath, fileId).first();
    
    if (existingFile) {
      return generateResponse({ error: `File already exists: ${filePath}` }, { status: 409 });
    }
    
    // Get file content from R2
    const object = await env.COSPEC_STORAGE.get(file.r2_key);
    if (!object) {
      return generateResponse({ error: 'File content not found' }, { status: 404 });
    }
    
    const content = await object.text();
    
    // Create new R2 key
    const newR2Key = `${projectId}/${filePath}`;
    
    // Create file at new location
    await env.COSPEC_STORAGE.put(newR2Key, content);
    
    // Delete old file
    await env.COSPEC_STORAGE.delete(file.r2_key);
    
    // Update file metadata
    const now = Date.now();
    await env.COSPEC_DB.prepare(`
      UPDATE Files
      SET name = ?, path = ?, r2_key = ?, updated_at = ?, updated_by = ?
      WHERE id = ?
    `).bind(
      fileName,
      filePath,
      newR2Key,
      now,
      user.id,
      fileId
    ).run();
    
    // Send notification
    await sendNotification('FILE_RENAMED', filePath, env);
    
    return generateResponse({
      id: fileId,
      name: fileName,
      path: filePath,
      updated_at: now
    });
  } catch (error) {
    console.error('Error renaming file:', error);
    return generateResponse({ error: 'Failed to rename file' }, { status: 500 });
  }
}

/**
 * Get file version history
 */
export async function getFileVersions(request, env, user, projectId, fileId) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has access to project
    const { hasAccess } = await hasProjectAccess(env, projectId, user.id);
    if (!hasAccess) {
      return generateResponse({ error: 'Project not found or access denied' }, { status: 404 });
    }
    
    // Check if file exists and belongs to project
    const file = await env.COSPEC_DB.prepare(`
      SELECT id, name, path
      FROM Files
      WHERE id = ? AND project_id = ?
    `).bind(fileId, projectId).first();
    
    if (!file) {
      return generateResponse({ error: 'File not found' }, { status: 404 });
    }
    
    // Get file versions
    const versions = await env.COSPEC_DB.prepare(`
      SELECT fv.id, fv.version, fv.size, fv.created_at, u.name as created_by_name
      FROM File_Versions fv
      LEFT JOIN Users u ON fv.created_by = u.id
      WHERE fv.file_id = ?
      ORDER BY fv.version DESC
    `).bind(fileId).all();
    
    return generateResponse({
      file_id: fileId,
      file_name: file.name,
      file_path: file.path,
      versions: versions.results || []
    });
  } catch (error) {
    console.error('Error getting file versions:', error);
    return generateResponse({ error: 'Failed to get file versions' }, { status: 500 });
  }
}

/**
 * Get specific file version
 */
export async function getFileVersion(request, env, user, projectId, fileId, versionId) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has access to project
    const { hasAccess } = await hasProjectAccess(env, projectId, user.id);
    if (!hasAccess) {
      return generateResponse({ error: 'Project not found or access denied' }, { status: 404 });
    }
    
    // Check if file exists and belongs to project
    const file = await env.COSPEC_DB.prepare(`
      SELECT id, name, path
      FROM Files
      WHERE id = ? AND project_id = ?
    `).bind(fileId, projectId).first();
    
    if (!file) {
      return generateResponse({ error: 'File not found' }, { status: 404 });
    }
    
    // Get version metadata
    const version = await env.COSPEC_DB.prepare(`
      SELECT id, version, r2_key, size, created_at, created_by
      FROM File_Versions
      WHERE id = ? AND file_id = ?
    `).bind(versionId, fileId).first();
    
    if (!version) {
      return generateResponse({ error: 'Version not found' }, { status: 404 });
    }
    
    // Get version content from R2
    const object = await env.COSPEC_STORAGE.get(version.r2_key);
    if (!object) {
      return generateResponse({ error: 'Version content not found' }, { status: 404 });
    }
    
    const content = await object.text();
    
    // Get creator name
    const creator = await env.COSPEC_DB.prepare(`
      SELECT name
      FROM Users
      WHERE id = ?
    `).bind(version.created_by).first();
    
    return generateResponse({
      id: version.id,
      file_id: fileId,
      file_name: file.name,
      file_path: file.path,
      version: version.version,
      content,
      size: version.size,
      created_at: version.created_at,
      created_by: creator ? creator.name : 'Unknown'
    });
  } catch (error) {
    console.error('Error getting file version:', error);
    return generateResponse({ error: 'Failed to get file version' }, { status: 500 });
  }
}

/**
 * Restore file version
 */
export async function restoreFileVersion(request, env, user, projectId, fileId, versionId) {
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
    
    // Check if file exists and belongs to project
    const file = await env.COSPEC_DB.prepare(`
      SELECT id, name, path, r2_key
      FROM Files
      WHERE id = ? AND project_id = ?
    `).bind(fileId, projectId).first();
    
    if (!file) {
      return generateResponse({ error: 'File not found' }, { status: 404 });
    }
    
    // Get version metadata
    const version = await env.COSPEC_DB.prepare(`
      SELECT id, version, r2_key, size
      FROM File_Versions
      WHERE id = ? AND file_id = ?
    `).bind(versionId, fileId).first();
    
    if (!version) {
      return generateResponse({ error: 'Version not found' }, { status: 404 });
    }
    
    // Get version content from R2
    const object = await env.COSPEC_STORAGE.get(version.r2_key);
    if (!object) {
      return generateResponse({ error: 'Version content not found' }, { status: 404 });
    }
    
    const content = await object.text();
    
    // Save content as current version
    await env.COSPEC_STORAGE.put(file.r2_key, content);
    
    // Update file metadata
    const now = Date.now();
    await env.COSPEC_DB.prepare(`
      UPDATE Files
      SET updated_at = ?, updated_by = ?, size = ?
      WHERE id = ?
    `).bind(now, user.id, version.size, fileId).run();
    
    // Create new version record
    const newVersionId = crypto.randomUUID();
    const newVersionKey = `${file.r2_key}_versions/${newVersionId}`;
    
    // Save version to R2
    await env.COSPEC_STORAGE.put(newVersionKey, content);
    
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
      newVersionId,
      fileId,
      versionNumber,
      newVersionKey,
      version.size,
      user.id,
      now
    ).run();
    
    // Send notification
    await sendNotification('FILE_RESTORED', file.path, env);
    
    return generateResponse({
      id: fileId,
      restored_from_version: version.version,
      new_version: versionNumber,
      updated_at: now
    });
  } catch (error) {
    console.error('Error restoring file version:', error);
    return generateResponse({ error: 'Failed to restore file version' }, { status: 500 });
  }
}
