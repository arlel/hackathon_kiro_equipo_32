/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Serve the standalone e-ink page at the extensionless `/kindle` path in dev,
// mirroring the Vercel rewrite (public/kindle.html is served at `/kindle.html`).
function kindleRoute() {
  return {
    name: 'kindle-route',
    configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: unknown, next: () => void) => void) => void } }) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/kindle' || req.url === '/kindle/') req.url = '/kindle.html'
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), kindleRoute()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/game-ws': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
