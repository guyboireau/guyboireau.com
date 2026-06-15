import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

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

const supabase = getSupabase();

export default function PricingGrid(): React.JSX.Element {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPricing() {
      try {
        setLoading(true);
        setError(null);

        if (!supabase) {
          throw new Error('Supabase non configuré');
        }

        const { data, error: supabaseError } = await supabase
          .from('pricing_tiers')
          .select('*')
          .order('price', { ascending: true });

        if (supabaseError) {
          throw supabaseError;
        }

        const validated = (data ?? []).map((raw: unknown): PricingTier => {
          const item = raw as Record<string, unknown>;
          return {
            id: String(item.id ?? ''),
            name: String(item.name ?? ''),
            price: Number(item.price ?? 0),
            description: String(item.description ?? ''),
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
          };
        });

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
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(tier.price)}
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

            <a
              href={`/contact?forfait=${encodeURIComponent(tier.name)}`}
              className={`mt-8 w-full rounded-lg px-4 py-3 text-sm font-semibold text-center transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                tier.highlighted
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {tier.ctaLabel}
            </a>
          </article>
        ))}
      </div>

    </section>
  );
}