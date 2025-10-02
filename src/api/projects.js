/**
 * Project management API for CoSpec SaaS platform
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

// Helper function to generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper function to check if user has admin access to organization
async function hasOrgAdminAccess(env, orgId, userId) {
  const orgUser = await env.COSPEC_DB.prepare(
    'SELECT role FROM Organization_Users WHERE organization_id = ? AND user_id = ?'
  ).bind(orgId, userId).first();
  
  return orgUser && orgUser.role === 'admin';
}

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
    role: orgUser ? orgUser.role : null,
    orgRole: orgUser ? orgUser.role : null
  };
}

/**
 * Create a new project
 */
export async function createProject(request, env, user, orgId) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has access to organization
    const orgUser = await env.COSPEC_DB.prepare(
      'SELECT role FROM Organization_Users WHERE organization_id = ? AND user_id = ?'
    ).bind(orgId, userId).first();
    
    if (!orgUser) {
      return generateResponse({ error: 'Organization not found or access denied' }, { status: 404 });
    }
    
    const { name, settings, github_repo, github_branch, github_access_token } = await request.json();
    
    // Validate input
    if (!name) {
      return generateResponse({ error: 'Project name is required' }, { status: 400 });
    }
    
    // Generate slug from name
    const slug = generateSlug(name);
    
    // Check if project with this slug already exists in the organization
    const existingProject = await env.COSPEC_DB.prepare(
      'SELECT id FROM Projects WHERE organization_id = ? AND slug = ?'
    ).bind(orgId, slug).first();
    
    if (existingProject) {
      return generateResponse({ error: 'Project with this name already exists in the organization' }, { status: 409 });
    }
    
    // Generate project ID
    const projectId = crypto.randomUUID();
    const now = Date.now();
    
    // Create project in database
    await env.COSPEC_DB.prepare(`
      INSERT INTO Projects (
        id, organization_id, name, slug, github_repo, github_branch, 
        github_access_token, created_at, updated_at, settings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      projectId,
      orgId,
      name,
      slug,
      github_repo || null,
      github_branch || null,
      github_access_token || null,
      now,
      now,
      settings ? JSON.stringify(settings) : null
    ).run();
    
    // Add user as admin of the project
    await env.COSPEC_DB.prepare(
      'INSERT INTO Project_Users (id, project_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      crypto.randomUUID(),
      projectId,
      user.id,
      'admin',
      now
    ).run();
    
    return generateResponse({
      id: projectId,
      organization_id: orgId,
      name,
      slug,
      github_repo: github_repo || null,
      github_branch: github_branch || null,
      settings: settings || {},
      created_at: now,
      updated_at: now
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return generateResponse({ error: 'Failed to create project' }, { status: 500 });
  }
}

/**
 * Get project details
 */
export async function getProject(request, env, user, projectId) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has access to project
    const { hasAccess, role } = await hasProjectAccess(env, projectId, user.id);
    if (!hasAccess) {
      return generateResponse({ error: 'Project not found or access denied' }, { status: 404 });
    }
    
    // Get project details
    const project = await env.COSPEC_DB.prepare(`
      SELECT p.id, p.organization_id, p.name, p.slug, p.github_repo, p.github_branch,
             p.last_sync_at, p.sync_status, p.created_at, p.updated_at, p.settings,
             o.name as organization_name, o.slug as organization_slug
      FROM Projects p
      JOIN Organizations o ON p.organization_id = o.id
      WHERE p.id = ?
    `).bind(projectId).first();
    
    if (!project) {
      return generateResponse({ error: 'Project not found' }, { status: 404 });
    }
    
    // Get project members
    const members = await env.COSPEC_DB.prepare(`
      SELECT u.id, u.name, u.email, pu.role
      FROM Users u
      JOIN Project_Users pu ON u.id = pu.user_id
      WHERE pu.project_id = ?
      ORDER BY u.name
    `).bind(projectId).all();
    
    // Get project files
    const files = await env.COSPEC_DB.prepare(`
      SELECT id, name, path, size, git_status, last_commit_hash, created_at, updated_at
      FROM Files
      WHERE project_id = ?
      ORDER BY path
    `).bind(projectId).all();
    
    return generateResponse({
      ...project,
      settings: project.settings ? JSON.parse(project.settings) : {},
      members: members.results || [],
      files: files.results || [],
      user_role: role
    });
  } catch (error) {
    console.error('Error getting project:', error);
    return generateResponse({ error: 'Failed to get project' }, { status: 500 });
  }
}

/**
 * Update project
 */
export async function updateProject(request, env, user, projectId) {
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
    
    const { name, settings, github_repo, github_branch, github_access_token } = await request.json();
    const updates = {};
    const params = [];
    
    // Get project organization
    const project = await env.COSPEC_DB.prepare(
      'SELECT organization_id, slug FROM Projects WHERE id = ?'
    ).bind(projectId).first();
    
    if (!project) {
      return generateResponse({ error: 'Project not found' }, { status: 404 });
    }
    
    if (name) {
      updates.name = name;
      params.push(name);
      
      // Update slug if name is changing
      const slug = generateSlug(name);
      updates.slug = slug;
      params.push(slug);
      
      // Check if new slug conflicts with existing project in the organization
      const existingProject = await env.COSPEC_DB.prepare(
        'SELECT id FROM Projects WHERE organization_id = ? AND slug = ? AND id != ?'
      ).bind(project.organization_id, slug, projectId).first();
      
      if (existingProject) {
        return generateResponse({ error: 'Project with this name already exists in the organization' }, { status: 409 });
      }
    }
    
    if (settings !== undefined) {
      updates.settings = JSON.stringify(settings || {});
      params.push(updates.settings);
    }
    
    if (github_repo !== undefined) {
      updates.github_repo = github_repo || null;
      params.push(updates.github_repo);
    }
    
    if (github_branch !== undefined) {
      updates.github_branch = github_branch || null;
      params.push(updates.github_branch);
    }
    
    if (github_access_token !== undefined) {
      updates.github_access_token = github_access_token || null;
      params.push(updates.github_access_token);
    }
    
    if (Object.keys(updates).length === 0) {
      return generateResponse({ error: 'No updates provided' }, { status: 400 });
    }
    
    // Update project in database
    const now = Date.now();
    updates.updated_at = now;
    params.push(now);
    params.push(projectId);
    
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    
    await env.COSPEC_DB.prepare(
      `UPDATE Projects SET ${setClause} WHERE id = ?`
    ).bind(...params).run();
    
    // Get updated project
    const updatedProject = await env.COSPEC_DB.prepare(`
      SELECT id, organization_id, name, slug, github_repo, github_branch,
             last_sync_at, sync_status, created_at, updated_at, settings
      FROM Projects
      WHERE id = ?
    `).bind(projectId).first();
    
    return generateResponse({
      ...updatedProject,
      settings: updatedProject.settings ? JSON.parse(updatedProject.settings) : {}
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return generateResponse({ error: 'Failed to update project' }, { status: 500 });
  }
}

/**
 * Delete project
 */
export async function deleteProject(request, env, user, projectId) {
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
    
    // Delete project from database
    await env.COSPEC_DB.prepare(
      'DELETE FROM Projects WHERE id = ?'
    ).bind(projectId).run();
    
    return generateResponse({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return generateResponse({ error: 'Failed to delete project' }, { status: 500 });
  }
}

/**
 * List projects for organization
 */
export async function listProjects(request, env, user, orgId) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has access to organization
    const orgUser = await env.COSPEC_DB.prepare(
      'SELECT role FROM Organization_Users WHERE organization_id = ? AND user_id = ?'
    ).bind(orgId, user.id).first();
    
    if (!orgUser) {
      return generateResponse({ error: 'Organization not found or access denied' }, { status: 404 });
    }
    
    // Get projects for organization
    const projects = await env.COSPEC_DB.prepare(`
      SELECT id, name, slug, github_repo, github_branch, last_sync_at, sync_status, created_at, updated_at, settings
      FROM Projects
      WHERE organization_id = ?
      ORDER BY name
    `).bind(orgId).all();
    
    // Parse settings for each project
    const projectList = (projects.results || []).map(project => ({
      ...project,
      settings: project.settings ? JSON.parse(project.settings) : {}
    }));
    
    return generateResponse({ projects: projectList });
  } catch (error) {
    console.error('Error listing projects:', error);
    return generateResponse({ error: 'Failed to list projects' }, { status: 500 });
  }
}

/**
 * Add member to project
 */
export async function addProjectMember(request, env, user, projectId) {
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
    
    const { email, role: memberRole } = await request.json();
    
    // Validate input
    if (!email) {
      return generateResponse({ error: 'Email is required' }, { status: 400 });
    }
    
    if (!['admin', 'editor', 'viewer'].includes(memberRole)) {
      return generateResponse({ error: 'Invalid role' }, { status: 400 });
    }
    
    // Find user by email
    const memberUser = await env.COSPEC_DB.prepare(
      'SELECT id FROM Users WHERE email = ?'
    ).bind(email).first();
    
    if (!memberUser) {
      return generateResponse({ error: 'User not found' }, { status: 404 });
    }
    
    // Get project organization
    const project = await env.COSPEC_DB.prepare(
      'SELECT organization_id FROM Projects WHERE id = ?'
    ).bind(projectId).first();
    
    // Check if user is a member of the organization
    const orgUser = await env.COSPEC_DB.prepare(
      'SELECT id FROM Organization_Users WHERE organization_id = ? AND user_id = ?'
    ).bind(project.organization_id, memberUser.id).first();
    
    if (!orgUser) {
      return generateResponse({ error: 'User must be a member of the organization first' }, { status: 400 });
    }
    
    // Check if user is already a member of the project
    const existingMember = await env.COSPEC_DB.prepare(
      'SELECT id FROM Project_Users WHERE project_id = ? AND user_id = ?'
    ).bind(projectId, memberUser.id).first();
    
    if (existingMember) {
      // Update role if user is already a member
      await env.COSPEC_DB.prepare(
        'UPDATE Project_Users SET role = ? WHERE project_id = ? AND user_id = ?'
      ).bind(memberRole, projectId, memberUser.id).run();
    } else {
      // Add user to project
      await env.COSPEC_DB.prepare(
        'INSERT INTO Project_Users (id, project_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        crypto.randomUUID(),
        projectId,
        memberUser.id,
        memberRole,
        Date.now()
      ).run();
    }
    
    return generateResponse({ success: true });
  } catch (error) {
    console.error('Error adding project member:', error);
    return generateResponse({ error: 'Failed to add project member' }, { status: 500 });
  }
}

/**
 * Remove member from project
 */
export async function removeProjectMember(request, env, user, projectId, memberId) {
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
    
    // Prevent removing self
    if (user.id === memberId) {
      return generateResponse({ error: 'Cannot remove yourself from project' }, { status: 400 });
    }
    
    // Remove user from project
    await env.COSPEC_DB.prepare(
      'DELETE FROM Project_Users WHERE project_id = ? AND user_id = ?'
    ).bind(projectId, memberId).run();
    
    return generateResponse({ success: true });
  } catch (error) {
    console.error('Error removing project member:', error);
    return generateResponse({ error: 'Failed to remove project member' }, { status: 500 });
  }
}
