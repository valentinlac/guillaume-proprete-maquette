import type { ReactNode } from 'react'

/** Bloc de contenu : fond blanc, filet fin, pas d'ombre. */
export function Carte({ titre, action, children, className = '', sansMarge = false }: {
  titre?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  /** Contenu collé aux bords (tableaux, listes). */
  sansMarge?: boolean
}) {
  return (
    <section className={`rounded-lg border border-filet bg-surface ${className}`}>
      {(titre || action) && (
        <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-filet px-5 py-2">
          {titre && <h2 className="text-[15px] font-semibold text-encre">{titre}</h2>}
          {action}
        </div>
      )}
      <div className={sansMarge ? '' : 'p-5'}>{children}</div>
    </section>
  )
}

/** Chiffre clé : libellé discret, valeur lisible, détail en sourdine. */
export function Indicateur({ libelle, valeur, detail }: { libelle: string; valeur: ReactNode; detail?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[13px] text-sourdine">{libelle}</div>
      <div className="mt-0.5 text-xl font-semibold text-encre tabular-nums">{valeur}</div>
      {detail && <div className="mt-0.5 text-xs text-sourdine">{detail}</div>}
    </div>
  )
}
