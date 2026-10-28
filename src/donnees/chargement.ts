/**
 * Transforme le fichier de données fictives en jeux de données prêts à l'emploi.
 *
 * C'est ici que l'on branchera plus tard Sellsy ou une vraie base : il suffira
 * de produire les mêmes `JeuDeDonnees` depuis une autre source.
 */
import { planningInitial } from '../planning/tournees'
import { detecterRecurrents, marquerRecurrents, recurrentsAvecDecisions } from '../tresorerie/recurrents'
import { ajouterJours, annee, jourSemaine, mois, premierDuMois, versDate, versISO } from '../utils/dates'
import type { DateISO } from '../utils/dates'
import { DATE_DU_JOUR, ENTITES } from './donnees-fictives'
import { creerHasard, hacher } from './hasard'
import type { Hasard } from './hasard'
import type { Agent, Categorie, Client, Entite, Facture, Frequence, JeuDeDonnees, Mouvement } from './types'

// ─── Format du fichier de données ────────────────────────────────────────────

export interface SourceClient {
  id: string
  nom: string
  adresse: string
  ville: string
  lat: number
  lng: number
  tarif: number
  frequence: Frequence
  dureeMin: number
  /** 12 caractères, « X » = dû */
  moisDus: string
  /** Nom de l'interlocuteur ; téléphone et e-mail fictifs sont générés. */
  contact: string
}

export interface SourceRecurrent {
  tiers: string
  categorie: Categorie
  /** Jour du mois (décalé au lundi suivant si week-end). */
  jour: number
  montant: number
  /** Variation aléatoire relative du montant (0,03 = ±3 %). */
  variation: number
}

export interface SourcePonctuel {
  tiers: string[]
  categorie: Categorie
  /** Nombre moyen par mois (peut être décimal). */
  parMois: number
  min: number
  max: number
}

export interface SourceTresorerie {
  debutHistorique: DateISO
  soldeInitial: number
  /**
   * Récurrents « tout juste détectés », à confirmer pendant la démo. Tous les
   * autres récurrents détectés sont considérés comme déjà confirmés.
   */
  recurrentsAConfirmer: string[]
  recurrents: SourceRecurrent[]
  ponctuels: SourcePonctuel[]
  factures: Omit<Facture, 'id'>[]
  seuilSecurite: number
  /** Relevé bancaire du jour (libellé tel que l'écrit la banque, montant signé). */
  releveDuJour: { libelle: string; montant: number }[]
}

export interface SourceEntite extends Entite {
  /** Valeur fictive affichée dans le compteur « heures économisées ». */
  heuresEconomiseesMois: number
  agents: Agent[]
  clients: SourceClient[]
  tresorerie: SourceTresorerie
}

// ─── Conversion ──────────────────────────────────────────────────────────────

export function lireMoisDus(texte: string): boolean[] {
  if (!/^[X.]{12}$/i.test(texte)) {
    throw new Error(`Mois dus invalides : « ${texte} » (12 caractères X ou . attendus)`)
  }
  return [...texte].map((c) => c.toUpperCase() === 'X')
}

function slug(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Numéro dans la tranche 06 39 98 réservée par l'ARCEP aux fictions : jamais celui d'un vrai abonné. */
function telephoneFictif(h: Hasard): string {
  const groupes = Array.from({ length: 2 }, () => String(h.entier(0, 99)).padStart(2, '0'))
  return `06 39 98 ${groupes.join(' ')}`
}

export function convertirClient(source: SourceClient): Client {
  const h = creerHasard(hacher(source.id + source.nom))
  return {
    id: source.id,
    nom: source.nom,
    adresse: source.adresse,
    ville: source.ville,
    lat: source.lat,
    lng: source.lng,
    tarif: source.tarif,
    frequence: source.frequence,
    dureeMin: source.dureeMin,
    moisDus: lireMoisDus(source.moisDus),
    contact: {
      nom: source.contact,
      telephone: telephoneFictif(h),
      email: `contact@${slug(source.nom).slice(0, 28)}.exemple.fr`,
    },
  }
}

// ─── Historique de trésorerie ────────────────────────────────────────────────

function signe(categorie: Categorie, montant: number): number {
  return categorie === 'encaissements_clients' ? montant : -montant
}

function arrondiCentimes(n: number): number {
  return Math.round(n * 100) / 100
}

/** Décale samedi et dimanche au lundi suivant (date de valeur bancaire). */
function jourOuvrableBancaire(iso: DateISO): DateISO {
  const j = jourSemaine(iso)
  return j === 6 ? ajouterJours(iso, 2) : j === 7 ? ajouterJours(iso, 1) : iso
}

/**
 * Génère l'historique des mouvements entre `debutHistorique` et la veille de
 * `dateDuJour`. Le tirage est déterministe : même entrée, même résultat.
 */
export function genererMouvements(
  entiteId: string,
  source: SourceTresorerie,
  dateDuJour: DateISO,
): Mouvement[] {
  const h = creerHasard(hacher(`tresorerie-${entiteId}`))
  const lignes: Omit<Mouvement, 'id'>[] = []

  let debutMois = source.debutHistorique
  while (debutMois < dateDuJour) {
    const a = annee(debutMois)
    const m = mois(debutMois)
    const nbJours = new Date(a, m + 1, 0).getDate()

    for (const r of source.recurrents) {
      const date = jourOuvrableBancaire(versISO(new Date(a, m, Math.min(r.jour, nbJours))))
      if (date >= dateDuJour) continue
      const montant = r.montant * (1 + (h.reel() * 2 - 1) * r.variation)
      lignes.push({
        date,
        montant: signe(r.categorie, arrondiCentimes(montant)),
        categorie: r.categorie,
        tiers: r.tiers,
        recurrent: false,
      })
    }

    for (const p of source.ponctuels) {
      const nb = Math.floor(p.parMois) + (h.reel() < p.parMois % 1 ? 1 : 0)
      for (let i = 0; i < nb; i++) {
        const date = jourOuvrableBancaire(versISO(new Date(a, m, h.entier(1, nbJours))))
        if (date >= dateDuJour) continue
        lignes.push({
          date,
          montant: signe(p.categorie, arrondiCentimes(p.min + h.reel() * (p.max - p.min))),
          categorie: p.categorie,
          tiers: h.choisir(p.tiers),
          recurrent: false,
        })
      }
    }

    debutMois = premierDuMois(a, m + 1)
  }

  return lignes
    .sort((x, y) => x.date.localeCompare(y.date) || x.tiers.localeCompare(y.tiers))
    .map((l, i) => ({ id: `${entiteId}-mv${String(i + 1).padStart(3, '0')}`, ...l }))
}

// ─── Point d'entrée ──────────────────────────────────────────────────────────

export function construireJeu(source: SourceEntite, dateDuJour: DateISO = DATE_DU_JOUR): JeuDeDonnees {
  const { agents, clients: sourcesClients, tresorerie, heuresEconomiseesMois, ...entite } = source
  const clients = sourcesClients.map(convertirClient)
  const agentsCopies = agents.map((a) => ({ ...a }))
  const interventions = planningInitial({ depot: entite.depot, clients, agents: agentsCopies }, dateDuJour).interventions
  const historique = genererMouvements(source.id, tresorerie, dateDuJour)
  const decisionsRecurrents = Object.fromEntries(
    detecterRecurrents(historique)
      .filter((r) => !tresorerie.recurrentsAConfirmer.includes(r.tiers))
      .map((r) => [r.cle, { statut: 'confirme' as const }]),
  )
  const mouvements = marquerRecurrents(historique, recurrentsAvecDecisions(historique, decisionsRecurrents))
  return {
    entite,
    agents: agentsCopies,
    clients,
    // Mois en cours et mois suivant, tournées déjà regroupées par secteur.
    interventions,
    interventionsEnvoyees: interventions,
    messagesEnvoyes: [],
    heuresEconomiseesMois,
    soldeInitial: tresorerie.soldeInitial,
    mouvements,
    decisionsRecurrents,
    factures: tresorerie.factures.map((f, i) => ({ id: `${source.id}-fa${String(i + 1).padStart(2, '0')}`, ...f })),
    seuilSecurite: tresorerie.seuilSecurite,
    releveDuJour: tresorerie.releveDuJour.map((l, i) => ({ id: `${source.id}-rel${i + 1}`, date: dateDuJour, ...l })),
  }
}

export function chargerJeux(dateDuJour: DateISO = DATE_DU_JOUR): Record<string, JeuDeDonnees> {
  return Object.fromEntries(ENTITES.map((e) => [e.id, construireJeu(e, dateDuJour)]))
}

/** Vérifie qu'une date existe (utile pour valider le fichier de données). */
export function dateValide(iso: DateISO): boolean {
  return versISO(versDate(iso)) === iso
}
