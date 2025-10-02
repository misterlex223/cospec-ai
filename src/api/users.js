/**
 * User management API for CoSpec SaaS platform
 */

import { generateToken, hashPassword, verifyPassword } from '../utils/auth.js';

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
 * Register a new user
 */
export async function registerUser(request, env) {
  try {
    const { email, name, password } = await request.json();
    
    // Validate input
    if (!email || !name || !password) {
      return generateResponse({ error: 'Email, name, and password are required' }, { status: 400 });
    }
    
    // Check if user already exists
    const existingUser = await env.COSPEC_DB.prepare(
      'SELECT id FROM Users WHERE email = ?'
    ).bind(email).first();
    
    if (existingUser) {
      return generateResponse({ error: 'User with this email already exists' }, { status: 409 });
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Generate user ID
    const userId = crypto.randomUUID();
    const now = Date.now();
    
    // Create user in database
    await env.COSPEC_DB.prepare(
      'INSERT INTO Users (id, email, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      userId,
      email,
      name,
      passwordHash,
      now,
      now
    ).run();
    
    // Generate token
    const token = await generateToken({
      sub: userId,
      email,
      name
    }, env);
    
    return generateResponse({
      id: userId,
      email,
      name,
      token
    }, { status: 201 });
  } catch (error) {
    console.error('Error registering user:', error);
    return generateResponse({ error: 'Failed to register user' }, { status: 500 });
  }
}

/**
 * Login user
 */
export async function loginUser(request, env) {
  try {
    const { email, password } = await request.json();
    
    // Validate input
    if (!email || !password) {
      return generateResponse({ error: 'Email and password are required' }, { status: 400 });
    }
    
    // Find user by email
    const user = await env.COSPEC_DB.prepare(
      'SELECT id, email, name, password_hash FROM Users WHERE email = ?'
    ).bind(email).first();
    
    if (!user) {
      return generateResponse({ error: 'Invalid email or password' }, { status: 401 });
    }
    
    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return generateResponse({ error: 'Invalid email or password' }, { status: 401 });
    }
    
    // Update last login time
    const now = Date.now();
    await env.COSPEC_DB.prepare(
      'UPDATE Users SET last_login = ?, updated_at = ? WHERE id = ?'
    ).bind(now, now, user.id).run();
    
    // Generate token
    const token = await generateToken({
      sub: user.id,
      email: user.email,
      name: user.name
    }, env);
    
    return generateResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      token
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    return generateResponse({ error: 'Failed to login' }, { status: 500 });
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(request, env, user) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's organizations
    const organizations = await env.COSPEC_DB.prepare(`
      SELECT o.id, o.name, o.slug, ou.role
      FROM Organizations o
      JOIN Organization_Users ou ON o.id = ou.organization_id
      WHERE ou.user_id = ?
      ORDER BY o.name
    `).bind(user.id).all();
    
    // Get user's projects
    const projects = await env.COSPEC_DB.prepare(`
      SELECT p.id, p.name, p.slug, p.organization_id, o.name as organization_name, pu.role
      FROM Projects p
      JOIN Project_Users pu ON p.id = pu.project_id
      JOIN Organizations o ON p.organization_id = o.id
      WHERE pu.user_id = ?
      ORDER BY p.name
    `).bind(user.id).all();
    
    return generateResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      organizations: organizations.results || [],
      projects: projects.results || []
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return generateResponse({ error: 'Failed to get user profile' }, { status: 500 });
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(request, env, user) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { name, currentPassword, newPassword } = await request.json();
    const updates = {};
    const params = [];
    
    if (name) {
      updates.name = name;
      params.push(name);
    }
    
    // If changing password, verify current password
    if (currentPassword && newPassword) {
      // Get current password hash
      const userData = await env.COSPEC_DB.prepare(
        'SELECT password_hash FROM Users WHERE id = ?'
      ).bind(user.id).first();
      
      if (!userData) {
        return generateResponse({ error: 'User not found' }, { status: 404 });
      }
      
      // Verify current password
      const isPasswordValid = await verifyPassword(currentPassword, userData.password_hash);
      if (!isPasswordValid) {
        return generateResponse({ error: 'Current password is incorrect' }, { status: 400 });
      }
      
      // Hash new password
      const passwordHash = await hashPassword(newPassword);
      updates.password_hash = passwordHash;
      params.push(passwordHash);
    }
    
    if (Object.keys(updates).length === 0) {
      return generateResponse({ error: 'No updates provided' }, { status: 400 });
    }
    
    // Update user in database
    const now = Date.now();
    updates.updated_at = now;
    params.push(now);
    params.push(user.id);
    
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    
    await env.COSPEC_DB.prepare(
      `UPDATE Users SET ${setClause} WHERE id = ?`
    ).bind(...params).run();
    
    return generateResponse({
      id: user.id,
      email: user.email,
      name: updates.name || user.name,
      updated: true
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return generateResponse({ error: 'Failed to update user profile' }, { status: 500 });
  }
}
