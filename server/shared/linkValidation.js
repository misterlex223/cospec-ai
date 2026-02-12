/**
 * Link Validation Utilities
 * Single source of truth for validation logic
 * Used by both runtime validation and CLI tools
 */

const path = require('path');
const {
  LINK_TYPES,
  RELATION_TYPES,
  VALIDATION_RULES,
  ERROR_CODES
} = require('./linkSchema');

/**
 * Validate a link path
 * @param {string} linkPath - The path to validate
 * @returns {{ valid: boolean, error?: string, code?: string }}
 */
function validateLinkPath(linkPath) {
  if (!linkPath || typeof linkPath !== 'string') {
    return {
      valid: false,
      error: 'Link path must be a non-empty string',
      code: ERROR_CODES.INVALID_PATH
    };
  }

  // Trim whitespace
  linkPath = linkPath.trim();

  // Check length
  if (linkPath.length > VALIDATION_RULES.MAX_PATH_LENGTH) {
    return {
      valid: false,
      error: `Link path exceeds maximum length of ${VALIDATION_RULES.MAX_PATH_LENGTH}`,
      code: ERROR_CODES.INVALID_PATH
    };
  }

  // Check for valid characters
  if (!VALIDATION_RULES.PATH_PATTERN.test(linkPath)) {
    return {
      valid: false,
      error: 'Link path contains invalid characters',
      code: ERROR_CODES.INVALID_PATH
    };
  }

  // Check for directory traversal attempts
  if (linkPath.includes('..')) {
    return {
      valid: false,
      error: 'Link path cannot contain ".." (directory traversal)',
      code: ERROR_CODES.INVALID_PATH
    };
  }

  // Ensure it ends with valid extension
  const ext = path.extname(linkPath).toLowerCase();
  if (ext && !VALIDATION_RULES.VALID_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Link path must have a valid extension: ${VALIDATION_RULES.VALID_EXTENSIONS.join(', ')}`,
      code: ERROR_CODES.INVALID_PATH
    };
  }

  return { valid: true };
}

/**
 * Validate a relation type
 * @param {string} relationType - The relation type to validate
 * @returns {{ valid: boolean, error?: string, code?: string }}
 */
function validateRelationType(relationType) {
  if (!relationType) {
    return { valid: true }; // Relation type is optional
  }

  const validTypes = Object.values(RELATION_TYPES);
  if (!validTypes.includes(relationType)) {
    return {
      valid: false,
      error: `Invalid relation type. Must be one of: ${validTypes.join(', ')}`,
      code: ERROR_CODES.INVALID_TYPE
    };
  }

  return { valid: true };
}

/**
 * Validate a link object
 * @param {object} link - Link object with from, to, type, relationType
 * @returns {{ valid: boolean, errors: Array }}
 */
function validateLink(link) {
  const errors = [];

  if (!link || typeof link !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'link', message: 'Link must be an object', code: ERROR_CODES.INVALID_SYNTAX }]
    };
  }

  // Validate 'from' path
  if (!link.from) {
    errors.push({ field: 'from', message: 'Missing source path', code: ERROR_CODES.INVALID_PATH });
  } else {
    const fromValidation = validateLinkPath(link.from);
    if (!fromValidation.valid) {
      errors.push({ field: 'from', message: fromValidation.error, code: fromValidation.code });
    }
  }

  // Validate 'to' path
  if (!link.to) {
    errors.push({ field: 'to', message: 'Missing target path', code: ERROR_CODES.INVALID_PATH });
  } else {
    const toValidation = validateLinkPath(link.to);
    if (!toValidation.valid) {
      errors.push({ field: 'to', message: toValidation.error, code: toValidation.code });
    }
  }

  // Validate link type
  if (link.type && !Object.values(LINK_TYPES).includes(link.type)) {
    errors.push({
      field: 'type',
      message: `Invalid link type. Must be one of: ${Object.values(LINK_TYPES).join(', ')}`,
      code: ERROR_CODES.INVALID_TYPE
    });
  }

  // Validate relation type if present
  if (link.relationType) {
    const relationValidation = validateRelationType(link.relationType);
    if (!relationValidation.valid) {
      errors.push({ field: 'relationType', message: relationValidation.error, code: relationValidation.code });
    }
  }

  // Check for self-referencing link
  if (link.from && link.to && link.from === link.to) {
    errors.push({
      field: 'link',
      message: 'Link cannot reference itself',
      code: ERROR_CODES.CIRCULAR_DEPENDENCY
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Detect circular dependencies in a graph
 * @param {object} graph - Graph object with nodes and edges
 * @param {string} startNode - Starting node path
 * @param {Set} visited - Set of visited nodes
 * @param {Set} recursionStack - Current recursion stack
 * @returns {{ hasCircular: boolean, path?: Array }}
 */
function detectCircularDependency(graph, startNode, visited = new Set(), recursionStack = new Set(), path = []) {
  visited.add(startNode);
  recursionStack.add(startNode);
  path.push(startNode);

  // Get outgoing edges from this node
  const outgoingEdges = graph.edges.filter(edge => edge.from === startNode);

  for (const edge of outgoingEdges) {
    const targetNode = edge.to;

    if (!visited.has(targetNode)) {
      const result = detectCircularDependency(graph, targetNode, visited, recursionStack, [...path]);
      if (result.hasCircular) {
        return result;
      }
    } else if (recursionStack.has(targetNode)) {
      // Found a cycle
      return {
        hasCircular: true,
        path: [...path, targetNode]
      };
    }
  }

  recursionStack.delete(startNode);
  return { hasCircular: false };
}

/**
 * Check for circular dependencies in entire graph
 * @param {object} graph - Graph object with nodes and edges
 * @returns {Array} Array of circular dependency paths
 */
function findAllCircularDependencies(graph) {
  const circularPaths = [];
  const visited = new Set();

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      const result = detectCircularDependency(graph, node.id, visited, new Set(), []);
      if (result.hasCircular) {
        circularPaths.push(result.path);
      }
    }
  }

  return circularPaths;
}

/**
 * Find broken links in a graph
 * @param {object} graph - Graph object with nodes and edges
 * @returns {Array} Array of broken links
 */
function findBrokenLinks(graph) {
  const existingNodes = new Set(graph.nodes.filter(n => n.exists).map(n => n.id));
  const brokenLinks = [];

  for (const edge of graph.edges) {
    if (!existingNodes.has(edge.to)) {
      brokenLinks.push({
        from: edge.from,
        to: edge.to,
        type: edge.type,
        relationType: edge.relationType,
        error: 'Target file does not exist',
        code: ERROR_CODES.FILE_NOT_FOUND
      });
    }
  }

  return brokenLinks;
}

/**
 * Find orphaned nodes (files with no links)
 * @param {object} graph - Graph object with nodes and edges
 * @returns {Array} Array of orphaned node IDs
 */
function findOrphanedNodes(graph) {
  const connectedNodes = new Set();

  for (const edge of graph.edges) {
    connectedNodes.add(edge.from);
    connectedNodes.add(edge.to);
  }

  return graph.nodes
    .filter(node => !connectedNodes.has(node.id))
    .map(node => node.id);
}

/**
 * Validate entire graph structure
 * @param {object} graph - Graph object with nodes and edges
 * @returns {{ valid: boolean, errors: Array, warnings: Array }}
 */
function validateGraph(graph) {
  const errors = [];
  const warnings = [];

  // Validate graph structure
  if (!graph || typeof graph !== 'object') {
    return {
      valid: false,
      errors: [{ message: 'Graph must be an object', code: ERROR_CODES.INVALID_SYNTAX }],
      warnings: []
    };
  }

  if (!Array.isArray(graph.nodes)) {
    errors.push({ message: 'Graph must have a nodes array', code: ERROR_CODES.INVALID_SYNTAX });
  }

  if (!Array.isArray(graph.edges)) {
    errors.push({ message: 'Graph must have an edges array', code: ERROR_CODES.INVALID_SYNTAX });
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Validate each edge
  for (let i = 0; i < graph.edges.length; i++) {
    const edge = graph.edges[i];
    const validation = validateLink(edge);
    if (!validation.valid) {
      errors.push({
        message: `Invalid edge at index ${i}`,
        details: validation.errors,
        code: ERROR_CODES.INVALID_SYNTAX
      });
    }
  }

  // Check for broken links
  const brokenLinks = findBrokenLinks(graph);
  if (brokenLinks.length > 0) {
    warnings.push({
      message: `Found ${brokenLinks.length} broken link(s)`,
      details: brokenLinks,
      code: ERROR_CODES.BROKEN_LINK
    });
  }

  // Check for circular dependencies
  const circularPaths = findAllCircularDependencies(graph);
  if (circularPaths.length > 0) {
    warnings.push({
      message: `Found ${circularPaths.length} circular dependency path(s)`,
      details: circularPaths,
      code: ERROR_CODES.CIRCULAR_DEPENDENCY
    });
  }

  // Check for orphaned nodes
  const orphanedNodes = findOrphanedNodes(graph);
  if (orphanedNodes.length > 0) {
    warnings.push({
      message: `Found ${orphanedNodes.length} orphaned file(s) with no links`,
      details: orphanedNodes
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Normalize a file path for consistent comparison
 * @param {string} filePath - File path to normalize
 * @returns {string} Normalized path
 */
function normalizePath(filePath) {
  if (!filePath) return '';

  // Remove leading/trailing whitespace
  let normalized = filePath.trim();

  // Remove leading slash
  if (normalized.startsWith('/')) {
    normalized = normalized.substring(1);
  }

  // Add .md extension if missing
  if (!path.extname(normalized)) {
    normalized += '.md';
  }

  // Normalize path separators
  normalized = normalized.replace(/\\/g, '/');

  return normalized;
}

module.exports = {
  validateLinkPath,
  validateRelationType,
  validateLink,
  validateGraph,
  detectCircularDependency,
  findAllCircularDependencies,
  findBrokenLinks,
  findOrphanedNodes,
  normalizePath
};
