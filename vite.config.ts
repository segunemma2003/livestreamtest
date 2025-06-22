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
        target: 'http://192.168.1.170:8000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy WebSocket connections to livestream service
      '/ws': {
        target: 'ws://192.168.1.100:7880',
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
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  }
})