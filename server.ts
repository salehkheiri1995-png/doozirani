import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  // Readiness for a reverse proxy / container orchestrator. It intentionally
  // reports only process health; there is no fake multiplayer or ad backend.
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const dist = path.resolve(__dirname, 'dist');
    app.use(
      express.static(dist, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader(
              'Content-Security-Policy',
              "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:; connect-src 'self' https: wss:; frame-ancestors 'none'; base-uri 'self'"
            );
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(dist, 'index.html'));
    });
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Dooz web server listening on port ${port} (${isProduction ? 'production' : 'development'})`);
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}; shutting down.`);
    const timer = setTimeout(() => {
      console.error('Graceful shutdown timed out.');
      process.exit(1);
    }, 10_000);
    timer.unref();
    server.close((error) => {
      clearTimeout(timer);
      if (error) {
        console.error('Shutdown error:', error.message);
        process.exit(1);
      }
      process.exit(0);
    });
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((error: unknown) => {
  console.error('Server failed to start:', error instanceof Error ? error.message : error);
  process.exit(1);
});
