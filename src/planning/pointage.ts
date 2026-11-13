/**
 * Pointage de l'agent sur le terrain (app mobile) : début, clôture, bon signé.
 * Le bureau voit ensuite le passage « OK » avec l'écart entre prévu et réel.
 */
import type { Client, Intervention } from '../donnees/types'

export interface BonDePassage {
  debutReel: number
  finReel: number
  observation: string
  signataire: string
  signature: string
}

/** Le passage passe en « terminée » avec la durée réelle et le bon signé. */
export function cloturerPassage(interventions: Intervention[], interventionId: string, bon: BonDePassage): Intervention[] {
  return interventions.map((i) => (i.id === interventionId ? { ...i, ...bon, statut: 'terminee' as const } : i))
}

export function dureeReelleMin(i: Intervention): number | null {
  return i.debutReel !== undefined && i.finReel !== undefined ? i.finReel - i.debutReel : null
}

/** Écart réel moins prévu, en minutes (positif = plus long que prévu). */
export function ecartDureeMin(i: Intervention, client: Pick<Client, 'dureeMin'>): number | null {
  const reel = dureeReelleMin(i)
  return reel === null ? null : reel - client.dureeMin
}

/** « +12 min », « −5 min », « pile à l'heure » */
export function formatEcart(ecart: number): string {
  if (ecart === 0) return 'durée prévue respectée'
  return `${ecart > 0 ? '+' : '−'}${Math.abs(ecart)} min`
}

/** Lien qui ouvre l'itinéraire dans Waze (application ou site). */
export function lienWaze(p: { lat: number; lng: number }): string {
  return `https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`
}
