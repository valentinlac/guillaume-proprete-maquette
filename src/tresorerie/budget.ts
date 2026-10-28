/**
 * Prévu contre réel : par catégorie, le budget du mois (récurrents confirmés +
 * moyenne des postes variables) comparé aux mouvements réellement passés.
 *
 * Pour le mois en cours, on compare au « prévu à date » : récurrents dont le
 * jour est passé (avant aujourd'hui) et postes variables au prorata des jours
 * écoulés. Sinon des salaires pas encore versés passeraient pour une économie.
 */
import type { Categorie, DateISO, Mouvement } from '../donnees/types'
import { annee, dernierDuMois, jourDuMois, mois } from '../utils/dates'
import { CATEGORIES } from './categories'
import { postesVariables } from './prevision'
import type { Recurrent } from './recurrents'

export interface LigneBudget {
  categorie: Categorie
  prevu: number
  realise: number
  /** Réalisé − prévu (positif = mieux que prévu : plus d'entrées ou moins de dépenses). */
  ecart: number
}

export function prevuContreReel(
  mouvements: Mouvement[],
  recurrents: Recurrent[],
  prefixeMois: string,
  dateDuJour: DateISO,
): LigneBudget[] {
  const confirmes = recurrents.filter((r) => r.statut === 'confirme')
  const variables = new Map(postesVariables(mouvements, recurrents, dateDuJour).map((p) => [p.categorie, p.montantMensuel]))
  const fin = dernierDuMois(annee(`${prefixeMois}-01`), mois(`${prefixeMois}-01`))
  const jusquau = fin < dateDuJour ? fin : dateDuJour

  const enCours = fin > dateDuJour
  const joursDansMois = jourDuMois(fin)
  const jourCourant = jourDuMois(dateDuJour)
  const prorata = enCours ? (jourCourant - 1) / joursDansMois : 1

  return CATEGORIES.map((categorie) => {
    const prevu =
      confirmes
        .filter((r) => r.categorie === categorie && (!enCours || r.jour < jourCourant))
        .reduce((s, r) => s + r.montant, 0) +
      (variables.get(categorie) ?? 0) * prorata
    const realise = mouvements
      .filter((m) => m.categorie === categorie && m.date.startsWith(prefixeMois) && m.date <= jusquau)
      .reduce((s, m) => s + m.montant, 0)
    return { categorie, prevu: Math.round(prevu * 100) / 100, realise: Math.round(realise * 100) / 100, ecart: Math.round((realise - prevu) * 100) / 100 }
  }).filter((l) => l.prevu !== 0 || l.realise !== 0)
}
