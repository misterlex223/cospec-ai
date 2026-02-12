/**
 * Link Parser - Extract links from Markdown content
 * Supports:
 * - [[wikilink]] - Obsidian-style wikilinks
 * - [[document|type:relation]] - Typed wikilinks
 * - [text](path.md) - Standard markdown links
 */

const path = require('path');
const { LINK_TYPES, LINK_PATTERNS } = require('./shared/linkSchema');
const { normalizePath } = require('./shared/linkValidation');

/**
 * Parse wikilinks from markdown content
 * @param {string} content - Markdown content
 * @param {string} sourceFilePath - Path of the source file (for context)
 * @returns {Array} Array of parsed links
 */
function parseWikilinks(content, sourceFilePath) {
  const links = [];
  const lines = content.split('\n');

  // Parse typed wikilinks first: [[document|type:relation]]
  lines.forEach((line, lineIndex) => {
    const typedMatches = [...line.matchAll(LINK_PATTERNS.TYPED_WIKILINK)];
    typedMatches.forEach(match => {
      const targetPath = match[1].trim();
      const relationType = match[2].trim();

      links.push({
        from: sourceFilePath,
        to: normalizePath(targetPath),
        type: LINK_TYPES.TYPED_WIKILINK,
        relationType,
        metadata: {
          sourceLineNumber: lineIndex + 1,
          context: line.trim(),
          rawMatch: match[0]
        }
      });
    });
  });

  // Parse simple wikilinks: [[document]]
  // Need to remove typed wikilinks first to avoid double-counting
  const contentWithoutTyped = content.replace(LINK_PATTERNS.TYPED_WIKILINK, '');
  const linesWithoutTyped = contentWithoutTyped.split('\n');

  linesWithoutTyped.forEach((line, lineIndex) => {
    const simpleMatches = [...line.matchAll(LINK_PATTERNS.WIKILINK)];
    simpleMatches.forEach(match => {
      const targetPath = match[1].trim();

      links.push({
        from: sourceFilePath,
        to: normalizePath(targetPath),
        type: LINK_TYPES.WIKILINK,
        relationType: null,
        metadata: {
          sourceLineNumber: lineIndex + 1,
          context: line.trim(),
          rawMatch: match[0]
        }
      });
    });
  });

  return links;
}

/**
 * Parse markdown links from content
 * @param {string} content - Markdown content
 * @param {string} sourceFilePath - Path of the source file
 * @returns {Array} Array of parsed links
 */
function parseMarkdownLinks(content, sourceFilePath) {
  const links = [];
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    const matches = [...line.matchAll(LINK_PATTERNS.MARKDOWN_LINK)];
    matches.forEach(match => {
      const linkText = match[1].trim();
      let targetPath = match[2].trim();

      // Determine link type
      let linkType = LINK_TYPES.MARKDOWN;
      if (targetPath.startsWith('./') || targetPath.startsWith('../')) {
        linkType = LINK_TYPES.RELATIVE;
      } else if (targetPath.startsWith('/')) {
        linkType = LINK_TYPES.ABSOLUTE;
      }

      // Resolve relative paths
      if (linkType === LINK_TYPES.RELATIVE) {
        const sourceDir = path.dirname(sourceFilePath);
        targetPath = path.join(sourceDir, targetPath);
      }

      // Normalize the target path
      targetPath = normalizePath(targetPath);

      links.push({
        from: sourceFilePath,
        to: targetPath,
        type: linkType,
        relationType: null,
        metadata: {
          sourceLineNumber: lineIndex + 1,
          context: line.trim(),
          rawMatch: match[0],
          linkText
        }
      });
    });
  });

  return links;
}

/**
 * Extract all links from markdown content
 * @param {string} content - Markdown content
 * @param {string} filePath - Path of the file being parsed
 * @returns {Array} Array of all links found
 */
function extractLinks(content, filePath) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const wikilinks = parseWikilinks(content, filePath);
  const markdownLinks = parseMarkdownLinks(content, filePath);

  return [...wikilinks, ...markdownLinks];
}

/**
 * Extract frontmatter from markdown content
 * @param {string} content - Markdown content
 * @returns {object|null} Frontmatter object or null
 */
function extractFrontmatter(content) {
  if (!content || !content.startsWith('---\n')) {
    return null;
  }

  const endIndex = content.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    return null;
  }

  const frontmatterText = content.substring(4, endIndex);
  try {
    // Simple YAML-like parsing (for basic key: value pairs)
    const frontmatter = {};
    frontmatterText.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();

        // Handle arrays (lines starting with -)
        if (value.startsWith('[') && value.endsWith(']')) {
          frontmatter[key] = value.slice(1, -1).split(',').map(v => v.trim());
        } else {
          frontmatter[key] = value;
        }
      }
    });
    return frontmatter;
  } catch (error) {
    console.error('Error parsing frontmatter:', error);
    return null;
  }
}

/**
 * Create backlinks from a list of links
 * @param {Array} links - Array of link objects
 * @returns {Array} Array of backlink objects
 */
function createBacklinks(links) {
  const backlinks = [];

  links.forEach(link => {
    backlinks.push({
      from: link.to,
      to: link.from,
      type: `${link.type}_backlink`,
      relationType: link.relationType ? `backlink_${link.relationType}` : null,
      isBacklink: true,
      originalLink: {
        from: link.from,
        to: link.to
      },
      metadata: {
        sourceLineNumber: link.metadata.sourceLineNumber,
        context: link.metadata.context
      }
    });
  });

  return backlinks;
}

/**
 * Get all outgoing links for a file
 * @param {Array} allLinks - Array of all links in the graph
 * @param {string} filePath - File path to get outgoing links for
 * @returns {Array} Array of outgoing links
 */
function getOutgoingLinks(allLinks, filePath) {
  return allLinks.filter(link => link.from === filePath && !link.isBacklink);
}

/**
 * Get all incoming links (backlinks) for a file
 * @param {Array} allLinks - Array of all links in the graph
 * @param {string} filePath - File path to get incoming links for
 * @returns {Array} Array of incoming links
 */
function getIncomingLinks(allLinks, filePath) {
  return allLinks.filter(link => link.to === filePath && !link.isBacklink);
}

/**
 * Parse link reference from various formats
 * Converts user input like "document" or "folder/document.md" to normalized path
 * @param {string} reference - User input reference
 * @param {string} contextPath - Optional context path for relative resolution
 * @returns {string} Normalized file path
 */
function parseLinkReference(reference, contextPath = '') {
  if (!reference) return '';

  // If it's already a full path, just normalize it
  if (reference.includes('/') || reference.endsWith('.md')) {
    return normalizePath(reference);
  }

  // If we have context and reference doesn't look like a path,
  // treat it as a file in the same directory
  if (contextPath) {
    const contextDir = path.dirname(contextPath);
    return normalizePath(path.join(contextDir, reference));
  }

  // Otherwise just normalize as-is
  return normalizePath(reference);
}

/**
 * Generate link text for creating markdown links
 * @param {string} fromPath - Source file path
 * @param {string} toPath - Target file path
 * @param {string} linkType - Type of link to generate (wikilink, markdown, etc.)
 * @param {string} relationType - Optional relation type for typed links
 * @returns {string} Generated link markdown
 */
function generateLinkText(fromPath, toPath, linkType = LINK_TYPES.WIKILINK, relationType = null) {
  const fileName = path.basename(toPath, '.md');

  switch (linkType) {
    case LINK_TYPES.WIKILINK:
      return `[[${fileName}]]`;

    case LINK_TYPES.TYPED_WIKILINK:
      return `[[${fileName}|type:${relationType}]]`;

    case LINK_TYPES.MARKDOWN:
      return `[${fileName}](${toPath})`;

    case LINK_TYPES.RELATIVE:
      const fromDir = path.dirname(fromPath);
      const relativePath = path.relative(fromDir, toPath);
      return `[${fileName}](${relativePath})`;

    default:
      return `[[${fileName}]]`;
  }
}

module.exports = {
  parseWikilinks,
  parseMarkdownLinks,
  extractLinks,
  extractFrontmatter,
  createBacklinks,
  getOutgoingLinks,
  getIncomingLinks,
  parseLinkReference,
  generateLinkText
};
