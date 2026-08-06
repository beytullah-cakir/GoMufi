import { Request, Response, NextFunction } from 'express';
import { redis, isRedisConfigured } from '../core/redis';

// ─── Redis Cache Middleware ───────────────────────────────────────────────────
// GET endpoint'leri için Redis tabanlı response cache.
// Cache miss'te DB'den veri gelir, Redis'e yazılır.
// Cache hit'te doğrudan Redis'ten yanıt döner.

const DEFAULT_TTL = 300; // 5 dakika

/**
 * Cache middleware factory.
 * @param keyFn   İstekten cache key üretir
 * @param ttl     Saniye cinsinden TTL (varsayılan: 5 dakika)
 */
export function cacheMiddleware(
  keyFn: (req: Request) => string,
  ttl: number = DEFAULT_TTL
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!isRedisConfigured) {
      return next();
    }

    const cacheKey = keyFn(req);

    try {
      const cached = await redis.get<string>(cacheKey);
      if (cached !== null) {
        res.setHeader('X-Cache', 'HIT');
        res.json(cached);
        return;
      }
    } catch (err) {
      console.error('[Cache] Redis okuma hatası:', err);
    }

    // Cache miss — orijinal res.json'u wrap ederek yanıtı yakala
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      res.setHeader('X-Cache', 'MISS');

      // Sadece başarılı yanıtları cache'le
      if (res.statusCode >= 200 && res.statusCode < 300 && isRedisConfigured) {
        redis.set(cacheKey, body, { ex: ttl }).catch((err) => {
          console.error('[Cache] Redis yazma hatası:', err);
        });
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Belirli bir cache key'ini veya prefix pattern'ını siler.
 * Tek key için doğrudan DEL kullanılır. Pattern içeriyorsa SCAN kullanılır.
 */
export async function invalidateCache(keyOrPattern: string): Promise<void> {
  if (!isRedisConfigured) return;

  try {
    // Pattern içermiyorsa direkt sil
    if (!keyOrPattern.includes('*')) {
      await redis.del(keyOrPattern);
      console.info(`[Cache] Key invalidate edildi: ${keyOrPattern}`);
      return;
    }

    // Pattern varsa SCAN ile bul ve sil
    let cursor = 0;
    do {
      const [nextCursor, keys]: [string, string[]] = await redis.scan(cursor, { match: keyOrPattern, count: 100 }) as any;
      cursor = parseInt(nextCursor, 10);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.info(`[Cache] ${keys.length} key invalidate edildi: ${keyOrPattern}`);
      }
    } while (cursor !== 0);

  } catch (err) {
    console.error('[Cache] Invalidation hatası:', err);
  }
}


// ─── Hazır Cache Key Fabrikaları ─────────────────────────────────────────────

export const CacheKeys = {
  templates: () => 'cache:slide_templates',
  courseList: () => 'cache:courses:public',
  sessionStatus: (courseId: string) => `cache:session_status:${courseId}`,
};
