import type { PricingTier } from '@/lib/pricing.types';

interface PricingGridProps {
  tiers: PricingTier[];
}

export default function PricingGrid({ tiers }: PricingGridProps): React.JSX.Element {
  const formatPrice = (price: number, currency = 'EUR') =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(price);

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
            {tier.highlighted && tier.highlightLabel && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white">
                {tier.highlightLabel}
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
              href={`/contact?forfait=${encodeURIComponent(tier.id)}`}
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
