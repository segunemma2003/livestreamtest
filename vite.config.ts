import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allows external connections (important for Docker)
    port: 3000,
    proxy: {
      // Proxy API calls to Django backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy WebSocket connections to livestream service
      '/ws': {
        target: 'ws://localhost:8001',
        ws: true,
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  define: {
    // Define global constants
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  }
})
