/**
 * Kai Context Client
 * HTTP client for Kai's context API
 * Handles memory creation, updates, and deletion
 */

const axios = require('axios');

class KaiContextClient {
  constructor() {
    this.kaiBackendUrl = process.env.KAI_BACKEND_URL;
    this.projectId = process.env.KAI_PROJECT_ID;
    this.enabled = !!(this.kaiBackendUrl && this.projectId);

    if (!this.enabled) {
      console.warn('[KaiContext] Disabled: missing KAI_BACKEND_URL or KAI_PROJECT_ID');
      console.warn(`[KaiContext] KAI_BACKEND_URL=${this.kaiBackendUrl}, KAI_PROJECT_ID=${this.projectId}`);
    } else {
      console.log(`[KaiContext] Enabled: projectId=${this.projectId}, backend=${this.kaiBackendUrl}`);
    }

    this.client = axios.create({
      baseURL: this.kaiBackendUrl,
      timeout: 10000,
    });
  }

  /**
   * Create or update a memory in Kai's context system
   * Uses upsert endpoint to prevent duplicates
   */
  async createOrUpdateMemory(filePath, content, metadata = {}) {
    if (!this.enabled) {
      console.log('[KaiContext] Skipping sync: not enabled');
      return null;
    }

    try {
      const memoryData = {
        content,
        type: 'specification',
        scope: 'project',
        scopeId: this.projectId,
        metadata: {
          source: 'cospec-ai',
          filePath,
          summary: metadata.title || filePath,
          tags: metadata.tags || [],
          keyEntities: metadata.keyEntities || [],
          visibility: 'workspace', // Specs are usually shared
          ...metadata,
        },
      };

      // Use upsert endpoint to automatically handle create or update
      const response = await this.client.put(
        '/api/context/memories/upsert?uniqueKey=filePath',
        memoryData
      );

      const action = response.status === 201 ? 'Created' : 'Updated';
      console.log(`[KaiContext] ${action} memory for ${filePath}: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error(`[KaiContext] Failed to sync ${filePath}:`, error.message);
      if (error.response) {
        console.error(`[KaiContext] Response status: ${error.response.status}`);
        console.error(`[KaiContext] Response data:`, error.response.data);
      }
      throw error;
    }
  }

  /**
   * Get memory by file path
   */
  async getMemoryByFilePath(filePath) {
    if (!this.enabled) return null;

    try {
      const response = await this.client.post('/api/context/search', {
        query: filePath,
        scope: { type: 'project', id: this.projectId },
        types: ['specification'],
      });

      // Find exact match by metadata.filePath
      const matches = response.data.results || [];
      return matches.find(r => r.memory.metadata.filePath === filePath)?.memory || null;
    } catch (error) {
      console.error(`[KaiContext] Failed to find memory for ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Delete memory by file path
   */
  async deleteMemory(filePath) {
    if (!this.enabled) return false;

    try {
      const memory = await this.getMemoryByFilePath(filePath);
      if (memory) {
        await this.client.delete(`/api/context/memories/${memory.id}`);
        console.log(`[KaiContext] Deleted memory for ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`[KaiContext] Failed to delete memory for ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if Kai backend is reachable
   */
  async healthCheck() {
    if (!this.enabled) return false;

    try {
      await this.client.get('/api/context/health');
      return true;
    } catch (error) {
      console.error('[KaiContext] Health check failed:', error.message);
      return false;
    }
  }
}

module.exports = new KaiContextClient();
