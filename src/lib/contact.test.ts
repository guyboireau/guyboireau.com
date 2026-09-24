import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ContactFormSchema,
  sendContactEmail,
  saveContactMessage,
  processContactForm,
  type ContactFormInput,
} from '@/lib/contact'

const mocks = vi.hoisted(() => ({
  resendConstructor: vi.fn(),
  emailsSend: vi.fn(),
  getSupabase: vi.fn(),
}))

vi.mock('resend', () => ({
  Resend: mocks.resendConstructor,
}))

vi.mock('@/lib/supabase', () => ({
  getSupabase: mocks.getSupabase,
}))

const validInput: ContactFormInput = {
  name: 'Jean Dupont',
  email: 'jean@example.com',
  message: 'Bonjour, je souhaite un devis pour un site vitrine.',
}

type SingleResult = {
  data: { id: string } | null
  error: { message: string } | null
}

function createSupabaseClient(
  result: SingleResult,
  options: { reject?: unknown } = {}
) {
  const single =
    options.reject !== undefined
      ? vi.fn().mockRejectedValue(options.reject)
      : vi.fn().mockResolvedValue(result)
  const insert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }))
  const from = vi.fn(() => ({ insert }))
  return { client: { from }, insert, single }
}

describe('contact', () => {
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.resendConstructor.mockImplementation(function () {
      return { emails: { send: mocks.emailsSend } }
    })
    mocks.emailsSend.mockResolvedValue({
      data: { id: 'email-123' },
      error: null,
    })
    mocks.getSupabase.mockReturnValue(
      createSupabaseClient({ data: { id: 'rec-1' }, error: null }).client
    )
  })

  afterEach(() => {
    consoleError.mockRestore()
  })

  describe('ContactFormSchema', () => {
    it('accepte un formulaire valide', () => {
      const result = ContactFormSchema.safeParse(validInput)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validInput)
      }
    })

    it('rejette un nom vide', () => {
      const result = ContactFormSchema.safeParse({ ...validInput, name: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1)
        expect(result.error.issues[0]).toMatchObject({
          path: ['name'],
          message: 'Le nom est requis',
        })
      }
    })

    it('rejette un nom de plus de 100 caractères', () => {
      const result = ContactFormSchema.safeParse({
        ...validInput,
        name: 'a'.repeat(101),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]).toMatchObject({
          path: ['name'],
          message: 'Le nom est trop long',
        })
      }
    })

    it('accepte un nom de 100 caractères (limite incluse)', () => {
      const result = ContactFormSchema.safeParse({
        ...validInput,
        name: 'a'.repeat(100),
      })
      expect(result.success).toBe(true)
    })

    it('rejette un email invalide', () => {
      const result = ContactFormSchema.safeParse({
        ...validInput,
        email: 'pas-un-email',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]).toMatchObject({
          path: ['email'],
          message: 'Email invalide',
        })
      }
    })

    it('rejette un message vide', () => {
      const result = ContactFormSchema.safeParse({ ...validInput, message: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]).toMatchObject({
          path: ['message'],
          message: 'Le message est requis',
        })
      }
    })

    it('rejette un message de plus de 5000 caractères', () => {
      const result = ContactFormSchema.safeParse({
        ...validInput,
        message: 'a'.repeat(5001),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]).toMatchObject({
          path: ['message'],
          message: 'Le message est trop long',
        })
      }
    })

    it('accepte un message de 5000 caractères (limite incluse)', () => {
      const result = ContactFormSchema.safeParse({
        ...validInput,
        message: 'a'.repeat(5000),
      })
      expect(result.success).toBe(true)
    })

    it('rejette une entrée manquante des trois champs', () => {
      const result = ContactFormSchema.safeParse({})
      expect(result.success).toBe(false)
      if (!result.success) {
        const paths = result.error.issues.map((issue) => issue.path.join('.'))
        expect(paths.sort()).toEqual(['email', 'message', 'name'])
      }
    })

    it('rejette une entrée qui n’est pas un objet', () => {
      const result = ContactFormSchema.safeParse(null)
      expect(result.success).toBe(false)
    })
  })

  describe('sendContactEmail', () => {
    it('retourne l’identifiant de l’email en cas de succès', async () => {
      const result = await sendContactEmail(validInput)

      expect(result).toEqual({ id: 'email-123' })
      expect(mocks.resendConstructor).toHaveBeenCalledTimes(1)
      expect(mocks.emailsSend).toHaveBeenCalledTimes(1)
      expect(mocks.emailsSend).toHaveBeenCalledWith({
        from: 'Contact <contact@guyboireau.com>',
        to: ['guy@guyboireau.com'],
        subject: 'Nouveau message de Jean Dupont',
        text: 'De: Jean Dupont <jean@example.com>\n\nBonjour, je souhaite un devis pour un site vitrine.',
        replyTo: 'jean@example.com',
      })
    })

    it('retourne l’erreur renvoyée par l’API Resend', async () => {
      mocks.emailsSend.mockResolvedValue({
        data: null,
        error: { message: 'rate limited' },
      })

      const result = await sendContactEmail(validInput)

      expect(result).toEqual({ error: 'rate limited' })
    })

    it('retourne une erreur si la réponse ne contient pas d’identifiant', async () => {
      mocks.emailsSend.mockResolvedValue({ data: {}, error: null })

      const result = await sendContactEmail(validInput)

      expect(result).toEqual({ error: 'Resend did not return an email ID' })
    })

    it('retourne une erreur si la clé API Resend est manquante', async () => {
      const nodeKey = process.env.RESEND_API_KEY
      const viteKey = import.meta.env.RESEND_API_KEY
      process.env.RESEND_API_KEY = ''
      import.meta.env.RESEND_API_KEY = ''
      try {
        const result = await sendContactEmail(validInput)

        expect(result).toEqual({
          error: 'Missing required environment variable: RESEND_API_KEY',
        })
        expect(mocks.resendConstructor).not.toHaveBeenCalled()
        expect(mocks.emailsSend).not.toHaveBeenCalled()
      } finally {
        if (nodeKey === undefined) {
          delete process.env.RESEND_API_KEY
        } else {
          process.env.RESEND_API_KEY = nodeKey
        }
        import.meta.env.RESEND_API_KEY = viteKey
      }
    })

    it('retourne une erreur si l’envoi lève une exception', async () => {
      mocks.emailsSend.mockRejectedValue(new Error('connexion refusée'))

      const result = await sendContactEmail(validInput)

      expect(result).toEqual({ error: 'connexion refusée' })
    })

    it('retourne une erreur générique pour une exception non-Error', async () => {
      mocks.emailsSend.mockRejectedValue('explosion inattendue')

      const result = await sendContactEmail(validInput)

      expect(result).toEqual({ error: 'Unknown error while sending email' })
    })
  })

  describe('saveContactMessage', () => {
    it('enregistre le message en base et retourne l’identifiant du enregistrement', async () => {
      const { client, insert } = createSupabaseClient({
        data: { id: 'rec-1' },
        error: null,
      })
      mocks.getSupabase.mockReturnValue(client)

      const result = await saveContactMessage(validInput)

      expect(result).toEqual({ id: 'rec-1' })
      expect(mocks.getSupabase).toHaveBeenCalledTimes(1)
      expect(client.from).toHaveBeenCalledWith('contacts')
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: validInput.name,
          email: validInput.email,
          message: validInput.message,
          created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        })
      )
    })

    it('retourne une erreur si le client Supabase n’est pas initialisé', async () => {
      mocks.getSupabase.mockReturnValue(null)

      const result = await saveContactMessage(validInput)

      expect(result).toEqual({ error: 'Supabase client not initialized' })
    })

    it('retourne l’erreur d’insertion renvoyée par Supabase', async () => {
      mocks.getSupabase.mockReturnValue(
        createSupabaseClient({
          data: null,
          error: { message: 'new row violates row-level security policy' },
        }).client
      )

      const result = await saveContactMessage(validInput)

      expect(result).toEqual({
        error: 'new row violates row-level security policy',
      })
    })

    it('retourne une erreur si l’identifiant du enregistrement est absent', async () => {
      mocks.getSupabase.mockReturnValue(
        createSupabaseClient({ data: null, error: null }).client
      )

      const result = await saveContactMessage(validInput)

      expect(result).toEqual({ error: 'Supabase did not return a record ID' })
    })

    it('retourne une erreur si l’insertion lève une exception', async () => {
      mocks.getSupabase.mockReturnValue(
        createSupabaseClient({ data: null, error: null }, {
          reject: new Error('base indisponible'),
        }).client
      )

      const result = await saveContactMessage(validInput)

      expect(result).toEqual({ error: 'base indisponible' })
    })

    it('retourne une erreur générique pour une exception non-Error', async () => {
      mocks.getSupabase.mockReturnValue(
        createSupabaseClient({ data: null, error: null }, {
          reject: 'explosion inattendue',
        }).client
      )

      const result = await saveContactMessage(validInput)

      expect(result).toEqual({ error: 'Unknown error while saving to database' })
    })
  })

  describe('processContactForm', () => {
    it('valide, enregistre et envoie le message : succès', async () => {
      const result = await processContactForm(validInput)

      expect(result).toEqual({
        success: true,
        emailId: 'email-123',
        recordId: 'rec-1',
      })
    })

    it('rejette des données invalides sans toucher à la base ni à Resend', async () => {
      const result = await processContactForm({
        name: '',
        email: 'pas-un-email',
        message: '',
      })

      expect(result).toMatchObject({ success: false, code: 'VALIDATION_ERROR' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Validation échouée')
        expect(result.error).toContain('Le nom est requis')
        expect(result.error).toContain('Email invalide')
        expect(result.error).toContain('Le message est requis')
      }
      expect(mocks.getSupabase).not.toHaveBeenCalled()
      expect(mocks.emailsSend).not.toHaveBeenCalled()
    })

    it('rejette une entrée qui n’est pas un objet', async () => {
      const result = await processContactForm(null)

      expect(result).toMatchObject({ success: false, code: 'VALIDATION_ERROR' })
      expect(mocks.getSupabase).not.toHaveBeenCalled()
      expect(mocks.emailsSend).not.toHaveBeenCalled()
    })

    it('signale une erreur Supabase sans envoyer l’email', async () => {
      mocks.getSupabase.mockReturnValue(
        createSupabaseClient({
          data: null,
          error: { message: 'policy violation' },
        }).client
      )

      const result = await processContactForm(validInput)

      expect(result).toEqual({
        success: false,
        error: 'policy violation',
        code: 'SUPABASE_ERROR',
      })
      expect(mocks.emailsSend).not.toHaveBeenCalled()
    })

    it('signale une erreur Resend après enregistrement en base', async () => {
      mocks.emailsSend.mockResolvedValue({
        data: null,
        error: { message: 'rate limited' },
      })

      const result = await processContactForm(validInput)

      expect(result).toEqual({
        success: false,
        error: 'rate limited',
        code: 'RESEND_ERROR',
      })
    })
  })
})
