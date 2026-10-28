import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { integrerNouveauxClients } from '../planning/integration'
import { verifierPlanning } from '../planning/verifications'
import { distanceVolOiseauKm } from '../trajets/tempsTrajet'
import { chargerJeux } from './chargement'
import { lireCsvClients } from './importCsv'

const AUJOURDHUI = '2026-10-28'
const jeux = chargerJeux(AUJOURDHUI)
const ENTETE = 'nom;adresse;ville;latitude;longitude;tarif;frequence;duree_min;mois_dus;contact'

describe('import CSV des clients', () => {
  it.each(Object.keys(jeux))('lit le fichier d’exemple de %s sans erreur, autour du dépôt', (id) => {
    const jeu = jeux[id]
    const contenu = readFileSync(`public/exemple-clients-${id}.csv`, 'utf8')
    const r = lireCsvClients(contenu, jeu.clients)
    expect(r.erreurs).toEqual([])
    expect(r.clients.length).toBeGreaterThanOrEqual(3)
    for (const c of r.clients) {
      expect(jeu.clients.map((x) => x.id)).not.toContain(c.id)
      expect(distanceVolOiseauKm(jeu.entite.depot, c)).toBeLessThan(30)
    }
  })

  it('accepte virgule décimale, guillemets, accents et séparateur « , »', () => {
    const r = lireCsvClients(
      [
        'Nom,Adresse,Ville,Latitude,Longitude,Tarif,Fréquence,Duree_min,Mois_dus,Contact',
        '"Café ""Le Central""","1 rue A, bât. B",Valence,44.93,4.89,70 €,Mensuelle,60,XXXXXXXXXXXX,M. A',
      ].join('\n'),
    )
    expect(r.erreurs).toEqual([])
    expect(r.clients[0]).toMatchObject({ nom: 'Café "Le Central"', adresse: '1 rue A, bât. B', tarif: 70, frequence: 'mensuelle' })
  })

  it('explique chaque ligne refusée sans bloquer les autres', () => {
    const r = lireCsvClients(
      [
        ENTETE,
        'Bon client;1 rue A;Valence;44,93;4,89;70;mensuelle;60;XXXXXXXXXXXX;M. A',
        'Sans coordonnées;2 rue B;Valence;;;70;mensuelle;60;XXXXXXXXXXXX;M. B',
        'Fréquence bizarre;3 rue C;Valence;44,93;4,89;70;hebdo;60;XXXXXXXXXXXX;M. C',
        'Mois faux;4 rue D;Valence;44,93;4,89;70;mensuelle;60;XXX;M. D',
        ';5 rue E;Valence;44,93;4,89;0;mensuelle;600;XXXXXXXXXXXX;M. E',
      ].join('\r\n'),
    )
    expect(r.clients.map((c) => c.nom)).toEqual(['Bon client'])
    expect(r.erreurs.map((e) => e.ligne)).toEqual([3, 4, 5, 6])
    expect(r.erreurs[0].message).toContain('coordonnées manquantes')
    expect(r.erreurs[1].message).toContain('fréquence inconnue')
    expect(r.erreurs[2].message).toContain('mois dus invalides')
    expect(r.erreurs[3].message).toMatch(/nom vide.*tarif invalide.*durée invalide/)
  })

  it('écarte un client déjà présent (même nom, accents et majuscules ignorés) ou en double dans le fichier', () => {
    const csv = [ENTETE, 'PHARMACIE DES ARCADES;8 avenue Victor Hugo;Valence;44,93;4,89;55;quinzaine;45;XXXXXXXXXXXX;M. Roux', 'Nouveau;1 rue A;Valence;44,93;4,89;70;mensuelle;60;XXXXXXXXXXXX;M. A', 'Nouveau;1 rue A;Valence;44,93;4,89;70;mensuelle;60;XXXXXXXXXXXX;M. A'].join('\n')
    const r = lireCsvClients(csv, jeux.valence.clients)
    expect(r.clients.map((c) => c.nom)).toEqual(['Nouveau'])
    expect(r.erreurs.map((e) => e.message)).toEqual(['PHARMACIE DES ARCADES : déjà dans la liste, ignoré', 'Nouveau : déjà dans la liste, ignoré'])
  })

  it('refuse un fichier sans les bonnes colonnes ou vide', () => {
    expect(lireCsvClients('nom;ville\nA;B').erreurs[0].message).toContain('Colonne(s) manquante(s)')
    expect(lireCsvClients('   \n').erreurs[0].message).toBe('Fichier vide')
  })
})

describe('intégration des clients importés dans le planning', () => {
  it.each(Object.keys(jeux))('%s : place les passages des nouveaux clients sans abîmer le planning', (id) => {
    const jeu = jeux[id]
    const nouveaux = lireCsvClients(readFileSync(`public/exemple-clients-${id}.csv`, 'utf8'), jeu.clients).clients
    const r = integrerNouveauxClients(jeu, nouveaux, AUJOURDHUI)
    const tous = [...jeu.clients, ...nouveaux]
    const ctx = { depot: jeu.entite.depot, clients: tous, agents: jeu.agents }

    expect(r.nonPlaces).toEqual([])
    expect(r.places.length).toBeGreaterThanOrEqual(nouveaux.length)
    expect(verifierPlanning(ctx, r.interventions)).toEqual([])
    // Les interventions existantes gardent leur date et leur agent.
    for (const avant of jeu.interventions) {
      const apres = r.interventions.find((i) => i.id === avant.id)!
      expect([apres.date, apres.agentId, apres.statut]).toEqual([avant.date, avant.agentId, avant.statut])
    }
    // Uniquement dans le futur, et aux identifiants de passage habituels.
    const ajoutees = r.interventions.filter((i) => nouveaux.some((c) => c.id === i.clientId))
    expect(ajoutees.every((i) => i.date > AUJOURDHUI && i.statut === 'planifiee')).toBe(true)
    expect(ajoutees.every((i) => /^i\d\d-\d{4}-\d\d-[12]$/.test(i.id))).toBe(true)
  })
})
