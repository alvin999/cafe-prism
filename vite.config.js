import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api-scholar': {
        target: 'https://api.semanticscholar.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-scholar/, '')
      },
      '/api-reddit': {
        target: 'https://www.reddit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-reddit/, '')
      },
      '/api-allorigins': {
        target: 'https://api.allorigins.win',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-allorigins/, '')
      }
    }
  },
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        }
      }
    }
  }
})
