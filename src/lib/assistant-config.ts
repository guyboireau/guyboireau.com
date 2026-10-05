export type ConfigurationAssistant = { apiKey: string; baseURL: string; model: string }

/**
 * Le site déclare (confidentialité, bandeau du chat, llms.txt) que les messages vont
 * chez Mistral AI, dans l'UE, par le relais LiteLLM du VPS. Le SDK parle le protocole
 * Anthropic : sans relais, il appellerait l'API Anthropic aux États-Unis, transfert
 * non déclaré (B08). La route ne s'ouvre donc que si le relais et son groupe sont
 * tous deux fixés — aucun repli sur un modèle par défaut ni sur l'URL du SDK.
 */
export function configurationAssistant(
  env: Record<string, string | undefined> = process.env
): ConfigurationAssistant | { manquantes: string[] } {
  const apiKey = env.ANTHROPIC_API_KEY
  const baseURL = env.ANTHROPIC_BASE_URL
  const model = env.CHAT_MODEL
  const manquantes: string[] = []
  if (!apiKey) manquantes.push('ANTHROPIC_API_KEY')
  if (!model) manquantes.push('CHAT_MODEL')
  if (!baseURL) {
    manquantes.push('ANTHROPIC_BASE_URL')
  } else {
    let hote: string | null = null
    try {
      hote = new URL(baseURL).hostname
    } catch {
      hote = null
    }
    if (hote === null) manquantes.push('ANTHROPIC_BASE_URL (URL illisible)')
    else if (hote === 'anthropic.com' || hote.endsWith('.anthropic.com'))
      manquantes.push('ANTHROPIC_BASE_URL (vise Anthropic au lieu du relais)')
  }
  if (!apiKey || !baseURL || !model || manquantes.length > 0) return { manquantes }
  return { apiKey, baseURL, model }
}
