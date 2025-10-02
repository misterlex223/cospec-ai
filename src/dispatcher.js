/**
 * CoSpec - Dynamic Dispatch Worker
 * 
 * This is the main entry point for the CoSpec SaaS platform.
 * It handles authentication, routing, and dispatching requests to organization-specific workers.
 */

// Import utilities
import { extractOrgId, generateResponse } from './utils/dispatcher-utils.js';

export default {
  /**
   * Handle incoming requests
   */
  async fetch(request, env, ctx) {
    try {
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
    return generateResponse({ status: 'ok' });
  }
  
  // Organization management endpoints
  if (path.startsWith('/api/organizations')) {
    // Authenticate request
    const user = await authenticateRequest(request, env);
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Handle organization CRUD operations
    // ...
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
    // ...
  }
  
  if (path === '/auth/register') {
    // Handle registration
    // ...
  }
  
  if (path === '/auth/logout') {
    // Handle logout
    // ...
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
 * Authenticate request
 */
async function authenticateRequest(request, env) {
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
