import { describe, expect, it } from 'vitest'
import { chargerJeux } from '../donnees/chargement'
import { DATE_DU_JOUR } from '../donnees/donnees-fictives'
import { clientsAPrevenir } from './messages'
import { prochainJourTravaille } from './calendrierTravail'
import { preparerUrgence } from './urgence'

describe('intervention urgente', () => {
  const jeu = chargerJeux(DATE_DU_JOUR).valence
  const demain = prochainJourTravaille(DATE_DU_JOUR)
  const premier = jeu.interventions.find((i) => i.date === demain)!
  const client = jeu.clients.find((c) => !jeu.interventions.some((i) => i.date === demain && i.clientId === c.id) && !c.horaires)!
  const prep = preparerUrgence(jeu, { clientId: client.id, date: demain, agentId: premier.agentId, plage: 'matin' }, DATE_DU_JOUR)

  it('place l’urgence le matin du jour demandé', () => {
    const u = prep.interventions.find((i) => i.id === prep.urgenteId)!
    expect(u).toMatchObject({ date: demain, agentId: premier.agentId, urgente: true, statut: 'planifiee' })
    expect(u.debutMin).toBeLessThan(12 * 60)
  })

  it('replace les passages du créneau sur un autre jour, avec un message de déplacement', () => {
    expect(prep.annules.length).toBeGreaterThan(0)
    for (const a of prep.annules) {
      const apres = prep.interventions.find((i) => i.id === a.id)!
      expect(apres.statut).toBe('replanifiee')
      expect(apres.date).not.toBe(demain)
      expect(apres.motif).toBe('deplacement')
    }
    const messages = clientsAPrevenir({ ...jeu, interventions: prep.interventions }, DATE_DU_JOUR).filter((x) => x.modele === 'deplacement')
    expect(messages.length).toBe(prep.annules.length)
  })

  it('ne touche pas au planning enregistré', () => {
    expect(jeu.interventions.some((i) => i.id === prep.urgenteId)).toBe(false)
  })
})
