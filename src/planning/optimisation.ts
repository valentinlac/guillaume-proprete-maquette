/**
 * « Optimiser les tournées » sur un planning en cours, et planning « fait à la
 * main » de comparaison.
 *
 * Règles :
 * - le passé, aujourd'hui et demain ne bougent pas (la tournée de demain est
 *   déjà envoyée aux agents) ;
 * - seuls les passages planifiés ou replanifiés à venir sont regroupés ;
 * - un passage qui ne trouve pas de place garde sa date d'origine : aucun
 *   passage n'est jamais perdu.
 */
import type { Client, DateISO, Intervention, JeuDeDonnees } from '../donnees/types'
import { annee, dernierDuMois, ecartJours, mois, premierDuMois } from '../utils/dates'
import { joursTravaillesDuMois, joursTravaillesEntre, prochainJourTravaille } from './calendrierTravail'
import { calculerJournee, capaciteMin } from './journee'
import { passagesDuMois } from './passages'
import type { Fenetre, PassageAPlacer } from './passages'
import { regrouperEnTournees, repartirTournees, tourneesEnInterventions } from './tournees'
import { journeesActives, routeTotale } from './verifications'

type JeuPlanning = Pick<JeuDeDonnees, 'entite' | 'agents' | 'interventions'> & { clients: Client[] }

export interface ResultatOptimisation {
  interventions: Intervention[]
  premierJourModifiable: DateISO
  routeAvantMin: number
  routeApresMin: number
  tourneesAvant: number
  tourneesApres: number
  /** Passages dont le jour ou l'agent a changé. */
  deplaces: number
  /** Passages laissés à leur place faute de créneau. */
  inchanges: number
}

/** Premier jour que l'optimisation peut modifier : après-demain (jour travaillé). */
export function premierJourModifiable(dateDuJour: DateISO): DateISO {
  return prochainJourTravaille(prochainJourTravaille(dateDuJour))
}

function estDeplacable(i: Intervention, premier: DateISO): boolean {
  return i.date >= premier && (i.statut === 'planifiee' || i.statut === 'replanifiee')
}

/** Période dans laquelle un passage à venir peut être déplacé. */
function fenetreDe(i: Intervention, passages: Map<string, PassageAPlacer>, premier: DateISO): Fenetre {
  const p = passages.get(i.id)
  const finMois = dernierDuMois(annee(i.date), mois(i.date))
  const base = p ? p.fenetre : { debut: premierDuMois(annee(i.date), mois(i.date)), fin: finMois }
  const fenetre = { debut: base.debut > premier ? base.debut : premier, fin: base.fin }
  // Période d'origine déjà passée (ex. passage replanifié après la pluie) : reste dans son mois actuel.
  if (fenetre.debut > fenetre.fin || !joursTravaillesEntre(fenetre.debut, fenetre.fin).length) {
    const debutMois = premierDuMois(annee(i.date), mois(i.date))
    return { debut: debutMois > premier ? debutMois : premier, fin: finMois }
  }
  return fenetre
}

function passagesConnus(jeu: JeuPlanning, interventions: Intervention[]): Map<string, PassageAPlacer> {
  const moisVus = new Set(interventions.map((i) => i.id.match(/-(\d{4})-(\d{2})-\d$/)).filter(Boolean).map((m) => `${m![1]}-${m![2]}`))
  const resultat = new Map<string, PassageAPlacer>()
  for (const m of moisVus) {
    for (const p of passagesDuMois(jeu.clients, Number(m.slice(0, 4)), Number(m.slice(5)) - 1)) resultat.set(p.id, p)
  }
  return resultat
}

function compterTournees(interventions: Intervention[], depuis: DateISO): number {
  return [...journeesActives(interventions).keys()].filter((cle) => cle >= depuis).length
}

export function optimiserTournees(jeu: JeuPlanning, dateDuJour: DateISO): ResultatOptimisation {
  const premier = premierJourModifiable(dateDuJour)
  const ctx = { depot: jeu.entite.depot, clients: jeu.clients, agents: jeu.agents }
  const deplacables = jeu.interventions.filter((i) => estDeplacable(i, premier))
  const fixes = jeu.interventions.filter((i) => !estDeplacable(i, premier))
  const passages = passagesConnus(jeu, deplacables)

  // Regroupement mois par mois.
  const parMois = new Map<string, PassageAPlacer[]>()
  for (const i of deplacables) {
    const fenetre = fenetreDe(i, passages, premier)
    const cle = fenetre.debut.slice(0, 7)
    parMois.set(cle, [...(parMois.get(cle) ?? []), { id: i.id, clientId: i.clientId, numero: 1, fenetre }])
  }

  let placees: Intervention[] = []
  const nonPlaces: string[] = []
  for (const [cle, liste] of [...parMois].sort(([a], [b]) => a.localeCompare(b))) {
    const a = Number(cle.slice(0, 4))
    const m = Number(cle.slice(5)) - 1
    const jours = joursTravaillesDuMois(a, m).filter((d) => d >= premier)
    const tournees = regrouperEnTournees(liste, ctx)
    const resultat = repartirTournees(tournees, ctx, jours, { dejaPlanifiees: [...fixes, ...placees] })
    placees = [...placees, ...tourneesEnInterventions(resultat.placees, dateDuJour)]
    nonPlaces.push(...resultat.nonPlacees.flatMap((t) => t.passages.map((p) => p.id)))
  }

  // On garde le statut (ex. « replanifiée ») et la date d'origine de chaque passage.
  const origine = new Map(deplacables.map((i) => [i.id, i]))
  const nouvelles = placees.map((n) => {
    const o = origine.get(n.id)!
    return { ...o, date: n.date, agentId: n.agentId, ordre: n.ordre, debutMin: n.debutMin }
  })
  const inchangees = deplacables.filter((i) => nonPlaces.includes(i.id))
  const interventions = recalculerHeures(jeu, [...fixes, ...nouvelles, ...inchangees])

  const futur = (liste: Intervention[]) => liste.filter((i) => i.date >= premier)
  return {
    interventions,
    premierJourModifiable: premier,
    routeAvantMin: routeTotale(ctx, futur(jeu.interventions)),
    routeApresMin: routeTotale(ctx, futur(interventions)),
    tourneesAvant: compterTournees(jeu.interventions, premier),
    tourneesApres: compterTournees(interventions, premier),
    deplaces: nouvelles.filter((n) => {
      const o = origine.get(n.id)!
      return o.date !== n.date || o.agentId !== n.agentId
    }).length,
    inchanges: inchangees.length,
  }
}

/** Renumérote et recalcule les heures des journées (utile quand des passages inchangés rejoignent une journée). */
function recalculerHeures(jeu: JeuPlanning, interventions: Intervention[]): Intervention[] {
  const clients = new Map(jeu.clients.map((c) => [c.id, c]))
  const misesAJour = new Map<string, Intervention>()
  for (const liste of journeesActives(interventions).values()) {
    const journee = calculerJournee(jeu.entite.depot, liste.map((i) => clients.get(i.clientId)!))
    liste.forEach((i, k) => misesAJour.set(i.id, { ...i, ordre: k + 1, debutMin: journee.etapes[k].debutMin }))
  }
  return interventions
    .map((i) => misesAJour.get(i.id) ?? i)
    .sort((a, b) => a.date.localeCompare(b.date) || a.agentId.localeCompare(b.agentId) || a.ordre - b.ordre)
}

/**
 * Planning « fait à la main », pour la comparaison : les passages à venir sont
 * pris dans l'ordre alphabétique des clients (comme dans le tableur) et posés
 * dans les premières journées où ils rentrent, sans regroupement ni réordonnancement.
 */
export function planningALaMain(jeu: JeuPlanning, dateDuJour: DateISO): Intervention[] {
  const premier = premierJourModifiable(dateDuJour)
  const clients = new Map(jeu.clients.map((c) => [c.id, c]))
  const deplacables = jeu.interventions.filter((i) => estDeplacable(i, premier))
  const fixes = jeu.interventions.filter((i) => !estDeplacable(i, premier))
  const passages = passagesConnus(jeu, deplacables)

  const journees = new Map<string, Intervention[]>() // « date|agent » → passages dans l'ordre d'ajout
  for (const i of fixes) if (i.date >= premier) journees.set(`${i.date}|${i.agentId}`, [...(journees.get(`${i.date}|${i.agentId}`) ?? []), i])
  const datesClient = new Map<string, DateISO[]>()
  for (const i of fixes) if (i.statut !== 'annulee_meteo') datesClient.set(i.clientId, [...(datesClient.get(i.clientId) ?? []), i.date])

  const aPlacer = [...deplacables].sort(
    (a, b) => clients.get(a.clientId)!.nom.localeCompare(clients.get(b.clientId)!.nom) || a.id.localeCompare(b.id),
  )
  const resultat: Intervention[] = []
  for (const i of aPlacer) {
    const fenetre = fenetreDe(i, passages, premier)
    let place = false
    for (const date of joursTravaillesEntre(fenetre.debut, fenetre.fin)) {
      if ((datesClient.get(i.clientId) ?? []).some((d) => Math.abs(ecartJours(d, date)) < 7)) continue
      for (const agent of jeu.agents) {
        const cle = `${date}|${agent.id}`
        const liste = journees.get(cle) ?? []
        const essai = [...liste, i].map((x) => clients.get(x.clientId)!)
        if (calculerJournee(jeu.entite.depot, essai).totalMin > capaciteMin(agent)) continue
        const placee = { ...i, date, agentId: agent.id }
        journees.set(cle, [...liste, placee])
        datesClient.set(i.clientId, [...(datesClient.get(i.clientId) ?? []), date])
        resultat.push(placee)
        place = true
        break
      }
      if (place) break
    }
    if (!place) {
      // Pas de place : le passage reste où il était, et compte dans sa journée.
      const cle = `${i.date}|${i.agentId}`
      journees.set(cle, [...(journees.get(cle) ?? []), i])
      resultat.push(i)
    }
  }
  // L'ordre de passage est l'ordre d'ajout (alphabétique), pas un ordre optimisé.
  const ordres = new Map<string, number>()
  for (const liste of journees.values()) liste.forEach((x, k) => ordres.set(x.id, k + 1))
  return recalculerHeures(jeu, [...fixes, ...resultat.map((x) => ({ ...x, ordre: ordres.get(x.id) ?? x.ordre }))])
}
