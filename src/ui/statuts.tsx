import type { Frequence, StatutIntervention } from '../donnees/types'

export const LIBELLES_STATUT: Record<StatutIntervention, string> = {
  planifiee: 'Planifié',
  terminee: 'Fait',
  annulee_meteo: 'Annulé (météo)',
  replanifiee: 'Replacé',
}

const COULEURS_STATUT: Record<StatutIntervention, string> = {
  planifiee: 'text-encre-2',
  terminee: 'text-ok',
  annulee_meteo: 'text-alerte',
  replanifiee: 'text-accent',
}

/** Statut en texte, sans pastille colorée. */
export function BadgeStatut({ statut }: { statut: StatutIntervention }) {
  return <span className={`text-xs font-medium whitespace-nowrap ${COULEURS_STATUT[statut]}`}>{LIBELLES_STATUT[statut]}</span>
}

export const LIBELLES_FREQUENCE: Record<Frequence, string> = {
  quinzaine: 'Quinzaine',
  mensuelle: 'Mensuelle',
  trimestrielle: 'Trimestrielle',
  semestrielle: 'Semestrielle',
}

export function BadgeFrequence({ frequence }: { frequence: Frequence }) {
  return <span className="text-encre-2">{LIBELLES_FREQUENCE[frequence]}</span>
}

/** Pastille de couleur d'un agent (seul usage décoratif de la couleur). */
export function PastilleAgent({ couleur, taille = 8 }: { couleur: string; taille?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ backgroundColor: couleur, width: taille, height: taille }} aria-hidden />
}
