import { useState, useCallback } from 'react'

interface OptionItem {
  id: string
  label: string
  price: number
  unit?: string
}

interface BlockConfig {
  title: string
  subtitle: string
  options: OptionItem[]
  isSubscription?: boolean
}

const BLOCKS: BlockConfig[] = [
  {
    title: 'La base',
    subtitle: 'Tout site commence ici',
    options: [
      { id: 'base-design', label: 'Design + intégration', price: 400 },
      { id: 'base-deploy', label: 'Mise en ligne + configuration', price: 100 },
    ],
  },
  {
    title: 'Options à la création',
    subtitle: 'Ajoutez ce dont vous avez besoin',
    options: [
      { id: 'opt-page', label: 'Page supplémentaire (Galerie, À propos, etc.)', price: 100, unit: '/page' },
      { id: 'opt-contact', label: 'Formulaire de contact', price: 60 },
      { id: 'opt-rdv', label: 'Prise de RDV en ligne (Calendly intégré)', price: 80 },
      { id: 'opt-shop', label: 'Boutique en ligne (jusqu\'à 20 produits)', price: 400 },
      { id: 'opt-blog', label: 'Blog / actualités', price: 150 },
      { id: 'opt-gallery', label: 'Galerie photos optimisée', price: 80 },
      { id: 'opt-bilingue', label: 'Version bilingue FR/EN', price: 200 },
      { id: 'opt-copy', label: 'Rédaction des textes (copywriting)', price: 150 },
    ],
  },
  {
    title: 'Présence en ligne (one shot)',
    subtitle: 'Être trouvé sur internet',
    options: [
      { id: 'pres-gmb', label: 'Fiche Google Business (Maps + recherche)', price: 80 },
      { id: 'pres-fb', label: 'Page Facebook pro', price: 60 },
      { id: 'pres-ig', label: 'Page Instagram pro', price: 60 },
      { id: 'pres-pixel', label: 'Pixel Meta / Google Tag Manager', price: 60 },
      { id: 'pres-ga', label: 'Google Analytics', price: 50 },
    ],
  },
  {
    title: 'Abonnement mensuel (sans engagement)',
    subtitle: 'Votre site reste en vie',
    isSubscription: true,
    options: [
      { id: 'sub-host', label: 'Hébergement + domaine', price: 15, unit: '/mois' },
      { id: 'sub-backup', label: 'Sauvegardes automatiques', price: 10, unit: '/mois' },
      { id: 'sub-security', label: 'Mises à jour sécurité', price: 15, unit: '/mois' },
      { id: 'sub-edit', label: '1 modification/mois incluse', price: 15, unit: '/mois' },
      { id: 'sub-report', label: 'Rapport de performance mensuel', price: 10, unit: '/mois' },
      { id: 'sub-seo', label: 'SEO de base mensuel', price: 20, unit: '/mois' },
    ],
  },
  {
    title: 'Boosts ponctuels',
    subtitle: 'Quand vous avez un besoin précis',
    options: [
      { id: 'boost-hour', label: 'Modification hors abonnement', price: 60, unit: '/h' },
      { id: 'boost-redesign', label: 'Refonte graphique partielle', price: 200 },
      { id: 'boost-speed', label: 'Optimisation vitesse / Core Web Vitals', price: 150 },
      { id: 'boost-seo', label: 'Audit SEO complet', price: 200 },
    ],
  },
]

const _BASE_TOTAL = 500

export default function PricingSimulator() {
  const [selected, setSelected] = useState<Set<string>>(new Set(['base-design', 'base-deploy']))
  const [subQty, _setSubQty] = useState<Record<string, number>>({ 'sub-host': 1, 'sub-backup': 1, 'sub-security': 1, 'sub-edit': 1, 'sub-report': 1, 'sub-seo': 1 })
  const [optPages, setOptPages] = useState(1)
  const [boostHours, setBoostHours] = useState(1)

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const isChecked = (id: string) => selected.has(id)

  const oneTimeTotal = Array.from(selected).reduce((sum, id) => {
    for (const block of BLOCKS) {
      const opt = block.options.find((o) => o.id === id)
      if (opt) {
        if (opt.id === 'opt-page') return sum + opt.price * optPages
        if (opt.id === 'boost-hour') return sum + opt.price * boostHours
        return sum + opt.price
      }
    }
    return sum
  }, 0)

  const monthlyTotal = Array.from(selected).reduce((sum, id) => {
    for (const block of BLOCKS) {
      const opt = block.options.find((o) => o.id === id)
      if (opt && block.isSubscription) {
        const qty = subQty[id] ?? 1
        return sum + opt.price * qty
      }
    }
    return sum
  }, 0)

  const formatPrice = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-8">
        {BLOCKS.map((block) => (
          <div key={block.title} className="glass-card p-6 md:p-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-800">{block.title}</h3>
              <p className="text-slate-500 text-sm">{block.subtitle}</p>
            </div>
            <div className="space-y-3">
              {block.options.map((opt) => {
                const checked = isChecked(opt.id)
                const isBase = block.title === 'La base'
                return (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      checked
                        ? 'border-primary-500 bg-primary-500/5'
                        : 'border-slate-200 hover:border-primary-300'
                    } ${isBase ? 'opacity-100 cursor-default' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-slate-300 text-primary-500 focus:ring-primary-500 shrink-0"
                      checked={checked}
                      onChange={() => toggle(opt.id)}
                      disabled={isBase}
                    />
                    <span className="flex-1 text-slate-700 text-sm md:text-base">{opt.label}</span>
                    <span className="text-primary-600 font-semibold whitespace-nowrap text-sm md:text-base">
                      +{formatPrice(opt.price)}
                      {opt.unit && <span className="text-slate-400 font-normal text-xs ml-0.5">{opt.unit}</span>}
                    </span>
                  </label>
                )
              })}
            </div>

            {/* Quantité pour options spéciales */}
            {isChecked('opt-page') && block.title === 'Options à la création' && (
              <div className="mt-4 flex items-center gap-4 pl-14">
                <span className="text-slate-500 text-sm">Nombre de pages :</span>
                <div className="flex items-center gap-2">
                  <button
                    className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => setOptPages((p) => Math.max(1, p - 1))}
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold text-slate-800">{optPages}</span>
                  <button
                    className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => setOptPages((p) => p + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {isChecked('boost-hour') && block.title === 'Boosts ponctuels' && (
              <div className="mt-4 flex items-center gap-4 pl-14">
                <span className="text-slate-500 text-sm">Nombre d'heures :</span>
                <div className="flex items-center gap-2">
                  <button
                    className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => setBoostHours((p) => Math.max(1, p - 1))}
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold text-slate-800">{boostHours}</span>
                  <button
                    className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => setBoostHours((p) => p + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Récapitulatif sticky */}
      <div className="sticky bottom-6 mt-8">
        <div className="glass-card p-6 border-2 border-primary-500/30 shadow-xl shadow-primary-500/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-slate-500 text-sm">Total création + options</p>
              <p className="text-3xl font-bold text-gradient">{formatPrice(oneTimeTotal)}</p>
              {monthlyTotal > 0 && (
                <p className="text-slate-500 text-sm mt-1">
                  + {formatPrice(monthlyTotal)}/mois d'abonnement
                </p>
              )}
            </div>
            <a
              href={`/contact?subject=Devis%20site%20web&budget=${oneTimeTotal}${monthlyTotal > 0 ? `&monthly=${monthlyTotal}` : ''}`}
              className="btn-primary text-center block md:inline-block px-8 py-3"
            >
              Demander ce devis →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
