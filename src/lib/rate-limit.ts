/**
 * Limitation de débit en mémoire, par adresse de visiteur.
 *
 * En production, un seul processus Node sert le site sur le VPS : la Map est
 * commune à toutes les requêtes et repart de zéro à chaque redémarrage, donc à
 * chaque déploiement. La clé est l'adresse calculée par `adresseVisiteur`
 * (src/lib/client-ip.ts), qui lit X-Forwarded-For derrière Caddy — sans elle,
 * tous les visiteurs partageaient le même compteur.
 *
 * Sur une plateforme à plusieurs instances (fonctions serverless), chaque
 * instance aurait sa propre Map : il faudrait alors un stockage partagé
 * (Redis, Upstash…).
 */
type RateLimitEntry = {
  count: number;
  resetAt: number;
};

/**
 * Crée un limiteur en mémoire à fenêtre fixe.
 * Adapté à un processus unique ; sans effet réel sur plusieurs instances.
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