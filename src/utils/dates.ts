/**
 * Dates manipulées en interne au format ISO « aaaa-mm-jj » (sans heure ni fuseau),
 * affichées au format français jj/mm/aaaa.
 */
export type DateISO = string

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

export function versDate(iso: DateISO): Date {
  const [annee, mois, jour] = iso.split('-').map(Number)
  return new Date(annee, mois - 1, jour)
}

export function versISO(date: Date): DateISO {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const j = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${j}`
}

export function ajouterJours(iso: DateISO, nb: number): DateISO {
  const d = versDate(iso)
  d.setDate(d.getDate() + nb)
  return versISO(d)
}

/** Ajoute des mois en gardant le jour (borné à la fin du mois si besoin). */
export function ajouterMois(iso: DateISO, nb: number): DateISO {
  const d = versDate(iso)
  const jour = d.getDate()
  const cible = new Date(d.getFullYear(), d.getMonth() + nb, 1)
  const dernierJour = new Date(cible.getFullYear(), cible.getMonth() + 1, 0).getDate()
  cible.setDate(Math.min(jour, dernierJour))
  return versISO(cible)
}

/** Écart en jours entre deux dates (b - a). */
export function ecartJours(a: DateISO, b: DateISO): number {
  return Math.round((versDate(b).getTime() - versDate(a).getTime()) / 86_400_000)
}

/** 1 = lundi … 7 = dimanche. */
export function jourSemaine(iso: DateISO): number {
  const j = versDate(iso).getDay()
  return j === 0 ? 7 : j
}

export function annee(iso: DateISO): number {
  return Number(iso.slice(0, 4))
}

/** Mois de 0 (janvier) à 11 (décembre). */
export function mois(iso: DateISO): number {
  return Number(iso.slice(5, 7)) - 1
}

export function jourDuMois(iso: DateISO): number {
  return Number(iso.slice(8, 10))
}

export function premierDuMois(anneeNum: number, moisNum: number): DateISO {
  return versISO(new Date(anneeNum, moisNum, 1))
}

export function dernierDuMois(anneeNum: number, moisNum: number): DateISO {
  return versISO(new Date(anneeNum, moisNum + 1, 0))
}

export function joursDuMois(anneeNum: number, moisNum: number): DateISO[] {
  const nb = new Date(anneeNum, moisNum + 1, 0).getDate()
  return Array.from({ length: nb }, (_, i) => versISO(new Date(anneeNum, moisNum, i + 1)))
}

/** 28/10/2026 */
export function formatDate(iso: DateISO): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
}

/** mercredi 28/10/2026 */
export function formatDateLongue(iso: DateISO): string {
  return `${nomJour(iso)} ${formatDate(iso)}`
}

export function nomJour(iso: DateISO): string {
  return JOURS[versDate(iso).getDay()]
}

/** octobre 2026 */
export function nomMois(anneeNum: number, moisNum: number): string {
  return `${MOIS[moisNum]} ${anneeNum}`
}

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

/** nov. */
export function nomMoisCourt(moisNum: number): string {
  return MOIS_COURTS[moisNum]
}

/** Lit une date saisie au format jj/mm/aaaa ou aaaa-mm-jj. Renvoie null si invalide. */
export function lireDate(texte: string): DateISO | null {
  const t = texte.trim()
  let iso: string | null = null
  const fr = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (fr) iso = `${fr[3]}-${fr[2].padStart(2, '0')}-${fr[1].padStart(2, '0')}`
  else if (/^\d{4}-\d{2}-\d{2}$/.test(t)) iso = t
  if (!iso) return null
  return versISO(versDate(iso)) === iso ? iso : null
}
