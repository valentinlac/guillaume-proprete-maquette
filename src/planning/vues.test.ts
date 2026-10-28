import { describe, expect, it } from 'vitest'
import { chargerJeux } from '../donnees/chargement'
import { serviceTrajet } from '../trajets/tempsTrajet'
import { detailJournee, statsDuMois, tourneesDuJour } from './vues'

const jeu = chargerJeux('2026-10-28').valence
const DEMAIN = '2026-10-29'

describe('vue journée', () => {
  const tournees = tourneesDuJour(jeu, jeu.interventions.filter((i) => i.date === DEMAIN))

  it('donne une tournée par agent présent ce jour-là', () => {
    expect(tournees.map((t) => t.agent.id).sort()).toEqual(['a1', 'a2'])
  })

  it('enchaîne les passages avec le temps de route réel entre chantiers', () => {
    const service = serviceTrajet()
    for (const t of tournees) {
      const d = detailJournee(t, jeu.clients)
      d.lignes.forEach((l, k) => {
        const depart = k === 0 ? jeu.entite.depot : d.lignes[k - 1].client
        expect(l.routeAvantMin).toBe(service.minutesEntre(depart, l.client))
        expect(l.debutMin).toBe(l.intervention.debutMin)
        if (k > 0) expect(l.debutMin!).toBeGreaterThan(d.lignes[k - 1].finMin!)
      })
      const derniere = d.lignes[d.lignes.length - 1]
      expect(d.retourDepotMin).toBe(service.minutesEntre(derniere.client, jeu.entite.depot))
      expect(d.retourDepotA).toBe(derniere.finMin! + d.retourDepotMin)
    }
  })

  it('met les passages annulés à part, sans heure ni route', () => {
    const annule = jeu.interventions.map((i) => (i.date === DEMAIN && i.ordre === 1 ? { ...i, statut: 'annulee_meteo' as const } : i))
    const t = tourneesDuJour(jeu, annule.filter((i) => i.date === DEMAIN))[0]
    const d = detailJournee(t, jeu.clients)
    const derniere = d.lignes[d.lignes.length - 1]
    expect(derniere.intervention.statut).toBe('annulee_meteo')
    expect([derniere.routeAvantMin, derniere.debutMin]).toEqual([null, null])
    expect(d.lignes.slice(0, -1).every((l) => l.routeAvantMin !== null)).toBe(true)
  })

  it('compte les statistiques du mois', () => {
    const s = statsDuMois(jeu, '2026-10')
    expect(s.passages).toBe(jeu.interventions.filter((i) => i.date.startsWith('2026-10')).length)
    expect(s.travailMin).toBeGreaterThan(0)
    expect(s.routeMin).toBeGreaterThan(0)
  })
})
