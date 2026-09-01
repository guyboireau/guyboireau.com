export const prerender = false

import type { APIRoute } from 'astro'
import { Resend } from 'resend'
import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase.server'
import { contactRateLimiter } from '@/lib/rate-limit'

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(320),
  project_type: z.string().max(100).optional(),
  message: z.string().min(10).max(5000),
})

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
  if (await contactRateLimiter(ip)) {
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

    // Sauvegarde Supabase
    const supabase = getSupabaseServer()
    if (supabase) {
      // @ts-expect-error portfolio_contacts absent des types générés — table créée manuellement
      const { error: dbError } = await supabase.from('portfolio_contacts').insert({
        name,
        email,
        message: `[${project_type || 'Non précisé'}] ${message}`,
      })
      if (dbError) console.error('[contact] Supabase error:', dbError)
    }

    // Envoi email via Resend
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.error('[contact] RESEND_API_KEY manquante')
      throw new Error('Clé API Resend manquante')
    }

    const resend = new Resend(resendApiKey)
    const projectLabel = project_type || 'Non précisé'
    const e = escapeHtml

    const { data: _data, error } = await resend.emails.send({
      from: 'Portfolio <onboarding@resend.dev>',
      to: 'boireauguy@gmail.com',
      replyTo: email,
      subject: `[Portfolio] Nouveau message de ${e(name)} — ${e(projectLabel)}`,
      html: `
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
      `,
    })

    if (error) {
      console.error('[contact] Resend error:', error)
      throw new Error("Erreur lors de l'envoi de l'email")
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[contact] Error:', err)
    return new Response(JSON.stringify({ error: "Une erreur est survenue lors de l'envoi du message." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}