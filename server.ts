import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function startServer() {
  const app = express();

  // Explicit APK download endpoint with Android MIME type & headers
  const handleApkDownload = (req: express.Request, res: express.Response) => {
    const candidatePaths = [
      path.resolve(__dirname, 'public/dooz.apk'),
      path.resolve(__dirname, 'dist/dooz.apk'),
      path.resolve(process.cwd(), 'public/dooz.apk'),
      path.resolve(process.cwd(), 'dist/dooz.apk'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', 'attachment; filename="dooz.apk"');
        const stat = fs.statSync(p);
        res.setHeader('Content-Length', stat.size.toString());
        return res.sendFile(p);
      }
    }
    return res.status(404).send('فایل APK یافت نشد.');
  };

  app.get('/dooz.apk', handleApkDownload);
  app.get('/api/dooz.apk', handleApkDownload);
  app.get('/download/dooz.apk', handleApkDownload);

  // Serve public static assets (videos, icons, mp4)
  app.use(express.static(path.resolve(__dirname, 'public')));

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
    // In production, serve dist folder
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
