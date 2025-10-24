/**
 * File Sync Manager
 * Manages syncing markdown files to Kai's context system
 * - Pattern-based auto-sync
 * - Manual sync control via API
 * - Frontmatter metadata extraction
 * - Debouncing for file changes
 */

const path = require('path');
const fs = require('fs').promises;
const matter = require('gray-matter'); // For YAML frontmatter parsing
const kaiContextClient = require('./kaiContextClient');

// Patterns that trigger auto-sync
const DEFAULT_SYNC_PATTERNS = [
  /^specs\//i,
  /^requirements\//i,
  /^docs\/specs\//i,
  /\.spec\.md$/i,
  /^SPEC\.md$/i,
  /^REQUIREMENTS\.md$/i,
];

class FileSyncManager {
  constructor() {
    this.syncedFiles = new Map(); // filePath → { memoryId, lastSync, status }
    this.pendingSync = new Map(); // filePath → timeout handle
    this.debounceDelay = 3000; // Wait 3 seconds after edit before syncing
    this.metadataDir = path.join(process.env.MARKDOWN_DIR || '/markdown', '.cospec-sync');
    this.metadataFile = path.join(this.metadataDir, 'sync-metadata.json');
    this.isInitialized = false;
    console.log('[FileSyncManager] Initialized');
  }

  /**
   * Initialize metadata storage and load existing sync data
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Ensure metadata directory exists
      await fs.mkdir(this.metadataDir, { recursive: true });

      // Load existing metadata
      try {
        const data = await fs.readFile(this.metadataFile, 'utf-8');
        const metadata = JSON.parse(data);

        // Restore syncedFiles map from JSON
        if (metadata.syncedFiles) {
          Object.entries(metadata.syncedFiles).forEach(([filePath, data]) => {
            this.syncedFiles.set(filePath, data);
          });
        }

        console.log(`[FileSyncManager] Loaded ${this.syncedFiles.size} synced files from metadata`);
      } catch (error) {
        // Metadata file doesn't exist yet, that's ok
        console.log('[FileSyncManager] No existing metadata found, starting fresh');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('[FileSyncManager] Failed to initialize metadata storage:', error);
    }
  }

  /**
   * Persist sync metadata to disk
   */
  async saveMetadata() {
    try {
      await fs.mkdir(this.metadataDir, { recursive: true });

      const metadata = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        syncedFiles: Object.fromEntries(this.syncedFiles)
      };

      await fs.writeFile(this.metadataFile, JSON.stringify(metadata, null, 2), 'utf-8');
      console.log(`[FileSyncManager] Saved metadata for ${this.syncedFiles.size} files`);
    } catch (error) {
      console.error('[FileSyncManager] Failed to save metadata:', error);
    }
  }

  /**
   * Check if file matches auto-sync patterns
   */
  shouldAutoSync(filePath) {
    return DEFAULT_SYNC_PATTERNS.some(pattern => pattern.test(filePath));
  }

  /**
   * Extract metadata from markdown frontmatter
   */
  async extractMetadata(filePath, content) {
    try {
      const parsed = matter(content);
      return {
        title: parsed.data.title || path.basename(filePath, '.md'),
        tags: parsed.data.tags || [],
        description: parsed.data.description,
        keyEntities: parsed.data.entities || [],
        contextSynced: parsed.data.context_synced || false,
        contextMemoryId: parsed.data.context_memory_id,
      };
    } catch (error) {
      console.error(`[FileSyncManager] Failed to parse frontmatter for ${filePath}:`, error);
      return {
        title: path.basename(filePath, '.md'),
        tags: [],
      };
    }
  }

  /**
   * Sync a file to Kai context system
   */
  async syncFile(filePath, content) {
    try {
      console.log(`[FileSyncManager] Syncing file: ${filePath}`);

      // Ensure initialized
      await this.initialize();

      const metadata = await this.extractMetadata(filePath, content);

      // Sync to Kai
      const memory = await kaiContextClient.createOrUpdateMemory(
        filePath,
        content,
        metadata
      );

      if (memory) {
        // Update local tracking
        this.syncedFiles.set(filePath, {
          memoryId: memory.id,
          lastSync: new Date().toISOString(),
          status: 'synced',
        });

        // Persist metadata to disk (separate file, NOT modifying original)
        await this.saveMetadata();

        console.log(`[FileSyncManager] Successfully synced ${filePath}`);
        return { success: true, memoryId: memory.id };
      }

      return { success: false, error: 'No memory returned' };
    } catch (error) {
      console.error(`[FileSyncManager] Sync failed for ${filePath}:`, error.message);
      this.syncedFiles.set(filePath, {
        lastSync: new Date().toISOString(),
        status: 'error',
        error: error.message,
      });
      await this.saveMetadata();
      throw error;
    }
  }

  /**
   * Handle file change with debouncing
   */
  handleFileChange(filePath, content) {
    // Check if should sync (auto-pattern or manually marked)
    const shouldSync = this.shouldAutoSync(filePath) || this.syncedFiles.has(filePath);

    if (!shouldSync) {
      console.log(`[FileSyncManager] Skipping ${filePath}: no matching pattern`);
      return;
    }

    console.log(`[FileSyncManager] Scheduling sync for ${filePath}`);

    // Clear pending sync if exists
    if (this.pendingSync.has(filePath)) {
      clearTimeout(this.pendingSync.get(filePath));
    }

    // Schedule new sync
    const timeoutHandle = setTimeout(() => {
      this.syncFile(filePath, content)
        .then(() => console.log(`[FileSyncManager] Auto-synced ${filePath}`))
        .catch(err => console.error(`[FileSyncManager] Auto-sync failed for ${filePath}:`, err.message));

      this.pendingSync.delete(filePath);
    }, this.debounceDelay);

    this.pendingSync.set(filePath, timeoutHandle);
  }

  /**
   * Handle file deletion
   */
  async handleFileDelete(filePath) {
    if (this.syncedFiles.has(filePath)) {
      try {
        await kaiContextClient.deleteMemory(filePath);
        this.syncedFiles.delete(filePath);
        await this.saveMetadata();
        console.log(`[FileSyncManager] Deleted memory for ${filePath}`);
      } catch (error) {
        console.error(`[FileSyncManager] Failed to delete memory for ${filePath}:`, error.message);
      }
    }
  }

  /**
   * Manually mark file for sync
   */
  async markForSync(filePath, content) {
    console.log(`[FileSyncManager] Manually marking ${filePath} for sync`);
    return await this.syncFile(filePath, content);
  }

  /**
   * Manually unmark file from sync
   */
  async unmarkFromSync(filePath) {
    try {
      console.log(`[FileSyncManager] Unmarking ${filePath} from sync`);
      await kaiContextClient.deleteMemory(filePath);
      this.syncedFiles.delete(filePath);
      await this.saveMetadata();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get sync status for a file
   */
  getSyncStatus(filePath) {
    if (this.syncedFiles.has(filePath)) {
      return this.syncedFiles.get(filePath);
    }
    return {
      status: this.shouldAutoSync(filePath) ? 'auto-eligible' : 'not-synced',
    };
  }

  /**
   * Get all synced files
   */
  getAllSyncedFiles() {
    return Array.from(this.syncedFiles.entries()).map(([filePath, data]) => ({
      filePath,
      ...data,
    }));
  }
}

module.exports = new FileSyncManager();
