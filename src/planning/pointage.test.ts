import { describe, expect, it } from 'vitest'
import { chargerJeux } from '../donnees/chargement'
import { DATE_DU_JOUR } from '../donnees/donnees-fictives'
import { cloturerPassage, ecartDureeMin, formatEcart, lienWaze } from './pointage'

describe('pointage agent', () => {
  const jeu = chargerJeux(DATE_DU_JOUR).valence
  const duJour = jeu.interventions.filter((i) => i.date === DATE_DU_JOUR)

  it('la démo a des passages à pointer aujourd’hui pour les deux agents', () => {
    expect(new Set(duJour.map((i) => i.agentId)).size).toBe(2)
    expect(duJour.every((i) => i.statut === 'planifiee')).toBe(true)
  })

  it('la clôture passe le passage en terminée avec la durée réelle', () => {
    const i = duJour[0]
    const client = jeu.clients.find((c) => c.id === i.clientId)!
    const apres = cloturerPassage(jeu.interventions, i.id, {
      debutReel: 480, finReel: 480 + client.dureeMin + 12, observation: 'RAS', signataire: 'Mme Test', signature: 'data:image/png;base64,xx',
    })
    const fait = apres.find((x) => x.id === i.id)!
    expect(fait.statut).toBe('terminee')
    expect(ecartDureeMin(fait, client)).toBe(12)
    expect(formatEcart(12)).toBe('+12 min')
    expect(formatEcart(-5)).toBe('−5 min')
    expect(apres.filter((x) => x.id !== i.id)).toEqual(jeu.interventions.filter((x) => x.id !== i.id))
  })

  it('le lien Waze contient les coordonnées', () => {
    expect(lienWaze({ lat: 44.9, lng: 4.89 })).toBe('https://waze.com/ul?ll=44.9,4.89&navigate=yes')
  })
})
