/**
 * CoSpec - Dynamic Dispatch Worker
 * 
 * This is the main entry point for the CoSpec SaaS platform.
 * It handles authentication, routing, and dispatching requests to organization-specific workers.
 */

// Import utilities
import { extractOrgId, generateResponse } from './utils/dispatcher-utils.js';
import { authenticateRequest } from './utils/auth.js';
import { initializeEnvironment } from './utils/setup.js';

export default {
  /**
   * Handle incoming requests
   */
  async fetch(request, env, ctx) {
    try {
      // Initialize environment if needed
      ctx.waitUntil(initializeEnvironment(env));
      // Parse request URL
      const url = new URL(request.url);
      const path = url.pathname;
      
      // Handle API requests
      if (path.startsWith('/api/')) {
        return await handleApiRequest(request, env, ctx);
      }
      
      // Handle auth requests
      if (path.startsWith('/auth/')) {
        return await handleAuthRequest(request, env, ctx);
      }
      
      // Handle organization-specific requests
      const orgId = extractOrgId(request, url);
      if (orgId) {
        return await dispatchToOrgWorker(orgId, request, env, ctx);
      }
      
      // Default: serve static assets from R2 or return 404
      return await serveStaticAssets(request, env, ctx);
    } catch (error) {
      console.error('Error in dispatcher:', error);
      return generateResponse({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      }, { status: 500 });
    }
  }
};

/**
 * Handle API requests
 */
async function handleApiRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // API routes
  if (path === '/api/health') {
    return generateResponse({ 
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  }
  
  // Authentication endpoints
  if (path.startsWith('/api/auth')) {
    // Handle login endpoint
    if (path === '/api/auth/login') {
      const { loginUser } = await import('./api/users.js');
      return await loginUser(request, env);
    }
    
    // Handle register endpoint
    if (path === '/api/auth/register') {
      const { registerUser } = await import('./api/users.js');
      return await registerUser(request, env);
    }
    
    // Handle profile endpoint
    if (path === '/api/auth/profile') {
      // Authenticate request
      const user = await authenticateRequest(request, env);
      if (!user) {
        return generateResponse({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const { getUserProfile } = await import('./api/users.js');
      return await getUserProfile(request, env, user);
    }
    
    // Handle profile update endpoint
    if (path === '/api/auth/profile' && request.method === 'PUT') {
      // Authenticate request
      const user = await authenticateRequest(request, env);
      if (!user) {
        return generateResponse({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const { updateUserProfile } = await import('./api/users.js');
      return await updateUserProfile(request, env, user);
    }
  }
  
  // Organization endpoints
  if (path.startsWith('/api/organizations')) {
    // Authenticate request
    const user = await authenticateRequest(request, env);
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Handle list organizations endpoint
    if (path === '/api/organizations' && request.method === 'GET') {
      const { listOrganizations } = await import('./api/organizations.js');
      return await listOrganizations(request, env, user);
    }
    
    // Handle create organization endpoint
    if (path === '/api/organizations' && request.method === 'POST') {
      const { createOrganization } = await import('./api/organizations.js');
      return await createOrganization(request, env, user);
    }
    
    // Handle specific organization endpoints
    const orgMatch = path.match(/^\/api\/organizations\/([\w-]+)/);
    if (orgMatch) {
      const orgId = orgMatch[1];
      
      // Handle get organization endpoint
      if (request.method === 'GET') {
        const { getOrganization } = await import('./api/organizations.js');
        return await getOrganization(request, env, user, orgId);
      }
      
      // Handle update organization endpoint
      if (request.method === 'PUT') {
        const { updateOrganization } = await import('./api/organizations.js');
        return await updateOrganization(request, env, user, orgId);
      }
      
      // Handle delete organization endpoint
      if (request.method === 'DELETE') {
        const { deleteOrganization } = await import('./api/organizations.js');
        return await deleteOrganization(request, env, user, orgId);
      }
      
      // Handle organization members endpoints
      if (path.endsWith('/members') && request.method === 'POST') {
        const { addOrganizationMember } = await import('./api/organizations.js');
        return await addOrganizationMember(request, env, user, orgId);
      }
      
      const memberMatch = path.match(/^\/api\/organizations\/([\w-]+)\/members\/([\w-]+)/);
      if (memberMatch && request.method === 'DELETE') {
        const memberId = memberMatch[2];
        const { removeOrganizationMember } = await import('./api/organizations.js');
        return await removeOrganizationMember(request, env, user, orgId, memberId);
      }
      
      // Handle organization projects endpoints
      if (path.endsWith('/projects') && request.method === 'GET') {
        const { listProjects } = await import('./api/projects.js');
        return await listProjects(request, env, user, orgId);
      }
      
      if (path.endsWith('/projects') && request.method === 'POST') {
        const { createProject } = await import('./api/projects.js');
        return await createProject(request, env, user, orgId);
      }
    }
  }
  
  // Project endpoints
  if (path.startsWith('/api/projects')) {
    // Authenticate request
    const user = await authenticateRequest(request, env);
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Handle specific project endpoints
    const projectMatch = path.match(/^\/api\/projects\/([\w-]+)/);
    if (projectMatch) {
      const projectId = projectMatch[1];
      
      // Handle get project endpoint
      if (request.method === 'GET' && projectMatch[0] === path) {
        const { getProject } = await import('./api/projects.js');
        return await getProject(request, env, user, projectId);
      }
      
      // Handle update project endpoint
      if (request.method === 'PUT' && projectMatch[0] === path) {
        const { updateProject } = await import('./api/projects.js');
        return await updateProject(request, env, user, projectId);
      }
      
      // Handle delete project endpoint
      if (request.method === 'DELETE' && projectMatch[0] === path) {
        const { deleteProject } = await import('./api/projects.js');
        return await deleteProject(request, env, user, projectId);
      }
      
      // Handle GitHub integration endpoints
      if (path.endsWith('/github/connect') && request.method === 'POST') {
        const { connectGitHubRepo } = await import('./api/github.js');
        return await connectGitHubRepo(request, env, user, projectId);
      }
      
      if (path.endsWith('/github/pull') && request.method === 'POST') {
        const { pullFromGitHub } = await import('./api/github.js');
        return await pullFromGitHub(request, env, user, projectId);
      }
      
      if (path.endsWith('/github/push') && request.method === 'POST') {
        const { pushToGitHub } = await import('./api/github.js');
        return await pushToGitHub(request, env, user, projectId);
      }
      
      if (path.endsWith('/github/operations') && request.method === 'GET') {
        const { getGitOperations } = await import('./api/github.js');
        return await getGitOperations(request, env, user, projectId);
      }
      
      // Handle specific Git operation endpoint
      const gitOpMatch = path.match(/^\/api\/projects\/([\w-]+)\/github\/operations\/([\w-]+)/);
      if (gitOpMatch && request.method === 'GET') {
        const operationId = gitOpMatch[2];
        const { getGitOperation } = await import('./api/github.js');
        return await getGitOperation(request, env, user, projectId, operationId);
      }
      
      // Handle project members endpoints
      if (path.endsWith('/members') && request.method === 'POST') {
        const { addProjectMember } = await import('./api/projects.js');
        return await addProjectMember(request, env, user, projectId);
      }
      
      const memberMatch = path.match(/^\/api\/projects\/([\w-]+)\/members\/([\w-]+)/);
      if (memberMatch && request.method === 'DELETE') {
        const memberId = memberMatch[2];
        const { removeProjectMember } = await import('./api/projects.js');
        return await removeProjectMember(request, env, user, projectId, memberId);
      }
      
      // Handle project files endpoints
      if (path.endsWith('/files') && request.method === 'GET') {
        const { listProjectFiles } = await import('./api/files.js');
        return await listProjectFiles(request, env, user, projectId);
      }
      
      if (path.endsWith('/files') && request.method === 'POST') {
        const { createProjectFile } = await import('./api/project-files.js');
        return await createProjectFile(request, env, user, projectId);
      }
      
      // Handle specific file endpoints
      const fileMatch = path.match(/^\/api\/projects\/([\w-]+)\/files\/([\w-]+)/);
      if (fileMatch) {
        const fileId = fileMatch[2];
        
        // Handle get file endpoint
        if (request.method === 'GET' && fileMatch[0] === path) {
          const { getProjectFile } = await import('./api/files.js');
          return await getProjectFile(request, env, user, projectId, fileId);
        }
        
        // Handle update file endpoint
        if (request.method === 'PUT' && fileMatch[0] === path) {
          const { saveProjectFile } = await import('./api/files.js');
          return await saveProjectFile(request, env, user, projectId, fileId);
        }
        
        // Handle delete file endpoint
        if (request.method === 'DELETE' && fileMatch[0] === path) {
          const { deleteProjectFile } = await import('./api/project-files.js');
          return await deleteProjectFile(request, env, user, projectId, fileId);
        }
        
        // Handle rename file endpoint
        if (request.method === 'PATCH' && fileMatch[0] === path) {
          const { renameProjectFile } = await import('./api/project-files.js');
          return await renameProjectFile(request, env, user, projectId, fileId);
        }
        
        // Handle file versions endpoints
        if (path.endsWith('/versions') && request.method === 'GET') {
          const { getFileVersions } = await import('./api/project-files.js');
          return await getFileVersions(request, env, user, projectId, fileId);
        }
        
        // Handle specific version endpoints
        const versionMatch = path.match(/^\/api\/projects\/([\w-]+)\/files\/([\w-]+)\/versions\/([\w-]+)/);
        if (versionMatch) {
          const versionId = versionMatch[3];
          
          // Handle get version endpoint
          if (request.method === 'GET') {
            const { getFileVersion } = await import('./api/project-files.js');
            return await getFileVersion(request, env, user, projectId, fileId, versionId);
          }
          
          // Handle restore version endpoint
          if (request.method === 'POST') {
            const { restoreFileVersion } = await import('./api/project-files.js');
            return await restoreFileVersion(request, env, user, projectId, fileId, versionId);
          }
        }
      }
    }
  }
  
  // Notifications endpoints
  if (path.startsWith('/api/notifications')) {
    // Authenticate request
    const user = await authenticateRequest(request, env);
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Handle get notifications endpoint
    if (request.method === 'GET') {
      const { getUserNotifications } = await import('./api/notifications.js');
      return await getUserNotifications(request, env, user);
    }
    
    // Handle mark notifications as read endpoint
    if (request.method === 'POST' && path.endsWith('/read')) {
      const { markNotificationsRead } = await import('./api/notifications.js');
      return await markNotificationsRead(request, env, user);
    }
  }
  
  // Legacy file operations endpoints
  if (path.startsWith('/api/files')) {
    // Handle file list endpoint
    if (path === '/api/files') {
      const { listFiles } = await import('./api/files.js');
      return await listFiles(env);
    }
    
    // Handle file cache refresh endpoint
    if (path === '/api/files/refresh') {
      const { refreshFileCache } = await import('./api/files.js');
      return await refreshFileCache(env);
    }
    
    // Handle file operations
    if (path.startsWith('/api/files/') && path !== '/api/files/refresh') {
      const filePath = getFilePath(request);
      if (!filePath) {
        return generateResponse({ error: 'Invalid file path' }, { status: 400 });
      }
      
      // Handle file operations based on HTTP method
      if (request.method === 'GET') {
        const { getFile } = await import('./api/files.js');
        return await getFile(request, env);
      } else if (request.method === 'PUT') {
        // Authenticate request
        const user = await legacyAuthenticateRequest(request, env);
        if (!user) {
          return generateResponse({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { saveFile } = await import('./api/files.js');
        return await saveFile(request, env);
      } else if (request.method === 'POST') {
        // Authenticate request
        const user = await legacyAuthenticateRequest(request, env);
        if (!user) {
          return generateResponse({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { createFile } = await import('./api/files.js');
        return await createFile(request, env);
      } else if (request.method === 'DELETE') {
        // Authenticate request
        const user = await legacyAuthenticateRequest(request, env);
        if (!user) {
          return generateResponse({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { deleteFile } = await import('./api/files.js');
        return await deleteFile(request, env);
      } else if (request.method === 'PATCH') {
        // Authenticate request
        const user = await legacyAuthenticateRequest(request, env);
        if (!user) {
          return generateResponse({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { renameFile } = await import('./api/files.js');
        return await renameFile(request, env);
      } else {
        return generateResponse({ error: 'Method not allowed' }, { status: 405 });
      }
    }
    
    // For other file operations, dispatch to organization worker
    const orgId = extractOrgId(request, url) || 'default';
    return await dispatchToOrgWorker(orgId, request, env, ctx);
  }
  
  // Default API response
  return generateResponse({ error: 'Not Found' }, { status: 404 });
}

/**
 * Handle authentication requests
 */
async function handleAuthRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Auth routes
  if (path === '/auth/login') {
    // Handle login
    const { loginUser } = await import('./api/users.js');
    return await loginUser(request, env);
  }
  
  if (path === '/auth/register') {
    // Handle registration
    const { registerUser } = await import('./api/users.js');
    return await registerUser(request, env);
  }
  
  if (path === '/auth/logout') {
    // Handle logout
    // TODO: Implement logout
    return generateResponse({ success: true });
  }
  
  // Default auth response
  return generateResponse({ error: 'Not Found' }, { status: 404 });
}

/**
 * Dispatch request to organization-specific worker
 */
async function dispatchToOrgWorker(orgId, request, env, ctx) {
  try {
    // Check if organization exists
    const org = await getOrganization(orgId, env);
    if (!org) {
      return generateResponse({ error: 'Organization not found' }, { status: 404 });
    }
    
    // Get the worker for this organization
    const worker = env.COSPEC_NAMESPACE.get(orgId);
    if (!worker) {
      return generateResponse({ error: 'Worker not found' }, { status: 404 });
    }
    
    // Dispatch request to the organization worker
    return await worker.fetch(request);
  } catch (error) {
    console.error('Error dispatching to org worker:', error);
    return generateResponse({
      error: 'Dispatch Error',
      message: 'Failed to dispatch request to organization worker'
    }, { status: 500 });
  }
}

/**
 * Serve static assets from R2
 */
async function serveStaticAssets(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Serve index.html for root path
  if (path === '/') {
    const object = await env.COSPEC_STORAGE.get('static/index.html');
    if (object === null) {
      return generateResponse({ error: 'Not Found' }, { status: 404 });
    }
    
    const headers = new Headers();
    headers.set('content-type', 'text/html');
    return new Response(object.body, { headers });
  }
  
  // Serve static assets
  if (path.startsWith('/assets/')) {
    const key = `static${path}`;
    const object = await env.COSPEC_STORAGE.get(key);
    if (object === null) {
      return generateResponse({ error: 'Not Found' }, { status: 404 });
    }
    
    // Set appropriate content-type based on file extension
    const headers = new Headers();
    const contentType = getContentType(path);
    headers.set('content-type', contentType);
    
    return new Response(object.body, { headers });
  }
  
  // Default: 404 Not Found
  return generateResponse({ error: 'Not Found' }, { status: 404 });
}

/**
 * Get content type based on file extension
 */
function getContentType(path) {
  const ext = path.split('.').pop().toLowerCase();
  const contentTypes = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}

/**
 * Helper function to get file path from request
 */
function getFilePath(request) {
  const url = new URL(request.url);
  const pathMatch = url.pathname.match(/^\/api\/files\/(.*)/);
  return pathMatch ? decodeURIComponent(pathMatch[1]) : null;
}

/**
 * Legacy authenticate request function
 * This is kept for backward compatibility
 * Use the imported authenticateRequest from utils/auth.js instead
 */
async function legacyAuthenticateRequest(request, env) {
  // Extract token from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    return null;
  }
  
  // Validate token and get user
  try {
    // Query D1 database for session
    const session = await env.COSPEC_DB.prepare(
      'SELECT * FROM Sessions WHERE token = ? AND expires_at > ?'
    ).bind(token, Date.now()).first();
    
    if (!session) {
      return null;
    }
    
    // Get user from session
    const user = await env.COSPEC_DB.prepare(
      'SELECT * FROM Users WHERE id = ?'
    ).bind(session.user_id).first();
    
    return user;
  } catch (error) {
    console.error('Error authenticating request:', error);
    return null;
  }
}

/**
 * Get organization by ID
 */
async function getOrganization(orgId, env) {
  try {
    return await env.COSPEC_DB.prepare(
      'SELECT * FROM Organizations WHERE id = ?'
    ).bind(orgId).first();
  } catch (error) {
    console.error('Error getting organization:', error);
    return null;
  }
}
