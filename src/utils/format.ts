const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const eurosArrondis = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/** 1 234,56 € */
export function formatEuros(montant: number): string {
  return euros.format(montant)
}

/** 1 235 € */
export function formatEurosArrondis(montant: number): string {
  return eurosArrondis.format(montant)
}

/** 90 → « 1 h 30 », 45 → « 45 min » */
export function formatDuree(minutes: number): string {
  const m = Math.round(minutes)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const reste = m % 60
  return reste === 0 ? `${h} h` : `${h} h ${String(reste).padStart(2, '0')}`
}

/** Minutes depuis minuit → « 08:30 » */
export function formatHeure(minutesDepuisMinuit: number): string {
  const h = Math.floor(minutesDepuisMinuit / 60)
  const m = minutesDepuisMinuit % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** « 08:30 » → 510 */
export function lireHeure(texte: string): number {
  const [h, m] = texte.split(':').map(Number)
  return h * 60 + m
}

/** Lit un montant saisi à la française (« 1 234,56 », « 120 € ») ; null si invalide. */
export function lireMontant(texte: string): number | null {
  const nettoye = texte.replace(/[\s\u202f€]/g, '').replace(',', '.')
  if (!/^-?\d+(\.\d{1,2})?$/.test(nettoye)) return null
  return Number(nettoye)
}
