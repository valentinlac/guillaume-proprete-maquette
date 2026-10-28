/**
 * Données prêtes à afficher pour le calendrier et la journée (sans affichage).
 */
import type { Agent, Client, DateISO, Intervention, JeuDeDonnees } from '../donnees/types'
import { calculerJournee } from './journee'
import type { Journee } from './journee'

export interface TourneeAgentJour {
  agent: Agent
  /** Toutes les interventions du jour (y compris annulées), dans l'ordre de passage. */
  interventions: Intervention[]
  /** Journée calculée sur les interventions actives (null si aucune). */
  journee: Journee | null
  /** Communes visitées, dans l'ordre : donne le « secteur » de la tournée. */
  communes: string[]
}

const ACTIVES: Intervention['statut'][] = ['planifiee', 'replanifiee', 'terminee']

export function estActive(i: Intervention): boolean {
  return ACTIVES.includes(i.statut)
}

/** Index des interventions par date, pour éviter de refiltrer à chaque case. */
export function indexerParDate(interventions: Intervention[]): Map<DateISO, Intervention[]> {
  const index = new Map<DateISO, Intervention[]>()
  for (const i of interventions) index.set(i.date, [...(index.get(i.date) ?? []), i])
  return index
}

export function tourneesDuJour(
  jeu: Pick<JeuDeDonnees, 'entite' | 'agents'> & { clients: Client[] },
  interventionsDuJour: Intervention[],
): TourneeAgentJour[] {
  const clients = new Map(jeu.clients.map((c) => [c.id, c]))
  return jeu.agents
    .map((agent) => {
      const interventions = interventionsDuJour
        .filter((i) => i.agentId === agent.id)
        .sort((a, b) => a.ordre - b.ordre || a.debutMin - b.debutMin)
      const actives = interventions.filter(estActive)
      return {
        agent,
        interventions,
        journee: actives.length ? calculerJournee(jeu.entite.depot, actives.map((i) => clients.get(i.clientId)!)) : null,
        communes: [...new Set(interventions.map((i) => clients.get(i.clientId)?.ville ?? '?'))],
      }
    })
    .filter((t) => t.interventions.length > 0)
}

export interface StatsMois {
  passages: number
  terminees: number
  annulees: number
  replanifiees: number
  travailMin: number
  routeMin: number
}

export function statsDuMois(
  jeu: Pick<JeuDeDonnees, 'entite' | 'agents' | 'interventions'> & { clients: Client[] },
  prefixeMois: string,
): StatsMois {
  const duMois = jeu.interventions.filter((i) => i.date.startsWith(prefixeMois))
  const stats: StatsMois = { passages: 0, terminees: 0, annulees: 0, replanifiees: 0, travailMin: 0, routeMin: 0 }
  for (const [, liste] of indexerParDate(duMois)) {
    for (const t of tourneesDuJour(jeu, liste)) {
      stats.travailMin += t.journee?.travailMin ?? 0
      stats.routeMin += t.journee?.routeTotaleMin ?? 0
    }
  }
  for (const i of duMois) {
    if (estActive(i)) stats.passages++
    if (i.statut === 'terminee') stats.terminees++
    if (i.statut === 'annulee_meteo') stats.annulees++
    if (i.statut === 'replanifiee') stats.replanifiees++
  }
  return stats
}

export interface LigneJournee {
  intervention: Intervention
  client: Client
  /** Route depuis le chantier précédent (ou le dépôt) ; null pour un passage annulé. */
  routeAvantMin: number | null
  debutMin: number | null
  finMin: number | null
}

export interface DetailJournee {
  /** Passages actifs dans l'ordre de la tournée, puis passages annulés. */
  lignes: LigneJournee[]
  retourDepotMin: number
  /** Heure de retour au dépôt (null si aucun passage actif). */
  retourDepotA: number | null
}

/** Lignes de la vue journée d'un agent : passages, heures et route entre chantiers. */
export function detailJournee(tournee: TourneeAgentJour, clients: Client[]): DetailJournee {
  const parId = new Map(clients.map((c) => [c.id, c]))
  const actives = tournee.interventions.filter(estActive)
  const etapes = tournee.journee?.etapes ?? []
  const lignes: LigneJournee[] = actives.map((i, k) => ({
    intervention: i,
    client: parId.get(i.clientId)!,
    routeAvantMin: etapes[k].routeMin,
    debutMin: etapes[k].debutMin,
    finMin: etapes[k].finMin,
  }))
  for (const i of tournee.interventions.filter((x) => !estActive(x))) {
    lignes.push({ intervention: i, client: parId.get(i.clientId)!, routeAvantMin: null, debutMin: null, finMin: null })
  }
  const derniere = etapes[etapes.length - 1]
  const retourDepotMin = tournee.journee?.retourDepotMin ?? 0
  return { lignes, retourDepotMin, retourDepotA: derniere ? derniere.finMin + retourDepotMin : null }
}
