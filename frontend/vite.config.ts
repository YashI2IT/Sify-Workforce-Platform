import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
  server: {
    proxy: {
      '/ums-api': {
        target: 'https://apidev.sifymodernization.digital/user-mgt/api',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/ums-api/, ''),
        bypass: (req: any) => {
          delete req.headers.origin;
          delete req.headers.referer;
        },
      },
    },
  },
} as any)
