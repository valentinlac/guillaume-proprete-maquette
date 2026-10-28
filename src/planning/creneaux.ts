/**
 * « Trouver un créneau » : propose les meilleurs créneaux pour un passage, en
 * regardant tous les agents à la fois.
 *
 * Pour chaque jour travaillé de la période et chaque agent, on essaie d'insérer
 * le passage à chaque position de la tournée existante et on garde la position
 * qui ajoute le moins de route, à condition de respecter le maximum d'heures.
 * Les propositions sont classées par un score (en « minutes équivalentes ») :
 * détour ajouté, pénalité pour ouvrir une journée vide, préférence pour les
 * dates proches, éloignement d'un autre passage du même client.
 *
 * L'outil ne décide jamais seul : `trouverCreneaux` ne modifie rien,
 * `appliquerCreneau` n'est appelé qu'avec la proposition choisie par l'utilisateur.
 */
import type { Agent, Client, DateISO, Intervention, Point } from '../donnees/types'
import { distanceVolOiseauKm, serviceTrajet } from '../trajets/tempsTrajet'
import type { ServiceTrajet } from '../trajets/tempsTrajet'
import { ajouterJours, annee, dernierDuMois, ecartJours, formatDate, mois, nomMois, premierDuMois } from '../utils/dates'
import { formatDuree, formatHeure } from '../utils/format'
import { joursTravaillesEntre } from './calendrierTravail'
import { calculerJournee, capaciteMin } from './journee'
import type { Fenetre } from './passages'

export interface ContexteCreneaux {
  depot: Point
  clients: Client[]
  agents: Agent[]
  interventions: Intervention[]
  dateDuJour: DateISO
}

export interface DemandeCreneau {
  clientId: string
  /** Période de recherche (seuls les jours après la date du jour sont proposés). */
  fenetre: Fenetre
  /** Intervention existante à déplacer (elle est ignorée dans le planning actuel). */
  interventionId?: string
  /** Jours à ne pas proposer (ex. le jour annulé pour la pluie). */
  joursExclus?: DateISO[]
  /** Identifiant à donner au nouveau passage (sinon, il est généré). */
  idNouvelle?: string
  /**
   * Agent habituel du client. Par défaut : l'agent du passage à déplacer, sinon
   * celui qui fait le plus souvent ce client.
   */
  agentHabituelId?: string
}

export interface Proposition {
  date: DateISO
  agentId: string
  /** Position d'insertion dans la tournée (0 = premier passage). */
  position: number
  debutMin: number
  finMin: number
  /** Route depuis l'étape précédente. */
  routeAvantMin: number
  /** Nom du client précédent, ou null si départ du dépôt. */
  precedent: string | null
  /** Route ajoutée à la journée de l'agent. */
  detourMin: number
  /** Durée totale de la journée après ajout (route comprise) et maximum de l'agent. */
  chargeApresMin: number
  capaciteMin: number
  journeeVide: boolean
  /** Client le plus proche dans la tournée de ce jour. */
  voisin: { nom: string; km: number } | null
  score: number
  /** Raison principale, affichée en premier. */
  raison: string
  /** Détails complémentaires. */
  details: string[]
  /** Si l'agent n'est pas l'agent habituel du client : qui remplace qui, et pourquoi. */
  changementAgent?: string
}

export interface OptionsCreneaux {
  nombre?: number
  service?: ServiceTrajet
}

/** Pénalités du score, en minutes équivalentes. */
export const PENALITES = {
  /** Poids du temps de route depuis le chantier précédent (proximité). */
  routeDepuisPrecedent: 0.25,
  journeeVide: 15,
  parJourDAttente: 1,
  /** Passage repoussé au-delà du mois du début de la période. */
  moisSuivant: 10,
  /**
   * Tournée rejointe sans aucun client à moins de RAYON_SECTEUR_KM (hors secteur).
   * Un client proche du dépôt est sur le chemin de toutes les tournées : jamais hors secteur.
   */
  horsSecteur: 15,
  /** Par jour en dessous de 7 jours d'écart avec un autre passage du même client. */
  procheAutrePassage: 5,
  /**
   * Passage confié à un autre agent que l'agent habituel du client : chaque agent
   * garde ses clients et son secteur, sauf vrai gain ou manque de place.
   */
  autreAgent: 45,
}

/** Distance en dessous de laquelle deux clients sont considérés dans le même secteur. */
export const RAYON_SECTEUR_KM = 10

/** En dessous de cet écart (jours) avec un autre passage du même client, le jour est exclu. */
export const ECART_MIN_STRICT_JOURS = 3

const ACTIFS: Intervention['statut'][] = ['planifiee', 'replanifiee', 'terminee']

function estActive(i: Intervention): boolean {
  return ACTIFS.includes(i.statut)
}

/** Interventions actives d'un agent un jour donné, dans l'ordre de passage. */
export function tourneeDuJour(interventions: Intervention[], date: DateISO, agentId: string, sauf?: string): Intervention[] {
  return interventions
    .filter((i) => i.date === date && i.agentId === agentId && estActive(i) && i.id !== sauf)
    .sort((a, b) => a.ordre - b.ordre)
}

/**
 * Évalue le placement d'un client à une position donnée de la tournée d'un
 * agent (tournée sans ce client). Renvoie null si la journée déborde.
 */
function evaluerPlacement(
  depot: Point,
  client: Client,
  agent: Agent,
  date: DateISO,
  clientsTournee: Client[],
  position: number,
  premierJour: DateISO,
  ecartAutre: number,
  service: ServiceTrajet,
  agentHabituelId?: string,
): Proposition | null {
  const capacite = capaciteMin(agent)
  const journee = calculerJournee(
    depot,
    [...clientsTournee.slice(0, position), client, ...clientsTournee.slice(position)],
    service,
  )
  if (journee.totalMin > capacite) return null
  const avant = calculerJournee(depot, clientsTournee, service)

  const etape = journee.etapes[position]
  const detourMin = journee.routeTotaleMin - avant.routeTotaleMin
  const journeeVide = clientsTournee.length === 0
  const precedent = position > 0 ? clientsTournee[position - 1].nom : null
  const voisin = clientsTournee.length
    ? clientsTournee.map((c) => ({ nom: c.nom, km: distanceVolOiseauKm(c, client) })).sort((a, b) => a.km - b.km)[0]
    : null

  const score =
    detourMin +
    PENALITES.routeDepuisPrecedent * etape.routeMin +
    (journeeVide ? PENALITES.journeeVide : 0) +
    (voisin && voisin.km > RAYON_SECTEUR_KM && distanceVolOiseauKm(depot, client) > RAYON_SECTEUR_KM ? PENALITES.horsSecteur : 0) +
    (date.slice(0, 7) > premierJour.slice(0, 7) ? PENALITES.moisSuivant : 0) +
    PENALITES.parJourDAttente * ecartJours(premierJour, date) +
    PENALITES.procheAutrePassage * Math.max(0, 7 - ecartAutre) +
    (agentHabituelId && agent.id !== agentHabituelId ? PENALITES.autreAgent : 0)

  const raison = journeeVide
    ? `Journée libre, ${etape.routeMin} min depuis le dépôt`
    : precedent
      ? `${etape.routeMin} min de route depuis ${precedent}`
      : `Début de tournée, ${etape.routeMin} min depuis le dépôt`

  const details = [
    `Fin de journée vers ${formatHeure(horlogeFin(journee))}, ${formatDuree(journee.totalMin)} sur ${formatDuree(capacite)} maximum`,
  ]
  if (!journeeVide) details.push(`Détour ajouté à la tournée : ${detourMin <= 0 ? 'aucun' : `+${detourMin} min`}`)
  if (voisin && voisin.km < 5) details.push(`Même secteur : à ${voisin.km.toFixed(1).replace('.', ',')} km de ${voisin.nom}`)
  if (ecartAutre < 7) details.push(`Attention : autre passage de ce client à ${ecartAutre} jour${ecartAutre > 1 ? 's' : ''} d’écart`)

  return {
    date,
    agentId: agent.id,
    position,
    debutMin: etape.debutMin,
    finMin: etape.finMin,
    routeAvantMin: etape.routeMin,
    precedent,
    detourMin,
    chargeApresMin: journee.totalMin,
    capaciteMin: capacite,
    journeeVide,
    voisin,
    score,
    raison,
    details,
  }
}

/** Écart en jours avec le passage le plus proche du même client (Infinity s'il n'y en a pas). */
function ecartAvecAutresPassages(autresDates: DateISO[], date: DateISO): number {
  return autresDates.length ? Math.min(...autresDates.map((d) => Math.abs(ecartJours(d, date)))) : Infinity
}

export function trouverCreneaux(
  ctx: ContexteCreneaux,
  demande: DemandeCreneau,
  options: OptionsCreneaux = {},
): Proposition[] {
  const service = options.service ?? serviceTrajet()
  const nombre = options.nombre ?? 3
  const clientsParId = new Map(ctx.clients.map((c) => [c.id, c]))
  const client = clientsParId.get(demande.clientId)
  if (!client) throw new Error(`Client inconnu : ${demande.clientId}`)

  const debut = demande.fenetre.debut > ctx.dateDuJour ? demande.fenetre.debut : ctx.dateDuJour
  const jours = joursTravaillesEntre(debut, demande.fenetre.fin).filter(
    (d) => d > ctx.dateDuJour && !(demande.joursExclus ?? []).includes(d),
  )
  const autresPassages = ctx.interventions
    .filter((i) => i.clientId === client.id && i.id !== demande.interventionId && estActive(i))
    .map((i) => i.date)
  const habituel = agentHabituel(ctx.interventions, demande)

  const propositions: Proposition[] = []
  for (const date of jours) {
    // Jamais deux passages du même client trop rapprochés (ni le même jour).
    const ecartAutre = ecartAvecAutresPassages(autresPassages, date)
    if (ecartAutre < ECART_MIN_STRICT_JOURS) continue

    for (const agent of ctx.agents) {
      const clientsTournee = tourneeDuJour(ctx.interventions, date, agent.id, demande.interventionId).map(
        (i) => clientsParId.get(i.clientId)!,
      )
      // Meilleure position dans la tournée : celle qui ajoute le moins de route.
      let meilleure: Proposition | null = null
      for (let position = 0; position <= clientsTournee.length; position++) {
        const p = evaluerPlacement(ctx.depot, client, agent, date, clientsTournee, position, jours[0], ecartAutre, service, habituel)
        if (p && (!meilleure || p.detourMin < meilleure.detourMin)) meilleure = p
      }
      if (meilleure) propositions.push(meilleure)
    }
  }

  propositions.sort((a, b) => a.score - b.score || a.date.localeCompare(b.date) || a.agentId.localeCompare(b.agentId))

  // Toujours montrer la meilleure option de chaque agent : l'utilisateur voit
  // que les deux agendas ont été comparés.
  const retenues = propositions.slice(0, nombre)
  for (const agent of ctx.agents) {
    if (retenues.some((p) => p.agentId === agent.id)) continue
    const meilleure = propositions.find((p) => p.agentId === agent.id)
    if (!meilleure || retenues.length < nombre) {
      if (meilleure) retenues.push(meilleure)
      continue
    }
    // Remplace la dernière proposition d'un agent déjà représenté plusieurs fois.
    for (let k = retenues.length - 1; k >= 0; k--) {
      if (retenues.filter((p) => p.agentId === retenues[k].agentId).length > 1) {
        retenues[k] = meilleure
        break
      }
    }
  }
  const duHabituel = propositions.filter((p) => p.agentId === habituel)
  return retenues
    .map((p) => (habituel && p.agentId !== habituel ? { ...p, changementAgent: expliquerChangement(p, habituel, duHabituel, ctx.agents) } : p))
    .sort((a, b) => a.score - b.score || a.date.localeCompare(b.date))
}

/** Agent habituel du client : celui de la demande, du passage à déplacer, ou le plus fréquent. */
export function agentHabituel(interventions: Intervention[], demande: DemandeCreneau): string | undefined {
  if (demande.agentHabituelId) return demande.agentHabituelId
  const existante = demande.interventionId ? interventions.find((i) => i.id === demande.interventionId) : undefined
  if (existante) return existante.agentId
  const compte = new Map<string, number>()
  for (const i of interventions) if (i.clientId === demande.clientId) compte.set(i.agentId, (compte.get(i.agentId) ?? 0) + 1)
  return [...compte].sort((a, b) => b[1] - a[1])[0]?.[0]
}

const prenom = (agents: Agent[], id: string) => (agents.find((a) => a.id === id)?.nom ?? id).split(' ')[0]

/**
 * « Julien remplace Sofiane, son agent habituel : … ». `duHabituel` : les
 * créneaux possibles de l'agent habituel, du meilleur au moins bon.
 */
function expliquerChangement(p: Proposition, habituelId: string, duHabituel: Proposition[], agents: Agent[]): string {
  const debut = `${prenom(agents, p.agentId)} remplace ${prenom(agents, habituelId)}, l’agent habituel de ce client`
  const h = prenom(agents, habituelId)
  if (!duHabituel.length) return `${debut} : ${h} n’a plus de place sur la période`
  // On compare au meilleur créneau de l'agent habituel qui ne soit pas plus tard.
  const comparable = duHabituel.find((q) => q.date <= p.date)
  if (!comparable) {
    const plusTot = duHabituel.reduce((a, b) => (b.date < a.date ? b : a))
    return `${debut} : ${h} n’a pas de place avant le ${formatDate(plusTot.date)}`
  }
  const gain = Math.round(comparable.detourMin + PENALITES.routeDepuisPrecedent * comparable.routeAvantMin - p.detourMin - PENALITES.routeDepuisPrecedent * p.routeAvantMin)
  return gain > 0
    ? `${debut} : environ ${gain} min de route en moins qu’avec ${h} (${formatDate(comparable.date)})`
    : `${debut} : pas plus avantageux que le créneau de ${h} du ${formatDate(comparable.date)}`
}

/** Heure de retour au dépôt. */
function horlogeFin(journee: ReturnType<typeof calculerJournee>): number {
  const derniere = journee.etapes[journee.etapes.length - 1]
  return derniere ? derniere.finMin + journee.retourDepotMin : 0
}

/**
 * Applique la proposition choisie par l'utilisateur : place (ou déplace) le
 * passage et recalcule l'ordre et les heures de la journée concernée.
 */
export function appliquerCreneau(
  ctx: ContexteCreneaux,
  demande: DemandeCreneau,
  proposition: Proposition,
  options: Pick<OptionsCreneaux, 'service'> = {},
): Intervention[] {
  const service = options.service ?? serviceTrajet()
  const clientsParId = new Map(ctx.clients.map((c) => [c.id, c]))
  const existante = demande.interventionId ? ctx.interventions.find((i) => i.id === demande.interventionId) : undefined

  const deplacee: Intervention = existante
    ? {
        ...existante,
        date: proposition.date,
        agentId: proposition.agentId,
        statut: 'replanifiee',
        dateOrigine: existante.dateOrigine ?? existante.date,
        motif: existante.statut === 'annulee_meteo' ? 'meteo' : (existante.motif ?? 'deplacement'),
      }
    : {
        id: demande.idNouvelle ?? `${demande.clientId}-ajout-${proposition.date}`,
        clientId: demande.clientId,
        date: proposition.date,
        agentId: proposition.agentId,
        ordre: 0,
        debutMin: 0,
        statut: 'planifiee',
      }

  const tournee = tourneeDuJour(ctx.interventions, proposition.date, proposition.agentId, demande.interventionId)
  tournee.splice(proposition.position, 0, deplacee)
  const journee = calculerJournee(ctx.depot, tournee.map((i) => clientsParId.get(i.clientId)!), service)
  const misesAJour = new Map(
    tournee.map((i, k) => [i.id, { ...i, ordre: k + 1, debutMin: journee.etapes[k].debutMin }]),
  )

  let resultat = ctx.interventions.map((i) => misesAJour.get(i.id) ?? i)
  if (!existante) resultat.push(misesAJour.get(deplacee.id)!)
  // La journée que le passage quitte est renumérotée et ses heures recalculées.
  if (existante && estActive(existante)) resultat = recalerJournee(ctx, resultat, existante.date, existante.agentId, service)
  return resultat
}

/** Renumérote une journée et recalcule ses heures (après le départ ou l'arrivée d'un passage). */
export function recalerJournee(
  ctx: Pick<ContexteCreneaux, 'depot' | 'clients'>,
  interventions: Intervention[],
  date: DateISO,
  agentId: string,
  service: ServiceTrajet = serviceTrajet(),
): Intervention[] {
  const clientsParId = new Map(ctx.clients.map((c) => [c.id, c]))
  const tournee = tourneeDuJour(interventions, date, agentId)
  const journee = calculerJournee(ctx.depot, tournee.map((i) => clientsParId.get(i.clientId)!), service)
  const misesAJour = new Map(tournee.map((i, k) => [i.id, { ...i, ordre: k + 1, debutMin: journee.etapes[k].debutMin }]))
  return interventions.map((i) => misesAJour.get(i.id) ?? i)
}

export interface Replacement {
  demande: DemandeCreneau
  /** Les meilleures propositions au moment où ce passage est traité. */
  propositions: Proposition[]
  /** Proposition retenue par défaut (la première), modifiable par l'utilisateur. */
  retenue: Proposition | null
}

/**
 * Replace plusieurs passages à la suite (après une annulation météo) : chaque
 * passage reçoit sa meilleure proposition en tenant compte des précédents.
 * Renvoie une suggestion complète que l'utilisateur valide ou ajuste avant
 * confirmation : le planning d'origine n'est pas modifié.
 */
export function replacerEnSerie(
  ctx: ContexteCreneaux,
  demandes: DemandeCreneau[],
  options: OptionsCreneaux = {},
): { replacements: Replacement[]; interventions: Intervention[] } {
  const clientsParId = new Map(ctx.clients.map((c) => [c.id, c]))
  // Les passages les plus longs d'abord : ce sont les plus difficiles à caser.
  const ordre = [...demandes].sort(
    (a, b) => clientsParId.get(b.clientId)!.dureeMin - clientsParId.get(a.clientId)!.dureeMin || a.clientId.localeCompare(b.clientId),
  )
  let interventions = ctx.interventions
  const replacements: Replacement[] = []
  for (const demande of ordre) {
    const propositions = trouverCreneaux({ ...ctx, interventions }, demande, options)
    const retenue = propositions[0] ?? null
    if (retenue) interventions = appliquerCreneau({ ...ctx, interventions }, demande, retenue, options)
    replacements.push({ demande, propositions, retenue })
  }

  // Un passage placé tôt n'a pas vu ceux placés après lui : une journée encore
  // vide à ce moment-là a pu devenir une tournée où il serait mieux. On revoit
  // chaque passage déplacé dans le planning complet (quelques tours au plus),
  // pour que le créneau retenu soit bien le premier de la liste « Changer ».
  for (let tour = 0; tour < 3; tour++) {
    let ameliore = false
    for (const r of replacements) {
      const id = r.demande.interventionId
      const placee = id ? interventions.find((i) => i.id === id) : undefined
      if (!r.retenue || !placee || !estActive(placee)) continue
      const toutes = trouverCreneaux({ ...ctx, interventions }, r.demande, { ...options, nombre: 1000 })
      const actuelle = toutes.find((p) => p.date === placee.date && p.agentId === placee.agentId)
      const meilleure = toutes[0]
      if (!actuelle || !meilleure || meilleure === actuelle || meilleure.score >= actuelle.score - 0.5) continue
      interventions = appliquerCreneau({ ...ctx, interventions }, r.demande, meilleure, options)
      r.retenue = meilleure
      r.propositions = trouverCreneaux({ ...ctx, interventions }, r.demande, options)
      ameliore = true
    }
    if (!ameliore) break
  }

  // Les passages insérés ensuite ont pu changer la journée (heures, passage
  // précédent, journée plus « libre ») : on redécrit chaque placement retenu
  // dans le planning final, pour que l'explication affichée reste exacte.
  for (const r of replacements) {
    const id = r.demande.interventionId ?? r.demande.idNouvelle
    if (!r.retenue || !id) continue
    const redecrite = decrirePlacement({ ...ctx, interventions }, id, r.demande.fenetre.debut, options)
    if (redecrite) r.retenue = { ...redecrite, score: r.retenue.score, changementAgent: r.retenue.changementAgent }
  }
  return { replacements, interventions }
}

/**
 * Décrit un passage déjà placé (raison, heures, détour…) comme s'il venait
 * d'être proposé, dans le planning tel qu'il est. Null si le passage n'est pas actif.
 */
export function decrirePlacement(
  ctx: ContexteCreneaux,
  interventionId: string,
  premierJour: DateISO,
  options: Pick<OptionsCreneaux, 'service'> = {},
): Proposition | null {
  const service = options.service ?? serviceTrajet()
  const clientsParId = new Map(ctx.clients.map((c) => [c.id, c]))
  const placee = ctx.interventions.find((i) => i.id === interventionId)
  if (!placee || !estActive(placee)) return null
  const client = clientsParId.get(placee.clientId)!
  const agent = ctx.agents.find((a) => a.id === placee.agentId)!
  const autres = ctx.interventions.filter((i) => i.clientId === client.id && i.id !== interventionId && estActive(i)).map((i) => i.date)
  const tournee = tourneeDuJour(ctx.interventions, placee.date, placee.agentId, interventionId).map((i) => clientsParId.get(i.clientId)!)
  return evaluerPlacement(
    ctx.depot, client, agent, placee.date, tournee, placee.ordre - 1,
    premierJour, ecartAvecAutresPassages(autres, placee.date), service,
  )
}

/** Texte court d'une proposition, ex. « jeu. 05/11/2026 · 10:15 · Julien M. ». */
export function resumeProposition(p: Proposition, agents: Agent[]): string {
  const agent = agents.find((a) => a.id === p.agentId)
  return `${formatDate(p.date)} · ${formatHeure(p.debutMin)} · ${agent?.nom ?? p.agentId}`
}

export interface PeriodeRecherche {
  id: 'semaine' | 'mois' | 'suivant' | 'tout'
  libelle: string
  fenetre: Fenetre
}

/** Périodes de recherche proposées à l'utilisateur (toutes commencent après aujourd'hui). */
export function periodesDeRecherche(dateDuJour: DateISO): PeriodeRecherche[] {
  const demain = ajouterJours(dateDuJour, 1)
  const debutSuivant = premierDuMois(annee(dateDuJour), mois(dateDuJour) + 1)
  const finMois = dernierDuMois(annee(dateDuJour), mois(dateDuJour))
  const finSuivant = dernierDuMois(annee(debutSuivant), mois(debutSuivant))
  return [
    { id: 'tout', libelle: `Dès demain, jusqu’au ${formatDate(finSuivant)}`, fenetre: { debut: demain, fin: finSuivant } },
    { id: 'semaine', libelle: 'Dans les 7 jours', fenetre: { debut: demain, fin: ajouterJours(dateDuJour, 7) } },
    { id: 'mois', libelle: `D’ici la fin du mois (${formatDate(finMois)})`, fenetre: { debut: demain, fin: finMois } },
    { id: 'suivant', libelle: `Le mois prochain (${nomMois(annee(debutSuivant), mois(debutSuivant))})`, fenetre: { debut: debutSuivant, fin: finSuivant } },
  ]
}
