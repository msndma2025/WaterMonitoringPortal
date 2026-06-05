import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const geoserverTarget = env.VITE_GEOSERVER_URL || 'http://172.18.1.109:8080'

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      watch: {
        usePolling: true,
        interval: 500,
      },
      hmr: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        },
        '/uploads': {
          target: 'http://localhost:3001',
          changeOrigin: true
        },
        '/geoserver': {
          target: geoserverTarget,
          changeOrigin: true,
        }
      }
    },
  }
})
