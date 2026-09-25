import { useState } from 'react'
import type { ContactFormData } from '@/lib/types'

const PROJECT_TYPES: Array<{ value: string; label: string }> = [
  { value: '', label: 'Type de projet' },
  { value: 'app-metier', label: 'Application métier' },
  { value: 'traitement-documentaire', label: 'Traitement documentaire' },
  { value: 'facturation-electronique', label: 'Facturation électronique' },
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'site-vitrine', label: 'Interface publique / site' },
  { value: 'app-mobile', label: 'Application mobile' },
  { value: 'maintenance', label: 'Maintenance / évolution' },
  { value: 'automatisation', label: 'Automatisation IA' },
  { value: 'depannage', label: 'Dépannage informatique' },
  { value: 'autre', label: 'Autre' },
]

interface Props {
  defaultType?: ContactFormData['project_type']
}

type Champ = 'name' | 'email' | 'message'

export default function ContactForm({ defaultType = '' }: Props) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    project_type: defaultType,
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target

    setFormData((prev: ContactFormData) => {
      const next = { ...prev }
      switch (name) {
        case 'name':
          next.name = value
          break
        case 'email':
          next.email = value
          break
        case 'project_type':
          next.project_type = value
          break
        case 'message':
          next.message = value
          break
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)
    setFieldErrors({})

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      message: formData.message.trim(),
      ...(formData.project_type ? { project_type: formData.project_type } : {}),
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        if (res.status === 400 && data?.details) {
          setFieldErrors(data.details as Record<string, string[]>)
        }
        throw new Error(`Erreur ${res.status}`)
      }

      setSubmitStatus('success')
      setFormData({ name: '', email: '', project_type: '', message: '' })
    } catch (err) {
      console.error(err)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Bordure slate-500 : 4,8:1 sur blanc. Le contour d'un champ doit se voir
  // (contraste non textuel ≥ 3:1) ; slate-300 n'en donnait que 1,5:1.
  const inputClass =
    'w-full px-4 py-3 bg-white border border-slate-500 rounded-lg text-slate-800 placeholder:text-slate-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all'
  const erreurClass = 'border-red-700 focus:border-red-700 focus:ring-red-700/20'
  const labelClass = 'block text-slate-700 mb-2 font-medium text-sm'

  /** Relie un champ à son message d'erreur, quand il y en a un. */
  const aria = (champ: Champ) =>
    fieldErrors[champ]
      ? { 'aria-invalid': true as const, 'aria-describedby': `${champ}-erreur` }
      : {}

  const hasFieldErrors = Object.keys(fieldErrors).length > 0

  return (
    <div className="glass-card p-8">
      {/* Zone annoncée par les lecteurs d'écran : présente dès le départ,
          pour que l'arrivée du message soit bien lue. */}
      <div role="status" aria-live="polite" aria-atomic="true">
        {submitStatus === 'success' && (
          <p className="mb-6 p-4 bg-green-50 border border-green-700 rounded-lg text-green-800">
            Message envoyé ! Je vous répondrai sous 24h.
          </p>
        )}
        {submitStatus === 'error' && (
          <p className="mb-6 p-4 bg-red-50 border border-red-700 rounded-lg text-red-800">
            Erreur lors de l'envoi.{hasFieldErrors ? ' Vérifiez les champs signalés.' : ''} Réessayez ou
            écrivez-moi directement à{' '}
            <a href="mailto:me@guyboireau.com" className="underline">
              me@guyboireau.com
            </a>
            .
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-slate-600">
          <span aria-hidden="true">*</span> champ obligatoire
        </p>

        <div>
          <label htmlFor="name" className={labelClass}>
            Nom <span aria-hidden="true">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            autoComplete="name"
            value={formData.name}
            onChange={handleChange}
            required
            minLength={2}
            maxLength={100}
            className={`${inputClass} ${fieldErrors.name ? erreurClass : ''}`}
            placeholder="Votre nom"
            {...aria('name')}
          />
          {fieldErrors.name && (
            <p id="name-erreur" className="mt-1 text-sm text-red-700">
              {fieldErrors.name[0]}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email <span aria-hidden="true">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            required
            maxLength={320}
            className={`${inputClass} ${fieldErrors.email ? erreurClass : ''}`}
            placeholder="votre@email.com"
            {...aria('email')}
          />
          {fieldErrors.email && (
            <p id="email-erreur" className="mt-1 text-sm text-red-700">
              {fieldErrors.email[0]}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="project_type" className={labelClass}>
            Type de projet
          </label>
          <select
            id="project_type"
            name="project_type"
            value={formData.project_type}
            onChange={handleChange}
            className={inputClass}
          >
            {PROJECT_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="message" className={labelClass}>
            Message <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            minLength={10}
            maxLength={5000}
            rows={5}
            className={`${inputClass} resize-none ${fieldErrors.message ? erreurClass : ''}`}
            placeholder="Décrivez votre projet..."
            {...aria('message')}
          />
          {fieldErrors.message && (
            <p id="message-erreur" className="mt-1 text-sm text-red-700">
              {fieldErrors.message[0]}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {isSubmitting ? 'Envoi en cours...' : 'Envoyer le message'}
        </button>

        <p className="text-xs leading-relaxed text-slate-600">
          Vos données servent uniquement à répondre à votre demande et, le cas échéant, à établir un devis.
          Destinataire : Guy Boireau EI. Conservation : 3 ans à compter de votre message. Vous pouvez y accéder, les
          faire rectifier ou effacer, en limiter l'usage ou les récupérer en écrivant à me@guyboireau.com.{' '}
          <a
            href="/confidentialite#formulaire-contact"
            className="text-primary-700 underline underline-offset-2 hover:text-primary-600"
          >
            Politique de confidentialité
          </a>
          .
        </p>
      </form>
    </div>
  )
}
