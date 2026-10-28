/**
 * « Préparer le planning du mois suivant » : construit en un clic le mois qui
 * suit le dernier mois planifié, à partir de la liste des clients et de leurs
 * mois dus. Rien n'est enregistré : l'utilisateur vérifie puis valide.
 */
import type { Client, DateISO, JeuDeDonnees } from '../donnees/types'
import { annee, mois, premierDuMois } from '../utils/dates'
import { passagesDuMois } from './passages'
import { planifierMois } from './tournees'
import type { ResultatTournees } from './tournees'
import { routeSansRegroupement, routeTotale } from './verifications'

type JeuPlanning = Pick<JeuDeDonnees, 'entite' | 'agents' | 'interventions'> & { clients: Client[] }

/** Premier jour du mois qui suit le dernier mois ayant des passages planifiés. */
export function moisAPreparer(jeu: Pick<JeuDeDonnees, 'interventions'>, dateDuJour: DateISO): { annee: number; mois: number } {
  const dernier = jeu.interventions.reduce((max, i) => (i.date > max ? i.date : max), dateDuJour)
  const suivant = premierDuMois(annee(dernier), mois(dernier) + 1)
  return { annee: annee(suivant), mois: mois(suivant) }
}

export interface MoisPrepare extends ResultatTournees {
  annee: number
  mois: number
  /** Route du mois avec les tournées par secteur, et dans l'ordre du tableur (référence). */
  routeMin: number
  routeTableurMin: number
}

export function preparerMoisSuivant(jeu: JeuPlanning, dateDuJour: DateISO): MoisPrepare {
  const cible = moisAPreparer(jeu, dateDuJour)
  const ctx = { depot: jeu.entite.depot, clients: jeu.clients, agents: jeu.agents }
  const resultat = planifierMois(ctx, cible.annee, cible.mois, dateDuJour, { dejaPlanifiees: jeu.interventions })
  const clients = new Map(jeu.clients.map((c) => [c.id, c]))
  const passages = passagesDuMois(jeu.clients, cible.annee, cible.mois).sort((a, b) =>
    clients.get(a.clientId)!.nom.localeCompare(clients.get(b.clientId)!.nom),
  )
  return {
    ...cible,
    ...resultat,
    routeMin: routeTotale(ctx, resultat.interventions),
    routeTableurMin: routeSansRegroupement(ctx, passages),
  }
}
