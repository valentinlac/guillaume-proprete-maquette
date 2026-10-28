import { describe, expect, it } from 'vitest'
import { placerSurLaRoute, tracerParLaRoute } from './traces'

const depot = { id: 'depot', lat: 44.9, lng: 4.9 }
const a = { id: 'c01', lat: 45.0, lng: 4.8 }
const b = { id: 'c02', lat: 45.1, lng: 4.85 }

describe('tracé par la route', () => {
  const traces = {
    'depot|c01': [[44.91, 4.89], [44.99, 4.81]] as [number, number][],
    'c01|c02': [[44.99, 4.81], [45.09, 4.84]] as [number, number][],
  }

  it('enchaîne les routes étape par étape, dans les deux sens, sans raccord hors de la route', () => {
    expect(tracerParLaRoute(traces, [depot, a, b, depot])).toEqual([
      [44.91, 4.89], [44.99, 4.81], [45.09, 4.84],
      [44.91, 4.89], // retour au dépôt : pas de tracé connu, ligne droite entre les pastilles
    ])
    // Le retour c02 → c01 utilise le tracé c01 → c02 à l'envers.
    expect(tracerParLaRoute(traces, [b, a])).toEqual([[45.09, 4.84], [44.99, 4.81]])
  })

  it('pose chaque pastille sur la route, là où le trait passe', () => {
    expect(placerSurLaRoute(traces, depot)).toEqual([44.91, 4.89])
    expect(placerSurLaRoute(traces, b)).toEqual([45.09, 4.84])
    expect(placerSurLaRoute(traces, { id: 'c99', lat: 45.2, lng: 4.7 })).toEqual([45.2, 4.7])
  })

  it('sans tracés (fichier absent) : lignes droites entre les points exacts', () => {
    expect(tracerParLaRoute(null, [depot, a, depot])).toEqual([[44.9, 4.9], [45.0, 4.8], [44.9, 4.9]])
    expect(placerSurLaRoute(null, a)).toEqual([45.0, 4.8])
  })
})
