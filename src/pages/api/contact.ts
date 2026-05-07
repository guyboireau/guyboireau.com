export const prerender = false

import type { APIRoute } from 'astro'
import { Resend } from 'resend'
import { z } from 'zod'
import { getSupabase } from '@/lib/supabase'
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
    .replace