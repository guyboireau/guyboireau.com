export const prerender = false

import type { APIRoute } from 'astro'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const ipStore = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5
const WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = ipStore.get(ip)
  if (!record || now > record.resetAt) {
    ipStore.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  if (record.count >= RATE_LIMIT) return true
  record.count++
  return false
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress ?? 'unknown'
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Trop de requêtes. Réessaie dans une minute.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    })
  }

  try {
    const { name, email, project_type, message } = await request.json()

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Champs requis manquants' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Sauvegarde Supabase
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
    const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { error: dbError } = await supabase.from('portfolio_contacts').insert({
        name,
        email,
        message: `[${project_type || 'Non précisé'}] ${message}`,
      })
      if (dbError) console.error('[contact] Supabase error:', dbError)
    }

    // Envoi email via Resend
    const resendApiKey = import.meta.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.error('[contact] RESEND_API_KEY manquante')
      throw new Error('Clé API Resend manquante')
    }

    const resend = new Resend(resendApiKey)
    const projectLabel = project_type || 'Non précisé'
    const e = escapeHtml

    const { data, error } = await resend.emails.send({
      from: 'Portfolio <onboarding@resend.dev>',
      to: 'boireauguy@gmail.com',
      reply_to: email,
      subject: `[Portfolio] Nouveau message de ${e(name)} — ${e(projectLabel)}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
          <div style="background: linear-gradient(135deg, #ff6b35, #ea580c); padding: 24px 32px; border-radius: 12px 12px 0 0;">
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
                <td style="padding: 8px 0;"><a href="mailto:${e(email)}" style="color: #ff6b35;">${e(email)}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Type de projet</td>
                <td style="padding: 8px 0;">${e(projectLabel)}</td>
              </tr>
            </table>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
              <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Message</p>
              <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${e(message)}</p>
            </div>
            <div style="margin-top: 24px; text-align: center;">
              <a href="mailto:${e(email)}?subject=Re: ${e(projectLabel)}"
                 style="display: inline-block; background: linear-gradient(135deg, #ff6b35, #ea580c); color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Répondre à ${e(name)}
              </a>
            </div>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('[contact] Erreur Resend:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[contact] Erreur interne du serveur:', error)
    const message = error instanceof Error ? error.message : 'Erreur interne'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
