/**
 * Règles de calendrier : jours travaillés, jours fériés, plages horaires.
 * Les valeurs viennent du fichier de données (CALENDRIER_TRAVAIL).
 */
import { CALENDRIER_TRAVAIL } from '../donnees/donnees-fictives'
import { ajouterJours, joursDuMois, jourSemaine } from '../utils/dates'
import type { DateISO } from '../utils/dates'
import { lireHeure } from '../utils/format'

export interface Plage {
  /** minutes depuis minuit */
  debut: number
  fin: number
}

const feries = new Set(CALENDRIER_TRAVAIL.joursFeries)

export const PLAGES_HORAIRES: Plage[] = CALENDRIER_TRAVAIL.plages.map((p) => ({
  debut: lireHeure(p.debut),
  fin: lireHeure(p.fin),
}))

export function estFerie(date: DateISO): boolean {
  return feries.has(date)
}

export function estJourTravaille(date: DateISO): boolean {
  return CALENDRIER_TRAVAIL.joursTravailles.includes(jourSemaine(date)) && !estFerie(date)
}

export function joursTravaillesDuMois(annee: number, mois: number): DateISO[] {
  return joursDuMois(annee, mois).filter(estJourTravaille)
}

/** Durée totale des plages horaires d'une journée, en minutes. */
export function minutesOuvertesParJour(): number {
  return PLAGES_HORAIRES.reduce((total, p) => total + (p.fin - p.debut), 0)
}

/** Premier jour travaillé strictement après `date`. */
export function prochainJourTravaille(date: DateISO): DateISO {
  let d = ajouterJours(date, 1)
  while (!estJourTravaille(d)) d = ajouterJours(d, 1)
  return d
}

/** Jours travaillés entre deux dates incluses. */
export function joursTravaillesEntre(debut: DateISO, fin: DateISO): DateISO[] {
  const jours: DateISO[] = []
  for (let d = debut; d <= fin; d = ajouterJours(d, 1)) if (estJourTravaille(d)) jours.push(d)
  return jours
}

/**
 * Convertit un temps de travail écoulé depuis le début de journée (en minutes)
 * en heure d'horloge, en sautant la pause entre deux plages.
 * Une activité qui commence pile à la fin d'une plage démarre à la plage suivante.
 */
export function horloge(minutesEcoulees: number, commenceIci = true): number {
  let reste = minutesEcoulees
  for (let i = 0; i < PLAGES_HORAIRES.length; i++) {
    const p = PLAGES_HORAIRES[i]
    const longueur = p.fin - p.debut
    const dernier = i === PLAGES_HORAIRES.length - 1
    if (reste < longueur || (!commenceIci && reste === longueur) || dernier) return p.debut + reste
    reste -= longueur
  }
  return PLAGES_HORAIRES[0].debut + minutesEcoulees
}
