import { useState } from 'react'
import { useEtatDemo } from '../../donnees/EtatDemo'
import type { Categorie } from '../../donnees/types'
import { CATEGORIES, LIBELLES_CATEGORIE } from '../../tresorerie/categories'
import { classerReleve, validerReleve } from '../../tresorerie/releve'
import type { LigneClassee } from '../../tresorerie/releve'
import { Bouton } from '../../ui/Bouton'
import { formatDate } from '../../utils/dates'
import { formatEuros } from '../../utils/format'

/**
 * Relevé bancaire du jour (simulé : arrivera de la banque via Sellsy).
 * Chaque ligne est reconnue et classée automatiquement ; Damien vérifie et valide.
 */
export function ReleveDuJour() {
  const { donnees, modifier } = useEtatDemo()
  const lignes = classerReleve(donnees)
  const [choix, setChoix] = useState<Record<string, Categorie>>({})
  const [bilan, setBilan] = useState<string | null>(null)

  const categorieDe = (l: LigneClassee) => choix[l.ligne.id] ?? l.categorie
  const aClasser = lignes.filter((l) => !categorieDe(l)).length
  const automatiques = lignes.filter((l) => l.origine !== 'inconnu').length

  const valider = () => {
    const factures = lignes.filter((l) => l.facture).length
    modifier((jeu) => validerReleve(jeu, lignes.map((l) => ({ classee: l, categorie: categorieDe(l)! }))))
    setBilan(
      `${lignes.length} mouvement${lignes.length > 1 ? 's' : ''} enregistré${lignes.length > 1 ? 's' : ''}${factures ? `, ${factures} facture${factures > 1 ? 's' : ''} marquée${factures > 1 ? 's' : ''} payée${factures > 1 ? 's' : ''}` : ''}.`,
    )
  }

  if (lignes.length === 0) {
    return (
      <p className="rounded-lg border border-filet bg-surface px-5 py-3 text-sm text-encre-2">
        {bilan ?? 'Relevé bancaire : tout est à jour.'}
      </p>
    )
  }

  return (
    <section className="rounded-lg border border-filet bg-surface">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-filet px-5 py-2">
        <h2 className="text-[15px] font-semibold">Relevé bancaire du jour</h2>
        <span className="text-[13px] text-sourdine">via Sellsy (simulé)</span>
      </div>
      <p className="border-b border-filet px-5 py-3 text-encre-2">
        {lignes.length} mouvement{lignes.length > 1 ? 's' : ''} arrivé{lignes.length > 1 ? 's' : ''} : <strong className="font-semibold text-encre">{automatiques} reconnu{automatiques > 1 ? 's' : ''} et classé{automatiques > 1 ? 's' : ''} automatiquement</strong>
        {aClasser > 0 ? `, ${aClasser} à classer.` : '.'}
      </p>
      <ul>
        {lignes.map((l) => {
          const categorie = categorieDe(l)
          return (
            <li key={l.ligne.id} className="grid items-center gap-x-4 gap-y-2 border-b border-filet px-5 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_7rem_13rem]">
              <div className="min-w-0">
                <div className="truncate font-medium">{l.tiers}</div>
                <div className="truncate text-xs text-sourdine">
                  {l.ligne.libelle} ·{' '}
                  {l.origine === 'facture' && <span className="text-ok">règle sa facture (échéance {formatDate(l.facture!.echeance).slice(0, 5)})</span>}
                  {l.origine === 'habitude' && 'classé comme d’habitude'}
                  {l.origine === 'inconnu' && <span className="text-attention">nouveau fournisseur</span>}
                </div>
              </div>
              <span className={`text-right font-medium tabular-nums ${l.ligne.montant > 0 ? 'text-ok' : ''}`}>{formatEuros(l.ligne.montant)}</span>
              <select
                value={categorie ?? ''}
                onChange={(e) => setChoix({ ...choix, [l.ligne.id]: e.target.value as Categorie })}
                className={`h-8 rounded-md border bg-surface px-2 text-sm ${categorie ? 'border-filet-fort' : 'border-attention text-attention'}`}
                aria-label={`Catégorie de ${l.tiers}`}
              >
                {!categorie && <option value="">À classer…</option>}
                {CATEGORIES.map((c) => <option key={c} value={c}>{LIBELLES_CATEGORIE[c]}</option>)}
              </select>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-filet px-5 py-3">
        {aClasser > 0 && <span className="text-[13px] text-sourdine">Classez la ligne restante pour tout valider.</span>}
        <Bouton variante="principal" onClick={valider} disabled={aClasser > 0}>
          Tout valider ({lignes.length})
        </Bouton>
      </div>
    </section>
  )
}
