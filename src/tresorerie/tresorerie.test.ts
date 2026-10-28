import { describe, expect, it } from 'vitest'
import { chargerJeux } from '../donnees/chargement'
import { ENTITES } from '../donnees/donnees-fictives'
import type { Mouvement } from '../donnees/types'
import { journalParJour, soldeAu, soldeFinDeJournee, suggestionPourTiers, totauxDuMois } from './calculs'
import { prevuContreReel } from './budget'
import { detailArrondi, detailCalcul, evenementsPrevus, minimumsHebdomadaires, postesVariables, prevoir, resumePrevision, soldePrevuAu } from './prevision'
import { attendusAujourdhui, detecterRecurrents, marquerRecurrents, recurrentsAvecDecisions } from './recurrents'

const AUJOURDHUI = '2026-10-28'
const jeux = chargerJeux(AUJOURDHUI)
const mv = (date: string, montant: number, tiers = 'Fournisseur test'): Mouvement => ({
  id: `${tiers}-${date}`, date, montant, tiers, categorie: 'fournitures', recurrent: false,
})

describe('détection des récurrents', () => {
  it.each(ENTITES.map((e) => [e.id, e] as const))('%s : retrouve exactement les prélèvements et virements réguliers', (id, source) => {
    const detectes = detecterRecurrents(jeux[id].mouvements).map((r) => r.tiers).sort()
    expect(detectes).toEqual(source.tresorerie.recurrents.map((r) => r.tiers).sort())
  })

  it('ne retient pas le carburant ni les fournitures (plusieurs fois par mois, montants variables)', () => {
    const categories = new Set(detecterRecurrents(jeux.valence.mouvements).map((r) => r.categorie))
    expect(categories.has('carburant')).toBe(false)
    expect(categories.has('fournitures')).toBe(false)
  })

  it('tolère un prélèvement décalé au lundi et une petite variation de montant', () => {
    const r = detecterRecurrents([mv('2026-05-05', -100), mv('2026-06-08', -103), mv('2026-07-05', -97), mv('2026-08-06', -100)])
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ jour: 6, montant: -100, occurrences: 4 })
  })

  it('refuse un montant qui varie trop, un jour trop variable, deux fois par mois ou moins de 3 mois', () => {
    expect(detecterRecurrents([mv('2026-05-05', -100), mv('2026-06-05', -100), mv('2026-07-05', -125)])).toEqual([])
    expect(detecterRecurrents([mv('2026-05-05', -100), mv('2026-06-15', -100), mv('2026-07-25', -100)])).toEqual([])
    expect(detecterRecurrents([mv('2026-05-05', -100), mv('2026-05-06', -100), mv('2026-06-05', -100), mv('2026-07-05', -100)])).toEqual([])
    expect(detecterRecurrents([mv('2026-05-05', -100), mv('2026-06-05', -100)])).toEqual([])
  })

  it('applique les décisions et corrections de l’utilisateur', () => {
    const r = recurrentsAvecDecisions(jeux.valence.mouvements, {
      'Cadulis|sortie': { statut: 'confirme', montant: -55, jour: 4 },
      'Fibre Pro|sortie': { statut: 'ecarte' },
    })
    expect(r.find((x) => x.tiers === 'Cadulis')).toMatchObject({ statut: 'confirme', montant: -55, jour: 4 })
    expect(r.find((x) => x.tiers === 'Fibre Pro')!.statut).toBe('ecarte')
    expect(r.find((x) => x.tiers === 'URSSAF')!.statut).toBe('propose')
  })

  it('arrive avec des récurrents déjà confirmés et quelques-uns à confirmer pour la démo', () => {
    const r = recurrentsAvecDecisions(jeux.valence.mouvements, jeux.valence.decisionsRecurrents)
    expect(r.filter((x) => x.statut === 'propose').map((x) => x.tiers).sort()).toEqual(['Assurance flotte véhicules', 'Cadulis', 'Fibre Pro'])
    expect(r.filter((x) => x.statut === 'confirme')).toHaveLength(13)
  })

  it('marque « récurrent » les mouvements des récurrents confirmés', () => {
    const r = recurrentsAvecDecisions(jeux.valence.mouvements, jeux.valence.decisionsRecurrents)
    const marques = marquerRecurrents(jeux.valence.mouvements, r)
    expect(marques.filter((m) => m.tiers === 'URSSAF').every((m) => m.recurrent)).toBe(true)
    expect(marques.filter((m) => m.tiers === 'Cadulis').some((m) => m.recurrent)).toBe(false)
    expect(marques.filter((m) => m.categorie === 'carburant').some((m) => m.recurrent)).toBe(false)
  })
})

describe('mouvements attendus aujourd’hui', () => {
  it('propose les salaires du 28, pas encore saisis, puis plus rien une fois saisis', () => {
    const jeu = jeux.valence
    const r = recurrentsAvecDecisions(jeu.mouvements, jeu.decisionsRecurrents)
    const attendus = attendusAujourdhui(jeu.mouvements, r, AUJOURDHUI)
    expect(attendus.map((x) => x.tiers)).toEqual(['Salaires (virements)'])
    const saisi = [...jeu.mouvements, mv(AUJOURDHUI, attendus[0].montant, 'Salaires (virements)')]
    expect(attendusAujourdhui(saisi, r, AUJOURDHUI)).toEqual([])
  })

  it('arrive avec les mouvements des récurrents confirmés marqués « récurrent »', () => {
    expect(jeux.valence.mouvements.filter((m) => m.tiers === 'URSSAF').every((m) => m.recurrent)).toBe(true)
  })
})

describe('soldes et journal', () => {
  const jeu = jeux.valence

  it('distingue le solde du matin et celui du soir', () => {
    const avecAujourdhui = { ...jeu, mouvements: [...jeu.mouvements, mv(AUJOURDHUI, -500)] }
    expect(soldeFinDeJournee(avecAujourdhui, AUJOURDHUI)).toBeCloseTo(soldeAu(avecAujourdhui, AUJOURDHUI) - 500)
  })

  it('totalise les entrées et sorties du mois jusqu’à aujourd’hui', () => {
    const t = totauxDuMois(jeu.mouvements, '2026-10', AUJOURDHUI)
    const oct = jeu.mouvements.filter((m) => m.date.startsWith('2026-10'))
    expect(t.entrees + t.sorties).toBeCloseTo(oct.reduce((s, m) => s + m.montant, 0))
    expect(t.entrees).toBeGreaterThan(0)
    expect(t.sorties).toBeLessThan(0)
  })

  it('tient un journal jour par jour qui s’enchaîne (solde de la veille → solde du jour)', () => {
    const journal = journalParJour(jeu, '2026-10-01', AUJOURDHUI)
    expect(journal[0].soldeVeille).toBeCloseTo(soldeAu(jeu, '2026-10-01'))
    for (let k = 1; k < journal.length; k++) expect(journal[k].soldeVeille).toBeCloseTo(journal[k - 1].solde)
    expect(journal[journal.length - 1].solde).toBeCloseTo(soldeFinDeJournee(jeu, AUJOURDHUI))
  })

  it('pré-remplit la catégorie et le montant habituels d’un fournisseur connu', () => {
    expect(suggestionPourTiers(jeu.mouvements, 'urssaf')).toMatchObject({ categorie: 'social' })
    expect(suggestionPourTiers(jeu.mouvements, 'Inconnu SARL')).toBeNull()
  })
})

describe('prévision', () => {
  const jeu = jeux.valence
  const recurrents = recurrentsAvecDecisions(jeu.mouvements, jeu.decisionsRecurrents)

  it('part du solde actuel et va jusqu’à 3 ou 6 mois', () => {
    const p6 = prevoir(jeu, recurrents, AUJOURDHUI, 6)
    expect(p6.soldeActuel).toBeCloseTo(soldeFinDeJournee(jeu, AUJOURDHUI))
    expect(p6.points[0].date).toBe(AUJOURDHUI)
    expect(p6.points[p6.points.length - 1].date).toBe('2027-04-28')
    expect(prevoir(jeu, recurrents, AUJOURDHUI, 3).fin).toBe('2027-01-28')
  })

  it('le solde final est le solde actuel plus tous les événements prévus', () => {
    const p = prevoir(jeu, recurrents, AUJOURDHUI, 6)
    const somme = p.evenements.reduce((s, e) => s + e.montant, 0)
    expect(p.points[p.points.length - 1].solde).toBeCloseTo(p.soldeActuel + somme, 0)
  })

  it('compte chaque récurrent confirmé une fois par mois, sans les écartés ni les proposés', () => {
    const ev = evenementsPrevus(jeu, recurrents, AUJOURDHUI, '2027-04-28').filter((e) => e.type === 'recurrent')
    const urssaf = ev.filter((e) => e.libelle === 'URSSAF').map((e) => e.date.slice(0, 7))
    expect(urssaf).toEqual(['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04'])
    expect(ev.some((e) => e.libelle === 'Cadulis')).toBe(false)
  })

  it('prévoit le salaire d’octobre, pas encore versé aujourd’hui', () => {
    const ev = evenementsPrevus(jeu, recurrents, AUJOURDHUI, '2026-11-30')
    expect(ev.filter((e) => e.libelle === 'Salaires (virements)').map((e) => e.date)).toEqual(['2026-10-28', '2026-11-30'])
  })

  it('ne compte pas deux fois un client récurrent qui a une facture à encaisser le même mois', () => {
    const ev = evenementsPrevus(jeu, recurrents, AUJOURDHUI, '2026-12-31')
    const glycinesNov = ev.filter((e) => e.libelle.includes('Résidence Les Glycines') && e.date.startsWith('2026-11'))
    expect(glycinesNov).toHaveLength(1)
    expect(glycinesNov[0].type).toBe('facture')
    expect(ev.filter((e) => e.libelle === 'Résidence Les Glycines' && e.date.startsWith('2026-12'))).toHaveLength(1)
  })

  it('compte les postes variables à leur moyenne mensuelle', () => {
    const variables = postesVariables(jeu.mouvements, recurrents, AUJOURDHUI)
    const carburant = variables.find((v) => v.categorie === 'carburant')!
    const historique = jeu.mouvements.filter((m) => m.categorie === 'carburant' && m.date < '2026-10-01')
    expect(carburant.montantMensuel).toBeCloseTo(historique.reduce((s, m) => s + m.montant, 0) / 5, 1)
    // Confirmer un récurrent le sort de la moyenne variable de sa catégorie.
    const tel = (r: typeof recurrents) => postesVariables(jeu.mouvements, r, AUJOURDHUI).find((v) => v.categorie === 'telephonie_internet')!.montantMensuel
    const confirmes = recurrents.map((r) => (r.tiers === 'Cadulis' ? { ...r, statut: 'confirme' as const } : r))
    expect(tel(confirmes)).toBeCloseTo(tel(recurrents) + 49, 1)
  })

  it.each(Object.keys(jeux))('%s : soldes prévus plausibles, Valence reste positive', (id) => {
    const j = jeux[id]
    const p = prevoir(j, recurrentsAvecDecisions(j.mouvements, j.decisionsRecurrents), AUJOURDHUI, 6)
    expect(Number.isFinite(soldePrevuAu(p, '2027-01-28'))).toBe(true)
    if (id === 'valence') expect(p.pointBas.solde).toBeGreaterThan(10_000)
  })
})

describe('scénarios', () => {
  const jeu = jeux.valence
  const recurrents = recurrentsAvecDecisions(jeu.mouvements, jeu.decisionsRecurrents)
  const base = prevoir(jeu, recurrents, AUJOURDHUI, 6)

  it('retard de 30 jours d’un gros client : la facture est décalée, pas perdue', () => {
    const retard = prevoir(jeu, recurrents, AUJOURDHUI, 6, { retard: { client: 'Résidence Les Glycines', jours: 30 } })
    // Entre le paiement attendu (10/11) et le paiement réel (10/12), il manque 7 800 €.
    expect(soldePrevuAu(retard, '2026-11-20')).toBeCloseTo(soldePrevuAu(base, '2026-11-20') - 7800, 0)
    expect(retard.pointBas.solde).toBeLessThan(base.pointBas.solde)
    expect(retard.pointBas.date > '2026-11-10' && retard.pointBas.date < '2026-12-10').toBe(true)
    const facture = retard.evenements.find((e) => e.type === 'facture' && e.libelle.includes('Résidence Les Glycines'))!
    expect(facture.date).toBe('2026-12-10') // facture du 10/11 encaissée le 10/12
    expect(facture.libelle).toContain('(+30 j)')
    // Les paiements habituels des mois suivants ne bougent pas.
    const habituels = (p: typeof base) => p.evenements.filter((e) => e.type === 'recurrent' && e.libelle === 'Résidence Les Glycines').map((e) => e.date)
    expect(habituels(retard)).toEqual(habituels(base))
    // Une fois la facture payée, on retrouve exactement le même solde.
    expect(soldePrevuAu(retard, '2026-12-10')).toBeCloseTo(soldePrevuAu(base, '2026-12-10'), 2)
    expect(retard.points.at(-1)!.solde).toBeCloseTo(base.points.at(-1)!.solde, 2)
  })

  it('retard qui dépasse l’horizon : la facture sort de la période (3 mois, 120 jours)', () => {
    const base3 = prevoir(jeu, recurrents, AUJOURDHUI, 3)
    const retard = prevoir(jeu, recurrents, AUJOURDHUI, 3, { retard: { client: 'Résidence Les Glycines', jours: 120 } })
    expect(retard.points.at(-1)!.solde).toBeCloseTo(base3.points.at(-1)!.solde - 7800, 2)
  })

  it('dépense exceptionnelle : la courbe baisse du montant à partir de la date choisie', () => {
    const avec = prevoir(jeu, recurrents, AUJOURDHUI, 6, { depense: { date: '2026-12-15', montant: 12000, libelle: 'Achat véhicule' } })
    expect(soldePrevuAu(avec, '2026-12-14')).toBeCloseTo(soldePrevuAu(base, '2026-12-14'), 2)
    expect(soldePrevuAu(avec, '2026-12-15')).toBeCloseTo(soldePrevuAu(base, '2026-12-15') - 12000, 2)
  })

  it('une dépense hors période n’a pas d’effet', () => {
    const avec = prevoir(jeu, recurrents, AUJOURDHUI, 3, { depense: { date: '2027-03-15', montant: 12000, libelle: 'Plus tard' } })
    expect(avec.points.at(-1)!.solde).toBeCloseTo(prevoir(jeu, recurrents, AUJOURDHUI, 3).points.at(-1)!.solde, 2)
  })
})

describe('prévu contre réel', () => {
  const jeu = jeux.valence
  const recurrents = recurrentsAvecDecisions(jeu.mouvements, jeu.decisionsRecurrents)

  it('sur un mois complet (septembre), le réalisé est proche du prévu', () => {
    const lignes = prevuContreReel(jeu.mouvements, recurrents, '2026-09', AUJOURDHUI)
    const social = lignes.find((l) => l.categorie === 'social')!
    expect(Math.abs(social.ecart / social.prevu)).toBeLessThan(0.05)
    const total = lignes.reduce((s, l) => s + l.realise, 0)
    expect(total).toBeCloseTo(jeu.mouvements.filter((m) => m.date.startsWith('2026-09')).reduce((s, m) => s + m.montant, 0), 1)
  })

  it('sur le mois en cours, compare au prévu à date (les salaires du jour ne passent pas pour une économie)', () => {
    const lignes = prevuContreReel(jeu.mouvements, recurrents, '2026-10', AUJOURDHUI)
    const social = lignes.find((l) => l.categorie === 'social')!
    // URSSAF, retraite, mutuelle sont passées ; les salaires du 28 ne sont pas encore attendus.
    expect(Math.abs(social.ecart / social.prevu)).toBeLessThan(0.05)
    const septembre = prevuContreReel(jeu.mouvements, recurrents, '2026-09', AUJOURDHUI).find((l) => l.categorie === 'social')!
    expect(Math.abs(social.prevu)).toBeLessThan(Math.abs(septembre.prevu))
    expect(lignes.every((l) => Number.isFinite(l.ecart))).toBe(true)
  })
})

describe('résumé de la prévision', () => {
  it('additionne rentrées et dépenses fixes confirmées, courant moyen et factures', () => {
    const jeu = jeux.valence
    const recurrents = recurrentsAvecDecisions(jeu.mouvements, jeu.decisionsRecurrents)
    const r = resumePrevision(jeu.mouvements, recurrents, jeu.factures, AUJOURDHUI)
    expect(r.rentreesFixes).toBeCloseTo(7800 + 4178.91 + 3600 + 2400 + 1891.41, 0)
    expect(r.depensesFixes).toBeLessThan(-18000)
    expect(r.facturesNombre).toBe(12)
    const variables = postesVariables(jeu.mouvements, recurrents, AUJOURDHUI)
    expect(r.encaissementsCourants + r.depensesCourantes).toBeCloseTo(variables.reduce((s, p) => s + p.montantMensuel, 0), 2)
    expect(r.encaissementsCourants).toBeGreaterThan(0)
    expect(r.depensesCourantes).toBeLessThan(0)
  })
})

describe('courbe hebdomadaire', () => {
  it('donne un point par semaine, au plus bas de la semaine, sans perdre le moment le plus bas', () => {
    const jeu = jeux.valence
    const p = prevoir(jeu, recurrentsAvecDecisions(jeu.mouvements, jeu.decisionsRecurrents), AUJOURDHUI, 6)
    const semaines = minimumsHebdomadaires(p.points)
    expect(semaines.length).toBeGreaterThanOrEqual(26)
    expect(semaines.length).toBeLessThanOrEqual(28)
    expect(semaines.every((s) => new Date(s.date).getDay() === 1)).toBe(true) // des lundis
    expect(Math.min(...semaines.map((s) => s.solde))).toBeCloseTo(p.pointBas.solde, 2)
  })
})

describe('détail du calcul', () => {
  it('cas simple fait à la main : 1 000 € + assurance -400 €/mois + contrat +600 €/mois remplacé par une facture de 650 €', () => {
    const mouvements = ['2026-07', '2026-08', '2026-09'].flatMap((m) => [
      { id: `l${m}`, date: `${m}-05`, montant: -400, categorie: 'assurances' as const, tiers: 'Assureur', recurrent: true },
      { id: `c${m}`, date: `${m}-15`, montant: 600, categorie: 'encaissements_clients' as const, tiers: 'Client A', recurrent: true },
    ])
    const donnees = { soldeInitial: 1000 - 3 * 200, mouvements, factures: [{ id: 'f1', client: 'Client A', montant: 650, echeance: '2026-10-15' }] }
    const decisions = Object.fromEntries(detecterRecurrents(mouvements).map((r) => [r.cle, { statut: 'confirme' as const }]))
    const recurrents = recurrentsAvecDecisions(mouvements, decisions)
    expect(recurrents.filter((r) => r.statut === 'confirme')).toHaveLength(2)
    // Du 01/10 au 01/12 : octobre (assurance -400, facture +650 au lieu du contrat) et novembre (assurance -400, contrat +600).
    const p = prevoir(donnees, recurrents, '2026-10-01', 2)
    expect(p.soldeActuel).toBe(1000)
    const d = detailCalcul(p, '2026-10-01')
    expect(d).toMatchObject({ aujourdhui: 0, paiementsClients: 1250, dontFactures: 650, depensesFixes: -800, autresRentrees: 0, depensesCourantes: 0 })
    expect(d.soldeFinal).toBeCloseTo(1000 + 1250 - 800, 2)
  })

  it.each(Object.keys(jeux))('%s : les lignes affichées s’additionnent exactement au solde final', (id) => {
    const jeu = jeux[id]
    const recurrents = recurrentsAvecDecisions(jeu.mouvements, jeu.decisionsRecurrents)
    for (const nbMois of [3, 6]) {
      const d = detailCalcul(prevoir(jeu, recurrents, AUJOURDHUI, nbMois, { depense: { date: '2026-12-12', montant: 8000, libelle: 'x' } }), AUJOURDHUI)
      const somme = d.soldeActuel + d.aujourdhui + d.paiementsClients + d.depensesFixes + d.autresRentrees + d.depensesCourantes + d.exceptionnel
      expect(somme).toBeCloseTo(d.soldeFinal, 1)
    }
  })

  it.each(Object.keys(jeux))('%s : les montants affichés, arrondis à l’euro, s’additionnent aussi exactement', (id) => {
    const jeu = jeux[id]
    const recurrents = recurrentsAvecDecisions(jeu.mouvements, jeu.decisionsRecurrents)
    for (const nbMois of [3, 6]) {
      for (const simulation of [undefined, { depense: { date: '2026-12-12', montant: 8000, libelle: 'x' } }]) {
        const brut = detailCalcul(prevoir(jeu, recurrents, AUJOURDHUI, nbMois, simulation), AUJOURDHUI)
        const d = detailArrondi(brut)
        const lignes = [d.aujourdhui, d.paiementsClients, d.depensesFixes, d.autresRentrees, d.depensesCourantes, d.exceptionnel]
        expect(lignes.every(Number.isInteger)).toBe(true)
        expect(d.soldeFinal).toBe(Math.round(brut.soldeFinal))
        expect(d.soldeActuel + lignes.reduce((a, b) => a + b, 0)).toBe(d.soldeFinal)
      }
    }
  })
})
