import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          g6: ['@antv/g6']
        }
      }
    },
    chunkSizeWarningLimit: 1600
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.FAMILYTREE_API_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/uploads': {
        target: process.env.FAMILYTREE_API_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: ['@antv/g6']
  }
})
