import { Ratelimit } from '@upstash/ratelimit';
import { redis, isRedisConfigured } from '../core/redis';
import { Request, Response, NextFunction } from 'express';

// ─── Rate Limiter Tanımları ───────────────────────────────────────────────────

/**
 * AI endpoint'leri için rate limiter (Gemini çağrıları — gerçek para maliyeti var)
 * Öğretmen/kullanıcı ID bazlı: 10 istek / 1 dakika
 */
const aiLimiter = isRedisConfigured
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      prefix: 'rl:ai',
      analytics: true,
    })
  : null;

/**
 * Auth endpoint'leri için rate limiter (brute-force koruması)
 * IP bazlı: 10 istek / 15 dakika
 */
const authLimiter = isRedisConfigured
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(10, '15 m'),
      prefix: 'rl:auth',
      analytics: true,
    })
  : null;

/**
 * Quiz üretimi için rate limiter (Gemini çağrısı)
 * Kullanıcı ID bazlı: 5 istek / 1 dakika
 */
const quizLimiter = isRedisConfigured
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      prefix: 'rl:quiz',
      analytics: true,
    })
  : null;

/**
 * XP / Stats güncellemeleri için rate limiter (XP farm önleme)
 * Kullanıcı ID bazlı: 20 istek / 1 dakika
 */
const statsLimiter = isRedisConfigured
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(20, '1 m'),
      prefix: 'rl:stats',
      analytics: true,
    })
  : null;

/**
 * Ödeme başlatma için rate limiter (API suistimal koruması)
 * IP bazlı: 5 istek / 10 dakika
 */
const paymentLimiter = isRedisConfigured
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(5, '10 m'),
      prefix: 'rl:payment',
      analytics: true,
    })
  : null;

// ─── Yardımcı Fonksiyon ───────────────────────────────────────────────────────

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function getUserId(req: Request): string {
  const user = (req as any).user;
  return user?.userId?.toString() || user?.sub?.toString() || getClientIp(req);
}

// ─── Middleware Fabrikası ─────────────────────────────────────────────────────

function createRateLimitMiddleware(
  limiter: Ratelimit | null,
  getIdentifier: (req: Request) => string,
  label: string
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!limiter) {
      // Redis yapılandırılmamışsa sınırlama yapılmaz — uyarı loglanır
      console.warn(`[RateLimit] ${label}: Redis yapılandırılmamış, sınırlama atlanıyor.`);
      return next();
    }

    try {
      const identifier = getIdentifier(req);
      const { success, limit, remaining, reset } = await limiter.limit(identifier);

      // Rate limit header'larını ekle
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', new Date(reset).toISOString());

      if (!success) {
        const retryAfterSec = Math.ceil((reset - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfterSec);
        res.status(429).json({
          error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
          retryAfter: retryAfterSec,
        });
        return;
      }

      next();
    } catch (err) {
      // Redis hatası varsa isteği engelleme — graceful degradation
      console.error(`[RateLimit] ${label} Redis hatası:`, err);
      next();
    }
  };
}

// ─── Dışa Aktarılan Middleware'ler ───────────────────────────────────────────

/** AI endpoint'leri için — kullanıcı ID bazlı */
export const aiRateLimiter = createRateLimitMiddleware(
  aiLimiter,
  getUserId,
  'AI'
);

/** Auth endpoint'leri için — IP bazlı */
export const authRateLimiter = createRateLimitMiddleware(
  authLimiter,
  getClientIp,
  'Auth'
);

/** Quiz üretimi için — kullanıcı ID bazlı */
export const quizRateLimiter = createRateLimitMiddleware(
  quizLimiter,
  getUserId,
  'Quiz'
);

/** XP/Stats güncellemeleri için — kullanıcı ID bazlı */
export const statsRateLimiter = createRateLimitMiddleware(
  statsLimiter,
  getUserId,
  'Stats'
);

/** Ödeme başlatma için — IP bazlı */
export const paymentRateLimiter = createRateLimitMiddleware(
  paymentLimiter,
  getClientIp,
  'Payment'
);
