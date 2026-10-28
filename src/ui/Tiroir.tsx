import { useEffect } from 'react'
import type { ReactNode } from 'react'

/** Panneau latéral commun : en-tête, contenu qui défile, pied d'actions. Échap ferme. */
export function Tiroir({ titre, sousTitre, onFermer, pied, children, largeur = 'max-w-4xl' }: {
  titre: ReactNode
  sousTitre?: ReactNode
  onFermer: () => void
  pied?: ReactNode
  children: ReactNode
  largeur?: string
}) {
  useEffect(() => {
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && onFermer()
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, [onFermer])

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-encre/30" onClick={onFermer} />
      <div className={`relative flex h-full w-full ${largeur} flex-col bg-papier shadow-xl`}>
        <header className="flex items-start justify-between gap-4 border-b border-filet bg-surface px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-encre">{titre}</h2>
            {sousTitre && <p className="mt-0.5 text-sm text-sourdine">{sousTitre}</p>}
          </div>
          <button onClick={onFermer} className="-mr-1 rounded-md p-1.5 text-sourdine hover:bg-survol hover:text-encre" aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {pied && <footer className="flex flex-wrap items-center gap-3 border-t border-filet bg-surface px-6 py-3">{pied}</footer>}
      </div>
    </div>
  )
}
