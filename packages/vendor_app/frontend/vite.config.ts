import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Sovereign Vendor App Frontend (Port 5174 -> Backend 8001)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true
      },
      '/health': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true
      }
    }
  }
})
