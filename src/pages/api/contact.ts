export const prerender = false

import type { APIRoute } from 'astro'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

export const POST: APIRoute = async ({ request }) => {
  const { name, email, project_type, message } = await request.json()

  if (!name || !email || !message) {
    return new Response(JSON.stringify({ error: 'Champs requis manquants' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Sauvegarde Supabase
  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  )
  const { error: dbError } = await supabase.from('portfolio_contacts').insert({
    name,
    email,
    message: `[${project_type || 'Non précisé'}] ${message}`,
  })
  if (dbError) console.error('[contact] Supabase error:', dbError)

  // Envoi email via Resend
  const resend = new Resend(import.meta.env.RESEND_API_KEY)
  const projectLabel = project_type || 'Non précisé'

  await resend.emails.send({
    from: 'Portfolio <onboarding@resend.dev>',
    to: 'boireauguy@gmail.com',
    reply_to: email,
    subject: `[Portfolio] Nouveau message de ${name} — ${projectLabel}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #ff6b35, #ea580c); padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; color: white; font-size: 20px;">Nouveau message sur ton portfolio</h1>
        </div>
        <div style="background: #f8fafc; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 120px;">Nom</td>
              <td style="padding: 8px 0; font-weight: 600;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Email</td>
              <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #ff6b35;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Type de projet</td>
              <td style="padding: 8px 0;">${projectLabel}</td>
            </tr>
          </table>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Message</p>
            <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
          <div style="margin-top: 24px; text-align: center;">
            <a href="mailto:${email}?subject=Re: ${projectLabel}"
               style="display: inline-block; background: linear-gradient(135deg, #ff6b35, #ea580c); color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Répondre à ${name}
            </a>
          </div>
        </div>
      </div>
    `,
  })

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
