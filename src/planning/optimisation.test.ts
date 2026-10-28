import { describe, expect, it } from 'vitest'
import { chargerJeux } from '../donnees/chargement'
import type { Intervention, JeuDeDonnees } from '../donnees/types'
import { replacerEnSerie } from './creneaux'
import { optimiserTournees, planningALaMain, premierJourModifiable } from './optimisation'
import { routeTotale, verifierPlanning } from './verifications'

const AUJOURDHUI = '2026-10-28'
const DEMAIN = '2026-10-29'
const jeux = chargerJeux(AUJOURDHUI)
const ctxDe = (j: JeuDeDonnees) => ({ depot: j.entite.depot, clients: j.clients, agents: j.agents })
const futur = (l: Intervention[]) => l.filter((i) => i.date >= premierJourModifiable(AUJOURDHUI))

/** Mêmes passages avant et après, et rien n'a bougé avant après-demain. */
function verifierConservation(avant: Intervention[], apres: Intervention[]) {
  expect(apres.map((i) => i.id).sort()).toEqual(avant.map((i) => i.id).sort())
  const parId = new Map(apres.map((i) => [i.id, i]))
  for (const a of avant) {
    const b = parId.get(a.id)!
    expect(b.clientId).toBe(a.clientId)
    expect(b.statut).toBe(a.statut)
    if (a.date < premierJourModifiable(AUJOURDHUI)) expect([b.date, b.agentId, b.ordre, b.debutMin]).toEqual([a.date, a.agentId, a.ordre, a.debutMin])
    else expect(b.date >= premierJourModifiable(AUJOURDHUI)).toBe(true)
  }
}

describe('optimiser les tournées', () => {
  it('commence après-demain : la tournée de demain est déjà envoyée aux agents', () => {
    expect(premierJourModifiable(AUJOURDHUI)).toBe('2026-10-30')
    expect(premierJourModifiable('2026-10-29')).toBe('2026-11-02') // vendredi puis week-end
  })

  it.each(Object.keys(jeux))('%s : planning valide, aucun passage perdu, pas plus de route', (id) => {
    const jeu = jeux[id]
    const r = optimiserTournees(jeu, AUJOURDHUI)
    expect(verifierPlanning(ctxDe(jeu), r.interventions)).toEqual([])
    verifierConservation(jeu.interventions, r.interventions)
    expect(r.inchanges).toBe(0)
    expect(r.routeApresMin).toBeLessThanOrEqual(r.routeAvantMin * 1.05)
  })

  it.each(Object.keys(jeux))('%s : regroupe nettement un planning fait à la main', (id) => {
    const jeu = jeux[id]
    const aLaMain = planningALaMain(jeu, AUJOURDHUI)
    expect(verifierPlanning(ctxDe(jeu), aLaMain)).toEqual([])
    verifierConservation(jeu.interventions, aLaMain)
    expect(routeTotale(ctxDe(jeu), futur(aLaMain))).toBeGreaterThan(routeTotale(ctxDe(jeu), futur(jeu.interventions)))

    const r = optimiserTournees({ ...jeu, interventions: aLaMain }, AUJOURDHUI)
    expect(verifierPlanning(ctxDe(jeu), r.interventions)).toEqual([])
    verifierConservation(aLaMain, r.interventions)
    expect(r.routeApresMin).toBeLessThan(r.routeAvantMin * (jeu.entite.type === 'societe' ? 0.75 : 0.95))
    expect(r.deplaces).toBeGreaterThan(0)
  })

  it('respecte les périodes : 1re quinzaine dans la 1re moitié du mois, 2e dans la seconde', () => {
    const jeu = jeux.valence
    const r = optimiserTournees({ ...jeu, interventions: planningALaMain(jeu, AUJOURDHUI) }, AUJOURDHUI)
    for (const i of futur(r.interventions)) {
      const m = i.id.match(/-(\d{4}-\d{2})-([12])$/)
      if (!m || !i.date.startsWith(m[1])) continue
      const quinzaine = jeu.clients.find((c) => c.id === i.clientId)!.frequence === 'quinzaine'
      if (quinzaine && m[2] === '1') expect(Number(i.date.slice(8)), i.id).toBeLessThanOrEqual(15)
      if (quinzaine && m[2] === '2') expect(Number(i.date.slice(8)), i.id).toBeGreaterThanOrEqual(16)
    }
  })

  it('garde le statut « replanifiée » et la date d’origine après une annulation météo', () => {
    const jeu = jeux.valence
    const annule = jeu.interventions.map((i) => (i.date === DEMAIN ? { ...i, statut: 'annulee_meteo' as const } : i))
    const demandes = annule
      .filter((i) => i.statut === 'annulee_meteo')
      .map((i) => ({ clientId: i.clientId, interventionId: i.id, fenetre: { debut: '2026-10-30', fin: '2026-11-30' }, joursExclus: [DEMAIN] }))
    const apresPluie = replacerEnSerie({ ...ctxDe(jeu), interventions: annule, dateDuJour: AUJOURDHUI }, demandes).interventions

    const r = optimiserTournees({ ...jeu, interventions: apresPluie }, AUJOURDHUI)
    expect(verifierPlanning(ctxDe(jeu), r.interventions)).toEqual([])
    verifierConservation(apresPluie, r.interventions)
    const replanifiees = r.interventions.filter((i) => i.statut === 'replanifiee')
    expect(replanifiees).toHaveLength(demandes.length)
    expect(replanifiees.every((i) => i.dateOrigine === DEMAIN)).toBe(true)
  })

  it('donne le même résultat à chaque fois et tient en moins de 500 ms', () => {
    const debut = performance.now()
    const a = optimiserTournees(jeux.valence, AUJOURDHUI)
    expect(performance.now() - debut).toBeLessThan(500)
    expect(optimiserTournees(jeux.valence, AUJOURDHUI)).toEqual(a)
  })
})
