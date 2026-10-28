/**
 * Prévision de trésorerie : solde projeté jour par jour.
 *
 * Construite à partir :
 * - des récurrents confirmés (chaque mois, au jour habituel, décalé au lundi si week-end) ;
 * - des factures clients à encaisser (à leur échéance) ; une facture remplace
 *   l'encaissement récurrent du même client le même mois ;
 * - des postes variables (carburant, fournitures…) à leur moyenne mensuelle
 *   sur l'historique, répartie sur le mois ;
 * - des scénarios éventuels (retard de paiement, dépense exceptionnelle).
 */
import type { Categorie, DateISO, Facture, Mouvement } from '../donnees/types'
import { ajouterJours, ajouterMois, annee, jourSemaine, mois, premierDuMois, versISO } from '../utils/dates'
import { soldeFinDeJournee } from './calculs'
import { cleRecurrent } from './recurrents'
import type { Recurrent } from './recurrents'

export type TypeEvenement = 'recurrent' | 'facture' | 'variable' | 'exceptionnel'

export interface EvenementPrevu {
  date: DateISO
  montant: number
  libelle: string
  categorie: Categorie
  type: TypeEvenement
}

export interface PosteVariable {
  categorie: Categorie
  /** Moyenne mensuelle signée. */
  montantMensuel: number
}

export interface Scenario {
  /**
   * Retard de paiement d'un client : ses factures en attente arrivent `jours` plus tard.
   * L'argent est décalé, pas perdu ; les paiements des mois suivants restent à leur date.
   */
  retard?: { client: string; jours: number }
  /** Dépense exceptionnelle. */
  depense?: { date: DateISO; montant: number; libelle: string }
}

export interface PointSolde {
  date: DateISO
  solde: number
}

export interface Prevision {
  soldeActuel: number
  evenements: EvenementPrevu[]
  points: PointSolde[]
  pointBas: PointSolde
  fin: DateISO
}

/** Les jours de prélèvement tombant un week-end passent au lundi. */
function jourBancaire(date: DateISO): DateISO {
  const j = jourSemaine(date)
  return j === 6 ? ajouterJours(date, 2) : j === 7 ? ajouterJours(date, 1) : date
}

function dateDuMois(a: number, m: number, jour: number): DateISO {
  const dernier = new Date(a, m + 1, 0).getDate()
  return jourBancaire(versISO(new Date(a, m, Math.min(jour, dernier))))
}

/** Mois complets de l'historique (avant le mois en cours). */
function moisComplets(mouvements: Mouvement[], dateDuJour: DateISO): string[] {
  const courant = dateDuJour.slice(0, 7)
  return [...new Set(mouvements.map((m) => m.date.slice(0, 7)))].filter((p) => p < courant).sort()
}

/**
 * Moyenne mensuelle par catégorie des mouvements non couverts par un récurrent
 * confirmé (carburant, fournitures, petits encaissements…).
 */
export function postesVariables(mouvements: Mouvement[], recurrents: Recurrent[], dateDuJour: DateISO): PosteVariable[] {
  const confirmes = new Set(recurrents.filter((r) => r.statut === 'confirme').map((r) => r.cle))
  const periodes = new Set(moisComplets(mouvements, dateDuJour))
  if (periodes.size === 0) return []
  const totaux = new Map<Categorie, number>()
  for (const m of mouvements) {
    if (!periodes.has(m.date.slice(0, 7)) || confirmes.has(cleRecurrent(m.tiers, m.montant))) continue
    totaux.set(m.categorie, (totaux.get(m.categorie) ?? 0) + m.montant)
  }
  return [...totaux]
    .map(([categorie, total]) => ({ categorie, montantMensuel: Math.round((total / periodes.size) * 100) / 100 }))
    .filter((p) => p.montantMensuel !== 0)
}

export function evenementsPrevus(
  donnees: { mouvements: Mouvement[]; factures: Facture[] },
  recurrents: Recurrent[],
  dateDuJour: DateISO,
  fin: DateISO,
  scenario: Scenario = {},
): EvenementPrevu[] {
  const evenements: EvenementPrevu[] = []
  const dejaPasses = new Set(donnees.mouvements.map((m) => `${cleRecurrent(m.tiers, m.montant)}#${m.date.slice(0, 7)}`))
  const facturesParClientMois = new Set(donnees.factures.map((f) => `${f.client}#${f.echeance.slice(0, 7)}`))

  const moisCouverts: { a: number; m: number }[] = []
  for (let d = premierDuMois(annee(dateDuJour), mois(dateDuJour)); d <= fin; d = ajouterMois(d, 1)) {
    moisCouverts.push({ a: annee(d), m: mois(d) })
  }

  const retardDe = (client: string) => (scenario.retard && scenario.retard.client === client ? scenario.retard.jours : 0)

  // Récurrents confirmés
  for (const r of recurrents.filter((x) => x.statut === 'confirme')) {
    for (const { a, m } of moisCouverts) {
      const prevue = dateDuMois(a, m, r.jour)
      const prefixe = prevue.slice(0, 7)
      if (prevue < dateDuJour || prevue > fin) continue
      if (dejaPasses.has(`${r.cle}#${prefixe}`)) continue // déjà passé ce mois-ci
      if (r.montant > 0 && facturesParClientMois.has(`${r.tiers}#${prefixe}`)) continue // la facture fait foi
      evenements.push({ date: prevue, montant: r.montant, libelle: r.tiers, categorie: r.categorie, type: 'recurrent' })
    }
  }

  // Factures à encaisser (avec un éventuel retard de paiement)
  for (const f of donnees.factures) {
    const retard = retardDe(f.client)
    const date = jourBancaire(ajouterJours(f.echeance < dateDuJour ? dateDuJour : f.echeance, retard))
    if (date > fin) continue // un retard au-delà de l'horizon sort la facture de la période affichée
    evenements.push({ date, montant: f.montant, libelle: `Facture ${f.client}${retard ? ` (+${retard} j)` : ''}`, categorie: 'encaissements_clients', type: 'facture' })
  }

  // Postes variables : moyenne mensuelle répartie en 4 fois.
  for (const p of postesVariables(donnees.mouvements, recurrents, dateDuJour)) {
    for (const { a, m } of moisCouverts) {
      for (const jour of [5, 12, 19, 26]) {
        const date = dateDuMois(a, m, jour)
        if (date < dateDuJour || date > fin) continue
        evenements.push({ date, montant: Math.round((p.montantMensuel / 4) * 100) / 100, libelle: `Moyenne ${p.categorie}`, categorie: p.categorie, type: 'variable' })
      }
    }
  }

  if (scenario.depense && scenario.depense.date >= dateDuJour && scenario.depense.date <= fin) {
    evenements.push({
      date: scenario.depense.date,
      montant: -Math.abs(scenario.depense.montant),
      libelle: scenario.depense.libelle,
      categorie: 'fournitures',
      type: 'exceptionnel',
    })
  }

  return evenements.sort((x, y) => x.date.localeCompare(y.date) || x.montant - y.montant)
}

export function prevoir(
  donnees: { soldeInitial: number; mouvements: Mouvement[]; factures: Facture[] },
  recurrents: Recurrent[],
  dateDuJour: DateISO,
  nbMois: number,
  scenario: Scenario = {},
): Prevision {
  const fin = ajouterMois(dateDuJour, nbMois)
  const soldeActuel = soldeFinDeJournee(donnees, dateDuJour)
  const evenements = evenementsPrevus(donnees, recurrents, dateDuJour, fin, scenario)

  const parJour = new Map<DateISO, number>()
  for (const e of evenements) parJour.set(e.date, (parJour.get(e.date) ?? 0) + e.montant)

  const points: PointSolde[] = []
  let solde = soldeActuel
  for (let d = dateDuJour; d <= fin; d = ajouterJours(d, 1)) {
    solde += parJour.get(d) ?? 0
    points.push({ date: d, solde: Math.round(solde * 100) / 100 })
  }
  const pointBas = points.reduce((bas, p) => (p.solde < bas.solde ? p : bas), points[0])
  return { soldeActuel, evenements, points, pointBas, fin }
}

/** Solde prévu à une date (fin de journée). */
export function soldePrevuAu(prevision: Prevision, date: DateISO): number {
  const point = [...prevision.points].reverse().find((p) => p.date <= date)
  return point ? point.solde : prevision.soldeActuel
}

export interface ResumePrevision {
  /** Rentrées fixes confirmées, par mois (contrats clients). */
  rentreesFixes: number
  /** Dépenses fixes confirmées, par mois (salaires, charges, abonnements…), en négatif. */
  depensesFixes: number
  /** Moyenne mensuelle des petits encaissements (paiements de passages hors contrats). */
  encaissementsCourants: number
  /** Moyenne mensuelle des dépenses courantes (carburant, fournitures, entretien…), en négatif. */
  depensesCourantes: number
  facturesNombre: number
  facturesTotal: number
}

/** Ce que la prévision prend en compte, en quelques chiffres lisibles. */
export function resumePrevision(
  mouvements: Mouvement[],
  recurrents: Recurrent[],
  factures: Facture[],
  dateDuJour: DateISO,
): ResumePrevision {
  const confirmes = recurrents.filter((r) => r.statut === 'confirme')
  const variables = postesVariables(mouvements, recurrents, dateDuJour)
  return {
    rentreesFixes: confirmes.filter((r) => r.montant > 0).reduce((s, r) => s + r.montant, 0),
    depensesFixes: confirmes.filter((r) => r.montant < 0).reduce((s, r) => s + r.montant, 0),
    encaissementsCourants: variables.filter((p) => p.montantMensuel > 0).reduce((s, p) => s + p.montantMensuel, 0),
    depensesCourantes: variables.filter((p) => p.montantMensuel < 0).reduce((s, p) => s + p.montantMensuel, 0),
    facturesNombre: factures.length,
    facturesTotal: factures.reduce((s, f) => s + f.montant, 0),
  }
}

/**
 * Pour l'affichage : un point par semaine (du lundi au dimanche), au solde le
 * plus bas de la semaine. La courbe est plus lisible et le moment le plus bas
 * reste exactement visible.
 */
export function minimumsHebdomadaires(points: PointSolde[]): PointSolde[] {
  const semaines = new Map<DateISO, PointSolde>()
  for (const p of points) {
    const lundi = ajouterJours(p.date, 1 - jourSemaine(p.date))
    const actuel = semaines.get(lundi)
    if (!actuel || p.solde < actuel.solde) semaines.set(lundi, { date: lundi, solde: p.solde })
  }
  return [...semaines.values()]
}

export interface DetailCalcul {
  soldeActuel: number
  /** Mouvements attendus aujourd'hui, pas encore passés sur le compte (ex. salaires du jour). */
  aujourdhui: number
  /** Paiements des clients : contrats mensuels et factures en attente (une facture remplace le paiement habituel du mois). */
  paiementsClients: number
  /** Dont factures en attente. */
  dontFactures: number
  depensesFixes: number
  autresRentrees: number
  depensesCourantes: number
  exceptionnel: number
  soldeFinal: number
}

/** Le calcul de la prévision, ligne par ligne : du solde d'aujourd'hui au solde final. */
export function detailCalcul(prevision: Prevision, dateDuJour: DateISO): DetailCalcul {
  const somme = (filtre: (e: EvenementPrevu) => boolean) => prevision.evenements.filter(filtre).reduce((s, e) => s + e.montant, 0)
  const plusTard = (e: EvenementPrevu) => e.date > dateDuJour
  return {
    soldeActuel: prevision.soldeActuel,
    aujourdhui: somme((e) => e.date === dateDuJour),
    paiementsClients: somme((e) => plusTard(e) && (e.type === 'facture' || (e.type === 'recurrent' && e.montant > 0))),
    dontFactures: somme((e) => plusTard(e) && e.type === 'facture'),
    depensesFixes: somme((e) => plusTard(e) && e.type === 'recurrent' && e.montant < 0),
    autresRentrees: somme((e) => plusTard(e) && e.type === 'variable' && e.montant > 0),
    depensesCourantes: somme((e) => plusTard(e) && e.type === 'variable' && e.montant < 0),
    exceptionnel: somme((e) => plusTard(e) && e.type === 'exceptionnel'),
    soldeFinal: prevision.points.at(-1)!.solde,
  }
}

/**
 * Le même détail arrondi à l'euro, pour l'affichage : les lignes arrondies
 * s'additionnent exactement au solde final arrondi (l'écart d'arrondi, au plus
 * quelques euros, est reporté sur la plus grosse ligne).
 */
export function detailArrondi(detail: DetailCalcul): DetailCalcul {
  const postes = ['aujourdhui', 'paiementsClients', 'depensesFixes', 'autresRentrees', 'depensesCourantes', 'exceptionnel'] as const
  const arrondi: DetailCalcul = { ...detail }
  for (const cle of [...postes, 'soldeActuel', 'soldeFinal', 'dontFactures'] as const) arrondi[cle] = Math.round(detail[cle])
  const ecart = arrondi.soldeFinal - arrondi.soldeActuel - postes.reduce((s, cle) => s + arrondi[cle], 0)
  const plusGros = postes.reduce((a, b) => (Math.abs(arrondi[b]) > Math.abs(arrondi[a]) ? b : a))
  arrondi[plusGros] += ecart
  return arrondi
}
