import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const geoserverTarget = env.VITE_GEOSERVER_URL || 'http://172.18.1.109:8080'
  // Water-variable rasters (ET / precipitation / snow cover) live on a separate geoserver.
  const geoserverWvTarget = env.VITE_GEOSERVER_WV_URL || 'http://172.18.1.100:8080'
  // Hydro Analytics historical-data API (see "For mudassir regarding api.pdf")
  const hydroTarget = env.VITE_HYDRO_API_URL || 'http://172.18.7.35:8000'

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
        },
        // Water-variable rasters only: /wv-geoserver/* -> <wv host>/geoserver/*
        // NOTE: must NOT start with "/geoserver" or the "/geoserver" rule above
        // would match it first (prefix collision) and route to the wrong host.
        '/wv-geoserver': {
          target: geoserverWvTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/wv-geoserver/, '/geoserver'),
        },
        // Proxies /hydro_api/* -> http://172.18.7.35:8000/proxy_api_daily/*
        // (avoids CORS / mixed-content when the portal is served over http)
        '/hydro_api': {
          target: hydroTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/hydro_api/, '/proxy_api_daily'),
        }
      }
    },
  }
})
