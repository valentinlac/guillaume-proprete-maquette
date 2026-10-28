/**
 * Saisie automatique : les lignes du relevé bancaire sont reconnues (quel
 * fournisseur ou client ?) et classées (quelle catégorie ?), et les virements
 * clients sont rapprochés des factures à encaisser. L'utilisateur valide.
 */
import type { Categorie, Facture, JeuDeDonnees, LigneReleve, Mouvement } from '../donnees/types'
import { suggestionPourTiers } from './calculs'
import { cleRecurrent } from './recurrents'

export type OrigineClassement = 'habitude' | 'facture' | 'inconnu'

export interface LigneClassee {
  ligne: LigneReleve
  /** Fournisseur ou client reconnu (ou le libellé nettoyé s'il est inconnu). */
  tiers: string
  /** Catégorie proposée ; null si l'outil ne sait pas (à classer à la main). */
  categorie: Categorie | null
  origine: OrigineClassement
  /** Facture rapprochée, pour un virement client. */
  facture?: Facture
}

function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Mots significatifs d'un nom (4 lettres ou plus). */
function motsCles(nom: string): string[] {
  return normaliser(nom).split(' ').filter((m) => m.length >= 4)
}

/**
 * Reconnaît le fournisseur ou client d'un libellé bancaire parmi les noms connus :
 * tous ses mots significatifs doivent figurer dans le libellé. Le nom le plus précis l'emporte.
 */
export function reconnaitreTiers(libelle: string, noms: string[]): string | null {
  const mots = new Set(normaliser(libelle).split(' '))
  let meilleur: { nom: string; score: number } | null = null
  for (const nom of noms) {
    const cles = motsCles(nom)
    if (cles.length === 0 || !cles.every((m) => mots.has(m))) continue
    if (!meilleur || cles.length > meilleur.score) meilleur = { nom, score: cles.length }
  }
  return meilleur?.nom ?? null
}

/** Libellé bancaire débarrassé des préfixes techniques (CB, VIR, PRLV, date…). */
function nettoyerLibelle(libelle: string): string {
  return libelle
    .replace(/^(CB|VIR( SEPA)?|PRLV( SEPA)?)\s+/i, '')
    .replace(/\s+\d{2}\/\d{2}$/, '')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
}

/** Lignes du relevé pas encore enregistrées (même date, même montant, même tiers). */
function dejaSaisie(mouvements: Mouvement[], ligne: LigneReleve, tiers: string): boolean {
  return mouvements.some((m) => m.date === ligne.date && Math.abs(m.montant - ligne.montant) < 0.01 && m.tiers === tiers)
}

export function classerReleve(jeu: Pick<JeuDeDonnees, 'releveDuJour' | 'mouvements' | 'factures' | 'clients'>): LigneClassee[] {
  const nomsConnus = [...new Set([...jeu.mouvements.map((m) => m.tiers), ...jeu.factures.map((f) => f.client), ...jeu.clients.map((c) => c.nom)])]
  const resultat: LigneClassee[] = []
  for (const ligne of jeu.releveDuJour) {
    const reconnu = reconnaitreTiers(ligne.libelle, nomsConnus)
    const tiers = reconnu ?? nettoyerLibelle(ligne.libelle)
    if (dejaSaisie(jeu.mouvements, ligne, tiers)) continue

    // Virement client : rapprochement avec une facture du même client, au montant près (±1 %).
    const facture =
      ligne.montant > 0 && reconnu
        ? jeu.factures.find((f) => f.client === reconnu && Math.abs(f.montant - ligne.montant) <= f.montant * 0.01)
        : undefined
    if (facture) {
      resultat.push({ ligne, tiers, categorie: 'encaissements_clients', origine: 'facture', facture })
      continue
    }
    const habitude = reconnu ? suggestionPourTiers(jeu.mouvements, reconnu) : null
    resultat.push({ ligne, tiers, categorie: habitude?.categorie ?? null, origine: habitude ? 'habitude' : 'inconnu' })
  }
  return resultat
}

/**
 * Enregistre les lignes validées : nouveaux mouvements (marqués « récurrent »
 * s'ils correspondent à une dépense fixe confirmée) et factures payées retirées
 * des factures à encaisser.
 */
export function validerReleve<T extends Pick<JeuDeDonnees, 'entite' | 'mouvements' | 'factures' | 'decisionsRecurrents'>>(
  jeu: T,
  lignes: { classee: LigneClassee; categorie: Categorie }[],
): T {
  const nouveaux: Mouvement[] = lignes.map(({ classee, categorie }, k) => ({
    id: `${jeu.entite.id}-banque-${classee.ligne.id}-${k}`,
    date: classee.ligne.date,
    montant: classee.ligne.montant,
    categorie,
    tiers: classee.tiers,
    recurrent: jeu.decisionsRecurrents[cleRecurrent(classee.tiers, classee.ligne.montant)]?.statut === 'confirme',
  }))
  const payees = new Set(lignes.map((l) => l.classee.facture?.id).filter(Boolean))
  return {
    ...jeu,
    mouvements: [...jeu.mouvements, ...nouveaux].sort((a, b) => a.date.localeCompare(b.date)),
    factures: jeu.factures.filter((f) => !payees.has(f.id)),
  }
}

