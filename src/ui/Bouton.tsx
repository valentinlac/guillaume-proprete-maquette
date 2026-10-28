import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variante = 'principal' | 'secondaire' | 'discret' | 'danger'

const STYLES: Record<Variante, string> = {
  principal: 'bg-accent text-white hover:bg-accent-fonce',
  secondaire: 'border border-filet-fort bg-surface text-encre hover:bg-survol',
  discret: 'text-encre-2 hover:bg-survol hover:text-encre',
  danger: 'border border-filet-fort bg-surface text-alerte hover:bg-alerte-doux',
}

/** Bouton de l'application : une variante principale par écran, le reste en secondaire ou discret. */
export function Bouton({
  variante = 'secondaire',
  petit = false,
  icone,
  compteur,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
  petit?: boolean
  icone?: ReactNode
  /** Petit nombre affiché à droite (éléments en attente). */
  compteur?: number
}) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
        petit ? 'h-7 px-2.5 text-[13px]' : 'h-9 px-3.5 text-sm'
      } ${STYLES[variante]} ${className}`}
    >
      {icone}
      {children}
      {compteur !== undefined && compteur > 0 && (
        <span className={`rounded px-1.5 text-xs font-semibold tabular-nums ${variante === 'principal' ? 'bg-white/20' : 'bg-accent text-white'}`}>
          {compteur}
        </span>
      )}
    </button>
  )
}
