/**
 * Authentication utilities for CoSpec SaaS platform
 */

// Helper function to generate JWT tokens
async function generateToken(payload, env) {
  // Create JWT with expiration time
  const expirationTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours
  
  const token = await createJWT(
    {
      ...payload,
      exp: expirationTime,
      iat: Math.floor(Date.now() / 1000)
    },
    env.JWT_SECRET
  );
  
  return token;
}

// Helper function to verify JWT tokens
async function verifyToken(token, env) {
  try {
    const decoded = await verifyJWT(token, env.JWT_SECRET);
    return { valid: true, payload: decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Helper function to create a JWT
async function createJWT(payload, secret) {
  // In a real implementation, this would use the Web Crypto API
  // For now, we'll use a simplified version
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const base64UrlEncode = (str) => {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };
  
  const headerStr = base64UrlEncode(JSON.stringify(header));
  const payloadStr = base64UrlEncode(JSON.stringify(payload));
  
  const encoder = new TextEncoder();
  const data = encoder.encode(`${headerStr}.${payloadStr}`);
  const secretData = encoder.encode(secret);
  
  // Use Web Crypto API for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    secretData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, data);
  
  // Convert signature to base64url
  const signatureStr = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );
  
  return `${headerStr}.${payloadStr}.${signatureStr}`;
}

// Helper function to verify a JWT
async function verifyJWT(token, secret) {
  const [headerStr, payloadStr, signatureStr] = token.split('.');
  
  if (!headerStr || !payloadStr || !signatureStr) {
    throw new Error('Invalid token format');
  }
  
  // Decode payload
  const base64UrlDecode = (str) => {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
      str += '=';
    }
    return JSON.parse(atob(str));
  };
  
  const payload = base64UrlDecode(payloadStr);
  
  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expired');
  }
  
  // Verify signature
  const encoder = new TextEncoder();
  const data = encoder.encode(`${headerStr}.${payloadStr}`);
  const secretData = encoder.encode(secret);
  
  // Use Web Crypto API for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    secretData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  // Convert base64url signature to ArrayBuffer
  const signatureBase64 = signatureStr.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - signatureBase64.length % 4) % 4);
  const signatureBytes = atob(signatureBase64 + padding);
  const signatureArray = new Uint8Array(signatureBytes.length);
  
  for (let i = 0; i < signatureBytes.length; i++) {
    signatureArray[i] = signatureBytes.charCodeAt(i);
  }
  
  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureArray,
    data
  );
  
  if (!isValid) {
    throw new Error('Invalid signature');
  }
  
  return payload;
}

// Helper function to hash passwords
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  // Use SHA-256 for password hashing (in a real app, use a proper password hashing algorithm like bcrypt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

// Helper function to verify passwords
async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Middleware to authenticate requests
async function authenticateRequest(request, env) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  const { valid, payload, error } = await verifyToken(token, env);
  
  if (!valid) {
    console.error('Authentication error:', error);
    return null;
  }
  
  // Check if user exists in database
  const user = await env.COSPEC_DB.prepare(
    'SELECT * FROM Users WHERE id = ?'
  ).bind(payload.sub).first();
  
  if (!user) {
    return null;
  }
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: payload.roles || []
  };
}

// Export authentication utilities
export {
  generateToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  authenticateRequest
};
