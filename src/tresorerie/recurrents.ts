/**
 * Détection des mouvements récurrents dans l'historique : même fournisseur ou
 * client, à peu près le même jour du mois, montant proche, au plus une fois
 * par mois, sur au moins 3 mois.
 */
import type { Categorie, DateISO, Mouvement } from '../donnees/types'
import { jourDuMois } from '../utils/dates'

export const REGLES_DETECTION = {
  moisMinimum: 3,
  /** Écart toléré autour du jour habituel (un prélèvement du week-end passe au lundi). */
  toleranceJours: 3,
  /** Écart toléré autour du montant habituel. */
  toleranceMontant: 0.1,
}

export interface RecurrentDetecte {
  /** Clé stable : fournisseur + sens (entrée ou dépense). */
  cle: string
  tiers: string
  categorie: Categorie
  /** Jour habituel du mois. */
  jour: number
  /** Montant habituel, signé (négatif pour une dépense). */
  montant: number
  occurrences: number
  derniereDate: DateISO
  /** Plus grand écart de montant constaté (0,03 = 3 %). */
  variation: number
}

export type StatutRecurrent = 'propose' | 'confirme' | 'ecarte'

export interface DecisionRecurrent {
  statut: Exclude<StatutRecurrent, 'propose'>
  /** Corrections de l'utilisateur. */
  montant?: number
  jour?: number
}

export interface Recurrent extends RecurrentDetecte {
  statut: StatutRecurrent
}

function mediane(valeurs: number[]): number {
  const t = [...valeurs].sort((a, b) => a - b)
  const m = Math.floor(t.length / 2)
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2
}

export function cleRecurrent(tiers: string, montant: number): string {
  return `${tiers}|${montant >= 0 ? 'entree' : 'sortie'}`
}

export function detecterRecurrents(mouvements: Mouvement[], regles = REGLES_DETECTION): RecurrentDetecte[] {
  const groupes = new Map<string, Mouvement[]>()
  for (const m of mouvements) {
    const cle = cleRecurrent(m.tiers, m.montant)
    groupes.set(cle, [...(groupes.get(cle) ?? []), m])
  }

  const resultat: RecurrentDetecte[] = []
  for (const [cle, liste] of groupes) {
    const mois = new Set(liste.map((m) => m.date.slice(0, 7)))
    // Au plus un mouvement par mois, sur assez de mois.
    if (mois.size < regles.moisMinimum || mois.size !== liste.length) continue

    const jour = Math.round(mediane(liste.map((m) => jourDuMois(m.date))))
    if (!liste.every((m) => Math.abs(jourDuMois(m.date) - jour) <= regles.toleranceJours)) continue

    const montant = mediane(liste.map((m) => m.montant))
    const variation = Math.max(...liste.map((m) => Math.abs(m.montant - montant) / Math.abs(montant)))
    if (variation > regles.toleranceMontant) continue

    const triee = [...liste].sort((a, b) => a.date.localeCompare(b.date))
    const categories = new Map<Categorie, number>()
    for (const m of liste) categories.set(m.categorie, (categories.get(m.categorie) ?? 0) + 1)
    resultat.push({
      cle,
      tiers: liste[0].tiers,
      categorie: [...categories].sort((a, b) => b[1] - a[1])[0][0],
      jour,
      montant: Math.round(montant * 100) / 100,
      occurrences: liste.length,
      derniereDate: triee[triee.length - 1].date,
      variation,
    })
  }
  return resultat.sort((a, b) => a.montant - b.montant)
}

/** Récurrents détectés, avec les décisions (et corrections) de l'utilisateur. */
export function recurrentsAvecDecisions(
  mouvements: Mouvement[],
  decisions: Record<string, DecisionRecurrent>,
): Recurrent[] {
  return detecterRecurrents(mouvements).map((r) => {
    const d = decisions[r.cle]
    if (!d) return { ...r, statut: 'propose' }
    return { ...r, statut: d.statut, montant: d.montant ?? r.montant, jour: d.jour ?? r.jour }
  })
}

/** Mouvements de l'historique rattachés à un récurrent confirmé (pour le champ « récurrent »). */
export function marquerRecurrents(mouvements: Mouvement[], recurrents: Recurrent[]): Mouvement[] {
  const confirmes = new Set(recurrents.filter((r) => r.statut === 'confirme').map((r) => r.cle))
  return mouvements.map((m) => {
    const recurrent = confirmes.has(cleRecurrent(m.tiers, m.montant))
    return recurrent === m.recurrent ? m : { ...m, recurrent }
  })
}

/**
 * Récurrents confirmés attendus ce mois-ci jusqu'à aujourd'hui inclus mais pas
 * encore saisis (ex. les salaires du 28) : proposés en saisie d'un clic.
 */
export function attendusAujourdhui(mouvements: Mouvement[], recurrents: Recurrent[], dateDuJour: DateISO): Recurrent[] {
  const prefixe = dateDuJour.slice(0, 7)
  const saisis = new Set(mouvements.filter((m) => m.date.startsWith(prefixe)).map((m) => cleRecurrent(m.tiers, m.montant)))
  return recurrents.filter((r) => r.statut === 'confirme' && r.jour <= jourDuMois(dateDuJour) && !saisis.has(r.cle))
}
