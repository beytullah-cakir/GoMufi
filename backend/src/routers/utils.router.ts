import { Router } from 'express';

const router = Router();

router.get('/time', (req, res) => {
  const server_time = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  res.json({ server_time, timezone: 'Europe/Istanbul' });
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
