/**
 * Link Schema Definitions
 * Single source of truth for link types and validation rules
 * Used by both runtime validation and CLI tools
 */

/**
 * Supported link types in CoSpec AI
 */
const LINK_TYPES = {
  WIKILINK: 'wikilink',           // [[document]]
  TYPED_WIKILINK: 'typed_wikilink', // [[document|type:relation]]
  MARKDOWN: 'markdown',           // [text](path.md)
  RELATIVE: 'relative',           // [text](./path.md)
  ABSOLUTE: 'absolute'            // [text](/specs/api.md)
};

/**
 * Supported relationship types for typed links
 */
const RELATION_TYPES = {
  DEPENDS_ON: 'depends-on',
  RELATED_TO: 'related-to',
  IMPLEMENTS: 'implements',
  REFERENCES: 'references',
  EXTENDS: 'extends',
  SUPERSEDES: 'supersedes',
  PARENT_OF: 'parent-of',
  CHILD_OF: 'child-of'
};

/**
 * Link patterns (regex) for parsing markdown content
 */
const LINK_PATTERNS = {
  // [[document]] or [[document.md]]
  WIKILINK: /\[\[([^\]|]+)\]\]/g,

  // [[document|type:relation]] or [[document.md|type:depends-on]]
  TYPED_WIKILINK: /\[\[([^\]|]+)\|type:([^\]]+)\]\]/g,

  // [text](path.md) - standard markdown links
  MARKDOWN_LINK: /\[([^\]]+)\]\(([^)]+\.md)\)/g,

  // Extract just the path from markdown link
  MARKDOWN_PATH: /\[([^\]]+)\]\(([^)]+)\)/
};

/**
 * Validation rules
 */
const VALIDATION_RULES = {
  // Maximum link depth to prevent infinite loops
  MAX_DEPTH: 100,

  // Maximum number of links per file
  MAX_LINKS_PER_FILE: 1000,

  // Valid file extensions for linked documents
  VALID_EXTENSIONS: ['.md', '.markdown'],

  // Path validation regex (allow alphanumeric, dash, underscore, slash, dot)
  PATH_PATTERN: /^[a-zA-Z0-9._\-/]+$/,

  // Maximum path length
  MAX_PATH_LENGTH: 500
};

/**
 * Error codes for link validation
 */
const ERROR_CODES = {
  BROKEN_LINK: 'BROKEN_LINK',
  INVALID_SYNTAX: 'INVALID_SYNTAX',
  INVALID_TYPE: 'INVALID_TYPE',
  CIRCULAR_DEPENDENCY: 'CIRCULAR_DEPENDENCY',
  INVALID_PATH: 'INVALID_PATH',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  TOO_MANY_LINKS: 'TOO_MANY_LINKS',
  DEPTH_EXCEEDED: 'DEPTH_EXCEEDED'
};

/**
 * Link node schema for graph representation
 */
const NODE_SCHEMA = {
  id: 'string',           // File path (relative to MARKDOWN_DIR)
  label: 'string',        // Display name (filename)
  path: 'string',         // Full relative path
  type: 'file',           // Node type (always 'file' for now)
  exists: 'boolean',      // Whether file exists on disk
  metadata: {
    size: 'number',       // File size in bytes
    modified: 'string',   // Last modified timestamp (ISO string)
    tags: 'array',        // Tags from frontmatter
    title: 'string'       // Title from frontmatter
  }
};

/**
 * Link edge schema for graph representation
 */
const EDGE_SCHEMA = {
  id: 'string',           // Unique edge ID (from-to-type)
  from: 'string',         // Source file path
  to: 'string',           // Target file path
  type: 'string',         // Link type (LINK_TYPES)
  relationType: 'string', // Relation type (RELATION_TYPES) for typed links
  bidirectional: 'boolean', // Whether this is a bidirectional link
  metadata: {
    sourceLineNumber: 'number', // Line number in source file
    context: 'string'     // Surrounding text for context
  }
};

/**
 * Graph metadata schema
 */
const GRAPH_METADATA_SCHEMA = {
  version: 1,
  lastUpdated: 'string',  // ISO timestamp
  totalNodes: 'number',
  totalEdges: 'number',
  orphanedNodes: 'array', // Files with no incoming or outgoing links
  brokenLinks: 'array'    // Links pointing to non-existent files
};

module.exports = {
  LINK_TYPES,
  RELATION_TYPES,
  LINK_PATTERNS,
  VALIDATION_RULES,
  ERROR_CODES,
  NODE_SCHEMA,
  EDGE_SCHEMA,
  GRAPH_METADATA_SCHEMA
};
