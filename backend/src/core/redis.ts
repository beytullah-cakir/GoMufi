import { Redis } from '@upstash/redis';
import { config } from '../config';

// ─── Upstash Redis HTTP/REST Client ──────────────────────────────────────────
// Tamamen HTTP üzerinden çalışır — TCP bağlantısı gerektirmez.
// Vercel, Render ve diğer serverless platformlarla tam uyumludur.

if (!config.UPSTASH_REDIS_REST_URL || !config.UPSTASH_REDIS_REST_TOKEN) {
  console.warn('[Redis] UPSTASH_REDIS_REST_URL veya UPSTASH_REDIS_REST_TOKEN tanımlı değil. Redis özellikleri devre dışı.');
}

export const redis = new Redis({
  url: config.UPSTASH_REDIS_REST_URL || '',
  token: config.UPSTASH_REDIS_REST_TOKEN || '',
});

export const isRedisConfigured = !!(
  config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN
);
