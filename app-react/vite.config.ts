import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for assets to support reverse proxy
  server: {
    host: '0.0.0.0',
    allowedHosts: ['themis.ambmh.app'],
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:9280', // Changed from 9281 to 9280 for unified server
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:9280', // Added WebSocket proxy
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist', // Build to dist directory in the same directory as this config file
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/[name].[ext]';
          }
          return 'assets/[name].[hash].[ext]';
        },
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      }
    }
  }
})
