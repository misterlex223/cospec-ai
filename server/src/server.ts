/**
 * HTTP Server entry point
 */

import { httpServer, io } from './app.js';
import { config } from './config/index.js';

const PORT = config.port;

async function main(): Promise<void> {
  console.log('Starting CoSpec AI Server...');
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Markdown directory: ${config.markdownDir}`);

  // Start server
  return new Promise<void>((resolve) => {
    httpServer.listen(PORT, async () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ WebSocket server available at ws://localhost:${PORT}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);

      // Graceful shutdown
      process.on('SIGTERM', gracefulShutdown);
      process.on('SIGINT', gracefulShutdown);

      resolve();
    });

    // Error handlers
    httpServer.on('error', (error: Error) => {
      console.error('HTTP server error:', error);
      process.exit(1);
    });
  });
}

function gracefulShutdown(): void {
  console.log('\nShutting down gracefully...');

  io.close(() => {
    console.log('WebSocket server closed');
  });

  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
