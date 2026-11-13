/**
 * Indicateurs et rentabilité : heures réelles, vitreries décalées, chiffre
 * d'affaires réalisé, et marge par journée et par agent.
 *
 * Marge d'une journée = CA des passages − taux horaire × heures (route
 * comprise) − kilomètres × coût au kilomètre.
 */
import type { Agent, Client, DateISO, Intervention, JeuDeDonnees, Point } from '../donnees/types'
import { distanceVolOiseauKm, OPTIONS_TRAJET_PAR_DEFAUT } from '../trajets/tempsTrajet'
import { dureeReelleMin } from '../planning/pointage'
import { indexerParDate, tourneesDuJour } from '../planning/vues'

/** Coût au kilomètre par défaut (utilitaire : carburant, entretien, usure). */
export const COUT_KM_DEFAUT = 0.6

export interface Periode {
  debut: DateISO
  fin: DateISO
}

export interface JourneeAgent {
  date: DateISO
  agent: Agent
  passages: number
  /** Passages encore à faire (journée prévue, pas encore réalisée). */
  prevue: boolean
  ca: number
  heures: number
  km: number
  coutMainOeuvre: number
  coutDeplacements: number
  marge: number
}

export interface Indicateurs {
  journees: JourneeAgent[]
  parAgent: { agent: Agent; heures: number; ca: number; marge: number; journees: number }[]
  caRealise: number
  heuresReelles: number
  vitreriesDecalees: number
  journeesDeficitaires: number
}

/** Kilomètres d'une boucle dépôt → clients → dépôt (vol d'oiseau × coefficient de détour). */
export function kmBoucle(depot: Point, points: Point[]): number {
  let km = 0
  let precedent = depot
  for (const p of [...points, depot]) {
    km += distanceVolOiseauKm(precedent, p)
    precedent = p
  }
  return points.length ? km * OPTIONS_TRAJET_PAR_DEFAUT.coefficientDetour : 0
}

export function calculerIndicateurs(
  jeu: Pick<JeuDeDonnees, 'entite' | 'agents' | 'clients' | 'interventions'>,
  periode: Periode,
  coutKm: number,
): Indicateurs {
  const clients = new Map<string, Client>(jeu.clients.map((c) => [c.id, c]))
  const dansPeriode = (d: DateISO) => d >= periode.debut && d <= periode.fin
  const journees: JourneeAgent[] = []

  for (const [date, liste] of indexerParDate(jeu.interventions.filter((i) => dansPeriode(i.date)))) {
    for (const t of tourneesDuJour(jeu, liste)) {
      if (!t.journee) continue
      const actives = t.interventions.filter((i) => i.statut !== 'annulee_meteo')
      // Durée réelle quand l'agent a pointé, sinon durée prévue.
      const ecartReel = actives.reduce((s, i) => s + ((dureeReelleMin(i) ?? clients.get(i.clientId)!.dureeMin) - clients.get(i.clientId)!.dureeMin), 0)
      const heures = (t.journee.totalMin + ecartReel) / 60
      const km = kmBoucle(jeu.entite.depot, actives.map((i) => clients.get(i.clientId)!))
      const ca = actives.reduce((s, i) => s + clients.get(i.clientId)!.tarif, 0)
      const coutMainOeuvre = heures * t.agent.tauxHoraire
      const coutDeplacements = km * coutKm
      journees.push({
        date,
        agent: t.agent,
        passages: actives.length,
        prevue: actives.some((i) => i.statut !== 'terminee'),
        ca,
        heures,
        km,
        coutMainOeuvre,
        coutDeplacements,
        marge: ca - coutMainOeuvre - coutDeplacements,
      })
    }
  }
  journees.sort((a, b) => a.date.localeCompare(b.date) || a.agent.nom.localeCompare(b.agent.nom))

  const realisees = journees.filter((j) => !j.prevue)
  const parAgent = jeu.agents.map((agent) => {
    const siennes = realisees.filter((j) => j.agent.id === agent.id)
    return {
      agent,
      heures: siennes.reduce((s, j) => s + j.heures, 0),
      ca: siennes.reduce((s, j) => s + j.ca, 0),
      marge: siennes.reduce((s, j) => s + j.marge, 0),
      journees: siennes.length,
    }
  })

  return {
    journees,
    parAgent,
    caRealise: realisees.reduce((s, j) => s + j.ca, 0),
    heuresReelles: realisees.reduce((s, j) => s + j.heures, 0),
    vitreriesDecalees: jeu.interventions.filter((i: Intervention) => i.dateOrigine && dansPeriode(i.dateOrigine)).length,
    journeesDeficitaires: journees.filter((j) => j.marge < 0).length,
  }
}
