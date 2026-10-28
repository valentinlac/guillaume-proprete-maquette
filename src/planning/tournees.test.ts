import { describe, expect, it } from 'vitest'
import { chargerJeux } from '../donnees/chargement'
import type { Agent, Client, JeuDeDonnees } from '../donnees/types'
import { distanceVolOiseauKm } from '../trajets/tempsTrajet'
import { ecartJours } from '../utils/dates'
import { estJourTravaille, horloge, joursTravaillesDuMois } from './calendrierTravail'
import { calculerJournee, capaciteMin, ordonnerTournee } from './journee'
import { passagesDuMois } from './passages'
import { planifierMois, planningInitial } from './tournees'
import { routeSansRegroupement, routeTotale, verifierPlanning } from './verifications'

const AUJOURDHUI = '2026-10-28'
const DEMAIN = '2026-10-29'
const jeux = chargerJeux(AUJOURDHUI)
const ctxDe = (j: JeuDeDonnees) => ({ depot: j.entite.depot, clients: j.clients, agents: j.agents })
const resultats = Object.fromEntries(Object.values(jeux).map((j) => [j.entite.id, planningInitial(ctxDe(j), AUJOURDHUI)]))

describe('calcul d’une journée', () => {
  const depot = { lat: 44.9165, lng: 4.9105 }
  const client = (id: string, lat: number, lng: number, dureeMin: number) => ({ id, lat, lng, dureeMin })

  it('saute la pause de midi', () => {
    expect(horloge(0)).toBe(8 * 60)
    expect(horloge(240)).toBe(13 * 60 + 30) // un passage qui commence pile à 12:00 démarre à 13:30
    expect(horloge(240, false)).toBe(12 * 60) // un passage qui finit pile à 12:00 finit à 12:00
    expect(horloge(250)).toBe(13 * 60 + 40)
  })

  it('enchaîne route et passages et revient au dépôt', () => {
    const j = calculerJournee(depot, [client('a', 44.93, 4.89, 60), client('b', 44.95, 4.89, 90)])
    expect(j.etapes).toHaveLength(2)
    expect(j.etapes[0].debutMin).toBe(8 * 60 + j.etapes[0].routeMin)
    expect(j.etapes[1].debutEcoule).toBe(j.etapes[0].finEcoulee + j.etapes[1].routeMin)
    expect(j.totalMin).toBe(j.routeTotaleMin + 150)
    expect(j.retourDepotMin).toBeGreaterThan(0)
  })

  it('compte une journée vide à zéro', () => {
    expect(calculerJournee(depot, []).totalMin).toBe(0)
  })

  it('trouve l’ordre de passage le plus court (comparé à toutes les permutations)', () => {
    const permutations = <T,>(l: T[]): T[][] =>
      l.length <= 1 ? [l] : l.flatMap((x, i) => permutations([...l.slice(0, i), ...l.slice(i + 1)]).map((r) => [x, ...r]))
    // Tournées réelles de Valence de 4 à 6 passages.
    const tournees = resultats.valence.tournees.filter((t) => t.passages.length >= 4).slice(0, 5)
    expect(tournees.length).toBeGreaterThan(0)
    for (const t of tournees) {
      const clients = t.passages.map((p) => jeux.valence.clients.find((c) => c.id === p.clientId)!)
      const route = (l: typeof clients) => calculerJournee(jeux.valence.entite.depot, l).routeTotaleMin
      const optimum = Math.min(...permutations(clients).map(route))
      const obtenu = route(ordonnerTournee(jeux.valence.entite.depot, clients))
      expect(obtenu - optimum, t.id).toBeLessThanOrEqual(2) // à 2 minutes près
    }
  })

  it('limite la capacité au plus petit du maximum de l’agent et des plages horaires', () => {
    expect(capaciteMin({ heuresMaxJour: 7 })).toBe(420)
    expect(capaciteMin({ heuresMaxJour: 6 })).toBe(360)
    expect(capaciteMin({ heuresMaxJour: 10 })).toBe(450)
  })
})

describe.each(Object.values(jeux).map((j) => [j.entite.id, j] as const))('tournées (%s)', (id, jeu) => {
  const r = resultats[id]
  const ctx = ctxDe(jeu)
  const clients = new Map(jeu.clients.map((c) => [c.id, c]))

  it('place tous les passages dus d’octobre et novembre, une seule fois', () => {
    expect(r.nonPlaces).toEqual([])
    const attendus = [...passagesDuMois(jeu.clients, 2026, 9), ...passagesDuMois(jeu.clients, 2026, 10)].map((p) => p.id).sort()
    expect(r.interventions.map((i) => i.id).sort()).toEqual(attendus)
  })

  it('produit un planning sans anomalie (heures max, horaires, jours travaillés, ordre)', () => {
    expect(verifierPlanning(ctx, r.interventions)).toEqual([])
  })

  it('respecte la période de chaque passage (quinzaine : 1re et 2de moitié du mois)', () => {
    const passages = new Map(
      [...passagesDuMois(jeu.clients, 2026, 9), ...passagesDuMois(jeu.clients, 2026, 10)].map((p) => [p.id, p]),
    )
    for (const i of r.interventions) {
      const p = passages.get(i.id)!
      expect(i.date >= p.fenetre.debut && i.date <= p.fenetre.fin, i.id).toBe(true)
    }
  })

  it('espace d’au moins 7 jours deux passages d’un même client', () => {
    const parClient = new Map<string, string[]>()
    for (const i of r.interventions) parClient.set(i.clientId, [...(parClient.get(i.clientId) ?? []), i.date])
    for (const [clientId, dates] of parClient) {
      const triees = dates.sort()
      for (let k = 1; k < triees.length; k++) {
        expect(ecartJours(triees[k - 1], triees[k]), clients.get(clientId)!.nom).toBeGreaterThanOrEqual(7)
      }
    }
  })

  it('garnit demain pour les deux agents (scénario météo)', () => {
    for (const agent of jeu.agents) {
      expect(r.interventions.filter((i) => i.date === DEMAIN && i.agentId === agent.id).length, agent.nom).toBeGreaterThan(0)
    }
  })

  it('marque « terminée » le passé et « planifiée » le reste', () => {
    for (const i of r.interventions) expect(i.statut).toBe(i.date < AUJOURDHUI ? 'terminee' : 'planifiee')
  })

  it('regroupe par proximité : chaque passage est à moins de 10 km d’un autre de sa tournée', () => {
    for (const t of r.tournees) {
      if (t.passages.length < 2) continue
      for (const p of t.passages) {
        const c = clients.get(p.clientId)!
        const plusProche = Math.min(
          ...t.passages.filter((q) => q !== p).map((q) => distanceVolOiseauKm(c, clients.get(q.clientId)!)),
        )
        expect(plusProche, `${t.id} / ${c.nom}`).toBeLessThanOrEqual(10)
      }
    }
  })

  // Territoire étendu (Valence) : gain net attendu. Territoire compact (franchisés) :
  // peu à gagner, mais jamais pire.
  const gainMin = jeu.entite.type === 'societe' ? 0.3 : 0
  it(`fait au moins ${gainMin * 100} % de route en moins qu’un planning pris dans l’ordre alphabétique`, () => {
    for (const mois of [9, 10]) {
      const passages = passagesDuMois(jeu.clients, 2026, mois).sort((a, b) =>
        clients.get(a.clientId)!.nom.localeCompare(clients.get(b.clientId)!.nom),
      )
      const ref = routeSansRegroupement(ctx, passages)
      const optimise = routeTotale(ctx, r.interventions.filter((i) => Number(i.date.slice(5, 7)) - 1 === mois))
      expect(optimise, `mois ${mois + 1}`).toBeLessThanOrEqual(ref * (1 - gainMin))
    }
  })

  it('équilibre la charge entre les deux agents (écart < 40 %)', () => {
    const charge = jeu.agents.map((a) =>
      r.tournees.filter((t) => t.agentId === a.id).reduce((s, t) => s + t.journee.totalMin, 0),
    )
    expect(Math.min(...charge) / Math.max(...charge)).toBeGreaterThan(0.6)
  })

  it.runIf(jeu.entite.type === 'societe')('étale les tournées sur le mois (pas de trou de plus de 7 jours)', () => {
    for (const mois of [9, 10]) {
      const dates = [...new Set(r.tournees.filter((t) => Number(t.date.slice(5, 7)) - 1 === mois).map((t) => t.date))].sort()
      for (let k = 1; k < dates.length; k++) expect(ecartJours(dates[k - 1], dates[k])).toBeLessThanOrEqual(7)
    }
  })

  it('donne exactement le même planning à chaque calcul', () => {
    expect(planningInitial(ctx, AUJOURDHUI).interventions).toEqual(r.interventions)
  })
})

describe('tournées : cas limites', () => {
  const valence = jeux.valence
  const ctx = ctxDe(valence)

  it('ne planifie jamais un jour férié ni un week-end', () => {
    for (const i of resultats.valence.interventions) expect(estJourTravaille(i.date), i.date).toBe(true)
    expect(resultats.valence.interventions.some((i) => i.date === '2026-11-11')).toBe(false)
  })

  it('ignore un jour à garnir férié', () => {
    const r = planifierMois(ctx, 2026, 10, AUJOURDHUI, { joursAGarnir: ['2026-11-11'] })
    expect(r.nonPlaces).toEqual([])
    expect(r.interventions.some((i) => i.date === '2026-11-11')).toBe(false)
  })

  it('n’utilise aucun jour avant « premierJour »', () => {
    const r = planifierMois(ctx, 2026, 10, AUJOURDHUI, { premierJour: '2026-11-09' })
    expect(r.interventions.every((i) => i.date >= '2026-11-09')).toBe(true)
    expect(verifierPlanning(ctx, r.interventions)).toEqual([])
  })

  it('signale un passage trop long pour une journée au lieu de dépasser le maximum', () => {
    const geant: Client = { ...valence.clients[0], id: 'x01', nom: 'Passage géant', dureeMin: 500, frequence: 'mensuelle' }
    const r = planifierMois({ ...ctx, clients: [...valence.clients, geant] }, 2026, 10, AUJOURDHUI)
    expect(r.nonPlaces.map((p) => p.clientId)).toEqual(['x01'])
    expect(verifierPlanning({ ...ctx, clients: [...valence.clients, geant] }, r.interventions)).toEqual([])
  })

  it('signale les passages en trop quand le mois est plein, sans jamais dépasser les heures', () => {
    // 4 fois plus de clients que la normale.
    const clients = [0, 1, 2, 3].flatMap((k) => valence.clients.map((c) => ({ ...c, id: `${c.id}-${k}`, frequence: 'quinzaine' as const, moisDus: Array(12).fill(true) })))
    const r = planifierMois({ ...ctx, clients }, 2026, 10, AUJOURDHUI)
    expect(r.nonPlaces.length).toBeGreaterThan(0)
    expect(verifierPlanning({ ...ctx, clients }, r.interventions)).toEqual([])
    expect(r.interventions.length + r.nonPlaces.length).toBe(passagesDuMois(clients, 2026, 10).length)
  })

  it('respecte un agent à 6 h par jour (franchise de Montélimar)', () => {
    const chloe = jeux.montelimar.agents.find((a) => a.heuresMaxJour === 6)!
    for (const t of resultats.montelimar.tournees.filter((x) => x.agentId === chloe.id)) {
      expect(t.journee.totalMin).toBeLessThanOrEqual(360)
    }
  })

  it('fonctionne avec un seul agent', () => {
    const seul: Agent[] = [valence.agents[0]]
    const r = planifierMois({ ...ctx, agents: seul }, 2026, 10, AUJOURDHUI)
    expect(r.nonPlaces).toEqual([])
    expect(new Set(r.interventions.map((i) => i.agentId))).toEqual(new Set(['a1']))
    expect(verifierPlanning({ ...ctx, agents: seul }, r.interventions)).toEqual([])
  })

  it('a assez de jours libres pour replacer une journée annulée', () => {
    const joursOccupes = new Set(resultats.valence.tournees.filter((t) => t.date.startsWith('2026-11')).map((t) => `${t.date}|${t.agentId}`))
    const joursPossibles = joursTravaillesDuMois(2026, 10).length * valence.agents.length
    expect(joursPossibles - joursOccupes.size).toBeGreaterThan(10)
  })

  it('calcule le planning initial d’une entité en moins de 500 ms', () => {
    const debut = performance.now()
    planningInitial(ctx, AUJOURDHUI)
    expect(performance.now() - debut).toBeLessThan(500)
  })
})
