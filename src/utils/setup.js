/**
 * Setup utilities for CoSpec
 * 
 * This module provides functions to initialize the CoSpec environment,
 * including setting up database tables and initial data.
 */

import { setupNotificationSystem } from '../api/notifications.js';

/**
 * Initialize the CoSpec environment
 */
export async function initializeEnvironment(env) {
  try {
    console.log('Initializing CoSpec environment...');
    
    // Setup notification system
    await setupNotificationSystem(env);
    
    // Create default organization if it doesn't exist
    const defaultOrg = await env.COSPEC_DB.prepare(
      'SELECT * FROM Organizations WHERE slug = ?'
    ).bind('default').first();
    
    if (!defaultOrg) {
      const now = Date.now();
      await env.COSPEC_DB.prepare(
        'INSERT INTO Organizations (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        'default',
        'Default Organization',
        'default',
        now,
        now
      ).run();
      
      console.log('Created default organization');
    }
    
    // Create default project if it doesn't exist
    const defaultProject = await env.COSPEC_DB.prepare(
      'SELECT * FROM Projects WHERE slug = ? AND organization_id = ?'
    ).bind('default', 'default').first();
    
    if (!defaultProject) {
      const now = Date.now();
      await env.COSPEC_DB.prepare(
        'INSERT INTO Projects (id, organization_id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        'default',
        'default',
        'Default Project',
        'default',
        now,
        now
      ).run();
      
      console.log('Created default project');
    }
    
    // Create welcome file if it doesn't exist
    const welcomeFile = await env.COSPEC_STORAGE.head('files/welcome.md');
    if (!welcomeFile) {
      const welcomeContent = `# Welcome to CoSpec

This is a sample Markdown file to help you get started with CoSpec.

## Features

- Markdown editing with Vditor
- File management
- GitHub integration
- Real-time collaboration

## Getting Started

1. Create or open a Markdown file
2. Edit using the rich editor
3. Changes are automatically saved

Enjoy using CoSpec!
`;
      
      await env.COSPEC_STORAGE.put('files/welcome.md', welcomeContent);
      
      // Add file metadata to D1
      const now = Date.now();
      await env.COSPEC_DB.prepare(
        'INSERT INTO Files (id, project_id, name, path, r2_key, size, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        crypto.randomUUID(),
        'default',
        'welcome.md',
        'welcome.md',
        'files/welcome.md',
        welcomeContent.length,
        'system',
        'system',
        now,
        now
      ).run();
      
      console.log('Created welcome file');
    }
    
    console.log('CoSpec environment initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Error initializing CoSpec environment:', error);
    return { success: false, error: error.message };
  }
}
