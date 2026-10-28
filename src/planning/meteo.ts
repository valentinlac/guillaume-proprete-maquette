/**
 * Annulation météo et envoi du planning aux agents (logique, sans affichage).
 *
 * Déroulé : on annule une journée → l'outil propose un replacement pour chaque
 * passage (« Trouver un créneau » en série) → l'utilisateur ajuste puis confirme
 * → le planning modifié est envoyé aux agents (simulé).
 */
import type { Agent, DateISO, Intervention, JeuDeDonnees } from '../donnees/types'
import { annee, dernierDuMois, formatDate, mois, premierDuMois } from '../utils/dates'
import { prochainJourTravaille } from './calendrierTravail'
import { recalerJournee, replacerEnSerie } from './creneaux'
import type { ContexteCreneaux, DemandeCreneau, Replacement } from './creneaux'
import { clientsAPrevenir, enregistrerEnvois } from './messages'

/** Marque « annulée (météo) » les passages à faire d'une journée. */
export function annulerJournee(interventions: Intervention[], date: DateISO): Intervention[] {
  return interventions.map((i) =>
    i.date === date && (i.statut === 'planifiee' || i.statut === 'replanifiee') ? { ...i, statut: 'annulee_meteo' } : i,
  )
}

/** Annule l'annulation : les passages annulés de cette journée redeviennent planifiés. */
export function retablirJournee(interventions: Intervention[], date: DateISO): Intervention[] {
  return interventions.map((i) =>
    i.date === date && i.statut === 'annulee_meteo' ? { ...i, statut: i.dateOrigine ? 'replanifiee' : 'planifiee' } : i,
  )
}

/** Passages annulés pour la météo et pas encore replacés. */
export function passagesAReplacer(interventions: Intervention[]): Intervention[] {
  return interventions.filter((i) => i.statut === 'annulee_meteo')
}

/**
 * Période de replacement : du lendemain de la journée annulée à la fin du mois
 * suivant (« dans le mois ou le mois suivant »), sans la journée annulée.
 */
export function demandesDeReplacement(interventions: Intervention[], dateDuJour: DateISO): DemandeCreneau[] {
  const suivant = premierDuMois(annee(dateDuJour), mois(dateDuJour) + 1)
  const fin = dernierDuMois(annee(suivant), mois(suivant))
  return passagesAReplacer(interventions).map((i) => ({
    clientId: i.clientId,
    interventionId: i.id,
    fenetre: { debut: prochainJourTravaille(i.date), fin },
    joursExclus: [i.date],
    // L'agent prévu ce jour-là reste l'agent de référence, même si le passage a déjà été déplacé.
    agentHabituelId: i.agentId,
  }))
}

/** Suggestion complète de replacement, que l'utilisateur ajuste avant de confirmer. */
export function proposerReplacements(ctx: ContexteCreneaux): { replacements: Replacement[]; interventions: Intervention[] } {
  return replacerEnSerie(ctx, demandesDeReplacement(ctx.interventions, ctx.dateDuJour))
}

/**
 * Retire un passage de la suggestion : il redevient « annulé (météo) » à sa date
 * d'origine, à replacer plus tard.
 */
export function laisserAnnule(
  ctx: Pick<ContexteCreneaux, 'depot' | 'clients'>,
  brouillon: Intervention[],
  original: Intervention,
): Intervention[] {
  const place = brouillon.find((i) => i.id === original.id)
  const resultat = brouillon.map((i) => (i.id === original.id ? { ...original } : i))
  return place ? recalerJournee(ctx, resultat, place.date, place.agentId) : resultat
}

// ─── Envoi aux agents ───────────────────────────────────────────────────────

export type TypeChangement = 'ajout' | 'retrait' | 'horaire'

export interface Changement {
  type: TypeChangement
  intervention: Intervention
  /** Pour un horaire modifié : l'ancienne heure de début. */
  ancienDebutMin?: number
  /** Pour un retrait : la raison affichée à l'agent. */
  motif?: string
}

const ACTIVES: Intervention['statut'][] = ['planifiee', 'replanifiee']

/**
 * Ce que chaque agent doit recevoir : différences entre le dernier planning
 * envoyé et le planning actuel, à partir d'aujourd'hui.
 */
export function changementsParAgent(
  envoye: Intervention[],
  actuel: Intervention[],
  agents: Agent[],
  dateDuJour: DateISO,
): Map<string, Changement[]> {
  const avant = new Map(envoye.filter((i) => i.date >= dateDuJour).map((i) => [i.id, i]))
  const apres = new Map(actuel.filter((i) => i.date >= dateDuJour).map((i) => [i.id, i]))
  const resultat = new Map<string, Changement[]>(agents.map((a) => [a.id, []]))
  const ajouter = (agentId: string, c: Changement) => resultat.get(agentId)?.push(c)

  for (const id of new Set([...avant.keys(), ...apres.keys()])) {
    const a = avant.get(id)
    const b = apres.get(id)
    const etaitActif = !!a && ACTIVES.includes(a.statut)
    const estActif = !!b && ACTIVES.includes(b.statut)
    const memePlace = etaitActif && estActif && a!.date === b!.date && a!.agentId === b!.agentId

    if (memePlace) {
      if (a!.debutMin !== b!.debutMin) ajouter(b!.agentId, { type: 'horaire', intervention: b!, ancienDebutMin: a!.debutMin })
      continue
    }
    if (etaitActif) {
      ajouter(a!.agentId, {
        type: 'retrait',
        intervention: a!,
        motif: !b || b.statut === 'annulee_meteo' ? 'annulé (météo)' : `déplacé au ${formatDate(b.date)}`,
      })
    }
    if (estActif) ajouter(b!.agentId, { type: 'ajout', intervention: b! })
  }

  for (const liste of resultat.values()) {
    liste.sort((x, y) => x.intervention.date.localeCompare(y.intervention.date) || x.intervention.debutMin - y.intervention.debutMin)
  }
  return resultat
}

export function nombreDeChangements(changements: Map<string, Changement[]>): number {
  return [...changements.values()].reduce((n, l) => n + l.length, 0)
}

// ─── Pluie : tout préparer en un clic ──────────────────────────────────────

export interface JourneePluiePreparee {
  date: DateISO
  /** Passages annulés (état « annulée météo »), tels qu'avant replacement. */
  annules: Intervention[]
  /** Planning proposé : passages annulés puis replacés. Rien n'est encore enregistré. */
  interventions: Intervention[]
  replacements: Replacement[]
}

type JeuPluie = Pick<JeuDeDonnees, 'entite' | 'clients' | 'agents' | 'interventions' | 'interventionsEnvoyees' | 'messagesEnvoyes'>

/** Prépare toute la gestion d'une journée de pluie : annulation et replacement, sans rien enregistrer. */
export function preparerJourneePluie(jeu: JeuPluie, date: DateISO, dateDuJour: DateISO): JourneePluiePreparee {
  const annulees = annulerJournee(jeu.interventions, date)
  const { replacements, interventions } = proposerReplacements({
    depot: jeu.entite.depot,
    clients: jeu.clients,
    agents: jeu.agents,
    interventions: annulees,
    dateDuJour,
  })
  return { date, annules: annulees.filter((i) => i.date === date && i.statut === 'annulee_meteo'), interventions, replacements }
}

/**
 * Valide tout d'un coup : planning enregistré, clients touchés prévenus (SMS et
 * mail) et planning envoyé aux agents. Envois simulés.
 */
export function validerJourneePluie<T extends JeuPluie>(jeu: T, interventions: Intervention[], dateDuJour: DateISO): T {
  const aPrevenir = clientsAPrevenir({ ...jeu, interventions }, dateDuJour).filter((x) => !x.dejaPrevenu && x.modele === 'annulation_meteo')
  return {
    ...jeu,
    interventions,
    interventionsEnvoyees: interventions,
    messagesEnvoyes: enregistrerEnvois(
      jeu.messagesEnvoyes,
      aPrevenir.map((x) => ({ aPrevenir: x, modele: x.modele, canaux: ['sms', 'mail'] })),
      dateDuJour,
    ),
  }
}
