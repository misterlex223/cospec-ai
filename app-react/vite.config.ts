import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['themis.ambmh.app'],
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 優化構建設置
    target: 'esnext',
    minify: 'terser',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('vditor')) {
              return 'vendor-vditor';
            }
            if (id.includes('@radix-ui') || id.includes('lucide-react') || 
                id.includes('class-variance-authority') || id.includes('clsx') || 
                id.includes('tailwind-merge')) {
              return 'vendor-ui';
            }
            return 'vendor';
          }
        },
      },
    },
    // 生成 Cloudflare Pages 兼容的輸出
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: true,
  },
  // 環境變量前綴
  envPrefix: ['VITE_', 'CLOUDFLARE_'],
})
