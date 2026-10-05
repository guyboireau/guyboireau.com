import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { configurationAssistant } from './assistant-config'

/** Vitest tourne à la racine du dépôt. */
const lire = (chemin: string) => readFileSync(resolve(process.cwd(), chemin), 'utf8')

const RELAIS = { ANTHROPIC_API_KEY: 'cle-du-relais', ANTHROPIC_BASE_URL: 'http://127.0.0.1:4000', CHAT_MODEL: 'assistant-site' }

/** Fournisseurs d'IA qui ne doivent pas apparaître là où le site décrit SON assistant. */
const AUTRES_FOURNISSEURS = /Anthropic|Claude|Gemini|OpenAI|GPT/

describe('configurationAssistant (B08)', () => {
  it('relais, groupe et clé fixés : la configuration est rendue telle quelle', () => {
    expect(configurationAssistant(RELAIS)).toEqual({
      apiKey: 'cle-du-relais',
      baseURL: 'http://127.0.0.1:4000',
      model: 'assistant-site',
    })
  })

  it('rien de fixé : les trois variables sont signalées', () => {
    expect(configurationAssistant({})).toEqual({
      manquantes: ['ANTHROPIC_API_KEY', 'CHAT_MODEL', 'ANTHROPIC_BASE_URL'],
    })
  })

  it.each([
    ['https://api.anthropic.com', 'vise Anthropic'],
    ['https://anthropic.com/v1', 'vise Anthropic'],
    ['127.0.0.1:4000', 'URL illisible'],
  ])('ANTHROPIC_BASE_URL=%s est refusée (%s)', (url, motif) => {
    const resultat = configurationAssistant({ ...RELAIS, ANTHROPIC_BASE_URL: url })
    expect(resultat).toEqual({ manquantes: [expect.stringContaining(motif)] })
  })

  it('aucun modèle par défaut dans le code : CHAT_MODEL est obligatoire', () => {
    expect(lire('src/pages/api/chat.ts')).not.toMatch(/CHAT_MODEL\s*(\|\||\?\?)/)
    expect(lire('src/data/ai-config.ts')).not.toMatch(/claude-|MODEL\s*[:=]/i)
  })
})

/**
 * La déclaration faite aux visiteurs et la configuration exigée par le code doivent
 * nommer le même fournisseur. En une semaine, trois avaient été écrits pour la même
 * fonction (Gemini, Mistral AI, Claude) sans qu'aucun test ne les relie.
 */
describe('fournisseur de l’assistant : un seul nom partout', () => {
  it('politique de confidentialité, section 2.2 : Mistral AI, et lui seul', () => {
    const page = lire('src/pages/confidentialite.astro')
    const section = page.slice(page.indexOf('id="assistant-ia"'), page.indexOf('<h3', page.indexOf('id="assistant-ia"') + 1))
    expect(section).toContain('Mistral AI')
    expect(section).not.toMatch(AUTRES_FOURNISSEURS)
  })

  it('politique de confidentialité, transferts : l’assistant passe par Mistral AI', () => {
    expect(lire('src/pages/confidentialite.astro')).toMatch(/L’assistant IA passe par Mistral AI/)
  })

  it('bandeau du chat : Mistral AI, et lui seul', () => {
    const composant = lire('src/components/ChatBot.tsx')
    const bandeau = composant.slice(composant.indexOf('id="chat-avertissement"'), composant.indexOf('</p>', composant.indexOf('id="chat-avertissement"')))
    expect(bandeau).toContain('Mistral AI')
    expect(bandeau).not.toMatch(AUTRES_FOURNISSEURS)
  })

  it('llms.txt : Mistral AI', () => {
    const ligne = lire('public/llms.txt').split('\n').find((l) => l.includes('assistant d'))
    expect(ligne).toContain('Mistral AI')
    expect(ligne).not.toMatch(AUTRES_FOURNISSEURS)
  })
})
