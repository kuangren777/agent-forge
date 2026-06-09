import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Frontend dev server proxies /api → FastAPI backend (server/ on :8099)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:8099', changeOrigin: true },
    },
  },
  preview: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:8099', changeOrigin: true },
    },
  },
})
