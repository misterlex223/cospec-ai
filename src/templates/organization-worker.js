/**
 * CoSpec - Organization Worker Template
 * 
 * This template is used to create organization-specific workers.
 * Each organization gets its own worker instance with isolated resources.
 */

export default {
  /**
   * Handle incoming requests for a specific organization
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
      
      // Handle file operations
      if (path.startsWith('/files/')) {
        return await handleFileRequest(request, env, ctx);
      }
      
      // Handle Git operations
      if (path.startsWith('/git/')) {
        return await handleGitRequest(request, env, ctx);
      }
      
      // Default: 404 Not Found
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Error in organization worker:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};

/**
 * Handle API requests
 */
async function handleApiRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Projects API
  if (path.startsWith('/api/projects')) {
    return await handleProjectsApi(request, env, ctx);
  }
  
  // Users API
  if (path.startsWith('/api/users')) {
    return await handleUsersApi(request, env, ctx);
  }
  
  // Notifications API
  if (path.startsWith('/api/notifications')) {
    return await handleNotificationsApi(request, env, ctx);
  }
  
  // Default API response
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handle file operations
 */
async function handleFileRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  
  // Import file operations
  const { getFile, saveFile, createFile, deleteFile, renameFile } = await import('../api/files.js');
  
  // Handle different HTTP methods
  switch (method) {
    case 'GET':
      return await getFile(request, env);
    case 'PUT':
      return await createFile(request, env);
    case 'POST':
      return await saveFile(request, env);
    case 'DELETE':
      return await deleteFile(request, env);
    case 'PATCH':
      return await renameFile(request, env);
    default:
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
  }
}

/**
 * Handle Git operations
 */
async function handleGitRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  
  // Extract project ID and Git operation from URL
  const pathParts = path.split('/').filter(Boolean);
  if (pathParts.length < 3 || pathParts[0] !== 'git') {
    return new Response(JSON.stringify({ error: 'Invalid Git operation path' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const projectId = pathParts[1];
  const operation = pathParts[2];
  
  // Handle different Git operations
  switch (operation) {
    case 'pull':
      return await gitPull(projectId, request, env);
    case 'commit':
      return await gitCommit(projectId, request, env);
    case 'push':
      return await gitPush(projectId, request, env);
    case 'status':
      return await gitStatus(projectId, env);
    case 'branch':
      return await gitBranch(projectId, request, env);
    default:
      return new Response(JSON.stringify({ error: 'Invalid Git operation' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
  }
}

// File operations (placeholder implementations)
async function getFile(projectId, filePath, env) {
  // Implementation will be added later
  return new Response(JSON.stringify({ message: 'Get file not implemented yet' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function createFile(projectId, filePath, request, env) {
  // Implementation will be added later
  return new Response(JSON.stringify({ message: 'Create file not implemented yet' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function updateFile(projectId, filePath, request, env) {
  // Implementation will be added later
  return new Response(JSON.stringify({ message: 'Update file not implemented yet' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function deleteFile(projectId, filePath, env) {
  // Implementation will be added later
  return new Response(JSON.stringify({ message: 'Delete file not implemented yet' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Git operations (placeholder implementations)
async function gitPull(projectId, request, env) {
  // Implementation will be added later
  return new Response(JSON.stringify({ message: 'Git pull not implemented yet' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function gitCommit(projectId, request, env) {
  // Implementation will be added later
  return new Response(JSON.stringify({ message: 'Git commit not implemented yet' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function gitPush(projectId, request, env) {
  // Implementation will be added later
  return new Response(JSON.stringify({ message: 'Git push not implemented yet' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function gitStatus(projectId, env) {
  // Implementation will be added later
  return new Response(JSON.stringify({ message: 'Git status not implemented yet' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function gitBranch(projectId, request, env) {
  // Implementation will be added later
  return new Response(JSON.stringify({ message: 'Git branch not implemented yet' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' }
  });
}

// API handlers (placeholder implementations)
async function handleProjectsApi(request, env, ctx) {
  // Implementation will be added later
  return new Response(JSON.stringify({ message: 'Projects API not implemented yet' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleUsersApi(request, env, ctx) {
  // Implementation will be added later
  return new Response(JSON.stringify({ message: 'Users API not implemented yet' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleNotificationsApi(request, env, ctx) {
  const url = new URL(request.url);
  const method = request.method;
  
  // Import notifications module
  const { getNotifications } = await import('../api/notifications.js');
  
  // Handle GET requests for polling notifications
  if (method === 'GET') {
    return await getNotifications(request, env);
  }
  
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}
