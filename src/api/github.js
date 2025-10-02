/**
 * GitHub integration API for CoSpec SaaS platform
 */

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
 * Connect project to GitHub repository
 */
export async function connectGitHubRepo(request, env, user, projectId) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has admin access to project
    const { hasAccess, role } = await hasProjectAccess(env, projectId, user.id);
    if (!hasAccess) {
      return generateResponse({ error: 'Project not found or access denied' }, { status: 404 });
    }
    
    if (role !== 'admin') {
      return generateResponse({ error: 'Admin access required' }, { status: 403 });
    }
    
    const { github_repo, github_branch, github_access_token } = await request.json();
    
    // Validate input
    if (!github_repo) {
      return generateResponse({ error: 'GitHub repository is required' }, { status: 400 });
    }
    
    if (!github_access_token) {
      return generateResponse({ error: 'GitHub access token is required' }, { status: 400 });
    }
    
    // Validate GitHub access token by making a test API call
    const githubResponse = await fetch(`https://api.github.com/repos/${github_repo}`, {
      headers: {
        'Authorization': `token ${github_access_token}`,
        'User-Agent': 'CoSpec-App'
      }
    });
    
    if (!githubResponse.ok) {
      return generateResponse({ 
        error: 'Invalid GitHub repository or access token',
        github_status: githubResponse.status
      }, { status: 400 });
    }
    
    // Update project with GitHub details
    const now = Date.now();
    await env.COSPEC_DB.prepare(`
      UPDATE Projects
      SET github_repo = ?, github_branch = ?, github_access_token = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      github_repo,
      github_branch || 'main',
      github_access_token,
      now,
      projectId
    ).run();
    
    // Record Git operation
    const operationId = crypto.randomUUID();
    await env.COSPEC_DB.prepare(`
      INSERT INTO Git_Operations (
        id, project_id, operation_type, status, message,
        performed_by, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      operationId,
      projectId,
      'connect',
      'success',
      `Connected to GitHub repository ${github_repo}`,
      user.id,
      now,
      now
    ).run();
    
    return generateResponse({
      success: true,
      github_repo,
      github_branch: github_branch || 'main'
    });
  } catch (error) {
    console.error('Error connecting GitHub repo:', error);
    return generateResponse({ error: 'Failed to connect GitHub repository' }, { status: 500 });
  }
}

/**
 * Pull changes from GitHub repository
 */
export async function pullFromGitHub(request, env, user, projectId) {
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
    
    // Get project GitHub details
    const project = await env.COSPEC_DB.prepare(`
      SELECT github_repo, github_branch, github_access_token
      FROM Projects
      WHERE id = ?
    `).bind(projectId).first();
    
    if (!project || !project.github_repo || !project.github_access_token) {
      return generateResponse({ error: 'Project not connected to GitHub' }, { status: 400 });
    }
    
    // Record Git operation start
    const operationId = crypto.randomUUID();
    const now = Date.now();
    await env.COSPEC_DB.prepare(`
      INSERT INTO Git_Operations (
        id, project_id, operation_type, status, message,
        performed_by, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      operationId,
      projectId,
      'pull',
      'in_progress',
      `Pulling from ${project.github_repo}:${project.github_branch}`,
      user.id,
      now
    ).run();
    
    // Get repository contents from GitHub API
    const branch = project.github_branch || 'main';
    const githubResponse = await fetch(`https://api.github.com/repos/${project.github_repo}/git/trees/${branch}?recursive=1`, {
      headers: {
        'Authorization': `token ${project.github_access_token}`,
        'User-Agent': 'CoSpec-App'
      }
    });
    
    if (!githubResponse.ok) {
      // Update Git operation status to failed
      await env.COSPEC_DB.prepare(`
        UPDATE Git_Operations
        SET status = ?, message = ?, completed_at = ?
        WHERE id = ?
      `).bind(
        'failed',
        `Failed to pull from GitHub: ${githubResponse.status} ${githubResponse.statusText}`,
        Date.now(),
        operationId
      ).run();
      
      return generateResponse({ 
        error: 'Failed to fetch repository contents',
        github_status: githubResponse.status
      }, { status: 500 });
    }
    
    const repoData = await githubResponse.json();
    
    // Filter for markdown files
    const markdownFiles = repoData.tree.filter(item => 
      item.type === 'blob' && 
      item.path.endsWith('.md')
    );
    
    // Process each markdown file
    const processedFiles = [];
    for (const file of markdownFiles) {
      // Get file content
      const contentResponse = await fetch(`https://api.github.com/repos/${project.github_repo}/contents/${file.path}?ref=${branch}`, {
        headers: {
          'Authorization': `token ${project.github_access_token}`,
          'User-Agent': 'CoSpec-App'
        }
      });
      
      if (!contentResponse.ok) {
        console.error(`Failed to fetch content for ${file.path}: ${contentResponse.status}`);
        continue;
      }
      
      const contentData = await contentResponse.json();
      const content = atob(contentData.content); // Decode base64 content
      
      // Generate R2 key
      const r2Key = `${projectId}/${file.path}`;
      
      // Save file to R2
      await env.COSPEC_STORAGE.put(r2Key, content);
      
      // Check if file already exists in database
      const existingFile = await env.COSPEC_DB.prepare(`
        SELECT id
        FROM Files
        WHERE project_id = ? AND path = ?
      `).bind(projectId, file.path).first();
      
      if (existingFile) {
        // Update existing file
        await env.COSPEC_DB.prepare(`
          UPDATE Files
          SET size = ?, git_status = ?, last_commit_hash = ?, updated_at = ?, updated_by = ?
          WHERE id = ?
        `).bind(
          content.length,
          'synced',
          file.sha,
          now,
          user.id,
          existingFile.id
        ).run();
        
        // Update Git status
        await env.COSPEC_DB.prepare(`
          UPDATE File_Git_Status
          SET git_status = ?, last_commit_hash = ?, updated_at = ?
          WHERE file_id = ?
        `).bind(
          'synced',
          file.sha,
          now,
          existingFile.id
        ).run();
        
        processedFiles.push({
          id: existingFile.id,
          path: file.path,
          status: 'updated'
        });
      } else {
        // Create new file
        const fileId = crypto.randomUUID();
        await env.COSPEC_DB.prepare(`
          INSERT INTO Files (
            id, project_id, name, path, r2_key, size,
            git_status, last_commit_hash,
            created_by, updated_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          fileId,
          projectId,
          file.path.split('/').pop(),
          file.path,
          r2Key,
          content.length,
          'synced',
          file.sha,
          user.id,
          user.id,
          now,
          now
        ).run();
        
        // Create Git status
        await env.COSPEC_DB.prepare(`
          INSERT INTO File_Git_Status (
            id, file_id, git_status, last_commit_hash, updated_at
          ) VALUES (?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          fileId,
          'synced',
          file.sha,
          now
        ).run();
        
        processedFiles.push({
          id: fileId,
          path: file.path,
          status: 'created'
        });
      }
    }
    
    // Update Git operation status to success
    await env.COSPEC_DB.prepare(`
      UPDATE Git_Operations
      SET status = ?, message = ?, completed_at = ?
      WHERE id = ?
    `).bind(
      'success',
      `Successfully pulled ${processedFiles.length} files from ${project.github_repo}:${branch}`,
      Date.now(),
      operationId
    ).run();
    
    // Update project last sync time
    await env.COSPEC_DB.prepare(`
      UPDATE Projects
      SET last_sync_at = ?, sync_status = ?
      WHERE id = ?
    `).bind(
      now,
      'success',
      projectId
    ).run();
    
    return generateResponse({
      success: true,
      operation_id: operationId,
      files_processed: processedFiles.length,
      files: processedFiles
    });
  } catch (error) {
    console.error('Error pulling from GitHub:', error);
    
    // Update Git operation status to failed
    await env.COSPEC_DB.prepare(`
      UPDATE Git_Operations
      SET status = ?, message = ?, completed_at = ?
      WHERE id = ?
    `).bind(
      'failed',
      `Error pulling from GitHub: ${error.message}`,
      Date.now(),
      operationId
    ).run();
    
    return generateResponse({ error: 'Failed to pull from GitHub' }, { status: 500 });
  }
}

/**
 * Push changes to GitHub repository
 */
export async function pushToGitHub(request, env, user, projectId) {
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
    
    // Get project GitHub details
    const project = await env.COSPEC_DB.prepare(`
      SELECT github_repo, github_branch, github_access_token
      FROM Projects
      WHERE id = ?
    `).bind(projectId).first();
    
    if (!project || !project.github_repo || !project.github_access_token) {
      return generateResponse({ error: 'Project not connected to GitHub' }, { status: 400 });
    }
    
    // Parse request body
    const { commit_message, files } = await request.json();
    
    if (!commit_message) {
      return generateResponse({ error: 'Commit message is required' }, { status: 400 });
    }
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return generateResponse({ error: 'Files to commit are required' }, { status: 400 });
    }
    
    // Record Git operation start
    const operationId = crypto.randomUUID();
    const now = Date.now();
    await env.COSPEC_DB.prepare(`
      INSERT INTO Git_Operations (
        id, project_id, operation_type, status, message,
        performed_by, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      operationId,
      projectId,
      'push',
      'in_progress',
      `Pushing to ${project.github_repo}:${project.github_branch} - ${commit_message}`,
      user.id,
      now
    ).run();
    
    // Get the current reference to the branch
    const branch = project.github_branch || 'main';
    const refResponse = await fetch(`https://api.github.com/repos/${project.github_repo}/git/refs/heads/${branch}`, {
      headers: {
        'Authorization': `token ${project.github_access_token}`,
        'User-Agent': 'CoSpec-App'
      }
    });
    
    if (!refResponse.ok) {
      // Update Git operation status to failed
      await env.COSPEC_DB.prepare(`
        UPDATE Git_Operations
        SET status = ?, message = ?, completed_at = ?
        WHERE id = ?
      `).bind(
        'failed',
        `Failed to get branch reference: ${refResponse.status} ${refResponse.statusText}`,
        Date.now(),
        operationId
      ).run();
      
      return generateResponse({ 
        error: 'Failed to get branch reference',
        github_status: refResponse.status
      }, { status: 500 });
    }
    
    const refData = await refResponse.json();
    const latestCommitSha = refData.object.sha;
    
    // Get the commit that the branch points to
    const commitResponse = await fetch(`https://api.github.com/repos/${project.github_repo}/git/commits/${latestCommitSha}`, {
      headers: {
        'Authorization': `token ${project.github_access_token}`,
        'User-Agent': 'CoSpec-App'
      }
    });
    
    if (!commitResponse.ok) {
      // Update Git operation status to failed
      await env.COSPEC_DB.prepare(`
        UPDATE Git_Operations
        SET status = ?, message = ?, completed_at = ?
        WHERE id = ?
      `).bind(
        'failed',
        `Failed to get commit: ${commitResponse.status} ${commitResponse.statusText}`,
        Date.now(),
        operationId
      ).run();
      
      return generateResponse({ 
        error: 'Failed to get commit',
        github_status: commitResponse.status
      }, { status: 500 });
    }
    
    const commitData = await commitResponse.json();
    const treeSha = commitData.tree.sha;
    
    // Create new tree entries for the files to be committed
    const treeEntries = [];
    for (const fileId of files) {
      // Get file details
      const file = await env.COSPEC_DB.prepare(`
        SELECT path, r2_key
        FROM Files
        WHERE id = ? AND project_id = ?
      `).bind(fileId, projectId).first();
      
      if (!file) {
        console.error(`File not found: ${fileId}`);
        continue;
      }
      
      // Get file content from R2
      const object = await env.COSPEC_STORAGE.get(file.r2_key);
      if (!object) {
        console.error(`File content not found for ${file.path}`);
        continue;
      }
      
      const content = await object.text();
      
      // Create blob for file content
      const blobResponse = await fetch(`https://api.github.com/repos/${project.github_repo}/git/blobs`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${project.github_access_token}`,
          'User-Agent': 'CoSpec-App',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          encoding: 'utf-8'
        })
      });
      
      if (!blobResponse.ok) {
        console.error(`Failed to create blob for ${file.path}: ${blobResponse.status}`);
        continue;
      }
      
      const blobData = await blobResponse.json();
      
      // Add tree entry
      treeEntries.push({
        path: file.path,
        mode: '100644', // File mode
        type: 'blob',
        sha: blobData.sha
      });
    }
    
    if (treeEntries.length === 0) {
      // Update Git operation status to failed
      await env.COSPEC_DB.prepare(`
        UPDATE Git_Operations
        SET status = ?, message = ?, completed_at = ?
        WHERE id = ?
      `).bind(
        'failed',
        'No valid files to commit',
        Date.now(),
        operationId
      ).run();
      
      return generateResponse({ error: 'No valid files to commit' }, { status: 400 });
    }
    
    // Create a new tree
    const treeResponse = await fetch(`https://api.github.com/repos/${project.github_repo}/git/trees`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${project.github_access_token}`,
        'User-Agent': 'CoSpec-App',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base_tree: treeSha,
        tree: treeEntries
      })
    });
    
    if (!treeResponse.ok) {
      // Update Git operation status to failed
      await env.COSPEC_DB.prepare(`
        UPDATE Git_Operations
        SET status = ?, message = ?, completed_at = ?
        WHERE id = ?
      `).bind(
        'failed',
        `Failed to create tree: ${treeResponse.status} ${treeResponse.statusText}`,
        Date.now(),
        operationId
      ).run();
      
      return generateResponse({ 
        error: 'Failed to create tree',
        github_status: treeResponse.status
      }, { status: 500 });
    }
    
    const treeData = await treeResponse.json();
    
    // Create a new commit
    const commitPayload = {
      message: commit_message,
      tree: treeData.sha,
      parents: [latestCommitSha]
    };
    
    const newCommitResponse = await fetch(`https://api.github.com/repos/${project.github_repo}/git/commits`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${project.github_access_token}`,
        'User-Agent': 'CoSpec-App',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commitPayload)
    });
    
    if (!newCommitResponse.ok) {
      // Update Git operation status to failed
      await env.COSPEC_DB.prepare(`
        UPDATE Git_Operations
        SET status = ?, message = ?, completed_at = ?
        WHERE id = ?
      `).bind(
        'failed',
        `Failed to create commit: ${newCommitResponse.status} ${newCommitResponse.statusText}`,
        Date.now(),
        operationId
      ).run();
      
      return generateResponse({ 
        error: 'Failed to create commit',
        github_status: newCommitResponse.status
      }, { status: 500 });
    }
    
    const newCommitData = await newCommitResponse.json();
    
    // Update the reference to point to the new commit
    const updateRefResponse = await fetch(`https://api.github.com/repos/${project.github_repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${project.github_access_token}`,
        'User-Agent': 'CoSpec-App',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sha: newCommitData.sha,
        force: false
      })
    });
    
    if (!updateRefResponse.ok) {
      // Update Git operation status to failed
      await env.COSPEC_DB.prepare(`
        UPDATE Git_Operations
        SET status = ?, message = ?, completed_at = ?
        WHERE id = ?
      `).bind(
        'failed',
        `Failed to update reference: ${updateRefResponse.status} ${updateRefResponse.statusText}`,
        Date.now(),
        operationId
      ).run();
      
      return generateResponse({ 
        error: 'Failed to update reference',
        github_status: updateRefResponse.status
      }, { status: 500 });
    }
    
    // Update Git operation status to success
    await env.COSPEC_DB.prepare(`
      UPDATE Git_Operations
      SET status = ?, message = ?, commit_hash = ?, completed_at = ?
      WHERE id = ?
    `).bind(
      'success',
      `Successfully pushed ${treeEntries.length} files to ${project.github_repo}:${branch}`,
      newCommitData.sha,
      Date.now(),
      operationId
    ).run();
    
    // Update project last sync time
    await env.COSPEC_DB.prepare(`
      UPDATE Projects
      SET last_sync_at = ?, sync_status = ?
      WHERE id = ?
    `).bind(
      now,
      'success',
      projectId
    ).run();
    
    // Update file Git status
    for (const fileId of files) {
      // Update file Git status
      await env.COSPEC_DB.prepare(`
        UPDATE Files
        SET git_status = ?, last_commit_hash = ?
        WHERE id = ?
      `).bind(
        'synced',
        newCommitData.sha,
        fileId
      ).run();
      
      // Update or create Git status record
      const gitStatus = await env.COSPEC_DB.prepare(`
        SELECT id
        FROM File_Git_Status
        WHERE file_id = ?
      `).bind(fileId).first();
      
      if (gitStatus) {
        await env.COSPEC_DB.prepare(`
          UPDATE File_Git_Status
          SET git_status = ?, last_commit_hash = ?, last_commit_message = ?, last_commit_author = ?, last_commit_date = ?, updated_at = ?
          WHERE id = ?
        `).bind(
          'synced',
          newCommitData.sha,
          commit_message,
          user.name || user.email,
          now,
          now,
          gitStatus.id
        ).run();
      } else {
        await env.COSPEC_DB.prepare(`
          INSERT INTO File_Git_Status (
            id, file_id, git_status, last_commit_hash, last_commit_message, last_commit_author, last_commit_date, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          fileId,
          'synced',
          newCommitData.sha,
          commit_message,
          user.name || user.email,
          now,
          now
        ).run();
      }
    }
    
    return generateResponse({
      success: true,
      operation_id: operationId,
      commit_hash: newCommitData.sha,
      files_committed: treeEntries.length
    });
  } catch (error) {
    console.error('Error pushing to GitHub:', error);
    
    // Update Git operation status to failed
    await env.COSPEC_DB.prepare(`
      UPDATE Git_Operations
      SET status = ?, message = ?, completed_at = ?
      WHERE id = ?
    `).bind(
      'failed',
      `Error pushing to GitHub: ${error.message}`,
      Date.now(),
      operationId
    ).run();
    
    return generateResponse({ error: 'Failed to push to GitHub' }, { status: 500 });
  }
}

/**
 * Get Git operations history
 */
export async function getGitOperations(request, env, user, projectId) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has access to project
    const { hasAccess } = await hasProjectAccess(env, projectId, user.id);
    if (!hasAccess) {
      return generateResponse({ error: 'Project not found or access denied' }, { status: 404 });
    }
    
    // Get Git operations
    const operations = await env.COSPEC_DB.prepare(`
      SELECT go.*, u.name as performer_name
      FROM Git_Operations go
      LEFT JOIN Users u ON go.performed_by = u.id
      WHERE go.project_id = ?
      ORDER BY go.started_at DESC
      LIMIT 50
    `).bind(projectId).all();
    
    return generateResponse({
      operations: operations.results || []
    });
  } catch (error) {
    console.error('Error getting Git operations:', error);
    return generateResponse({ error: 'Failed to get Git operations' }, { status: 500 });
  }
}

/**
 * Get Git operation details
 */
export async function getGitOperation(request, env, user, projectId, operationId) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has access to project
    const { hasAccess } = await hasProjectAccess(env, projectId, user.id);
    if (!hasAccess) {
      return generateResponse({ error: 'Project not found or access denied' }, { status: 404 });
    }
    
    // Get Git operation
    const operation = await env.COSPEC_DB.prepare(`
      SELECT go.*, u.name as performer_name
      FROM Git_Operations go
      LEFT JOIN Users u ON go.performed_by = u.id
      WHERE go.id = ? AND go.project_id = ?
    `).bind(operationId, projectId).first();
    
    if (!operation) {
      return generateResponse({ error: 'Git operation not found' }, { status: 404 });
    }
    
    return generateResponse(operation);
  } catch (error) {
    console.error('Error getting Git operation:', error);
    return generateResponse({ error: 'Failed to get Git operation' }, { status: 500 });
  }
}
