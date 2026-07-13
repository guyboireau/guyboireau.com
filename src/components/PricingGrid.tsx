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
  currency: string;
  description: string;
  features: PricingFeature[];
  highlighted?: boolean;
  highlighted_label?: string;
  ctaLabel: string;
}

interface PricingGridProps {
  /** Passer les tiers pré-chargés côté serveur pour éviter le fetch client-side. */
  initialTiers?: PricingTier[];
}

const formatPrice = (price: number, currency: string) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);

async function fetchTiers(): Promise<PricingTier[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase non configuré');

  const { data, error } = await supabase
    .from('pricing_tiers')
    .select('*')
    .order('price', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((raw: unknown): PricingTier => {
    const item = raw as Record<string, unknown>;
    return {
      id: String(item.id ?? ''),
      name: String(item.name ?? ''),
      price: Number(item.price ?? 0),
      currency: String(item.currency ?? 'EUR'),
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
      highlighted_label: item.highlighted_label ? String(item.highlighted_label) : undefined,
      ctaLabel: String(item.cta_label ?? 'Choisir'),
    };
  });
}

export default function PricingGrid({ initialTiers }: PricingGridProps): React.JSX.Element {
  const [tiers, setTiers] = useState<PricingTier[]>(initialTiers ?? []);
  const [loading, setLoading] = useState<boolean>(!initialTiers);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTiers) return;

    let cancelled = false;
    setLoading(true);
    fetchTiers()
      .then((data) => { if (!cancelled) setTiers(data); })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Erreur lors du chargement des tarifs');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [initialTiers]);

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
                {tier.highlighted_label ?? 'Recommandé'}
              </span>
            )}

            <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
            <p className="mt-2 text-sm text-gray-600">{tier.description}</p>

            <p className="mt-4 flex items-baseline">
              <span className="text-4xl font-bold tracking-tight text-gray-900">
                {formatPrice(tier.price, tier.currency)}
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
              href={`/contact?forfait=${encodeURIComponent(tier.id)}&subject=${encodeURIComponent(tier.name)}`}
              className={`mt-8 block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
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
