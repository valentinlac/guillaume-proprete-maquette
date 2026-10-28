import { useState } from 'react'
import { useEtatDemo } from '../../donnees/EtatDemo'

/** Compteur de démonstration « heures de planification économisées », modifiable d'un clic. */
export function CompteurHeures() {
  const { donnees, modifier } = useEtatDemo()
  const [edition, setEdition] = useState<string | null>(null)

  const valider = () => {
    const valeur = Number((edition ?? '').replace(',', '.'))
    if (Number.isFinite(valeur) && valeur >= 0) modifier((jeu) => ({ ...jeu, heuresEconomiseesMois: valeur }))
    setEdition(null)
  }

  return (
    <div className="min-w-0">
      <div className="text-[13px] text-sourdine">Temps de planification gagné</div>
      {edition === null ? (
        <button
          onClick={() => setEdition(String(donnees.heuresEconomiseesMois))}
          className="mt-0.5 text-left text-xl font-semibold text-accent tabular-nums hover:underline"
          title="Valeur de démonstration : cliquer pour modifier"
        >
          {donnees.heuresEconomiseesMois} h <span className="text-sm font-normal text-sourdine">par mois</span>
        </button>
      ) : (
        <input
          autoFocus
          inputMode="decimal"
          value={edition}
          onChange={(e) => setEdition(e.target.value)}
          onBlur={valider}
          onKeyDown={(e) => {
            if (e.key === 'Enter') valider()
            if (e.key === 'Escape') setEdition(null)
          }}
          className="mt-0.5 h-8 w-20 rounded-md border border-filet-fort px-2 text-lg font-semibold tabular-nums"
          aria-label="Heures gagnées par mois"
        />
      )}
      <div className="mt-0.5 text-xs text-sourdine">pour Kevin (valeur de démo)</div>
    </div>
  )
}
