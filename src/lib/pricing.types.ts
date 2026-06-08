export interface PricingFeature {
  name: string;
  included: boolean;
}

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string;
  features: PricingFeature[];
  highlighted?: boolean;
  highlightLabel?: string;
  ctaLabel: string;
}

export function parsePricingTier(raw: Record<string, unknown>): PricingTier {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    price: Number(raw.price ?? 0),
    currency: String(raw.currency ?? 'EUR'),
    description: String(raw.description ?? ''),
    features: Array.isArray(raw.features)
      ? raw.features.map((f: unknown): PricingFeature => {
          const record =
            typeof f === 'object' && f !== null ? (f as Record<string, unknown>) : {};
          return {
            name: String(record.name ?? ''),
            included: Boolean(record.included),
          };
        })
      : [],
    highlighted: Boolean(raw.highlighted),
    highlightLabel: raw.highlight_label ? String(raw.highlight_label) : 'Recommandé',
    ctaLabel: String(raw.cta_label ?? 'Choisir'),
  };
}
