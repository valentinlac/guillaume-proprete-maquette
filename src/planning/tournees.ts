/**
 * Construction des tournées du mois, en deux temps :
 *
 * 1. Regroupement par proximité : on part du client le plus éloigné du dépôt
 *    encore non placé, puis on ajoute le passage le plus proche de la tournée
 *    (dans un rayon donné) tant que la journée tient dans le maximum d'heures.
 * 2. Répartition : chaque tournée reçoit un jour travaillé de sa période et un
 *    agent libre, en étalant les tournées sur le mois, en équilibrant la charge
 *    et en gardant chaque agent sur les mêmes secteurs.
 *
 * Algorithme volontairement simple, suffisant pour la démonstration.
 */
import type { Agent, Client, DateISO, Intervention, Point } from '../donnees/types'
import { distanceVolOiseauKm, serviceTrajet } from '../trajets/tempsTrajet'
import type { ServiceTrajet } from '../trajets/tempsTrajet'
import { annee as anneeDe, ecartJours, mois as moisDe, premierDuMois } from '../utils/dates'
import { joursTravaillesDuMois, joursTravaillesEntre, prochainJourTravaille } from './calendrierTravail'
import { calculerJournee, capaciteMin, ordonnerTournee } from './journee'
import type { Journee } from './journee'
import { passagesDuMois } from './passages'
import type { Fenetre, PassageAPlacer } from './passages'

export interface OptionsTournees {
  service?: ServiceTrajet
  /** Distance maximale (km) entre un passage et la tournée qu'il rejoint. */
  rayonRegroupementKm?: number
  /** Écart minimal en jours entre deux passages d'un même client. */
  ecartMinJours?: number
  /** Jours à garnir en priorité pour chaque agent (ex. le lendemain, pour la démo météo). */
  joursAGarnir?: DateISO[]
  /** Interventions déjà fixées : leurs journées sont occupées et comptent pour l'écart entre passages. */
  dejaPlanifiees?: Intervention[]
  /** Aucun jour avant cette date ne sera utilisé. */
  premierJour?: DateISO
}

export const RAYON_REGROUPEMENT_KM = 10
export const ECART_MIN_JOURS = 7
/** Au-delà de cet écart entre deux tournées, on ne cherche plus à espacer davantage. */
const ETALEMENT_MAX_JOURS = 10

export interface Tournee {
  id: string
  passages: PassageAPlacer[]
  fenetre: Fenetre
  journee: Journee
  centre: Point
}

export interface TourneePlacee extends Tournee {
  date: DateISO
  agentId: string
}

export interface ResultatTournees {
  tournees: TourneePlacee[]
  interventions: Intervention[]
  /** Passages qu'aucun jour ni agent n'a pu accueillir (doit rester vide). */
  nonPlaces: PassageAPlacer[]
}

interface ContexteTournees {
  depot: Point
  clients: Client[]
  agents: Agent[]
}

function intersection(a: Fenetre, b: Fenetre): Fenetre | null {
  const debut = a.debut > b.debut ? a.debut : b.debut
  const fin = a.fin < b.fin ? a.fin : b.fin
  return joursTravaillesEntre(debut, fin).length ? { debut, fin } : null
}

function centreDe(points: Point[]): Point {
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
  }
}

// ─── 1. Regroupement par proximité ──────────────────────────────────────────

export function regrouperEnTournees(
  passages: PassageAPlacer[],
  ctx: ContexteTournees,
  options: OptionsTournees = {},
): Tournee[] {
  const service = options.service ?? serviceTrajet()
  const rayon = options.rayonRegroupementKm ?? RAYON_REGROUPEMENT_KM
  // Une tournée doit pouvoir être confiée à n'importe quel agent.
  const capacite = Math.min(...ctx.agents.map(capaciteMin))
  const clientsParId = new Map(ctx.clients.map((c) => [c.id, c]))
  const client = (p: PassageAPlacer) => clientsParId.get(p.clientId)!

  const restants = [...passages].sort((a, b) => a.id.localeCompare(b.id))
  const tournees: Tournee[] = []

  while (restants.length) {
    // Graine : le passage le plus éloigné du dépôt.
    let iGraine = 0
    for (let i = 1; i < restants.length; i++) {
      if (distanceVolOiseauKm(ctx.depot, client(restants[i])) > distanceVolOiseauKm(ctx.depot, client(restants[iGraine]))) iGraine = i
    }
    let membres = [restants.splice(iGraine, 1)[0]]
    let fenetre = membres[0].fenetre
    let journee = calculerJournee(ctx.depot, membres.map(client), service)
    const refuses = new Set<string>()

    for (;;) {
      let choix: { index: number; distance: number; fenetre: Fenetre } | null = null
      restants.forEach((p, index) => {
        if (refuses.has(p.id) || membres.some((m) => m.clientId === p.clientId)) return
        const commune = intersection(fenetre, p.fenetre)
        if (!commune) return
        const distance = Math.min(...membres.map((m) => distanceVolOiseauKm(client(m), client(p))))
        if (distance > rayon) return
        if (!choix || distance < choix.distance) choix = { index, distance, fenetre: commune }
      })
      if (!choix) break
      const { index, fenetre: commune } = choix as { index: number; fenetre: Fenetre }
      const candidat = restants[index]
      const essai = ordonnerTournee(
        ctx.depot,
        [...membres, candidat].map((p) => ({ id: p.id, lat: client(p).lat, lng: client(p).lng, passage: p })),
        service,
      ).map((e) => e.passage)
      const journeeEssai = calculerJournee(ctx.depot, essai.map(client), service)
      if (journeeEssai.totalMin <= capacite) {
        membres = essai
        fenetre = commune
        journee = journeeEssai
        restants.splice(index, 1)
      } else {
        refuses.add(candidat.id)
      }
    }

    tournees.push({
      id: '',
      passages: membres,
      fenetre,
      journee,
      centre: centreDe(membres.map(client)),
    })
  }

  // Fusion des petites tournées : tant que deux tournées voisines tiennent ensemble
  // dans une journée et que cela économise de la route, on les réunit (la plus
  // grosse économie d'abord). Évite les allers-retours au dépôt pour 1 passage.
  for (;;) {
    let fusion: { i: number; j: number; tournee: Tournee; gain: number } | null = null
    for (let i = 0; i < tournees.length; i++) {
      for (let j = i + 1; j < tournees.length; j++) {
        const a = tournees[i]
        const b = tournees[j]
        if (a.journee.totalMin + b.journee.travailMin > capacite) continue
        if (a.passages.some((p) => b.passages.some((q) => q.clientId === p.clientId))) continue
        // Uniquement des tournées voisines, pour garder des secteurs lisibles.
        const ecartKm = Math.min(
          ...a.passages.flatMap((p) => b.passages.map((q) => distanceVolOiseauKm(client(p), client(q)))),
        )
        if (ecartKm > rayon) continue
        const commune = intersection(a.fenetre, b.fenetre)
        if (!commune) continue
        const passagesReunis = ordonnerTournee(
          ctx.depot,
          [...a.passages, ...b.passages].map((p) => ({ id: p.id, lat: client(p).lat, lng: client(p).lng, passage: p })),
          service,
        ).map((e) => e.passage)
        const journeeReunie = calculerJournee(ctx.depot, passagesReunis.map(client), service)
        if (journeeReunie.totalMin > capacite) continue
        const gain = a.journee.routeTotaleMin + b.journee.routeTotaleMin - journeeReunie.routeTotaleMin
        if (gain <= 0 || (fusion && gain <= fusion.gain)) continue
        fusion = {
          i,
          j,
          gain,
          tournee: { id: '', passages: passagesReunis, fenetre: commune, journee: journeeReunie, centre: centreDe(passagesReunis.map(client)) },
        }
      }
    }
    if (!fusion) break
    tournees.splice(fusion.j, 1)
    tournees.splice(fusion.i, 1, fusion.tournee)
  }

  return tournees.map((t, k) => ({ ...t, id: `t${String(k + 1).padStart(2, '0')}` }))
}

// ─── 2. Répartition sur les jours et les agents ────────────────────────────

export function repartirTournees(
  tournees: Tournee[],
  ctx: ContexteTournees,
  jours: DateISO[],
  options: OptionsTournees = {},
): { placees: TourneePlacee[]; nonPlacees: Tournee[] } {
  const ecartMin = options.ecartMinJours ?? ECART_MIN_JOURS
  const occupes = new Set((options.dejaPlanifiees ?? []).map((i) => `${i.date}|${i.agentId}`))
  const datesClient = new Map<string, DateISO[]>()
  for (const i of options.dejaPlanifiees ?? []) {
    if (i.statut === 'annulee_meteo') continue
    datesClient.set(i.clientId, [...(datesClient.get(i.clientId) ?? []), i.date])
  }
  const toursParJour = new Map<DateISO, number>()
  const chargeAgent = new Map(ctx.agents.map((a) => [a.id, 0]))
  const centresAgent = new Map<string, Point[]>(ctx.agents.map((a) => [a.id, []]))
  const placees: TourneePlacee[] = []

  const possible = (t: Tournee, date: DateISO, agent: Agent) =>
    date >= t.fenetre.debut &&
    date <= t.fenetre.fin &&
    !occupes.has(`${date}|${agent.id}`) &&
    t.journee.totalMin <= capaciteMin(agent) &&
    t.passages.every((p) => (datesClient.get(p.clientId) ?? []).every((d) => Math.abs(ecartJours(d, date)) >= ecartMin))

  const placer = (t: Tournee, date: DateISO, agent: Agent) => {
    occupes.add(`${date}|${agent.id}`)
    toursParJour.set(date, (toursParJour.get(date) ?? 0) + 1)
    chargeAgent.set(agent.id, chargeAgent.get(agent.id)! + t.journee.totalMin)
    centresAgent.get(agent.id)!.push(t.centre)
    for (const p of t.passages) datesClient.set(p.clientId, [...(datesClient.get(p.clientId) ?? []), date])
    placees.push({ ...t, date, agentId: agent.id })
  }

  // Les tournées les plus contraintes (période courte, journée longue) d'abord.
  const aPlacer = [...tournees].sort(
    (a, b) =>
      joursTravaillesEntre(a.fenetre.debut, a.fenetre.fin).length - joursTravaillesEntre(b.fenetre.debut, b.fenetre.fin).length ||
      b.journee.totalMin - a.journee.totalMin ||
      a.id.localeCompare(b.id),
  )

  // Jours à garnir en priorité : une tournée par agent.
  for (const jour of options.joursAGarnir ?? []) {
    if (!jours.includes(jour)) continue
    for (const agent of ctx.agents) {
      const t = aPlacer.find((x) => possible(x, jour, agent))
      if (!t) continue
      placer(t, jour, agent)
      aPlacer.splice(aPlacer.indexOf(t), 1)
    }
  }

  const nonPlacees: Tournee[] = []
  for (const t of aPlacer) {
    let meilleur: { date: DateISO; agent: Agent; score: number } | null = null
    for (const date of jours) {
      for (const agent of ctx.agents) {
        if (!possible(t, date, agent)) continue
        const autres = ctx.agents.filter((a) => a.id !== agent.id)
        const chargeMoyenneAutres = autres.length
          ? autres.reduce((s, a) => s + chargeAgent.get(a.id)!, 0) / autres.length
          : 0
        const centres = centresAgent.get(agent.id)!
        const affiniteKm = centres.length ? distanceVolOiseauKm(centreDe(centres), t.centre) : 0
        const ecartAutresTournees = placees.length
          ? Math.min(...placees.map((x) => Math.abs(ecartJours(x.date, date))))
          : ETALEMENT_MAX_JOURS
        const score =
          100 * (toursParJour.get(date) ?? 0) + // une tournée par jour avant d'en mettre deux
          -8 * Math.min(ecartAutresTournees, ETALEMENT_MAX_JOURS) + // étaler sur le mois
          2 * affiniteKm + // même agent, même secteur
          ((chargeAgent.get(agent.id)! - chargeMoyenneAutres) / 60) * 5 // équilibrer la charge
        if (!meilleur || score < meilleur.score - 1e-9) meilleur = { date, agent, score }
      }
    }
    if (meilleur) placer(t, meilleur.date, meilleur.agent)
    else nonPlacees.push(t)
  }
  return { placees, nonPlacees }
}

// ─── Assemblage ─────────────────────────────────────────────────────────────

export function tourneesEnInterventions(tournees: TourneePlacee[], dateDuJour: DateISO): Intervention[] {
  return tournees
    .flatMap((t) =>
      t.journee.etapes.map((e, i) => ({
        id: t.passages[i].id,
        clientId: e.clientId,
        date: t.date,
        agentId: t.agentId,
        ordre: i + 1,
        debutMin: e.debutMin,
        statut: (t.date < dateDuJour ? 'terminee' : 'planifiee') as Intervention['statut'],
      })),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.agentId.localeCompare(b.agentId) || a.ordre - b.ordre)
}

/** Planifie un mois complet. */
export function planifierMois(
  ctx: ContexteTournees,
  annee: number,
  mois: number,
  dateDuJour: DateISO,
  options: OptionsTournees = {},
): ResultatTournees {
  const premierJour = options.premierJour
  const passages = passagesDuMois(ctx.clients, annee, mois)
  const tournees = regrouperEnTournees(passages, ctx, options)
  const jours = joursTravaillesDuMois(annee, mois).filter((d) => !premierJour || d >= premierJour)
  const { placees, nonPlacees } = repartirTournees(tournees, ctx, jours, options)
  return {
    tournees: placees,
    interventions: tourneesEnInterventions(placees, dateDuJour),
    nonPlaces: nonPlacees.flatMap((t) => t.passages),
  }
}

/**
 * Planning de départ de la démo : mois en cours et mois suivant, tournées déjà
 * regroupées, et le lendemain garni pour les deux agents (scénario météo).
 */
export function planningInitial(ctx: ContexteTournees, dateDuJour: DateISO, options: OptionsTournees = {}): ResultatTournees {
  const joursAGarnir = options.joursAGarnir ?? [prochainJourTravaille(dateDuJour)]
  const moisCourant = planifierMois(ctx, anneeDe(dateDuJour), moisDe(dateDuJour), dateDuJour, { ...options, joursAGarnir })
  const suivant = premierDuMois(anneeDe(dateDuJour), moisDe(dateDuJour) + 1)
  const moisSuivant = planifierMois(ctx, anneeDe(suivant), moisDe(suivant), dateDuJour, {
    ...options,
    joursAGarnir,
    dejaPlanifiees: [...(options.dejaPlanifiees ?? []), ...moisCourant.interventions],
  })
  return {
    tournees: [...moisCourant.tournees, ...moisSuivant.tournees],
    interventions: [...moisCourant.interventions, ...moisSuivant.interventions],
    nonPlaces: [...moisCourant.nonPlaces, ...moisSuivant.nonPlaces],
  }
}

