import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChat } from './useChat'

/**
 * Le client du chat IA. Il était à 50 % de branches — la moitié la moins
 * couverte étant précisément le parseur de flux SSE, c'est-à-dire l'endroit où
 * arrivent des données que l'on ne contrôle pas.
 *
 * Trois familles de défauts s'y logent, et aucune ne produit d'erreur visible :
 *   - un fragment SSE coupé au milieu, perdu au lieu d'être accumulé ;
 *   - un JSON malformé qui interrompt tout le flux au lieu d'être ignoré ;
 *   - une bulle de réponse vide laissée à l'écran après un échec.
 *
 * Et une garde qui compte financièrement : `if (streaming) return` empêche
 * qu'un double clic déclenche deux appels au modèle.
 */
describe('useChat', () => {
    beforeEach(() => vi.clearAllMocks())
    afterEach(() => vi.restoreAllMocks())

    /** Construit une réponse dont le corps émet les fragments donnés. */
    function reponseFlux(fragments: string[], { ok = true, status = 200 } = {}) {
        const encodeur = new TextEncoder()
        let i = 0
        return {
            ok,
            status,
            body: {
                getReader: () => ({
                    read: async () =>
                        i < fragments.length
                            ? { done: false, value: encodeur.encode(fragments[i++]) }
                            : { done: true, value: undefined },
                }),
            },
        } as unknown as Response
    }

    const sse = (objet: unknown) => `data: ${JSON.stringify(objet)}\n\n`

    it('part sans message, sans erreur et sans flux en cours', () => {
        const { result } = renderHook(() => useChat())

        expect(result.current.messages).toEqual([])
        expect(result.current.error).toBeNull()
        expect(result.current.streaming).toBe(false)
    })

    it('ajoute le message de l’utilisateur puis assemble la réponse', async () => {
        global.fetch = vi
            .fn()
            .mockResolvedValue(reponseFlux([sse({ text: 'Bon' }), sse({ text: 'jour' })])) as never

        const { result } = renderHook(() => useChat())
        await act(async () => {
            await result.current.send('Salut')
        })

        expect(result.current.messages).toEqual([
            { role: 'user', content: 'Salut' },
            { role: 'assistant', content: 'Bonjour' },
        ])
    })

    it('envoie tout l’historique, pas seulement le dernier message', async () => {
        // Sans l'historique, le modèle perd le contexte à chaque tour et
        // répond à côté — pour le même prix en jetons.
        const fetchMock = vi.fn().mockResolvedValue(reponseFlux([sse({ text: 'ok' })]))
        global.fetch = fetchMock as never

        const { result } = renderHook(() => useChat())
        await act(async () => {
            await result.current.send('Premier')
        })
        await act(async () => {
            await result.current.send('Second')
        })

        const corps = JSON.parse(fetchMock.mock.calls[1][1].body)
        expect(corps.messages).toHaveLength(3)
        expect(corps.messages[0]).toEqual({ role: 'user', content: 'Premier' })
    })

    it('LA GARDE QUI COMPTE : un envoi pendant un flux en cours est ignoré', async () => {
        // `if (streaming) return`. Un double clic sur « Envoyer », ou la touche
        // Entrée maintenue, déclencherait sinon deux appels facturés au modèle
        // et entrelacerait deux réponses dans la même bulle.
        let debloquer: () => void = () => {}
        const enAttente = new Promise<void>((r) => (debloquer = r))
        const fetchMock = vi.fn().mockImplementation(async () => {
            await enAttente
            return reponseFlux([sse({ text: 'ok' })])
        })
        global.fetch = fetchMock as never

        const { result } = renderHook(() => useChat())

        let premier: Promise<void>
        act(() => {
            premier = result.current.send('Premier')
        })
        await waitFor(() => expect(result.current.streaming).toBe(true))

        await act(async () => {
            await result.current.send('Deuxième pendant le flux')
        })
        expect(fetchMock).toHaveBeenCalledTimes(1)

        await act(async () => {
            debloquer()
            await premier!
        })
    })

    describe('parsing du flux', () => {
        it('un fragment coupé entre deux lectures est recollé', async () => {
            // Le cas le plus réel : le réseau découpe où il veut. Sans le
            // tampon `buffer`, la moitié du JSON serait jetée et le mot
            // disparaîtrait de la réponse — sans aucune erreur.
            global.fetch = vi
                .fn()
                .mockResolvedValue(
                    reponseFlux(['data: {"text":"Bon', 'jour"}\n\n'])
                ) as never

            const { result } = renderHook(() => useChat())
            await act(async () => {
                await result.current.send('Salut')
            })

            expect(result.current.messages[1].content).toBe('Bonjour')
        })

        it('« [DONE] » est ignoré au lieu d’être écrit dans la réponse', async () => {
            global.fetch = vi
                .fn()
                .mockResolvedValue(reponseFlux([sse({ text: 'Fini' }), 'data: [DONE]\n\n'])) as never

            const { result } = renderHook(() => useChat())
            await act(async () => {
                await result.current.send('Salut')
            })

            expect(result.current.messages[1].content).toBe('Fini')
        })

        it('un JSON malformé est sauté, le reste du flux continue', async () => {
            // Sans le try/catch autour de `JSON.parse`, un seul fragment abîmé
            // ferait échouer toute la réponse — y compris la partie déjà reçue.
            global.fetch = vi
                .fn()
                .mockResolvedValue(
                    reponseFlux([sse({ text: 'Avant' }), 'data: {pas du json}\n\n', sse({ text: 'Après' })])
                ) as never

            const { result } = renderHook(() => useChat())
            await act(async () => {
                await result.current.send('Salut')
            })

            expect(result.current.messages[1].content).toBe('AvantAprès')
        })

        it('une ligne qui n’est pas un « data: » est ignorée', async () => {
            // Les commentaires de maintien de connexion (`: keep-alive`) et les
            // champs `event:` font partie du protocole SSE.
            global.fetch = vi
                .fn()
                .mockResolvedValue(
                    reponseFlux([': keep-alive\n\n', sse({ text: 'Réponse' })])
                ) as never

            const { result } = renderHook(() => useChat())
            await act(async () => {
                await result.current.send('Salut')
            })

            expect(result.current.messages[1].content).toBe('Réponse')
        })

        it('un fragment sans champ text n’écrit rien, sans casser', async () => {
            global.fetch = vi
                .fn()
                .mockResolvedValue(reponseFlux([sse({}), sse({ text: 'Utile' })])) as never

            const { result } = renderHook(() => useChat())
            await act(async () => {
                await result.current.send('Salut')
            })

            expect(result.current.messages[1].content).toBe('Utile')
        })

        it('une erreur transmise DANS le flux est traitée comme un échec', async () => {
            // L'API peut commencer à répondre puis échouer (quota atteint en
            // cours de génération). Le champ `error` du payload est le seul
            // signal — le statut HTTP, lui, est déjà 200.
            global.fetch = vi
                .fn()
                .mockResolvedValue(
                    reponseFlux([sse({ text: 'Début' }), sse({ error: 'overloaded' })])
                ) as never

            const { result } = renderHook(() => useChat())
            await act(async () => {
                await result.current.send('Salut')
            })

            expect(result.current.error).toBeTruthy()
        })
    })

    describe('échecs', () => {
        it('un 429 donne un message qui dit quoi faire', async () => {
            // C'est le rate limiter du site qui répond. Un message générique
            // ferait réessayer immédiatement, donc re-déclencher la limite.
            global.fetch = vi.fn().mockResolvedValue(reponseFlux([], { ok: false, status: 429 })) as never

            const { result } = renderHook(() => useChat())
            await act(async () => {
                await result.current.send('Salut')
            })

            expect(result.current.error).toMatch(/attendez une minute/i)
        })

        it('un autre statut d’erreur donne un message générique', async () => {
            global.fetch = vi.fn().mockResolvedValue(reponseFlux([], { ok: false, status: 500 })) as never

            const { result } = renderHook(() => useChat())
            await act(async () => {
                await result.current.send('Salut')
            })

            expect(result.current.error).toMatch(/une erreur est survenue/i)
            expect(result.current.error).not.toMatch(/attendez une minute/i)
        })

        it('un rejet réseau est rattrapé', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch')) as never

            const { result } = renderHook(() => useChat())
            await act(async () => {
                await result.current.send('Salut')
            })

            expect(result.current.error).toBeTruthy()
        })

        it('LA BULLE VIDE EST RETIRÉE après un échec', async () => {
            // `setMessages(prev => prev.slice(0, -1))`. Sans ça, l'écran garde
            // une bulle de réponse vide sous le message de l'utilisateur, à
            // côté du message d'erreur : on dirait que l'IA a répondu par le
            // silence.
            global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch')) as never

            const { result } = renderHook(() => useChat())
            await act(async () => {
                await result.current.send('Salut')
            })

            expect(result.current.messages).toEqual([{ role: 'user', content: 'Salut' }])
        })

        it('le flux est toujours refermé, même après un échec', async () => {
            // Le `finally`. Sans lui, `streaming` resterait à true et la garde
            // de ré-entrance bloquerait DÉFINITIVEMENT le chat : le visiteur
            // tape, appuie sur Entrée, rien ne se passe, plus jamais.
            global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch')) as never

            const { result } = renderHook(() => useChat())
            await act(async () => {
                await result.current.send('Salut')
            })

            expect(result.current.streaming).toBe(false)
        })

        it('une réponse sans corps est un échec, pas un flux vide', async () => {
            global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, body: null }) as never

            const { result } = renderHook(() => useChat())
            await act(async () => {
                await result.current.send('Salut')
            })

            expect(result.current.error).toBeTruthy()
            expect(result.current.messages).toHaveLength(1)
        })

        it('une nouvelle tentative efface l’erreur précédente', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('KO')) as never
            const { result } = renderHook(() => useChat())
            await act(async () => {
                await result.current.send('Salut')
            })
            expect(result.current.error).toBeTruthy()

            global.fetch = vi.fn().mockResolvedValue(reponseFlux([sse({ text: 'ok' })])) as never
            await act(async () => {
                await result.current.send('Encore')
            })

            expect(result.current.error).toBeNull()
        })
    })

    describe('reset', () => {
        it('vide la conversation et l’erreur', async () => {
            global.fetch = vi.fn().mockResolvedValue(reponseFlux([sse({ text: 'ok' })])) as never
            const { result } = renderHook(() => useChat())
            await act(async () => {
                await result.current.send('Salut')
            })

            act(() => result.current.reset())

            expect(result.current.messages).toEqual([])
            expect(result.current.error).toBeNull()
        })
    })
})
