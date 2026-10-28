import { describe, expect, it } from 'vitest'
import { chargerJeux } from '../donnees/chargement'
import { ecartJours } from '../utils/dates'
import { estJourTravaille } from './calendrierTravail'
import { moisAPreparer, preparerMoisSuivant } from './moisSuivant'
import { passagesDuMois } from './passages'
import { verifierPlanning } from './verifications'

const AUJOURDHUI = '2026-10-28'
const jeux = chargerJeux(AUJOURDHUI)

describe.each(Object.keys(jeux))('préparer le mois suivant (%s)', (id) => {
  const jeu = jeux[id]
  const ctx = { depot: jeu.entite.depot, clients: jeu.clients, agents: jeu.agents }

  it('vise le mois qui suit le dernier mois planifié (décembre)', () => {
    expect(moisAPreparer(jeu, AUJOURDHUI)).toEqual({ annee: 2026, mois: 11 })
  })

  it('place tous les passages dus de décembre, en jours travaillés, sans rien modifier', () => {
    const avant = structuredClone(jeu.interventions)
    const p = preparerMoisSuivant(jeu, AUJOURDHUI)
    expect(jeu.interventions).toEqual(avant)
    expect(p.nonPlaces).toEqual([])
    expect(p.interventions.map((i) => i.id).sort()).toEqual(passagesDuMois(jeu.clients, 2026, 11).map((x) => x.id).sort())
    expect(p.interventions.every((i) => i.date.startsWith('2026-12') && estJourTravaille(i.date) && i.statut === 'planifiee')).toBe(true)
    expect(p.interventions.some((i) => i.date === '2026-12-25')).toBe(false)
    expect(verifierPlanning(ctx, [...jeu.interventions, ...p.interventions])).toEqual([])
  })

  it('respecte 7 jours entre deux passages d’un même client, y compris avec novembre', () => {
    const p = preparerMoisSuivant(jeu, AUJOURDHUI)
    const tous = [...jeu.interventions, ...p.interventions]
    for (const i of p.interventions) {
      for (const j of tous) {
        if (j.id !== i.id && j.clientId === i.clientId) expect(Math.abs(ecartJours(i.date, j.date)), i.id).toBeGreaterThanOrEqual(7)
      }
    }
  })

  it('fait moins de route qu’un planning dans l’ordre du tableur', () => {
    const p = preparerMoisSuivant(jeu, AUJOURDHUI)
    expect(p.routeMin).toBeLessThanOrEqual(p.routeTableurMin)
  })

  it('peut enchaîner sur le mois d’après (janvier 2027)', () => {
    const dec = preparerMoisSuivant(jeu, AUJOURDHUI)
    const avecDecembre = { ...jeu, interventions: [...jeu.interventions, ...dec.interventions] }
    const jan = preparerMoisSuivant(avecDecembre, AUJOURDHUI)
    expect([jan.annee, jan.mois]).toEqual([2027, 0])
    expect(jan.nonPlaces).toEqual([])
    expect(jan.interventions.some((i) => i.date === '2027-01-01')).toBe(false)
    expect(verifierPlanning(ctx, [...avecDecembre.interventions, ...jan.interventions])).toEqual([])
  })
})
