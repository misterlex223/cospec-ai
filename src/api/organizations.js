/**
 * Organization management API for CoSpec SaaS platform
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

/**
 * Create a new organization
 */
export async function createOrganization(request, env, user) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { name, settings } = await request.json();
    
    // Validate input
    if (!name) {
      return generateResponse({ error: 'Organization name is required' }, { status: 400 });
    }
    
    // Generate slug from name
    const slug = generateSlug(name);
    
    // Check if organization with this slug already exists
    const existingOrg = await env.COSPEC_DB.prepare(
      'SELECT id FROM Organizations WHERE slug = ?'
    ).bind(slug).first();
    
    if (existingOrg) {
      return generateResponse({ error: 'Organization with this name already exists' }, { status: 409 });
    }
    
    // Generate organization ID
    const orgId = crypto.randomUUID();
    const now = Date.now();
    
    // Create organization in database
    await env.COSPEC_DB.prepare(
      'INSERT INTO Organizations (id, name, slug, created_at, updated_at, settings) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      orgId,
      name,
      slug,
      now,
      now,
      settings ? JSON.stringify(settings) : null
    ).run();
    
    // Add user as admin of the organization
    await env.COSPEC_DB.prepare(
      'INSERT INTO Organization_Users (id, organization_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      crypto.randomUUID(),
      orgId,
      user.id,
      'admin',
      now
    ).run();
    
    return generateResponse({
      id: orgId,
      name,
      slug,
      settings: settings || {},
      created_at: now,
      updated_at: now
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return generateResponse({ error: 'Failed to create organization' }, { status: 500 });
  }
}

/**
 * Get organization details
 */
export async function getOrganization(request, env, user, orgId) {
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
    
    // Get organization details
    const org = await env.COSPEC_DB.prepare(
      'SELECT id, name, slug, created_at, updated_at, settings FROM Organizations WHERE id = ?'
    ).bind(orgId).first();
    
    if (!org) {
      return generateResponse({ error: 'Organization not found' }, { status: 404 });
    }
    
    // Get organization members
    const members = await env.COSPEC_DB.prepare(`
      SELECT u.id, u.name, u.email, ou.role
      FROM Users u
      JOIN Organization_Users ou ON u.id = ou.user_id
      WHERE ou.organization_id = ?
      ORDER BY u.name
    `).bind(orgId).all();
    
    // Get organization projects
    const projects = await env.COSPEC_DB.prepare(`
      SELECT id, name, slug, created_at, updated_at, settings
      FROM Projects
      WHERE organization_id = ?
      ORDER BY name
    `).bind(orgId).all();
    
    return generateResponse({
      ...org,
      settings: org.settings ? JSON.parse(org.settings) : {},
      members: members.results || [],
      projects: projects.results || [],
      user_role: orgUser.role
    });
  } catch (error) {
    console.error('Error getting organization:', error);
    return generateResponse({ error: 'Failed to get organization' }, { status: 500 });
  }
}

/**
 * Update organization
 */
export async function updateOrganization(request, env, user, orgId) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has admin access to organization
    const isAdmin = await hasOrgAdminAccess(env, orgId, user.id);
    if (!isAdmin) {
      return generateResponse({ error: 'Admin access required' }, { status: 403 });
    }
    
    const { name, settings } = await request.json();
    const updates = {};
    const params = [];
    
    if (name) {
      updates.name = name;
      params.push(name);
      
      // Update slug if name is changing
      const slug = generateSlug(name);
      updates.slug = slug;
      params.push(slug);
      
      // Check if new slug conflicts with existing organization
      const existingOrg = await env.COSPEC_DB.prepare(
        'SELECT id FROM Organizations WHERE slug = ? AND id != ?'
      ).bind(slug, orgId).first();
      
      if (existingOrg) {
        return generateResponse({ error: 'Organization with this name already exists' }, { status: 409 });
      }
    }
    
    if (settings) {
      updates.settings = JSON.stringify(settings);
      params.push(updates.settings);
    }
    
    if (Object.keys(updates).length === 0) {
      return generateResponse({ error: 'No updates provided' }, { status: 400 });
    }
    
    // Update organization in database
    const now = Date.now();
    updates.updated_at = now;
    params.push(now);
    params.push(orgId);
    
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    
    await env.COSPEC_DB.prepare(
      `UPDATE Organizations SET ${setClause} WHERE id = ?`
    ).bind(...params).run();
    
    // Get updated organization
    const org = await env.COSPEC_DB.prepare(
      'SELECT id, name, slug, created_at, updated_at, settings FROM Organizations WHERE id = ?'
    ).bind(orgId).first();
    
    return generateResponse({
      ...org,
      settings: org.settings ? JSON.parse(org.settings) : {}
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    return generateResponse({ error: 'Failed to update organization' }, { status: 500 });
  }
}

/**
 * Delete organization
 */
export async function deleteOrganization(request, env, user, orgId) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has admin access to organization
    const isAdmin = await hasOrgAdminAccess(env, orgId, user.id);
    if (!isAdmin) {
      return generateResponse({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Delete organization from database
    await env.COSPEC_DB.prepare(
      'DELETE FROM Organizations WHERE id = ?'
    ).bind(orgId).run();
    
    return generateResponse({ success: true });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return generateResponse({ error: 'Failed to delete organization' }, { status: 500 });
  }
}

/**
 * List organizations for user
 */
export async function listOrganizations(request, env, user) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get organizations for user
    const organizations = await env.COSPEC_DB.prepare(`
      SELECT o.id, o.name, o.slug, o.created_at, o.updated_at, o.settings, ou.role
      FROM Organizations o
      JOIN Organization_Users ou ON o.id = ou.organization_id
      WHERE ou.user_id = ?
      ORDER BY o.name
    `).bind(user.id).all();
    
    // Parse settings for each organization
    const orgs = (organizations.results || []).map(org => ({
      ...org,
      settings: org.settings ? JSON.parse(org.settings) : {}
    }));
    
    return generateResponse({ organizations: orgs });
  } catch (error) {
    console.error('Error listing organizations:', error);
    return generateResponse({ error: 'Failed to list organizations' }, { status: 500 });
  }
}

/**
 * Add member to organization
 */
export async function addOrganizationMember(request, env, user, orgId) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has admin access to organization
    const isAdmin = await hasOrgAdminAccess(env, orgId, user.id);
    if (!isAdmin) {
      return generateResponse({ error: 'Admin access required' }, { status: 403 });
    }
    
    const { email, role } = await request.json();
    
    // Validate input
    if (!email) {
      return generateResponse({ error: 'Email is required' }, { status: 400 });
    }
    
    if (!['admin', 'member'].includes(role)) {
      return generateResponse({ error: 'Invalid role' }, { status: 400 });
    }
    
    // Find user by email
    const memberUser = await env.COSPEC_DB.prepare(
      'SELECT id FROM Users WHERE email = ?'
    ).bind(email).first();
    
    if (!memberUser) {
      return generateResponse({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if user is already a member
    const existingMember = await env.COSPEC_DB.prepare(
      'SELECT id FROM Organization_Users WHERE organization_id = ? AND user_id = ?'
    ).bind(orgId, memberUser.id).first();
    
    if (existingMember) {
      // Update role if user is already a member
      await env.COSPEC_DB.prepare(
        'UPDATE Organization_Users SET role = ? WHERE organization_id = ? AND user_id = ?'
      ).bind(role, orgId, memberUser.id).run();
    } else {
      // Add user to organization
      await env.COSPEC_DB.prepare(
        'INSERT INTO Organization_Users (id, organization_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        crypto.randomUUID(),
        orgId,
        memberUser.id,
        role,
        Date.now()
      ).run();
    }
    
    return generateResponse({ success: true });
  } catch (error) {
    console.error('Error adding organization member:', error);
    return generateResponse({ error: 'Failed to add organization member' }, { status: 500 });
  }
}

/**
 * Remove member from organization
 */
export async function removeOrganizationMember(request, env, user, orgId, memberId) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has admin access to organization
    const isAdmin = await hasOrgAdminAccess(env, orgId, user.id);
    if (!isAdmin) {
      return generateResponse({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Prevent removing self
    if (user.id === memberId) {
      return generateResponse({ error: 'Cannot remove yourself from organization' }, { status: 400 });
    }
    
    // Remove user from organization
    await env.COSPEC_DB.prepare(
      'DELETE FROM Organization_Users WHERE organization_id = ? AND user_id = ?'
    ).bind(orgId, memberId).run();
    
    return generateResponse({ success: true });
  } catch (error) {
    console.error('Error removing organization member:', error);
    return generateResponse({ error: 'Failed to remove organization member' }, { status: 500 });
  }
}
