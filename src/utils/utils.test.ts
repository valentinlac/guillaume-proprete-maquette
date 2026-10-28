import { describe, expect, it } from 'vitest'
import { estJourTravaille, joursTravaillesDuMois, minutesOuvertesParJour } from '../planning/calendrierTravail'
import { creerServiceTrajetSimule, distanceVolOiseauKm } from '../trajets/tempsTrajet'
import { ajouterJours, ajouterMois, ecartJours, formatDate, formatDateLongue, jourSemaine, lireDate } from './dates'
import { formatDuree, formatEuros, formatHeure, lireMontant } from './format'

describe('dates', () => {
  it('formate en jj/mm/aaaa', () => {
    expect(formatDate('2026-10-28')).toBe('28/10/2026')
    expect(formatDateLongue('2026-10-28')).toBe('mercredi 28/10/2026')
  })

  it('calcule les jours en traversant les changements de mois et d’heure', () => {
    expect(ajouterJours('2026-10-31', 1)).toBe('2026-11-01')
    expect(ajouterJours('2026-10-24', 2)).toBe('2026-10-26') // passage à l’heure d’hiver le 25/10
    expect(ecartJours('2026-10-28', '2026-11-27')).toBe(30)
    expect(ajouterMois('2026-01-31', 1)).toBe('2026-02-28')
  })

  it('numérote les jours de lundi (1) à dimanche (7)', () => {
    expect(jourSemaine('2026-10-26')).toBe(1)
    expect(jourSemaine('2026-11-01')).toBe(7)
  })

  it('lit une date saisie', () => {
    expect(lireDate('5/11/2026')).toBe('2026-11-05')
    expect(lireDate('31/02/2026')).toBeNull()
    expect(lireDate('demain')).toBeNull()
  })
})

describe('format', () => {
  it('affiche les montants en euros à la française', () => {
    expect(formatEuros(1234.5).replace(/\s/g, ' ')).toBe('1 234,50 €')
  })
  it('lit un montant saisi à la française', () => {
    expect(lireMontant('1 234,56')).toBe(1234.56)
    expect(lireMontant('120 €')).toBe(120)
    expect(lireMontant('89.9')).toBe(89.9)
    expect(lireMontant('douze')).toBeNull()
    expect(lireMontant('1,234')).toBeNull()
  })
  it('affiche durées et heures', () => {
    expect(formatDuree(45)).toBe('45 min')
    expect(formatDuree(90)).toBe('1 h 30')
    expect(formatDuree(120)).toBe('2 h')
    expect(formatHeure(510)).toBe('08:30')
  })
})

describe('calendrier de travail', () => {
  it('exclut week-ends et jours fériés', () => {
    expect(estJourTravaille('2026-10-29')).toBe(true)
    expect(estJourTravaille('2026-10-31')).toBe(false)
    expect(estJourTravaille('2026-11-11')).toBe(false)
  })
  it('compte les jours travaillés', () => {
    expect(joursTravaillesDuMois(2026, 9)).toHaveLength(22) // octobre 2026
    expect(joursTravaillesDuMois(2026, 10)).toHaveLength(20) // novembre 2026 (11/11 férié)
  })
  it('offre 7 h 30 de plages horaires par jour', () => {
    expect(minutesOuvertesParJour()).toBe(450)
  })
})

describe('temps de trajet simulé', () => {
  const valence = { lat: 44.9334, lng: 4.8924 }
  const romans = { lat: 45.043, lng: 5.052 }

  it('mesure la distance à vol d’oiseau', () => {
    const km = distanceVolOiseauKm(valence, romans)
    expect(km).toBeGreaterThan(16)
    expect(km).toBeLessThan(19)
  })

  it('donne un temps de route plausible et symétrique', () => {
    const service = creerServiceTrajetSimule()
    const aller = service.minutesEntre(valence, romans)
    expect(aller).toBeGreaterThanOrEqual(25)
    expect(aller).toBeLessThanOrEqual(35)
    expect(service.minutesEntre(romans, valence)).toBe(aller)
    expect(service.minutesEntre(valence, valence)).toBe(0)
  })
})
