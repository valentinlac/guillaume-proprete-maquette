import type { ReactNode } from 'react'

/** Onglets soulignés (pas de pastilles). */
export function Onglets<T extends string>({ valeur, options, onChange }: {
  valeur: T
  options: { valeur: T; libelle: ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    // Sur un écran étroit, les onglets défilent sur une ligne plutôt que de se couper.
    // Le filet du bas est une ombre interne : le soulignement de l'onglet actif passe par-dessus.
    <div className="flex gap-4 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-filet)] [scrollbar-width:none] sm:gap-5" role="tablist">
      {options.map((o) => (
        <button
          key={o.valeur}
          role="tab"
          aria-selected={valeur === o.valeur}
          onClick={() => onChange(o.valeur)}
          className={`shrink-0 border-b-2 pb-2 text-sm font-medium whitespace-nowrap transition-colors ${
            valeur === o.valeur ? 'border-accent text-encre' : 'border-transparent text-sourdine hover:text-encre'
          }`}
        >
          {o.libelle}
        </button>
      ))}
    </div>
  )
}

/** Petit sélecteur à deux ou trois choix (ex. 3 mois / 6 mois). */
export function Bascule<T extends string>({ valeur, options, onChange }: {
  valeur: T
  options: { valeur: T; libelle: ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-filet-fort p-0.5" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.valeur}
          role="radio"
          aria-checked={valeur === o.valeur}
          onClick={() => onChange(o.valeur)}
          className={`h-6 rounded px-2.5 text-[13px] font-medium ${valeur === o.valeur ? 'bg-encre text-white' : 'text-encre-2 hover:text-encre'}`}
        >
          {o.libelle}
        </button>
      ))}
    </div>
  )
}
