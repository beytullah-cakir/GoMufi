import http from 'http';
import app from './app';
import { config } from './config';
import prisma from './db/prisma';

const port = config.IS_PRODUCTION ? parseInt(process.env['PORT'] ?? '8000') : config.PORT;

const server = http.createServer(app);

async function start(): Promise<void> {
  // ─── Startup: DB cleanup & table check ─────────────────────────────────────
  console.info('[App] Starting — checking database...');
  try {
    // Clean up stale live sessions from previous runs
    await prisma.liveSession.updateMany({
      where: { status: 'live' },
      data: { status: 'ended' },
    });
    console.info('[DB] Stale live sessions cleaned up.');
  } catch (err) {
    console.error('[DB] Startup cleanup error:', err);
  }

  // ─── Keep-alive ping for Render.com ────────────────────────────────────────
  if (config.IS_PRODUCTION) {
    const pingUrl = `${config.BACKEND_URL}/utils/health`;
    setInterval(async () => {
      try {
        await fetch(pingUrl);
      } catch {
        // ignore
      }
    }, 10 * 60 * 1000); // every 10 minutes
  }

  // ─── Start listening ────────────────────────────────────────────────────────
  server.listen(port, '0.0.0.0', () => {
    console.info(`[App] Server running on http://0.0.0.0:${port}`);
  });
}

// ─── Graceful shutdown ───────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.info('[App] SIGTERM received — shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.info('[App] SIGINT received — shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

start().catch((err) => {
  console.error('[App] Failed to start:', err);
  process.exit(1);
});

