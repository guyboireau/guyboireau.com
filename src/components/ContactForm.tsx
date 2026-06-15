import { useState } from 'react'
import type { ContactFormData } from '@/lib/types'

const PROJECT_TYPES: Array<{ value: string; label: string }> = [
  { value: '', label: 'Type de projet' },
  { value: 'site-vitrine', label: 'Site vitrine / CMS' },
  { value: 'app-web', label: 'Application web' },
  { value: 'app-mobile', label: 'Application mobile' },
  { value: 'maintenance', label: 'Maintenance / évolution' },
  { value: 'automatisation', label: 'Automatisation IA' },
  { value: 'depannage', label: 'Dépannage informatique' },
  { value: 'autre', label: 'Autre' },
]

interface Props {
  defaultType?: ContactFormData['project_type']
  forfait?: string
}

export default function ContactForm({ defaultType = '', forfait }: Props) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    project_type: defaultType,
    message: forfait ? `Bonjour,\n\nJe suis intéressé(e) par le forfait "${forfait}".\n\n` : '',
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
      setTimeout(() => setSubmitStatus(null), 6000)
    } catch (err) {
      console.error(err)
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus(null), 6000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all'

  return (
    <div className="glass-card p-8">
      {submitStatus === 'success' && (
        <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400">
          Message envoyé ! Je vous répondrai sous 24h.
        </div>
      )}
      {submitStatus === 'error' && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          Erreur lors de l'envoi. Réessayez ou écrivez-moi directement à{' '}
          <a href="mailto:me@guyboireau.com" className="underline">
            me@guyboireau.com
          </a>
          .
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-slate-300 mb-2 font-medium text-sm">
            Nom *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            minLength={2}
            className={`${inputClass} ${fieldErrors.name ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''}`}
            placeholder="Votre nom"
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-red-400">{fieldErrors.name[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-slate-300 mb-2 font-medium text-sm">
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className={`${inputClass} ${fieldErrors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''}`}
            placeholder="votre@email.com"
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-red-400">{fieldErrors.email[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="project_type" className="block text-slate-300 mb-2 font-medium text-sm">
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
          <label htmlFor="message" className="block text-slate-300 mb-2 font-medium text-sm">
            Message *
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            minLength={10}
            rows={5}
            className={`${inputClass} resize-none ${fieldErrors.message ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''}`}
            placeholder="Décrivez votre projet..."
          />
          {fieldErrors.message && (
            <p className="mt-1 text-xs text-red-400">{fieldErrors.message[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {isSubmitting ? 'Envoi en cours...' : 'Envoyer le message'}
        </button>
      </form>
    </div>
  )
}