/**
 * Contrôles de cohérence d'un planning. Utilisés par les tests et le rapport,
 * et réutilisables par l'interface (ex. avant d'« Envoyer aux agents »).
 */
import type { Agent, Client, Intervention, Point } from '../donnees/types'
import { serviceTrajet } from '../trajets/tempsTrajet'
import type { ServiceTrajet } from '../trajets/tempsTrajet'
import { formatDate } from '../utils/dates'
import { PLAGES_HORAIRES, estJourTravaille } from './calendrierTravail'
import { calculerJournee, capaciteMin } from './journee'

export interface ContexteVerification {
  depot: Point
  clients: Client[]
  agents: Agent[]
}

const ACTIVES: Intervention['statut'][] = ['planifiee', 'replanifiee', 'terminee']

/** Regroupe les interventions actives par « date|agent », dans l'ordre de passage. */
export function journeesActives(interventions: Intervention[]): Map<string, Intervention[]> {
  const parJour = new Map<string, Intervention[]>()
  for (const i of interventions) {
    if (!ACTIVES.includes(i.statut)) continue
    const cle = `${i.date}|${i.agentId}`
    parJour.set(cle, [...(parJour.get(cle) ?? []), i])
  }
  for (const liste of parJour.values()) liste.sort((a, b) => a.ordre - b.ordre)
  return parJour
}

/** Renvoie la liste des anomalies (vide si le planning est correct). */
export function verifierPlanning(
  ctx: ContexteVerification,
  interventions: Intervention[],
  service: ServiceTrajet = serviceTrajet(),
): string[] {
  const anomalies: string[] = []
  const clients = new Map(ctx.clients.map((c) => [c.id, c]))
  const agents = new Map(ctx.agents.map((a) => [a.id, a]))
  const finJournee = PLAGES_HORAIRES[PLAGES_HORAIRES.length - 1].fin

  const ids = new Set<string>()
  for (const i of interventions) {
    if (ids.has(i.id)) anomalies.push(`Identifiant en double : ${i.id}`)
    ids.add(i.id)
    if (!clients.has(i.clientId)) anomalies.push(`Client inconnu : ${i.clientId}`)
    if (!agents.has(i.agentId)) anomalies.push(`Agent inconnu : ${i.agentId}`)
  }

  for (const [cle, liste] of journeesActives(interventions)) {
    const [date, agentId] = cle.split('|')
    const agent = agents.get(agentId)
    const lieu = `${formatDate(date)} / ${agent?.nom ?? agentId}`
    if (!agent) continue
    if (!estJourTravaille(date)) anomalies.push(`${lieu} : jour non travaillé`)

    liste.forEach((i, k) => {
      if (i.ordre !== k + 1) anomalies.push(`${lieu} : ordre de passage non continu (${liste.map((x) => x.ordre).join(',')})`)
    })
    const clientsDuJour = liste.map((i) => i.clientId)
    if (new Set(clientsDuJour).size !== clientsDuJour.length) anomalies.push(`${lieu} : même client deux fois`)

    const journee = calculerJournee(ctx.depot, liste.map((i) => clients.get(i.clientId)!), service)
    if (journee.totalMin > capaciteMin(agent)) {
      anomalies.push(`${lieu} : ${journee.totalMin} min pour un maximum de ${capaciteMin(agent)} min`)
    }
    const derniere = journee.etapes[journee.etapes.length - 1]
    if (derniere && derniere.finMin + journee.retourDepotMin > finJournee) {
      anomalies.push(`${lieu} : retour au dépôt après la fin de journée`)
    }
    liste.forEach((i, k) => {
      if (i.debutMin !== journee.etapes[k].debutMin) {
        anomalies.push(`${lieu} : heure de ${clients.get(i.clientId)?.nom} incohérente`)
      }
    })
  }
  return anomalies
}

/** Temps de route total (minutes) de toutes les journées actives. */
export function routeTotale(
  ctx: ContexteVerification,
  interventions: Intervention[],
  service: ServiceTrajet = serviceTrajet(),
): number {
  const clients = new Map(ctx.clients.map((c) => [c.id, c]))
  let total = 0
  for (const liste of journeesActives(interventions).values()) {
    total += calculerJournee(ctx.depot, liste.map((i) => clients.get(i.clientId)!), service).routeTotaleMin
  }
  return total
}

/**
 * Planning de référence « sans regroupement » : passages pris dans l'ordre de la
 * liste des clients (comme dans le tableur), journées remplies les unes après
 * les autres (tri stable : l'ordre reçu est conservé à numéro de passage égal). Sert uniquement à mesurer le gain des tournées par secteur.
 */
export function routeSansRegroupement(
  ctx: ContexteVerification,
  passages: { clientId: string; numero: number }[],
  service: ServiceTrajet = serviceTrajet(),
): number {
  const clients = new Map(ctx.clients.map((c) => [c.id, c]))
  const capacite = Math.min(...ctx.agents.map(capaciteMin))
  let total = 0
  let journee: Client[] = []
  const cloturer = () => {
    if (journee.length) total += calculerJournee(ctx.depot, journee, service).routeTotaleMin
    journee = []
  }
  // 1ers passages du mois d'abord, puis les 2es (quinzaine) ; jamais deux fois le même client dans la journée.
  const ordonnes = [...passages].sort((a, b) => a.numero - b.numero)
  for (const p of ordonnes) {
    const c = clients.get(p.clientId)!
    const deborde = journee.length && calculerJournee(ctx.depot, [...journee, c], service).totalMin > capacite
    if (deborde || journee.includes(c)) cloturer()
    journee.push(c)
  }
  cloturer()
  return total
}
