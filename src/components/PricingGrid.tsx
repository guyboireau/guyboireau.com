import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PricingFeature {
  name: string;
  included: boolean;
}

interface PricingTier {
  id: string;
  name: string;
  price: number;
  description: string;
  features: PricingFeature[];
  highlighted?: boolean;
  ctaLabel: string;
}

const supabase = createClient();

export default function PricingGrid(): JSX.Element {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPricing() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: supabaseError } = await supabase
          .from('pricing_tiers')
          .select('*')
          .order('price', { ascending: true });

        if (supabaseError) {
          throw supabaseError;
        }

        const validated = (data ?? []).map((item): PricingTier => ({
          id: String(item.id),
          name: String(item.name),
          price: Number(item.price),
          description: String(item.description),
          features: Array.isArray(item.features)
            ? item.features.map((f: unknown): PricingFeature => {
                const record =
                  typeof f === 'object' && f !== null
                    ? (f as Record<string, unknown>)
                    : {};
                return {
                  name: String(record.name ?? ''),
                  included: Boolean(record.included),
                };
              })
            : [],
          highlighted: Boolean(item.highlighted),
          ctaLabel: String(item.cta_label ?? 'Choisir'),
        }));

        setTiers(validated);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erreur lors du chargement des tarifs'
        );
      } finally {
        setLoading(false);
      }
    }

    fetchPricing();
  }, []);

  if (loading) {
    return (
      <div
        className="grid gap-8 md:grid-cols-3 animate-pulse"
        aria-busy="true"
        aria-label="Chargement des tarifs"
      >
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-96 rounded-2xl bg-gray-200" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800"
        role="alert"
      >
        <p className="font-semibold">Impossible de charger les tarifs</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <section className="py-12" aria-labelledby="pricing-heading">
      <h2 id="pricing-heading" className="sr-only">
        Grille tarifaire
      </h2>

      <div className="grid gap-8 md:grid-cols-3">
        {tiers.map((tier) => (
          <article
            key={tier.id}
            className={`relative flex flex-col rounded-2xl border p-8 shadow-sm ${
              tier.highlighted
                ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                : 'border-gray-200 bg-white'
            }`}
          >
            {tier.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white">
                Recommandé
              </span>
            )}

            <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
            <p className="mt-2 text-sm text-gray-600">{tier.description}</p>

            <p className="mt-4 flex items-baseline">
              <span className="text-4xl font-bold tracking-tight text-gray-900">
                {tier.price.toFixed(2)} €
              </span>
              <span className="ml-1 text-sm font-semibold text-gray-600">
                / projet
              </span>
            </p>

            <ul className="mt-6 space-y-4 flex-1">
              {tier.features.map((feature, index) => (
                <li
                  key={`${tier.id}-feature-${index}`}
                  className="flex items-start"
                >
                  <span
                    className={`mr-3 flex-shrink-0 ${
                      feature.included ? 'text-indigo-600' : 'text-gray-400'
                    }`}
                    aria-hidden="true"
                  >
                    {feature.included ? '✓' : '—'}
                  </span>
                  <span
                    className={`text-sm ${
                      feature.included ? 'text-gray-700' : 'text-gray-400'
                    }`}
                  >
                    {feature.name}
                  </span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className={`mt-8 w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                tier.highlighted
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
              onClick={() =>
                (window.location.href = `mailto:contact@guyboireau.com?subject=Demande%20${encodeURIComponent(
                  tier.name
                )}`)
              }
            >
              {tier.ctaLabel}
            </button>
          </article>
        ))}
      </div>

      {/* 
        FIXME: La récupération des tarifs est effectuée côté client avec useEffect et useState.
        Pourquoi le fix est nécessaire: Cela provoque un Cumulative Layout Shift (CLS) au hydratation,
        dégrade le Largest Contentful Paint (LCP) et empêche l'indexation SEO des prix par les moteurs de recherche.
        Comportement attendu: Transformer ce composant en Server Component (Next.js App Router) ou utiliser
        getStaticProps avec revalidation ISR (Pages Router) pour prérendre la grille côté serveur.
        Dépendances: Nécessite de déplacer la logique de fetch dans une async function côté serveur
        et d'utiliser le client Supabase serveur (supabase-server) pour éviter d'exposer la clé anon au bundle client.
        Contrainte technique: Si des tarifs doivent être personnalisés par utilisateur connecté,
        il faudra alors utiliser une stratégie hybride (skeleton côté serveur + hydration côté client).
      */}

      {/* 
        FIXME: Le formatage des prix utilise toFixed(2) avec une devise hardcodée en EUR.
        Pourquoi le fix est nécessaire: Le site pourrait accueillir des clients internationaux
        (Canada, Belgique, Suisse) et le créateur pourrait facturer en USD ou CAD selon la localisation.
        Comportement attendu: Utiliser Intl.NumberFormat avec la locale du navigateur ou une préférence
        utilisateur stockée en base, et récupérer la devise depuis la colonne 'currency' de la table Supabase.
        Dépendances: Ajouter la colonne 'currency' (code ISO 4217, ex: 'EUR', 'CAD') dans la table
        'pricing_tiers' et une stratégie de fallback sur 'EUR' pour les entrées historiques.
        Contrainte technique: Intl.NumberFormat est natif mais nécessite des tests sur Safari < 14
        si le projet doit supporter des navigateurs legacy.
      */}

      {/* 
        FIXME: L'action du bouton CTA utilise un mailto simple sans contexte du forfait ni tracking.
        Pourquoi le fix est nécessaire: Le mailto perd le contexte de sélection (l'utilisateur doit
        répéter son choix dans l'email), ne permet pas de mesurer le taux de conversion, et n'offre
        pas d'expérience de réservation fluide.
        Comportement attendu: Rediriger vers /contact?forfait=tier.id avec préremplissage du formulaire,
        ou ouvrir un widget Calendly/Cal.com avec prefill sur le forfait sélectionné.
        Dépendances: Variable d'environnement NEXT_PUBLIC_CALENDLY_URL ou équivalent, et mise à jour
        du composant ContactForm pour consommer les paramètres d'URL.
        Contrainte technique: Si utilisation de Calendly, vérifier que le prefill supporte les caractères
        spéciaux (accents) via encodeURIComponent et que le plan Calendly permet l'UTM tracking.
      */}

      {/* 
        FIXME: La mise en évidence du forfait "Recommandé" repose sur un booléen 'highlighted' statique
        en base sans gestion de campagne temporelle.
        Pourquoi le fix est nécessaire: Le besoin métier évolue vers des campagnes saisonnières
        (ex: "Offre été", "Black Friday") où le forfait mis en avant change selon la période.
        Comportement attendu: Créer une table 'pricing_campaigns' liée à 'pricing_tiers' avec des
        dates de validité (start_at, end_at) et un libellé personnalisable (ex: "Populaire", "-20%").
        Dépendances: Migration Supabase pour ajouter la table 'pricing_campaigns' avec clé étrangère
        et politiques RLS. Jointure Supabase supplémentaire dans la requête de fetch.
        Contrainte technique: Gestion des timezones (UTC côté DB vs locale côté client) pour déterminer
        la campagne active. Utiliser la date serveur pour le prérendu afin d'éviter les décalages d'hydratation.
      */}
    </section>
  );
}