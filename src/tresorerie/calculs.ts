/**
 * Module « calcul de trésorerie » : fonctions pures, sans affichage.
 */
import type { Categorie, DateISO, JeuDeDonnees, Mouvement } from '../donnees/types'

type Historique = Pick<JeuDeDonnees, 'soldeInitial' | 'mouvements'>

/** Solde bancaire au matin de `date` (mouvements strictement antérieurs). */
export function soldeAu(jeu: Historique, date: DateISO): number {
  return jeu.mouvements.filter((m) => m.date < date).reduce((solde, m) => solde + m.montant, jeu.soldeInitial)
}

/** Solde bancaire le soir de `date` (mouvements du jour compris) : le « solde actuel ». */
export function soldeFinDeJournee(jeu: Historique, date: DateISO): number {
  return jeu.mouvements.filter((m) => m.date <= date).reduce((solde, m) => solde + m.montant, jeu.soldeInitial)
}

export interface TotauxPeriode {
  entrees: number
  sorties: number
}

/** Entrées et sorties d'un mois (« 2026-10 »), jusqu'à une date incluse. */
export function totauxDuMois(mouvements: Mouvement[], prefixeMois: string, jusquau: DateISO): TotauxPeriode {
  const t: TotauxPeriode = { entrees: 0, sorties: 0 }
  for (const m of mouvements) {
    if (!m.date.startsWith(prefixeMois) || m.date > jusquau) continue
    if (m.montant >= 0) t.entrees += m.montant
    else t.sorties += m.montant
  }
  return t
}

export interface JourneeDeCaisse {
  date: DateISO
  soldeVeille: number
  entrees: number
  sorties: number
  solde: number
  mouvements: Mouvement[]
}

/** Journal jour par jour, comme le tableur de Damien : solde de la veille, entrées, sorties, solde. */
export function journalParJour(jeu: Historique, depuis: DateISO, jusquau: DateISO): JourneeDeCaisse[] {
  const parDate = new Map<DateISO, Mouvement[]>()
  for (const m of jeu.mouvements) {
    if (m.date >= depuis && m.date <= jusquau) parDate.set(m.date, [...(parDate.get(m.date) ?? []), m])
  }
  let solde = soldeAu(jeu, depuis)
  return [...parDate.keys()].sort().map((date) => {
    const mouvements = parDate.get(date)!
    const entrees = mouvements.filter((m) => m.montant >= 0).reduce((s, m) => s + m.montant, 0)
    const sorties = mouvements.filter((m) => m.montant < 0).reduce((s, m) => s + m.montant, 0)
    const soldeVeille = solde
    solde += entrees + sorties
    return { date, soldeVeille, entrees, sorties, solde, mouvements }
  })
}

/** Dernière catégorie et dernier montant utilisés pour un fournisseur ou client : pour pré-remplir la saisie. */
export function suggestionPourTiers(mouvements: Mouvement[], tiers: string): { categorie: Categorie; montant: number } | null {
  const t = tiers.trim().toLowerCase()
  if (!t) return null
  const derniers = mouvements.filter((m) => m.tiers.toLowerCase() === t).sort((a, b) => b.date.localeCompare(a.date))
  return derniers[0] ? { categorie: derniers[0].categorie, montant: derniers[0].montant } : null
}
