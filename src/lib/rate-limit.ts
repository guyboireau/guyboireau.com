/**
 * Rate limiting in-memory par IP.
 *
 * ATTENTION — Limitation critique sur Vercel / serverless :
 * Chaque requête peut s'exécuter sur une instance différente. Le Map
 * en mémoire est donc réinitialisé à chaque cold start et ne partage
 * pas l'état entre les instances. Ce rate limiter ne protège réellement
 * que contre les abus sur une même instance (déploiement mono-instance
 * ou warm container).
 *
 * Pour une protection robuste en production multi-instance, migrer vers :
 * - Upstash KV + @upstash/ratelimit (recommandé sur Vercel)
 * - Redis + ioredis / node-rate-limiter-flexible
 * - Cloudflare Workers KV si edge
 */
type RateLimitEntry = {
  count: number;
  resetAt: number;
};

/**
 * Crée un rate limiter in-memory simple (fenêtre fixe).
 * Adapté aux déploiements mono-instance ; inefficace sur Vercel serverless.
 */
export function createRateLimiter(
  limit: number,
  windowMs: number
): (ip: string) => boolean {
  const store = new Map<string, RateLimitEntry>();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (typeof cleanupInterval.unref === "function") {
    cleanupInterval.unref();
  }

  return function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = store.get(ip);

    if (entry === undefined || entry.resetAt <= now) {
      store.set(ip, {
        count: 1,
        resetAt: now + windowMs,
      });
      return false;
    }

    entry.count += 1;
    return entry.count > limit;
  };
}

export const chatRateLimiter = createRateLimiter(10, 60_000);
export const contactRateLimiter = createRateLimiter(5, 60_000);