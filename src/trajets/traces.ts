/**
 * Tracés routiers pour les cartes : le chemin réel par la route entre deux points
 * (dépôt ou client), calculé à l'avance par `npm run itineraires` et lu depuis
 * public/itineraires/<entité>.json. Aucun appel extérieur pendant la démo ; si un
 * tracé manque, la carte retombe sur une ligne droite.
 */
import { useCallback, useEffect, useState } from 'react'
import { useEtatDemo } from '../donnees/EtatDemo'

export type Coord = [number, number]
export type TracesRoutiers = Record<string, Coord[]>

/** Une étape de tournée : identifiant du client (ou « depot ») et position. */
export interface Etape {
  id: string
  lat: number
  lng: number
}

/** Tracé reçu pour le trajet a → b, dans un sens ou dans l'autre. */
function routeEntre(traces: TracesRoutiers | null, a: Etape, b: Etape): Coord[] | null {
  const aller = traces?.[`${a.id}|${b.id}`]
  if (aller?.length) return aller
  const retour = traces?.[`${b.id}|${a.id}`]
  return retour?.length ? [...retour].reverse() : null
}

/**
 * Position d'un point posée sur la rue la plus proche, là où passe le tracé.
 * Les adresses fictives tombent parfois à quelques dizaines de mètres de la rue :
 * la pastille est affichée sur la route pour que le trait passe en son centre.
 */
export function placerSurLaRoute(traces: TracesRoutiers | null, etape: Etape): Coord {
  for (const [cle, route] of Object.entries(traces ?? {})) {
    if (!route.length) continue
    if (cle.startsWith(`${etape.id}|`)) return route[0]
    if (cle.endsWith(`|${etape.id}`)) return route[route.length - 1]
  }
  return [etape.lat, etape.lng]
}

/** Tracé complet d'une tournée, étape par étape, qui passe au centre de chaque pastille. */
export function tracerParLaRoute(traces: TracesRoutiers | null, etapes: Etape[]): Coord[] {
  const resultat: Coord[] = []
  for (let k = 0; k + 1 < etapes.length; k++) {
    const [a, b] = [etapes[k], etapes[k + 1]]
    // Sans tracé connu : ligne droite entre les deux pastilles.
    const segment = routeEntre(traces, a, b) ?? [placerSurLaRoute(traces, a), placerSurLaRoute(traces, b)]
    const [dernier, premier] = [resultat[resultat.length - 1], segment[0]]
    const raccord = dernier && dernier[0] === premier[0] && dernier[1] === premier[1]
    resultat.push(...(raccord ? segment.slice(1) : segment))
  }
  return resultat
}

const chargements = new Map<string, Promise<TracesRoutiers | null>>()

function charger(entiteId: string): Promise<TracesRoutiers | null> {
  if (!chargements.has(entiteId)) {
    chargements.set(
      entiteId,
      fetch(`itineraires/${entiteId}.json`)
        .then((r) => (r.ok ? (r.json() as Promise<TracesRoutiers>) : null))
        .catch(() => null),
    )
  }
  return chargements.get(entiteId)!
}

function useTraces(): TracesRoutiers | null {
  const { donnees } = useEtatDemo()
  const entiteId = donnees.entite.id
  const [charge, setCharge] = useState<{ entiteId: string; traces: TracesRoutiers | null } | null>(null)

  useEffect(() => {
    let actif = true
    charger(entiteId).then((traces) => actif && setCharge({ entiteId, traces }))
    return () => {
      actif = false
    }
  }, [entiteId])

  return charge?.entiteId === entiteId ? charge.traces : null
}

/** Fonction de tracé pour l'entité affichée (lignes droites tant que les tracés ne sont pas chargés). */
export function useTracerParLaRoute(): (etapes: Etape[]) => Coord[] {
  const traces = useTraces()
  return useCallback((etapes: Etape[]) => tracerParLaRoute(traces, etapes), [traces])
}

/** Fonction qui donne la position d'affichage d'une pastille, sur la route. */
export function usePlacerSurLaRoute(): (etape: Etape) => Coord {
  const traces = useTraces()
  return useCallback((etape: Etape) => placerSurLaRoute(traces, etape), [traces])
}
