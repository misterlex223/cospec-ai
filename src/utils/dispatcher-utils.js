/**
 * Utility functions for the Dynamic Dispatch Worker
 */

/**
 * Extract organization ID from request
 * 
 * This function extracts the organization ID from the request URL or headers
 * based on different strategies:
 * 1. From subdomain: org-name.cospec.app
 * 2. From path: /org/org-name/...
 * 3. From custom header: X-CoSpec-Organization
 * 
 * @param {Request} request - The incoming request
 * @param {URL} url - The parsed URL object
 * @returns {string|null} - The organization ID or null if not found
 */
export function extractOrgId(request, url) {
  // Strategy 1: Extract from subdomain
  const hostname = url.hostname;
  if (hostname.includes('.') && !hostname.startsWith('www.')) {
    const subdomain = hostname.split('.')[0];
    if (subdomain && subdomain !== 'app' && subdomain !== 'api') {
      return subdomain;
    }
  }
  
  // Strategy 2: Extract from path
  const pathParts = url.pathname.split('/').filter(Boolean);
  if (pathParts.length >= 2 && pathParts[0] === 'org') {
    return pathParts[1];
  }
  
  // Strategy 3: Extract from custom header
  const orgHeader = request.headers.get('X-CoSpec-Organization');
  if (orgHeader) {
    return orgHeader;
  }
  
  return null;
}

/**
 * Generate a standardized JSON response
 * 
 * @param {Object} data - The response data
 * @param {Object} options - Response options
 * @param {number} options.status - HTTP status code (default: 200)
 * @param {Object} options.headers - Additional headers
 * @returns {Response} - The formatted response
 */
export function generateResponse(data, options = {}) {
  const status = options.status || 200;
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  
  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}

/**
 * Generate a unique ID
 * 
 * @returns {string} - A unique ID
 */
export function generateId() {
  return crypto.randomUUID();
}

/**
 * Get current timestamp in milliseconds
 * 
 * @returns {number} - Current timestamp
 */
export function getCurrentTimestamp() {
  return Date.now();
}

/**
 * Validate email format
 * 
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether the email is valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize a string for use as a slug
 * 
 * @param {string} str - String to convert to slug
 * @returns {string} - Sanitized slug
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
