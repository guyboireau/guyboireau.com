export const prerender = false

import type { APIRoute } from 'astro'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { contactRateLimiter } from '@/lib/rate-limit'
import { adresseVisiteur } from '@/lib/client-ip'
import { deposerDemande } from '@/lib/crm'

// Messages en français : ils sont affichés sous le champ concerné par le
// formulaire (aria-describedby), ils doivent dire au visiteur quoi corriger.
const contactSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères.')
    .max(100, 'Le nom ne doit pas dépasser 100 caractères.'),
  email: z
    .string()
    .email('Adresse e-mail invalide.')
    .max(320, "L'adresse e-mail ne doit pas dépasser 320 caractères."),
  project_type: z.string().max(100).optional(),
  message: z
    .string()
    .min(10, 'Le message doit contenir au moins 10 caractères.')
    .max(5000, 'Le message ne doit pas dépasser 5 000 caractères.'),
})

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Envoi par Scaleway Transactional Email (TEM), hébergé à Paris, par son API
// HTTP : pas de SDK à embarquer. Remplace Resend depuis le 2026-10-15
// (vps-ovh/SOUVERAINETE.md, action 11). Projet Scaleway « guyboireau ».
const TEM_URL = 'https://api.scaleway.com/transactional-email/v1alpha1/regions/fr-par/emails'
const EXPEDITEUR = { email: 'formulaire@guyboireau.com', name: 'Portfolio' }
const DESTINATAIRE = 'boireauguy@gmail.com'

interface Demande {
  name: string
  email: string
  projectLabel: string
  message: string
}

type Envoi = { ok: true; id: string | null } | { ok: false; raison: Record<string, unknown> }

function corpsHtml({ name, email, projectLabel, message }: Demande): string {
  const e = escapeHtml
  return `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
          <div style="background: linear-gradient(135deg, #a0493b, #8a3d31); padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; color: white; font-size: 20px;">Nouveau message sur ton portfolio</h1>
          </div>
          <div style="background: #f8fafc; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 120px;">Nom</td>
                <td style="padding: 8px 0; font-weight: 600;">${e(name)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Email</td>
                <td style="padding: 8px 0;"><a href="mailto:${e(email)}" style="color: #a0493b;">${e(email)}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Projet</td>
                <td style="padding: 8px 0; font-weight: 600;">${e(projectLabel)}</td>
              </tr>
            </table>
            <div style="margin-top: 24px;">
              <p style="color: #64748b; font-size: 13px; margin-bottom: 8px;">Message</p>
              <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; white-space: pre-wrap;">${e(message)}</div>
            </div>
          </div>
        </div>
      `
}

/**
 * Ne lève jamais : un échec (refus de TEM, réseau, délai) revient en valeur,
 * pour que la route réponde quand même oui si le CRM a la demande. La raison
 * ne contient que des codes techniques : TEM peut citer une adresse dans son
 * message d'erreur, il n'est donc pas journalisé.
 */
async function envoyerParTem(secretKey: string, projectId: string, demande: Demande): Promise<Envoi> {
  const { name, email, projectLabel, message } = demande
  try {
    const res = await fetch(TEM_URL, {
      method: 'POST',
      headers: { 'X-Auth-Token': secretKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        from: EXPEDITEUR,
        to: [{ email: DESTINATAIRE }],
        subject: `[Portfolio] Nouveau message de ${escapeHtml(name)} — ${escapeHtml(projectLabel)}`,
        text: `Nom : ${name}\nEmail : ${email}\nProjet : ${projectLabel}\n\n${message}`,
        html: corpsHtml(demande),
        additional_headers: [{ key: 'Reply-To', value: email }],
      }),
      signal: AbortSignal.timeout(15_000),
    })
    const corps = (await res.json().catch(() => ({}))) as { type?: string; emails?: { id?: string }[] }
    if (!res.ok) return { ok: false, raison: { status: res.status, type: corps.type ?? null } }
    return { ok: true, id: corps.emails?.[0]?.id ?? null }
  } catch (err) {
    return { ok: false, raison: { erreur: err instanceof Error ? err.name : 'inconnue' } }
  }
}

function succes(requestId: string, emailId: string | null, crm: string): Response {
  // Journal sans donnée personnelle : identifiants techniques seulement.
  console.info('[contact] message traité', JSON.stringify({ requestId, emailId, crm }))
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = adresseVisiteur(request, clientAddress)
  // Corrèle les lignes de log entre elles et avec l'email reçu, sans y mettre
  // de donnée personnelle (nom / email / message du prospect).
  const requestId = randomUUID()
  if (contactRateLimiter(ip)) {
    return new Response(JSON.stringify({ error: 'Trop de requêtes. Réessaie dans une minute.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    })
  }

  try {
    const body = await request.json()
    const parsed = contactSchema.safeParse(body)
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.') || 'form'
        if (!fieldErrors[path]) fieldErrors[path] = []
        fieldErrors[path].push(issue.message)
      }
      return new Response(JSON.stringify({ error: 'Données invalides', details: fieldErrors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const { name, email, project_type, message } = parsed.data

    // 1. La demande entre dans le CRM (crm.demandes, base du VPS), où Guy la
    //    suit et la convertit en prospect. Jamais bloquant : l'email suit.
    const depot = await deposerDemande({ nom: name, email, message, type_projet: project_type || null })
    if (depot === 'echec') {
      console.error('[contact] dépôt dans le CRM impossible', JSON.stringify({ requestId }))
    }

    // 2. L'email, pour être prévenu tout de suite. Si lui seul échoue alors que
    //    le CRM a la demande, elle n'est pas perdue : on répond quand même oui.
    const secretKey = process.env.SCW_SECRET_KEY
    const projectId = process.env.SCW_PROJECT_ID
    if (!secretKey || !projectId) {
      console.error('[contact] SCW_SECRET_KEY ou SCW_PROJECT_ID manquant')
      if (depot === 'deposee') return succes(requestId, null, depot)
      throw new Error('Configuration Scaleway TEM manquante')
    }

    const envoi = await envoyerParTem(secretKey, projectId, {
      name,
      email,
      projectLabel: project_type || 'Non précisé',
      message,
    })

    if (!envoi.ok) {
      console.error('[contact] échec envoi TEM:', JSON.stringify({ requestId, ...envoi.raison }))
      if (depot === 'deposee') return succes(requestId, null, depot)
      throw new Error("Erreur lors de l'envoi de l'email")
    }

    return succes(requestId, envoi.id, depot)
  } catch (err) {
    console.error('[contact] Error:', requestId, err)
    return new Response(JSON.stringify({ error: "Une erreur est survenue lors de l'envoi du message." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
