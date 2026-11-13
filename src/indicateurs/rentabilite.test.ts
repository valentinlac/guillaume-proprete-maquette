import { describe, expect, it } from 'vitest'
import { chargerJeux } from '../donnees/chargement'
import { DATE_DU_JOUR } from '../donnees/donnees-fictives'
import { calculerIndicateurs } from './rentabilite'

describe.each(Object.entries(chargerJeux(DATE_DU_JOUR)))('indicateurs (%s)', (_id, jeu) => {
  const ind = calculerIndicateurs(jeu, { debut: '2026-10-01', fin: DATE_DU_JOUR }, 0.45)

  it('compte le CA réalisé et les heures des journées faites', () => {
    expect(ind.caRealise).toBeGreaterThan(0)
    expect(ind.heuresReelles).toBeGreaterThan(0)
    expect(ind.parAgent.reduce((s, a) => s + a.ca, 0)).toBeCloseTo(ind.caRealise)
  })

  it('marge = CA − main-d’œuvre − déplacements', () => {
    for (const j of ind.journees) expect(j.marge).toBeCloseTo(j.ca - j.heures * j.agent.tauxHoraire - j.km * 0.45)
  })

  it('repère les journées déficitaires quand les déplacements coûtent cher', () => {
    const cher = calculerIndicateurs(jeu, { debut: '2026-10-01', fin: DATE_DU_JOUR }, 5)
    expect(cher.journeesDeficitaires).toBeGreaterThan(ind.journeesDeficitaires)
    expect(cher.journeesDeficitaires).toBe(cher.journees.filter((j) => j.marge < 0).length)
  })
})
