/**
 * Intervention urgente : on la place sur le créneau demandé, et les passages
 * déjà prévus sur ce créneau sont replacés avec le moteur de créneaux (comme
 * pour la pluie). Rien n'est enregistré : l'utilisateur vérifie puis valide.
 */
import type { DateISO, Intervention, JeuDeDonnees } from '../donnees/types'
import { CALENDRIER_TRAVAIL } from '../donnees/donnees-fictives'
import { lireHeure } from '../utils/format'
import { appliquerCreneau, replacerEnSerie, tourneeDuJour } from './creneaux'
import type { Proposition } from './creneaux'
import { demandesDeReplacement } from './meteo'
import type { JourneePluiePreparee } from './meteo'

export type Plage = 'matin' | 'apres-midi'

export interface DemandeUrgence {
  clientId: string
  date: DateISO
  agentId: string
  plage: Plage
}

/** Bornes de la plage, en minutes depuis minuit (selon le calendrier de travail). */
export function bornesPlage(plage: Plage): { debut: number; fin: number } {
  const p = CALENDRIER_TRAVAIL.plages[plage === 'matin' ? 0 : 1]
  return { debut: lireHeure(p.debut), fin: lireHeure(p.fin) }
}

type JeuUrgence = Pick<JeuDeDonnees, 'entite' | 'clients' | 'agents' | 'interventions'>

/**
 * Prépare l'urgence. Le résultat a la même forme que la journée de pluie, pour
 * réutiliser le même panneau (liste des replacements, messages, envoi aux agents).
 */
export function preparerUrgence(jeu: JeuUrgence, demande: DemandeUrgence, dateDuJour: DateISO): JourneePluiePreparee & { urgenteId: string } {
  const { debut, fin } = bornesPlage(demande.plage)
  const ctx = { depot: jeu.entite.depot, clients: jeu.clients, agents: jeu.agents, dateDuJour }
  const tournee = tourneeDuJour(jeu.interventions, demande.date, demande.agentId)
  // Passages à faire qui commencent sur le créneau : ils laissent la place.
  const aDecaler = new Set(tournee.filter((i) => i.statut !== 'terminee' && i.debutMin >= debut && i.debutMin < fin).map((i) => i.id))
  let interventions: Intervention[] = jeu.interventions.map((i) => (aDecaler.has(i.id) ? { ...i, statut: 'annulee_meteo' as const } : i))

  // L'urgence prend la place du premier passage décalé (ou se place au début du créneau).
  const restants = tourneeDuJour(interventions, demande.date, demande.agentId)
  const position = restants.filter((i) => i.debutMin < debut).length
  const urgenteId = `${demande.clientId}-urgence-${demande.date}`
  interventions = appliquerCreneau(
    { ...ctx, interventions },
    { clientId: demande.clientId, fenetre: { debut: demande.date, fin: demande.date }, idNouvelle: urgenteId },
    { date: demande.date, agentId: demande.agentId, position } as Proposition,
  ).map((i) => (i.id === urgenteId ? { ...i, urgente: true } : i))

  const annules = interventions.filter((i) => aDecaler.has(i.id))
  const demandes = demandesDeReplacement(annules, dateDuJour)
  const { replacements, interventions: replacees } = replacerEnSerie({ ...ctx, interventions }, demandes)
  // Message « déplacement » (et non « pluie ») pour les clients décalés.
  const finales = replacees.map((i) => (aDecaler.has(i.id) && i.statut === 'replanifiee' ? { ...i, motif: 'deplacement' as const } : i))
  return { date: demande.date, annules, interventions: finales, replacements, urgenteId }
}
