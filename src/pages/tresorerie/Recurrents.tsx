import { useState } from 'react'
import { useEtatDemo } from '../../donnees/EtatDemo'
import { LIBELLES_CATEGORIE } from '../../tresorerie/categories'
import { marquerRecurrents, recurrentsAvecDecisions, REGLES_DETECTION } from '../../tresorerie/recurrents'
import type { DecisionRecurrent, Recurrent } from '../../tresorerie/recurrents'
import { Bouton } from '../../ui/Bouton'
import { Carte } from '../../ui/Carte'
import { formatEuros, lireMontant } from '../../utils/format'

/** Mouvements récurrents détectés dans l'historique : l'utilisateur confirme, corrige ou écarte. */
export function Recurrents({ recurrents }: { recurrents: Recurrent[] }) {
  const { modifier } = useEtatDemo()
  const [voirConfirmes, setVoirConfirmes] = useState(false)
  const proposes = recurrents.filter((r) => r.statut === 'propose')
  const confirmes = recurrents.filter((r) => r.statut === 'confirme')
  const ecartes = recurrents.filter((r) => r.statut === 'ecarte')

  const decider = (cle: string, decision: DecisionRecurrent | null) =>
    modifier((jeu) => {
      const decisions = { ...jeu.decisionsRecurrents }
      if (decision) decisions[cle] = decision
      else delete decisions[cle]
      return { ...jeu, decisionsRecurrents: decisions, mouvements: marquerRecurrents(jeu.mouvements, recurrentsAvecDecisions(jeu.mouvements, decisions)) }
    })

  const totalMensuel = confirmes.reduce((s, r) => s + r.montant, 0)

  return (
    <Carte titre="Dépenses et rentrées fixes">
      <p className="mb-3 text-xs text-sourdine">
        Repérées automatiquement dans l’historique : même fournisseur, vers le même jour chaque mois (±{REGLES_DETECTION.toleranceJours} j), montant proche (±{REGLES_DETECTION.toleranceMontant * 100} %). Une fois confirmées, elles comptent dans la prévision.
      </p>
      {proposes.length > 0 ? (
        <div className="space-y-2">
          <div className="text-[13px] font-medium">
            {proposes.length} à vérifier
          </div>
          {proposes.map((r) => (
            <LigneProposee key={r.cle} recurrent={r} onDecider={(d) => decider(r.cle, d)} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-encre-2">Tout a été vérifié.</p>
      )}

      <div className="mt-4 border-t border-filet pt-3">
        <button onClick={() => setVoirConfirmes((v) => !v)} className="flex w-full items-center justify-between text-sm">
          <span className="font-medium text-encre-2">
            {confirmes.length} déjà confirmées <span className="font-normal text-sourdine">· solde {totalMensuel >= 0 ? '+' : ''}{formatEuros(totalMensuel)} par mois</span>
          </span>
          <span className="text-[13px] text-accent">{voirConfirmes ? 'Masquer' : 'Voir'}</span>
        </button>
        {voirConfirmes && (
          <ul className="mt-2 divide-y divide-filet text-sm">
            {[...confirmes, ...ecartes].map((r) => (
              <li key={r.cle} className={`flex items-center gap-3 py-1.5 ${r.statut === 'ecarte' ? 'text-sourdine' : ''}`}>
                <span className="min-w-0 flex-1 truncate">
                  {r.tiers} <span className="text-xs text-sourdine">· {LIBELLES_CATEGORIE[r.categorie]} · le {r.jour}</span>
                </span>
                <span className={`tabular-nums ${r.montant >= 0 ? 'text-ok' : ''} ${r.statut === 'ecarte' ? 'line-through' : ''}`}>{formatEuros(r.montant)}</span>
                <button onClick={() => decider(r.cle, null)} className="text-xs text-sourdine hover:text-encre-2" title="Remettre en « à confirmer »">
                  Revoir
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Carte>
  )
}

function LigneProposee({ recurrent: r, onDecider }: { recurrent: Recurrent; onDecider: (d: DecisionRecurrent) => void }) {
  const [correction, setCorrection] = useState<{ montant: string; jour: string } | null>(null)

  const validerCorrection = () => {
    const montant = lireMontant(correction!.montant)
    const jour = Number(correction!.jour)
    if (montant === null || !(jour >= 1 && jour <= 31)) return
    onDecider({ statut: 'confirme', montant: r.montant < 0 ? -Math.abs(montant) : Math.abs(montant), jour })
  }

  return (
    <div className="rounded-lg border border-filet p-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-encre">{r.tiers}</span>
        <span className="font-semibold tabular-nums">{formatEuros(r.montant)} <span className="font-normal text-sourdine">/ mois</span></span>
      </div>
      <div className="text-xs text-sourdine">
        {LIBELLES_CATEGORIE[r.categorie]} · vers le {r.jour} du mois · vu {r.occurrences} mois de suite
        {r.variation > 0 && ` · écart max ${(r.variation * 100).toFixed(1).replace('.', ',')} %`}
      </div>
      {correction ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-xs">
            Montant
            <input value={correction.montant} onChange={(e) => setCorrection({ ...correction, montant: e.target.value })} className="w-24 rounded border border-filet-fort px-2 py-1 text-right" />
          </label>
          <label className="flex items-center gap-1 text-xs">
            Jour
            <input value={correction.jour} onChange={(e) => setCorrection({ ...correction, jour: e.target.value })} className="w-14 rounded border border-filet-fort px-2 py-1 text-right" />
          </label>
          <Bouton petit variante="principal" onClick={validerCorrection}>Valider</Bouton>
          <button onClick={() => setCorrection(null)} className="text-xs text-sourdine">Annuler</button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <Bouton petit variante="principal" onClick={() => onDecider({ statut: 'confirme' })}>Confirmer</Bouton>
          <Bouton petit onClick={() => setCorrection({ montant: String(Math.abs(r.montant)).replace('.', ','), jour: String(r.jour) })}>Corriger</Bouton>
          <Bouton petit variante="discret" onClick={() => onDecider({ statut: 'ecarte' })}>Pas une dépense fixe</Bouton>
        </div>
      )}
    </div>
  )
}
