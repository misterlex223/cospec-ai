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
export async function sendNotification(type, path, env) {
  try {
    const notification = {
      type,
      path,
      timestamp: Date.now()
    };
    
    // Store notification in D1 for clients to poll
    await env.COSPEC_DB.prepare(
      'INSERT INTO Notifications (id, type, path, timestamp) VALUES (?, ?, ?, ?)'
    ).bind(
      crypto.randomUUID(),
      notification.type,
      notification.path,
      notification.timestamp
    ).run();
    
    return generateResponse({ success: true, notification });
  } catch (error) {
    console.error('Error sending notification:', error);
    return generateResponse({ error: 'Failed to send notification' }, { status: 500 });
  }
}

/**
 * Get recent notifications
 * 
 * This function allows clients to poll for recent notifications.
 */
export async function getNotifications(request, env) {
  try {
    const url = new URL(request.url);
    const since = parseInt(url.searchParams.get('since') || '0');
    
    // Get notifications since the specified timestamp
    const notifications = await env.COSPEC_DB.prepare(
      'SELECT * FROM Notifications WHERE timestamp > ? ORDER BY timestamp ASC LIMIT 100'
    ).bind(since).all();
    
    return generateResponse(notifications.results || []);
  } catch (error) {
    console.error('Error getting notifications:', error);
    return generateResponse({ error: 'Failed to get notifications' }, { status: 500 });
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
        path TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON Notifications(timestamp);
    `);
    
    return generateResponse({ success: true });
  } catch (error) {
    console.error('Error setting up notification system:', error);
    return generateResponse({ error: 'Failed to setup notification system' }, { status: 500 });
  }
}
