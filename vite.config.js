import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-feed-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api-feed?url=')) {
            const targetUrl = decodeURIComponent(req.url.replace('/api-feed?url=', ''));
            try {
              const resp = await fetch(targetUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
                }
              });
              res.setHeader('Content-Type', resp.headers.get('content-type') || 'text/xml');
              res.setHeader('Access-Control-Allow-Origin', '*');
              const body = await resp.text();
              res.statusCode = resp.status;
              res.end(body);
            } catch (err) {
              res.statusCode = 500;
              res.end(err.message);
            }
            return;
          }
          next();
        });
      }
    }
  ],
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
      '/api-news': {
        target: 'https://news.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-news/, '')
      },
      '/api-sprudge': {
        target: 'https://sprudge.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-sprudge/, '')
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
