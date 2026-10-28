import { describe, expect, it } from 'vitest'
import { distanceVolOiseauKm } from '../trajets/tempsTrajet'
import { soldeAu } from '../tresorerie/calculs'
import { chargerJeux, dateValide } from './chargement'
import { CALENDRIER_TRAVAIL, DATE_DU_JOUR, ENTITES } from './donnees-fictives'

const jeux = chargerJeux()

describe('fichier de données fictives', () => {
  it('contient l’entité principale et 2 franchisés', () => {
    expect(ENTITES.map((e) => e.type)).toEqual(['societe', 'franchise', 'franchise'])
  })

  it('a 40 clients pour Valence, 2 agents par entité', () => {
    expect(jeux.valence.clients).toHaveLength(40)
    for (const jeu of Object.values(jeux)) expect(jeu.agents).toHaveLength(2)
  })

  it('a des identifiants de clients uniques', () => {
    for (const jeu of Object.values(jeux)) {
      const ids = jeu.clients.map((c) => c.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('mélange les fréquences', () => {
    const frequences = new Set(jeux.valence.clients.map((c) => c.frequence))
    expect(frequences).toEqual(new Set(['quinzaine', 'mensuelle', 'trimestrielle', 'semestrielle']))
  })

  it('place chaque client à moins de 30 km de son dépôt', () => {
    for (const jeu of Object.values(jeux)) {
      for (const c of jeu.clients) {
        expect(distanceVolOiseauKm(jeu.entite.depot, c), `${jeu.entite.id} / ${c.nom}`).toBeLessThan(30)
      }
    }
  })

  it('a des mois dus cohérents avec la fréquence', () => {
    const attendu = { quinzaine: [11, 12], mensuelle: [11, 12], trimestrielle: [4, 4], semestrielle: [2, 2] }
    for (const jeu of Object.values(jeux)) {
      for (const c of jeu.clients) {
        const nb = c.moisDus.filter(Boolean).length
        const [min, max] = attendu[c.frequence]
        expect(nb, c.nom).toBeGreaterThanOrEqual(min)
        expect(nb, c.nom).toBeLessThanOrEqual(max)
      }
    }
  })

  it('génère un contact fictif complet', () => {
    const c = jeux.valence.clients[0]
    expect(c.contact.telephone).toMatch(/^06( \d\d){4}$/)
    expect(c.contact.email).toMatch(/@.+\.exemple\.fr$/)
  })

  it('génère environ 150 mouvements sur 6 mois pour Valence, avant la date du jour', () => {
    const mv = jeux.valence.mouvements
    expect(mv.length).toBeGreaterThanOrEqual(130)
    expect(mv.length).toBeLessThanOrEqual(175)
    expect(mv.every((m) => m.date < DATE_DU_JOUR && m.date >= '2026-05-01')).toBe(true)
    expect(mv.every((m) => dateValide(m.date))).toBe(true)
  })

  it('génère des mouvements identiques à chaque chargement', () => {
    expect(chargerJeux().valence.mouvements).toEqual(jeux.valence.mouvements)
  })

  it('a 12 factures par entité : une seule échue, celle que le client règle dans le relevé du jour', () => {
    for (const jeu of Object.values(jeux)) {
      expect(jeu.factures).toHaveLength(12)
      expect(jeu.factures.every((f) => dateValide(f.echeance))).toBe(true)
      const echues = jeu.factures.filter((f) => f.echeance < DATE_DU_JOUR)
      expect(echues).toHaveLength(1)
      expect(jeu.releveDuJour.some((l) => l.montant === echues[0].montant)).toBe(true)
    }
  })

  it('a des données différentes par entité', () => {
    expect(jeux.romans.clients[0].nom).not.toBe(jeux.valence.clients[0].nom)
    expect(soldeAu(jeux.romans, DATE_DU_JOUR)).not.toBe(soldeAu(jeux.valence, DATE_DU_JOUR))
  })

  it('donne un solde actuel positif et plausible', () => {
    for (const jeu of Object.values(jeux)) {
      const solde = soldeAu(jeu, DATE_DU_JOUR)
      expect(solde, jeu.entite.id).toBeGreaterThan(5_000)
      expect(solde, jeu.entite.id).toBeLessThan(80_000)
    }
  })

  it('arrive avec un planning déjà calculé pour le mois en cours et le suivant', () => {
    for (const jeu of Object.values(jeux)) {
      expect(jeu.interventions.length, jeu.entite.id).toBeGreaterThan(20)
      expect(jeu.interventions.some((i) => i.date.startsWith('2026-10'))).toBe(true)
      expect(jeu.interventions.some((i) => i.date.startsWith('2026-11'))).toBe(true)
    }
  })

  it('a des jours fériés valides', () => {
    expect(CALENDRIER_TRAVAIL.joursFeries.every(dateValide)).toBe(true)
  })
})
