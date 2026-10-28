import { describe, expect, it } from 'vitest'
import { chargerJeux } from '../donnees/chargement'
import { soldeFinDeJournee } from './calculs'
import { attendusAujourdhui, recurrentsAvecDecisions } from './recurrents'
import { classerReleve, reconnaitreTiers, validerReleve } from './releve'

const AUJOURDHUI = '2026-10-28'
const jeux = chargerJeux(AUJOURDHUI)

describe('reconnaissance du libellé bancaire', () => {
  const noms = ['URSSAF', 'Mutuelle santé collective', 'Mutuelle des Artisans (RC pro)', 'Station du Rhône', 'Distri-Hygiène Pro', "Confiserie Le Nougat d'Antan"]

  it('reconnaît un fournisseur malgré majuscules, accents, tirets et préfixes bancaires', () => {
    expect(reconnaitreTiers('CB STATION DU RHONE 27/10', noms)).toBe('Station du Rhône')
    expect(reconnaitreTiers('PRLV SEPA DISTRI-HYGIENE PRO', noms)).toBe('Distri-Hygiène Pro')
    expect(reconnaitreTiers("VIR CONFISERIE LE NOUGAT D'ANTAN", noms)).toBe("Confiserie Le Nougat d'Antan")
    expect(reconnaitreTiers('PRLV URSSAF RHONE ALPES', noms)).toBe('URSSAF')
  })

  it('choisit le nom le plus précis et ne devine pas', () => {
    expect(reconnaitreTiers('PRLV MUTUELLE DES ARTISANS', noms)).toBe('Mutuelle des Artisans (RC pro)')
    expect(reconnaitreTiers('CB BRICOMARCHE VALENCE', noms)).toBeNull()
  })
})

describe.each(Object.keys(jeux))('relevé du jour (%s)', (id) => {
  const jeu = jeux[id]

  it('reconnaît et classe chaque ligne ; un seul fournisseur inconnu à classer', () => {
    const lignes = classerReleve(jeu)
    expect(lignes).toHaveLength(jeu.releveDuJour.length)
    expect(lignes.filter((l) => l.origine === 'inconnu')).toHaveLength(1)
    expect(lignes.find((l) => l.ligne.libelle.includes('SALAIRES'))).toMatchObject({ tiers: 'Salaires (virements)', categorie: 'social', origine: 'habitude' })
    expect(lignes.find((l) => l.ligne.libelle.startsWith('CB STATION'))!.categorie).toBe('carburant')
  })

  it('rapproche le virement client de sa facture', () => {
    const virement = classerReleve(jeu).find((l) => l.origine === 'facture')!
    expect(virement.categorie).toBe('encaissements_clients')
    expect(virement.facture!.montant).toBeCloseTo(virement.ligne.montant, 2)
    expect(virement.facture!.client).toBe(virement.tiers)
  })

  it('valide : mouvements enregistrés, facture payée retirée, salaires plus « attendus », rien en double', () => {
    const lignes = classerReleve(jeu)
    const apres = validerReleve(jeu, lignes.map((l) => ({ classee: l, categorie: l.categorie ?? 'fournitures' })))
    const total = jeu.releveDuJour.reduce((s, l) => s + l.montant, 0)
    expect(soldeFinDeJournee(apres, AUJOURDHUI)).toBeCloseTo(soldeFinDeJournee(jeu, AUJOURDHUI) + total, 2)
    expect(apres.factures).toHaveLength(jeu.factures.length - 1)
    const recurrents = recurrentsAvecDecisions(apres.mouvements, apres.decisionsRecurrents)
    expect(attendusAujourdhui(apres.mouvements, recurrents, AUJOURDHUI)).toEqual([])
    expect(apres.mouvements.find((m) => m.tiers === 'Salaires (virements)' && m.date === AUJOURDHUI)!.recurrent).toBe(true)
    // Une nouvelle synchronisation ne repropose pas les mêmes lignes.
    expect(classerReleve(apres)).toEqual([])
  })
})
