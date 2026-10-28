import type { Point } from '../trajets/tempsTrajet'
import type { DateISO } from '../utils/dates'

export type { DateISO } from '../utils/dates'
export type { Point } from '../trajets/tempsTrajet'

// ─── Entités (société principale ou franchisé) ────────────────────────────────

export type TypeEntite = 'societe' | 'franchise'

export interface Entite {
  id: string
  nom: string
  ville: string
  type: TypeEntite
  /** Centre de la carte et point de départ des tournées (dépôt). */
  depot: Point & { adresse: string }
}

// ─── Planning ─────────────────────────────────────────────────────────────────

export type Frequence = 'quinzaine' | 'mensuelle' | 'trimestrielle' | 'semestrielle'

export interface Contact {
  nom: string
  telephone: string
  email: string
}

export interface Client extends Point {
  id: string
  nom: string
  adresse: string
  ville: string
  /** Tarif HT d'un passage, en euros. */
  tarif: number
  frequence: Frequence
  /** Durée d'un passage, en minutes. */
  dureeMin: number
  /** 12 cases, de janvier (0) à décembre (11) : le passage est-il dû ce mois-ci ? */
  moisDus: boolean[]
  contact: Contact
}

export interface Agent {
  id: string
  nom: string
  heuresMaxJour: number
  zone: string
  /** Couleur d'affichage dans le planning. */
  couleur: string
}

export type StatutIntervention = 'planifiee' | 'annulee_meteo' | 'replanifiee' | 'terminee'

export interface Intervention {
  id: string
  clientId: string
  date: DateISO
  agentId: string
  /** Position dans la tournée de la journée (1, 2, 3…). */
  ordre: number
  /** Heure de début, en minutes depuis minuit. */
  debutMin: number
  statut: StatutIntervention
  /** Date initialement prévue, si le passage a été replanifié. */
  dateOrigine?: DateISO
  /** Raison de la replanification (pour le message au client). */
  motif?: 'meteo' | 'deplacement'
}

export type CanalMessage = 'sms' | 'mail'

export type ModeleMessage = 'rappel_veille' | 'retard' | 'annulation_meteo' | 'deplacement'

/** Trace d'un message envoyé à un client (envoi simulé). */
export interface MessageEnvoye {
  interventionId: string
  modele: ModeleMessage
  canaux: CanalMessage[]
  /** État du passage au moment de l'envoi : un nouveau changement redemande un message. */
  signature: string
  envoyeLe: DateISO
}

// ─── Trésorerie ───────────────────────────────────────────────────────────────

export type Categorie =
  | 'social'
  | 'entretien_vehicules'
  | 'telephonie_internet'
  | 'assurances'
  | 'carburant'
  | 'fournitures'
  | 'encaissements_clients'

export interface Mouvement {
  id: string
  date: DateISO
  /** Positif pour une entrée, négatif pour une dépense. */
  montant: number
  categorie: Categorie
  /** Fournisseur ou client. */
  tiers: string
  recurrent: boolean
}

/** Ligne du relevé bancaire, telle que la banque l'écrit. */
export interface LigneReleve {
  id: string
  date: DateISO
  libelle: string
  /** Positif pour une entrée, négatif pour une dépense. */
  montant: number
}

export interface Facture {
  id: string
  client: string
  montant: number
  echeance: DateISO
}

// ─── Jeu de données complet d'une entité ─────────────────────────────────────

export interface JeuDeDonnees {
  entite: Entite
  clients: Client[]
  agents: Agent[]
  interventions: Intervention[]
  /** Dernier planning envoyé aux agents (pour savoir ce qui a changé depuis). */
  interventionsEnvoyees: Intervention[]
  /** Messages déjà envoyés aux clients. */
  messagesEnvoyes: MessageEnvoye[]
  /** Compteur de démonstration : heures de planification économisées par mois (modifiable). */
  heuresEconomiseesMois: number
  /** Solde bancaire juste avant le premier mouvement de l'historique. */
  soldeInitial: number
  mouvements: Mouvement[]
  factures: Facture[]
  /** Seuil de sécurité du compte : la prévision prévient si le solde passe en dessous. */
  seuilSecurite: number
  /** Relevé bancaire du jour, pas encore importé (simulé : viendra de la banque via Sellsy). */
  releveDuJour: LigneReleve[]
  /** Décisions de l'utilisateur sur les récurrents détectés, par clé (fournisseur + sens). */
  decisionsRecurrents: Record<string, { statut: 'confirme' | 'ecarte'; montant?: number; jour?: number }>
}
