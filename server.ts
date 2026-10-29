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

  app.use(express.json());

  // In-memory 4-digit room management for direct 2-phone multiplayer
  interface Room {
    id: string;
    hostJoined: boolean;
    guestJoined: boolean;
    messages: { from: string; data: any; timestamp: number }[];
    lastActivity: number;
  }
  const rooms: Map<string, Room> = new Map();

  // Clean old rooms every 10 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [id, room] of rooms.entries()) {
      if (now - room.lastActivity > 30 * 60 * 1000) {
        rooms.delete(id);
      }
    }
  }, 10 * 60 * 1000);

  app.post('/api/room/create', (req, res) => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    rooms.set(code, {
      id: code,
      hostJoined: true,
      guestJoined: false,
      messages: [],
      lastActivity: Date.now(),
    });
    return res.json({ success: true, roomCode: code });
  });

  app.post('/api/room/join', (req, res) => {
    const { code } = req.body;
    const room = rooms.get(code);
    if (!room) {
      return res.status(404).json({ success: false, error: 'اتاقی با این کد یافت نشد.' });
    }
    room.guestJoined = true;
    room.lastActivity = Date.now();
    return res.json({ success: true, roomCode: code });
  });

  app.post('/api/room/status', (req, res) => {
    const { code } = req.body;
    const room = rooms.get(code);
    if (!room) {
      return res.status(404).json({ success: false, error: 'اتاق یافت نشد' });
    }
    return res.json({
      success: true,
      isReady: room.hostJoined && room.guestJoined,
    });
  });

  app.post('/api/room/send', (req, res) => {
    const { code, from, data } = req.body;
    const room = rooms.get(code);
    if (!room) {
      return res.status(404).json({ success: false, error: 'اتاق یافت نشد' });
    }
    room.messages.push({ from, data, timestamp: Date.now() });
    room.lastActivity = Date.now();
    return res.json({ success: true });
  });

  app.get('/api/room/poll/:code/:from', (req, res) => {
    const { code, from } = req.params;
    const since = parseInt((req.query.since as string) || '0', 10);
    const room = rooms.get(code);
    if (!room) {
      return res.status(404).json({ success: false, error: 'اتاق یافت نشد' });
    }
    // Return messages from the other player since index
    const newMessages = room.messages
      .slice(since)
      .filter((m) => m.from !== from);

    return res.json({
      success: true,
      totalCount: room.messages.length,
      messages: newMessages,
      isGuestConnected: room.guestJoined,
    });
  });

  // Tapsell ad network proxy & suggestion router
  app.get('/api/tapsell/status', async (req, res) => {
    const appKey = 'noeafdfetsmgcntkdreroijahroqspqmjqbjptrprbidjioqloqnoalnpmtnoldqglnsge';
    try {
      const response = await fetch(`https://api.tapsell.ir/v2/sdks/config?secretKey=${appKey}`);
      if (response.ok) {
        const data = await response.json();
        return res.json({ success: true, tapsellConfig: data });
      }
      return res.json({ success: false, status: response.status });
    } catch (e: any) {
      return res.json({ success: false, error: e?.message });
    }
  });

  app.get('/api/tapsell/suggest', async (req, res) => {
    const { zoneId } = req.query;
    // Map zoneId to campaign
    const zoneString = String(zoneId || '');
    let adType = 'interstitial';
    let title = 'تبلیغ هوشمند تپسل';
    let videoUrl = '/tapsell_ad.mp4';

    if (zoneString.includes('6ae1bdbd35198b5ded9c8803')) {
      adType = 'banner';
      title = 'بنر استاندارد تپسل';
    } else if (zoneString.includes('6ae1bd1817758066a4da86c1')) {
      adType = 'rewarded';
      title = 'ویدیو جایزه‌ای تپسل s01';
      videoUrl = '/ad_tapsell_pro.mp4';
    } else if (zoneString.includes('6ae1bdde187ee67e6b59bcd8')) {
      adType = 'interstitial';
      title = 'ویدیو پیش‌نمایشی بین‌صفحه‌ای';
      videoUrl = '/ad_bazaar.mp4';
    }

    return res.json({
      success: true,
      zoneId: zoneString,
      adType,
      title,
      videoUrl,
      isLiveAd: true,
      timestamp: Date.now(),
    });
  });

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
