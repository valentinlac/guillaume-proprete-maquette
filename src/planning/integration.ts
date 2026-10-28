/**
 * Intégration de nouveaux clients (import CSV) dans un planning existant :
 * leurs passages restant à faire ce mois-ci et le mois suivant sont placés
 * avec « Trouver un créneau », sans toucher aux tournées existantes.
 */
import type { Client, DateISO, Intervention, JeuDeDonnees } from '../donnees/types'
import { annee, mois, premierDuMois } from '../utils/dates'
import { replacerEnSerie } from './creneaux'
import type { DemandeCreneau } from './creneaux'
import { passagesDuMois } from './passages'

export interface ResultatIntegration {
  interventions: Intervention[]
  /** Passages placés et passages sans créneau (par client). */
  places: { clientId: string; date: DateISO }[]
  nonPlaces: { clientId: string; fenetre: { debut: DateISO; fin: DateISO } }[]
}

export function integrerNouveauxClients(
  jeu: Pick<JeuDeDonnees, 'entite' | 'agents' | 'interventions'> & { clients: Client[] },
  nouveaux: Client[],
  dateDuJour: DateISO,
): ResultatIntegration {
  const suivant = premierDuMois(annee(dateDuJour), mois(dateDuJour) + 1)
  const passages = [
    ...passagesDuMois(nouveaux, annee(dateDuJour), mois(dateDuJour)),
    ...passagesDuMois(nouveaux, annee(suivant), mois(suivant)),
  ].filter((p) => p.fenetre.fin > dateDuJour) // les périodes déjà écoulées ne sont pas rattrapées

  const demandes: DemandeCreneau[] = passages.map((p) => ({
    clientId: p.clientId,
    fenetre: p.fenetre,
    idNouvelle: p.id,
  }))
  const { replacements, interventions } = replacerEnSerie(
    { depot: jeu.entite.depot, clients: [...jeu.clients, ...nouveaux], agents: jeu.agents, interventions: jeu.interventions, dateDuJour },
    demandes,
  )
  return {
    interventions,
    places: replacements.filter((r) => r.retenue).map((r) => ({ clientId: r.demande.clientId, date: r.retenue!.date })),
    nonPlaces: replacements
      .filter((r) => !r.retenue)
      .map((r) => ({ clientId: r.demande.clientId, fenetre: r.demande.fenetre })),
  }
}
