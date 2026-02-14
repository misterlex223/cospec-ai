/**
 * Express application configuration
 */

import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import serveStatic from 'serve-static';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'node:path';

import { config } from './config/index.js';
import type { ExpressRequest, ExpressResponse } from './types/express.js';

// ============================================================================
// Application Setup
// ============================================================================

const app: Express = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ============================================================================
// Middleware
// ============================================================================

// Security headers
app.use(helmet());

// CORS
app.use(cors());

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Logging
app.use(morgan('dev'));

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', apiLimiter);

// ============================================================================
// Static Files
// ============================================================================

function setupStaticFiles(): void {
  const fs = require('fs');

  // Try app-react/dist first
  try {
    if (fs.existsSync(config.distPath) && fs.statSync(config.distPath).isDirectory()) {
      app.use(serveStatic(config.distPath));
      return;
    }
  } catch {}

  // Fall back to root dist
  try {
    if (fs.existsSync(config.rootDistPath) && fs.statSync(config.rootDistPath).isDirectory()) {
      app.use(serveStatic(config.rootDistPath));
      console.log('Using root dist directory for static files');
      return;
    }
  } catch {}

  console.warn('Warning: Frontend build directory not found');
  console.warn('Run `npm run build` in app-react directory to build frontend');
}

setupStaticFiles();

// ============================================================================
// Routes
// ============================================================================

// Health check
app.get('/health', (_req: ExpressRequest, res: ExpressResponse) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API info
app.get('/api', (_req: ExpressRequest, res: ExpressResponse) => {
  res.json({
    name: 'CoSpec AI Server',
    version: '1.0.0',
    status: 'ok',
  });
});

// ============================================================================
// Error Handlers
// ============================================================================

// 404 handler
app.use('/api/', (_req: ExpressRequest, res: ExpressResponse) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Catch-all for SPA
app.use('*', (req: ExpressRequest, res: ExpressResponse): void => {
  if (req.path?.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
    return;
  }

  const fs = require('fs');
  let indexPath = path.join(config.distPath, 'index.html');

  if (!fs.existsSync(indexPath)) {
    const rootIndexPath = path.join(config.rootDistPath, 'index.html');
    if (fs.existsSync(rootIndexPath)) {
      indexPath = rootIndexPath;
    } else {
      res.status(500).send('Frontend build not found. Please run build process.');
      return;
    }
  }

  res.sendFile(indexPath);
});

// Error handler
app.use((err: Error, _req: ExpressRequest, res: ExpressResponse) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error'
  });
});

// ============================================================================
// Exports
// ============================================================================

export { app, httpServer, io };
