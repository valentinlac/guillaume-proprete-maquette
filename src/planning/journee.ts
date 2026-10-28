/**
 * Calcul d'une journée de tournée : ordre de passage, heures, temps de route.
 *
 * Convention : l'agent part du dépôt au début de la première plage horaire et y
 * revient en fin de tournée. Le maximum d'heures par jour inclut la route
 * (aller, entre chantiers et retour). Un long passage peut être coupé par la
 * pause de midi.
 */
import type { Agent, Client, Point } from '../donnees/types'
import { serviceTrajet } from '../trajets/tempsTrajet'
import type { ServiceTrajet } from '../trajets/tempsTrajet'
import { horloge, minutesOuvertesParJour } from './calendrierTravail'

export interface Etape {
  clientId: string
  /** Route depuis l'étape précédente (ou le dépôt). */
  routeMin: number
  /** Temps de travail écoulé au début et à la fin du passage. */
  debutEcoule: number
  finEcoulee: number
  /** Heures d'horloge (minutes depuis minuit). */
  debutMin: number
  finMin: number
}

export interface Journee {
  etapes: Etape[]
  retourDepotMin: number
  routeTotaleMin: number
  travailMin: number
  /** Route + travail : c'est ce total qui est comparé au maximum d'heures. */
  totalMin: number
}

/** Durée maximale d'une journée pour un agent (route comprise). */
export function capaciteMin(agent: Pick<Agent, 'heuresMaxJour'>): number {
  return Math.min(agent.heuresMaxJour * 60, minutesOuvertesParJour())
}

export function calculerJournee(
  depot: Point,
  clientsDansLOrdre: Pick<Client, 'id' | 'lat' | 'lng' | 'dureeMin'>[],
  service: ServiceTrajet = serviceTrajet(),
): Journee {
  const etapes: Etape[] = []
  let position: Point = depot
  let ecoule = 0
  let route = 0
  let travail = 0
  for (const c of clientsDansLOrdre) {
    const routeMin = service.minutesEntre(position, c)
    ecoule += routeMin
    route += routeMin
    const debutEcoule = ecoule
    ecoule += c.dureeMin
    travail += c.dureeMin
    etapes.push({
      clientId: c.id,
      routeMin,
      debutEcoule,
      finEcoulee: ecoule,
      debutMin: horloge(debutEcoule),
      finMin: horloge(ecoule, false),
    })
    position = c
  }
  const retourDepotMin = clientsDansLOrdre.length ? service.minutesEntre(position, depot) : 0
  route += retourDepotMin
  return { etapes, retourDepotMin, routeTotaleMin: route, travailMin: travail, totalMin: route + travail }
}

/** Temps de route total d'une boucle dépôt → points → dépôt. */
function routeBoucle(depot: Point, points: Point[], service: ServiceTrajet): number {
  let total = 0
  let precedent = depot
  for (const p of points) {
    total += service.minutesEntre(precedent, p)
    precedent = p
  }
  return total + (points.length ? service.minutesEntre(precedent, depot) : 0)
}

/**
 * Ordre de passage : plus proche voisin depuis le dépôt, puis amélioration
 * « 2-opt » (on inverse des portions de trajet tant que ça raccourcit la route).
 * Suffisant pour une dizaine de passages par jour.
 */
export function ordonnerTournee<T extends Point & { id: string }>(
  depot: Point,
  points: T[],
  service: ServiceTrajet = serviceTrajet(),
): T[] {
  const restants = [...points].sort((a, b) => a.id.localeCompare(b.id))
  const ordre: T[] = []
  let position: Point = depot
  while (restants.length) {
    let meilleur = 0
    for (let i = 1; i < restants.length; i++) {
      if (service.minutesEntre(position, restants[i]) < service.minutesEntre(position, restants[meilleur])) meilleur = i
    }
    position = restants[meilleur]
    ordre.push(restants.splice(meilleur, 1)[0])
  }

  let ameliore = true
  while (ameliore) {
    ameliore = false
    const actuel = routeBoucle(depot, ordre, service)
    for (let i = 0; i < ordre.length - 1 && !ameliore; i++) {
      for (let j = i + 1; j < ordre.length && !ameliore; j++) {
        const essai = [...ordre.slice(0, i), ...ordre.slice(i, j + 1).reverse(), ...ordre.slice(j + 1)]
        if (routeBoucle(depot, essai, service) < actuel) {
          ordre.splice(0, ordre.length, ...essai)
          ameliore = true
        }
      }
    }
  }
  return ordre
}
