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
      { id: 'base-setup', label: 'Mise en service : design, intégration, mise en ligne', price: 490 },
    ],
  },
  {
    title: 'Options à la création',
    subtitle: 'Ajoutez ce dont vous avez besoin',
    options: [
      { id: 'opt-page', label: 'Page supplémentaire (galerie, à propos…)', price: 100, unit: '/page' },
      { id: 'opt-contact', label: 'Formulaire de contact', price: 60 },
      { id: 'opt-rdv', label: 'Prise de rendez-vous en ligne (Calendly)', price: 80 },
      { id: 'opt-shop', label: 'Boutique en ligne (jusqu\'à 20 produits)', price: 400 },
      { id: 'opt-blog', label: 'Blog ou actualités', price: 150 },
      { id: 'opt-gallery', label: 'Galerie photos optimisée', price: 80 },
      { id: 'opt-bilingue', label: 'Version bilingue français et anglais', price: 200 },
      { id: 'opt-copy', label: 'Rédaction des textes', price: 150 },
    ],
  },
  {
    title: 'Présence en ligne (paiement unique)',
    subtitle: 'Être trouvé sur internet',
    options: [
      { id: 'pres-gmb', label: 'Fiche Google Business (Maps et recherche)', price: 80 },
      { id: 'pres-fb', label: 'Page Facebook pro', price: 60 },
      { id: 'pres-ig', label: 'Page Instagram pro', price: 60 },
      { id: 'pres-pixel', label: 'Pixel Meta ou Google Tag Manager', price: 60 },
      { id: 'pres-ga', label: 'Google Analytics', price: 50 },
    ],
  },
  {
    title: 'Abonnement mensuel (engagement 12 mois)',
    subtitle: 'Votre site reste à jour. Premier mois offert. Sans engagement : 20 € de plus par mois.',
    isSubscription: true,
    options: [
      { id: 'sub-host', label: 'Hébergement + domaine', price: 15, unit: '/mois' },
      { id: 'sub-backup', label: 'Sauvegardes automatiques', price: 10, unit: '/mois' },
      { id: 'sub-security', label: 'Mises à jour de sécurité', price: 15, unit: '/mois' },
      { id: 'sub-edit', label: 'Une modification de contenu par mois', price: 15, unit: '/mois' },
      { id: 'sub-report', label: 'Rapport de performance mensuel', price: 10, unit: '/mois' },
      { id: 'sub-seo', label: 'Référencement de base, chaque mois', price: 20, unit: '/mois' },
    ],
  },
  {
    title: 'Interventions ponctuelles',
    subtitle: 'Quand vous avez un besoin précis',
    options: [
      { id: 'boost-hour', label: 'Modification hors abonnement', price: 60, unit: '/h' },
      { id: 'boost-redesign', label: 'Refonte graphique partielle', price: 200 },
      { id: 'boost-speed', label: 'Optimisation de la vitesse (Core Web Vitals)', price: 150 },
      { id: 'boost-seo', label: 'Audit complet du référencement', price: 200 },
    ],
  },
]

const _BASE_TOTAL = 490

export default function PricingSimulator() {
  const [selected, setSelected] = useState<Set<string>>(new Set(['base-setup']))
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

  // Les options d'abonnement sont comptées dans le total mensuel, pas ici :
  // jusqu'au 2026-09-25 elles s'ajoutaient aux deux totaux.
  const oneTimeTotal = Array.from(selected).reduce((sum, id) => {
    for (const block of BLOCKS) {
      const opt = block.options.find((o) => o.id === id)
      if (opt && !block.isSubscription) {
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
          <div key={block.title} className="carte p-6 md:p-8">
            <div className="mb-6">
              <h3 className="text-xl text-encre">{block.title}</h3>
              <p className="text-encre-2 text-sm">{block.subtitle}</p>
            </div>
            <div className="space-y-3">
              {block.options.map((opt) => {
                const checked = isChecked(opt.id)
                const isBase = block.title === 'La base'
                return (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-4 p-4 rounded border cursor-pointer transition-colors ${
                      checked
                        ? 'border-primary-500 bg-creme'
                        : 'border-ligne hover:border-primary-500'
                    } ${isBase ? 'opacity-100 cursor-default' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-ligne text-primary-500 focus:ring-primary-500 shrink-0"
                      checked={checked}
                      onChange={() => toggle(opt.id)}
                      disabled={isBase}
                    />
                    <span className="flex-1 text-encre-2 text-sm md:text-base">{opt.label}</span>
                    <span className="font-mono font-medium text-primary-700 whitespace-nowrap text-sm md:text-base">
                      +{formatPrice(opt.price)}
                      {opt.unit && <span className="text-encre-2 font-normal text-xs ml-0.5">{opt.unit}</span>}
                    </span>
                  </label>
                )
              })}
            </div>

            {/* Quantité pour options spéciales */}
            {isChecked('opt-page') && block.title === 'Options à la création' && (
              <div className="mt-4 flex items-center gap-4 pl-14" role="group" aria-labelledby="simulateur-pages">
                <span id="simulateur-pages" className="text-encre-2 text-sm">Nombre de pages :</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Retirer une page"
                    className="w-8 h-8 rounded border border-encre-3 text-encre-2 hover:bg-creme"
                    onClick={() => setOptPages((p) => Math.max(1, p - 1))}
                  >
                    <span aria-hidden="true">−</span>
                  </button>
                  <output aria-live="polite" className="w-8 text-center font-semibold text-encre">{optPages}</output>
                  <button
                    type="button"
                    aria-label="Ajouter une page"
                    className="w-8 h-8 rounded border border-encre-3 text-encre-2 hover:bg-creme"
                    onClick={() => setOptPages((p) => p + 1)}
                  >
                    <span aria-hidden="true">+</span>
                  </button>
                </div>
              </div>
            )}

            {isChecked('boost-hour') && block.title === 'Interventions ponctuelles' && (
              <div className="mt-4 flex items-center gap-4 pl-14" role="group" aria-labelledby="simulateur-heures">
                <span id="simulateur-heures" className="text-encre-2 text-sm">Nombre d'heures :</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Retirer une heure"
                    className="w-8 h-8 rounded border border-encre-3 text-encre-2 hover:bg-creme"
                    onClick={() => setBoostHours((p) => Math.max(1, p - 1))}
                  >
                    <span aria-hidden="true">−</span>
                  </button>
                  <output aria-live="polite" className="w-8 text-center font-semibold text-encre">{boostHours}</output>
                  <button
                    type="button"
                    aria-label="Ajouter une heure"
                    className="w-8 h-8 rounded border border-encre-3 text-encre-2 hover:bg-creme"
                    onClick={() => setBoostHours((p) => p + 1)}
                  >
                    <span aria-hidden="true">+</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Récapitulatif sticky */}
      <div className="sticky bottom-6 mt-8">
        <div className="carte p-6 border-primary-500">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              {/* Le total change à chaque case cochée : annoncé, sans interrompre. */}
              <div aria-live="polite" aria-atomic="true">
                <p className="text-encre-2 text-sm">Total création + options</p>
                <p className="chiffre text-3xl">{formatPrice(oneTimeTotal)}</p>
                {monthlyTotal > 0 && (
                  <p className="text-encre-2 text-sm mt-1">
                    + {formatPrice(monthlyTotal)}/mois d'abonnement
                  </p>
                )}
              </div>
              <p className="text-encre-2 text-xs mt-2">
                Prix nets. TVA non applicable, art. 293 B du CGI.{' '}
                <a href="/cgv" className="text-primary-700 underline underline-offset-2 hover:text-primary-600">
                  Conditions générales de vente
                </a>
              </p>
            </div>
            <a
              href={`/contact?subject=Devis%20site%20web&budget=${oneTimeTotal}${monthlyTotal > 0 ? `&monthly=${monthlyTotal}` : ''}`}
              className="btn-primary"
            >
              Demander ce devis
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
