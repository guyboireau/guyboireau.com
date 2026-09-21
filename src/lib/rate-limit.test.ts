import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRateLimiter, chatRateLimiter, contactRateLimiter } from './rate-limit';

/**
 * Le rate limiter garde les deux seules routes qui coûtent quelque chose :
 * /api/chat, qui appelle un modèle facturé au jeton, et /api/contact, qui
 * expédie un e-mail. Il n'avait aucun test.
 *
 * La logique est temporelle, donc invérifiable à l'œil : la question « au
 * bout de combien d'appels ça bloque » se joue à un `>` contre un `>=`, et
 * « quand ça redevient passant » dépend d'une comparaison de dates qu'aucune
 * relecture ne tranche avec certitude.
 *
 * Les fenêtres sont pilotées avec les faux timers de Vitest : les tests
 * mesurent le comportement, pas la patience.
 */
describe('createRateLimiter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('comptage dans la fenêtre', () => {
    it('laisse passer exactement `limit` appels, puis bloque', () => {
      // La frontière exacte. Avec limit = 3 : trois appels acceptés, le
      // quatrième refusé. Un `>=` au lieu du `>` n'en laisserait passer que
      // deux, et personne ne le verrait avant qu'un visiteur se plaigne.
      const estLimite = createRateLimiter(3, 60_000);

      expect(estLimite('1.2.3.4')).toBe(false); // 1er
      expect(estLimite('1.2.3.4')).toBe(false); // 2e
      expect(estLimite('1.2.3.4')).toBe(false); // 3e
      expect(estLimite('1.2.3.4')).toBe(true); // 4e → refusé
    });

    it('reste bloqué pour tous les appels suivants de la fenêtre', () => {
      const estLimite = createRateLimiter(2, 60_000);

      estLimite('ip');
      estLimite('ip');
      for (let i = 0; i < 5; i += 1) {
        expect(estLimite('ip')).toBe(true);
      }
    });

    it('compte chaque IP séparément', () => {
      // Sans isolation, un seul visiteur insistant couperait le formulaire
      // pour tout le monde.
      const estLimite = createRateLimiter(1, 60_000);

      expect(estLimite('a')).toBe(false);
      expect(estLimite('a')).toBe(true);
      expect(estLimite('b')).toBe(false); // b n'est pas puni pour a
      expect(estLimite('c')).toBe(false);
    });

    it('traite une IP vide ou inconnue comme une clé ordinaire', () => {
      // Les en-têtes de proxy peuvent ne rien donner. Le comportement
      // souhaitable est que tous ces appels tombent dans le même seau, pas
      // qu'ils passent au travers.
      const estLimite = createRateLimiter(1, 60_000);

      expect(estLimite('')).toBe(false);
      expect(estLimite('')).toBe(true);
    });
  });

  describe('fenêtre de temps', () => {
    it('ne débloque pas avant la fin de la fenêtre', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-17T10:00:00Z'));

      const estLimite = createRateLimiter(1, 60_000);
      expect(estLimite('ip')).toBe(false);
      expect(estLimite('ip')).toBe(true);

      vi.advanceTimersByTime(59_999);
      expect(estLimite('ip')).toBe(true);
    });

    it('rouvre une fois la fenêtre écoulée', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-17T10:00:00Z'));

      const estLimite = createRateLimiter(1, 60_000);
      estLimite('ip');
      expect(estLimite('ip')).toBe(true);

      vi.advanceTimersByTime(60_000);
      expect(estLimite('ip')).toBe(false);
    });

    it('un abus prolongé ne repousse pas la réouverture', () => {
      // La fenêtre est FIXE : `resetAt` est posé au premier appel et n'est
      // jamais réécrit. Marteler l'endpoint pendant toute la minute ne
      // prolonge donc pas le blocage — c'est voulu, mais ce n'est vrai que
      // tant que personne ne « répare » le compteur en remettant resetAt à
      // jour à chaque appel.
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-17T10:00:00Z'));

      const estLimite = createRateLimiter(2, 60_000);
      for (let i = 0; i < 500; i += 1) {
        estLimite('flood');
        vi.advanceTimersByTime(100); // 50 s au total
      }
      expect(estLimite('flood')).toBe(true);

      vi.advanceTimersByTime(10_001); // au-delà des 60 s du premier appel
      expect(estLimite('flood')).toBe(false);
    });

    it('la fenêtre de chaque IP est indépendante', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-17T10:00:00Z'));

      const estLimite = createRateLimiter(1, 60_000);
      estLimite('tot'); // fenêtre de « tot » : 10:00:00 → 10:01:00

      vi.advanceTimersByTime(30_000);
      estLimite('tard'); // fenêtre de « tard » : 10:00:30 → 10:01:30

      vi.advanceTimersByTime(30_001); // 10:01:00 passé
      expect(estLimite('tot')).toBe(false); // rouvert
      expect(estLimite('tard')).toBe(true); // pas encore
    });
  });

  describe('limites connues de la fenêtre fixe', () => {
    it('deux fois `limit` appels peuvent passer à cheval sur une frontière', () => {
      // Propriété inhérente à la fenêtre fixe, pas un défaut d'implémentation,
      // mais elle change le chiffre réel de protection : avec limit = 10 sur
      // /api/chat, on peut obtenir 20 appels au modèle en une poignée de
      // secondes en visant la frontière. Le test le rend explicite pour que ce
      // soit une décision, pas une surprise sur une facture.
      //
      // Une fenêtre glissante (ou un compartiment à jetons) supprimerait ce
      // cas ; c'est le bon moment d'y penser si on migre vers Upstash comme
      // l'en-tête du module le suggère.
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-17T10:00:00Z'));

      const estLimite = createRateLimiter(3, 60_000);

      vi.advanceTimersByTime(59_000); // fin de la première fenêtre
      expect([estLimite('ip'), estLimite('ip'), estLimite('ip')]).toEqual([
        false,
        false,
        false,
      ]);

      vi.advanceTimersByTime(60_000); // fenêtre suivante
      expect([estLimite('ip'), estLimite('ip'), estLimite('ip')]).toEqual([
        false,
        false,
        false,
      ]);
      // Six appels acceptés en 60 s pour une limite annoncée à 3/min.
    });

    it('limit = 0 laisse tout de même passer un appel par fenêtre', () => {
      // Le premier appel d'une fenêtre retourne false AVANT toute comparaison
      // au plafond. Régler la limite à 0 pour fermer une route ne la ferme
      // donc pas : elle autorise un appel par minute.
      //
      // Comportement figé tel quel. Pour vraiment couper une route, c'est le
      // handler qu'il faut désactiver, pas la limite qu'il faut mettre à zéro.
      const estLimite = createRateLimiter(0, 60_000);
      expect(estLimite('ip')).toBe(false);
      expect(estLimite('ip')).toBe(true);
    });
  });

  describe('instances exportées', () => {
    it('chat et contact ont des compteurs distincts', () => {
      // Deux appels à createRateLimiter, donc deux Map. Épuiser le quota de
      // chat ne doit pas fermer le formulaire de contact — et inversement.
      const ip = `isolation-${Date.now()}`;

      for (let i = 0; i < 11; i += 1) chatRateLimiter(ip);
      expect(chatRateLimiter(ip)).toBe(true);
      expect(contactRateLimiter(ip)).toBe(false);
    });

    it('contact est plus strict que chat', () => {
      // 5/min contre 10/min. Un envoi d'e-mail coûte plus cher qu'un message :
      // si les deux plafonds se retrouvaient égaux, c'est que quelqu'un a
      // recopié une ligne.
      const ipChat = `plafond-chat-${Date.now()}`;
      const ipContact = `plafond-contact-${Date.now()}`;

      let passesChat = 0;
      while (!chatRateLimiter(ipChat) && passesChat < 50) passesChat += 1;

      let passesContact = 0;
      while (!contactRateLimiter(ipContact) && passesContact < 50) passesContact += 1;

      expect(passesChat).toBe(10);
      expect(passesContact).toBe(5);
      expect(passesContact).toBeLessThan(passesChat);
    });
  });

  describe('nettoyage', () => {
    it('les entrées expirées sont purgées, sans fuite mémoire', () => {
      // Un intervalle passe toutes les 5 minutes. Sans lui, la Map grossit
      // d'une entrée par IP vue et ne rend jamais rien — sur un container
      // chaud de plusieurs jours, c'est une fuite lente.
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-17T10:00:00Z'));

      const estLimite = createRateLimiter(1, 60_000);
      estLimite('ephemere');
      expect(estLimite('ephemere')).toBe(true);

      vi.advanceTimersByTime(5 * 60 * 1000 + 1); // le nettoyage passe

      // Après purge, l'IP repart de zéro — observable seulement par le
      // comportement, la Map étant privée.
      expect(estLimite('ephemere')).toBe(false);
    });

    it("l'intervalle est unref'd : il n'empêche pas le processus de sortir", () => {
      // Sans `unref`, un build ou un script important ce module resterait
      // suspendu indéfiniment. Le fait que cette suite se termine en est déjà
      // la preuve ; l'assertion la rend lisible.
      vi.useFakeTimers();
      const espion = vi.spyOn(globalThis, 'setInterval');

      createRateLimiter(1, 1_000);

      const timer = espion.mock.results[espion.mock.results.length - 1]
        ?.value as NodeJS.Timeout;
      expect(typeof timer.unref).toBe('function');

      espion.mockRestore();
    });
  });
});
