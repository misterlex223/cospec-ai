/**
 * Link Manager - Manages document link graph
 * Pattern similar to fileSyncManager.js
 * - Scans all markdown files on startup
 * - Builds in-memory link graph
 * - Stores metadata in .cospec-sync/link-graph.json
 * - Integrates with file watcher for real-time updates
 */

const fs = require('fs').promises;
const path = require('path');
const { extractLinks, createBacklinks, getOutgoingLinks, getIncomingLinks } = require('./linkParser');
const { validateGraph, findBrokenLinks, findOrphanedNodes } = require('./shared/linkValidation');

class LinkManager {
  constructor(markdownDir) {
    this.markdownDir = markdownDir;
    this.syncDir = path.join(markdownDir, '.cospec-sync');
    this.metadataFile = path.join(this.syncDir, 'link-graph.json');

    // In-memory graph structure
    this.graph = {
      nodes: [],      // Array of file nodes
      edges: [],      // Array of link edges
      metadata: {
        version: 1,
        lastUpdated: null,
        totalNodes: 0,
        totalEdges: 0,
        orphanedNodes: [],
        brokenLinks: []
      }
    };

    // Debounce timers for file changes
    this.debounceTimers = new Map();
    this.debounceDelay = 3000; // 3 seconds

    this.initialized = false;
  }

  /**
   * Initialize the link manager
   * Load existing metadata and scan all files
   */
  async initialize() {
    console.log('[LinkManager] Initializing...');

    try {
      // Ensure sync directory exists
      await fs.mkdir(this.syncDir, { recursive: true });

      // Load existing metadata if available
      await this.loadMetadata();

      // Scan all markdown files and build graph
      await this.rebuildGraph();

      this.initialized = true;
      console.log(`[LinkManager] Initialized with ${this.graph.nodes.length} nodes and ${this.graph.edges.length} edges`);
    } catch (error) {
      console.error('[LinkManager] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Load metadata from disk
   */
  async loadMetadata() {
    try {
      const exists = await fs.access(this.metadataFile).then(() => true).catch(() => false);
      if (!exists) {
        console.log('[LinkManager] No existing metadata file');
        return;
      }

      const data = await fs.readFile(this.metadataFile, 'utf8');
      const savedGraph = JSON.parse(data);

      // Validate loaded graph
      const validation = validateGraph(savedGraph);
      if (validation.valid) {
        this.graph = savedGraph;
        console.log(`[LinkManager] Loaded metadata: ${this.graph.nodes.length} nodes, ${this.graph.edges.length} edges`);
      } else {
        console.warn('[LinkManager] Invalid metadata, will rebuild:', validation.errors);
      }
    } catch (error) {
      console.error('[LinkManager] Error loading metadata:', error);
    }
  }

  /**
   * Save metadata to disk
   */
  async saveMetadata() {
    try {
      // Ensure sync directory exists
      await fs.mkdir(this.syncDir, { recursive: true });

      // Update metadata timestamps and counts
      this.graph.metadata.lastUpdated = new Date().toISOString();
      this.graph.metadata.totalNodes = this.graph.nodes.length;
      this.graph.metadata.totalEdges = this.graph.edges.length;
      this.graph.metadata.orphanedNodes = findOrphanedNodes(this.graph);
      this.graph.metadata.brokenLinks = findBrokenLinks(this.graph);

      // Write to file
      await fs.writeFile(
        this.metadataFile,
        JSON.stringify(this.graph, null, 2),
        'utf8'
      );

      console.log(`[LinkManager] Saved metadata: ${this.graph.nodes.length} nodes, ${this.graph.edges.length} edges`);
    } catch (error) {
      console.error('[LinkManager] Error saving metadata:', error);
    }
  }

  /**
   * Scan a directory recursively for markdown files
   */
  async scanDirectory(dir, relativePath = '') {
    const files = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip hidden files and sync directory
        if (entry.name.startsWith('.') || entry.name === '.cospec-sync') {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subFiles = await this.scanDirectory(fullPath, relPath);
          files.push(...subFiles);
        } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.markdown'))) {
          // Get file stats
          const stats = await fs.stat(fullPath);

          files.push({
            path: relPath,
            fullPath,
            size: stats.size,
            modified: stats.mtime.toISOString()
          });
        }
      }
    } catch (error) {
      console.error(`[LinkManager] Error scanning directory ${dir}:`, error);
    }

    return files;
  }

  /**
   * Rebuild the entire graph from scratch
   */
  async rebuildGraph() {
    console.log('[LinkManager] Rebuilding graph...');

    try {
      // Scan all markdown files
      const files = await this.scanDirectory(this.markdownDir);
      console.log(`[LinkManager] Found ${files.length} markdown files`);

      // Clear existing graph
      this.graph.nodes = [];
      this.graph.edges = [];

      // Create nodes for all files
      for (const file of files) {
        this.graph.nodes.push({
          id: file.path,
          label: path.basename(file.path, path.extname(file.path)),
          path: file.path,
          type: 'file',
          exists: true,
          metadata: {
            size: file.size,
            modified: file.modified,
            tags: [],
            title: null
          }
        });
      }

      // Extract links from each file
      for (const file of files) {
        try {
          const content = await fs.readFile(file.fullPath, 'utf8');
          const links = extractLinks(content, file.path);

          // Add links as edges
          for (const link of links) {
            // Create unique edge ID
            const edgeId = `${link.from}->${link.to}${link.relationType ? `-${link.relationType}` : ''}`;

            this.graph.edges.push({
              id: edgeId,
              from: link.from,
              to: link.to,
              type: link.type,
              relationType: link.relationType,
              bidirectional: false,
              metadata: link.metadata || {}
            });

            // Ensure target node exists (even if file doesn't exist yet)
            const targetExists = this.graph.nodes.some(n => n.id === link.to);
            if (!targetExists) {
              this.graph.nodes.push({
                id: link.to,
                label: path.basename(link.to, path.extname(link.to)),
                path: link.to,
                type: 'file',
                exists: false,
                metadata: {
                  size: 0,
                  modified: null,
                  tags: [],
                  title: null
                }
              });
            }
          }
        } catch (error) {
          console.error(`[LinkManager] Error processing file ${file.path}:`, error);
        }
      }

      // Save the rebuilt graph
      await this.saveMetadata();

      console.log(`[LinkManager] Graph rebuilt: ${this.graph.nodes.length} nodes, ${this.graph.edges.length} edges`);
    } catch (error) {
      console.error('[LinkManager] Error rebuilding graph:', error);
      throw error;
    }
  }

  /**
   * Handle file change (add or update)
   * Debounced to avoid excessive processing
   */
  handleFileChange(filePath, content) {
    // Clear existing debounce timer
    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath));
    }

    // Set new debounce timer
    const timer = setTimeout(async () => {
      try {
        await this.processFileChange(filePath, content);
        this.debounceTimers.delete(filePath);
      } catch (error) {
        console.error(`[LinkManager] Error processing file change for ${filePath}:`, error);
      }
    }, this.debounceDelay);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Process file change immediately
   */
  async processFileChange(filePath, content) {
    console.log(`[LinkManager] Processing file change: ${filePath}`);

    try {
      // Update or create node
      let node = this.graph.nodes.find(n => n.id === filePath);
      if (!node) {
        node = {
          id: filePath,
          label: path.basename(filePath, path.extname(filePath)),
          path: filePath,
          type: 'file',
          exists: true,
          metadata: {
            size: Buffer.byteLength(content, 'utf8'),
            modified: new Date().toISOString(),
            tags: [],
            title: null
          }
        };
        this.graph.nodes.push(node);
      } else {
        node.exists = true;
        node.metadata.modified = new Date().toISOString();
        node.metadata.size = Buffer.byteLength(content, 'utf8');
      }

      // Remove existing edges from this file
      this.graph.edges = this.graph.edges.filter(edge => edge.from !== filePath);

      // Extract new links
      const links = extractLinks(content, filePath);

      // Add new edges
      for (const link of links) {
        const edgeId = `${link.from}->${link.to}${link.relationType ? `-${link.relationType}` : ''}`;

        this.graph.edges.push({
          id: edgeId,
          from: link.from,
          to: link.to,
          type: link.type,
          relationType: link.relationType,
          bidirectional: false,
          metadata: link.metadata || {}
        });

        // Ensure target node exists
        let targetNode = this.graph.nodes.find(n => n.id === link.to);
        if (!targetNode) {
          const targetFullPath = path.join(this.markdownDir, link.to);
          const targetExists = await fs.access(targetFullPath).then(() => true).catch(() => false);

          this.graph.nodes.push({
            id: link.to,
            label: path.basename(link.to, path.extname(link.to)),
            path: link.to,
            type: 'file',
            exists: targetExists,
            metadata: {
              size: 0,
              modified: null,
              tags: [],
              title: null
            }
          });
        }
      }

      // Save metadata
      await this.saveMetadata();

      console.log(`[LinkManager] Updated graph for ${filePath}: ${links.length} outgoing links`);
    } catch (error) {
      console.error(`[LinkManager] Error processing file change for ${filePath}:`, error);
    }
  }

  /**
   * Handle file deletion
   */
  async handleFileDelete(filePath) {
    console.log(`[LinkManager] Handling file deletion: ${filePath}`);

    try {
      // Mark node as non-existent (don't remove it as it might have incoming links)
      const node = this.graph.nodes.find(n => n.id === filePath);
      if (node) {
        node.exists = false;
      }

      // Remove outgoing edges from this file
      this.graph.edges = this.graph.edges.filter(edge => edge.from !== filePath);

      // Save metadata
      await this.saveMetadata();

      console.log(`[LinkManager] Removed links from deleted file: ${filePath}`);
    } catch (error) {
      console.error(`[LinkManager] Error handling file deletion for ${filePath}:`, error);
    }
  }

  /**
   * Get full graph
   */
  getFullGraph() {
    return this.graph;
  }

  /**
   * Get links for a specific file
   */
  getLinksForFile(filePath) {
    const outgoing = getOutgoingLinks(this.graph.edges, filePath);
    const incoming = getIncomingLinks(this.graph.edges, filePath);

    return {
      filePath,
      outgoing,
      incoming,
      total: outgoing.length + incoming.length
    };
  }

  /**
   * Add a link between files
   */
  async addLink(fromPath, toPath, linkType = 'wikilink', relationType = null) {
    const edgeId = `${fromPath}->${toPath}${relationType ? `-${relationType}` : ''}`;

    // Check if edge already exists
    const existingEdge = this.graph.edges.find(e => e.id === edgeId);
    if (existingEdge) {
      console.log(`[LinkManager] Link already exists: ${edgeId}`);
      return existingEdge;
    }

    // Create new edge
    const newEdge = {
      id: edgeId,
      from: fromPath,
      to: toPath,
      type: linkType,
      relationType,
      bidirectional: false,
      metadata: {
        addedProgrammatically: true,
        addedAt: new Date().toISOString()
      }
    };

    this.graph.edges.push(newEdge);

    // Ensure both nodes exist
    for (const filePath of [fromPath, toPath]) {
      let node = this.graph.nodes.find(n => n.id === filePath);
      if (!node) {
        const fullPath = path.join(this.markdownDir, filePath);
        const exists = await fs.access(fullPath).then(() => true).catch(() => false);

        this.graph.nodes.push({
          id: filePath,
          label: path.basename(filePath, path.extname(filePath)),
          path: filePath,
          type: 'file',
          exists,
          metadata: {
            size: 0,
            modified: null,
            tags: [],
            title: null
          }
        });
      }
    }

    await this.saveMetadata();

    console.log(`[LinkManager] Added link: ${edgeId}`);
    return newEdge;
  }

  /**
   * Remove a link between files
   */
  async removeLink(fromPath, toPath, relationType = null) {
    const edgeId = `${fromPath}->${toPath}${relationType ? `-${relationType}` : ''}`;

    const initialLength = this.graph.edges.length;
    this.graph.edges = this.graph.edges.filter(e => e.id !== edgeId);

    const removed = initialLength - this.graph.edges.length;

    if (removed > 0) {
      await this.saveMetadata();
      console.log(`[LinkManager] Removed link: ${edgeId}`);
    } else {
      console.log(`[LinkManager] Link not found: ${edgeId}`);
    }

    return removed > 0;
  }

  /**
   * Validate the graph
   */
  validateGraph() {
    return validateGraph(this.graph);
  }

  /**
   * Export graph as JSON
   */
  exportGraph(format = 'json') {
    if (format === 'json') {
      return JSON.stringify(this.graph, null, 2);
    }
    // Additional formats can be added here (YAML, DOT, etc.)
    throw new Error(`Unsupported export format: ${format}`);
  }
}

module.exports = LinkManager;
