/**
 * Passages dus dans un mois, déduits de la fréquence et des mois dus de chaque client.
 */
import type { Client, DateISO } from '../donnees/types'
import { versISO } from '../utils/dates'

export interface Fenetre {
  debut: DateISO
  fin: DateISO
}

export interface PassageAPlacer {
  /** Identifiant stable, repris par l'intervention : « c01-2026-10-1 ». */
  id: string
  clientId: string
  /** 1 ou 2 (2 passages par mois pour la quinzaine). */
  numero: number
  /** Période dans laquelle le passage doit avoir lieu. */
  fenetre: Fenetre
}

export function passagesDuMois(clients: Client[], annee: number, mois: number): PassageAPlacer[] {
  const premier = versISO(new Date(annee, mois, 1))
  const quinze = versISO(new Date(annee, mois, 15))
  const seize = versISO(new Date(annee, mois, 16))
  const dernier = versISO(new Date(annee, mois + 1, 0))
  const prefixe = premier.slice(0, 7)

  const passages: PassageAPlacer[] = []
  for (const c of clients) {
    if (!c.moisDus[mois]) continue
    if (c.frequence === 'quinzaine') {
      passages.push({ id: `${c.id}-${prefixe}-1`, clientId: c.id, numero: 1, fenetre: { debut: premier, fin: quinze } })
      passages.push({ id: `${c.id}-${prefixe}-2`, clientId: c.id, numero: 2, fenetre: { debut: seize, fin: dernier } })
    } else {
      passages.push({ id: `${c.id}-${prefixe}-1`, clientId: c.id, numero: 1, fenetre: { debut: premier, fin: dernier } })
    }
  }
  return passages
}
