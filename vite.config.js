import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { validateExternalUrl, safeFetchExternal } from './functions/_lib/security.js'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-feed-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api-feed?url=')) {
            const targetUrl = decodeURIComponent(req.url.replace('/api-feed?url=', ''));
            const validation = validateExternalUrl(targetUrl);
            res.setHeader('X-Content-Type-Options', 'nosniff');
            if (!validation.valid) {
              res.statusCode = validation.status;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: validation.error }));
              return;
            }
            try {
              const { resp, body } = await safeFetchExternal(validation.url, {
                method: 'GET',
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
                }
              });
              if (resp.ok && (body.includes('<item') || body.includes('<entry') || body.includes('<rss'))) {
                res.setHeader('Content-Type', 'application/xml; charset=utf-8');
                res.statusCode = 200;
                res.end(body);
              } else {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.statusCode = resp.status >= 400 ? resp.status : 502;
                res.end(JSON.stringify({ error: 'Upstream returned non-feed response' }));
              }
            } catch (err) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.statusCode = err.status || 500;
              res.end(JSON.stringify({ error: err.message }));
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
      '/api-dcn': {
        target: 'https://dailycoffeenews.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-dcn/, '')
      }
    }
  },
  base: '/',
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
