/**
 * File change notification system
 * 
 * This module provides a way to notify clients about file changes.
 * Since Cloudflare Workers don't support WebSockets directly,
 * we use a combination of Durable Objects and fetch events.
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

/**
 * Send file change notification
 * 
 * This function simulates the WebSocket broadcast functionality
 * by storing the notification in Durable Objects or D1.
 */
export async function sendNotification(type, path, env, options = {}) {
  try {
    const { projectId, organizationId, userId, message } = options;
    const now = Date.now();
    
    // Store notification in D1 for clients to poll
    await env.COSPEC_DB.prepare(`
      INSERT INTO Notifications (
        id, type, target_id, target_type, user_id, organization_id, 
        project_id, message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      type,
      path, // Using path as target_id for file operations
      'file', // Target type is file for file operations
      userId || null,
      organizationId || null,
      projectId || null,
      message || `File ${type.toLowerCase().replace('_', ' ')}: ${path}`,
      now
    ).run();
    
    return { success: true, timestamp: now };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recent notifications for a user
 * 
 * This function allows clients to poll for recent notifications.
 */
export async function getUserNotifications(request, env, user) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = new URL(request.url);
    const since = parseInt(url.searchParams.get('since') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const unreadOnly = url.searchParams.get('unread') === 'true';
    
    // Get user's organizations
    const orgs = await env.COSPEC_DB.prepare(`
      SELECT organization_id
      FROM Organization_Users
      WHERE user_id = ?
    `).bind(user.id).all();
    
    const orgIds = (orgs.results || []).map(org => org.organization_id);
    
    // Get user's projects
    const projects = await env.COSPEC_DB.prepare(`
      SELECT project_id
      FROM Project_Users
      WHERE user_id = ?
    `).bind(user.id).all();
    
    const projectIds = (projects.results || []).map(proj => proj.project_id);
    
    // Build query based on user's access
    let query = `
      SELECT n.*, u.name as user_name, o.name as organization_name, p.name as project_name
      FROM Notifications n
      LEFT JOIN Users u ON n.user_id = u.id
      LEFT JOIN Organizations o ON n.organization_id = o.id
      LEFT JOIN Projects p ON n.project_id = p.id
      WHERE n.created_at > ?
    `;
    
    const params = [since];
    
    // Add filters for organizations and projects
    if (orgIds.length > 0 || projectIds.length > 0) {
      query += ' AND (';
      
      const conditions = [];
      
      // User-specific notifications
      conditions.push('n.user_id = ?');
      params.push(user.id);
      
      // Organization notifications
      if (orgIds.length > 0) {
        conditions.push(`n.organization_id IN (${orgIds.map(() => '?').join(', ')})`);
        params.push(...orgIds);
      }
      
      // Project notifications
      if (projectIds.length > 0) {
        conditions.push(`n.project_id IN (${projectIds.map(() => '?').join(', ')})`);
        params.push(...projectIds);
      }
      
      query += conditions.join(' OR ');
      query += ')';
    } else {
      // If user has no orgs or projects, only show user-specific notifications
      query += ' AND n.user_id = ?';
      params.push(user.id);
    }
    
    // Add unread filter if requested
    if (unreadOnly) {
      query += ' AND n.read = 0';
    }
    
    // Add order and limit
    query += ' ORDER BY n.created_at DESC LIMIT ?';
    params.push(limit);
    
    // Execute query
    const notifications = await env.COSPEC_DB.prepare(query).bind(...params).all();
    
    return generateResponse({
      notifications: notifications.results || [],
      count: notifications.results ? notifications.results.length : 0,
      since,
      limit
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    return generateResponse({ error: 'Failed to get notifications' }, { status: 500 });
  }
}

/**
 * Get recent notifications (legacy API)
 */
export async function getNotifications(request, env) {
  try {
    const url = new URL(request.url);
    const since = parseInt(url.searchParams.get('since') || '0');
    
    // Get notifications since the specified timestamp
    const notifications = await env.COSPEC_DB.prepare(
      'SELECT * FROM Notifications WHERE created_at > ? ORDER BY created_at ASC LIMIT 100'
    ).bind(since).all();
    
    return generateResponse(notifications.results || []);
  } catch (error) {
    console.error('Error getting notifications:', error);
    return generateResponse({ error: 'Failed to get notifications' }, { status: 500 });
  }
}

/**
 * Mark notifications as read
 */
export async function markNotificationsRead(request, env, user) {
  try {
    if (!user) {
      return generateResponse({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { ids } = await request.json();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return generateResponse({ error: 'Notification IDs are required' }, { status: 400 });
    }
    
    // Update notifications
    await env.COSPEC_DB.prepare(`
      UPDATE Notifications
      SET read = 1
      WHERE id IN (${ids.map(() => '?').join(', ')})
    `).bind(...ids).run();
    
    return generateResponse({ success: true, count: ids.length });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return generateResponse({ error: 'Failed to mark notifications as read' }, { status: 500 });
  }
}

/**
 * Setup notification system
 * 
 * This function creates the necessary database table for notifications.
 */
export async function setupNotificationSystem(env) {
  try {
    // Create notifications table if it doesn't exist
    await env.COSPEC_DB.exec(`
      CREATE TABLE IF NOT EXISTS Notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        target_id TEXT,
        target_type TEXT,
        user_id TEXT,
        organization_id TEXT,
        project_id TEXT,
        message TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (organization_id) REFERENCES Organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON Notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON Notifications(organization_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON Notifications(project_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON Notifications(created_at);
    `);
    
    return generateResponse({ success: true });
  } catch (error) {
    console.error('Error setting up notification system:', error);
    return generateResponse({ error: 'Failed to setup notification system' }, { status: 500 });
  }
}
