import { useState } from 'react'
import type { ReactNode } from 'react'
import { useEtatDemo } from '../donnees/EtatDemo'
import { formatDateLongue } from '../utils/dates'

export type Page = 'planning' | 'tresorerie'

const MENU: { page: Page; libelle: string }[] = [
  { page: 'planning', libelle: 'Planning' },
  { page: 'tresorerie', libelle: 'Trésorerie' },
]

interface Props {
  page: Page
  allerA: (page: Page) => void
  children: ReactNode
}

export function Gabarit({ page, allerA, children }: Props) {
  const { entites, entiteId, choisirEntite, dateDuJour, reinitialiser } = useEtatDemo()
  const [menuOuvert, setMenuOuvert] = useState(false)

  const naviguer = (p: Page) => {
    allerA(p)
    setMenuOuvert(false)
  }

  return (
    <div className="flex h-full">
      {menuOuvert && <div className="fixed inset-0 z-30 bg-encre/30 md:hidden" onClick={() => setMenuOuvert(false)} />}

      {/* Menu à gauche (tiroir sur mobile) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-filet bg-surface transition-transform md:static md:translate-x-0 ${
          menuOuvert ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 pt-5 pb-4">
          <div className="text-[15px] font-semibold tracking-tight text-encre">Guillaume Propreté</div>
          <div className="text-xs text-sourdine">Outil de gestion</div>
        </div>

        <label className="mx-3 mb-4 block">
          <span className="sr-only">Entité</span>
          <select
            value={entiteId}
            onChange={(e) => choisirEntite(e.target.value)}
            className="h-9 w-full rounded-md border border-filet-fort bg-surface px-2.5 text-sm font-medium text-encre"
          >
            {/* Noms courts pour tenir dans le menu ; les franchises sont regroupées sous leur titre. */}
            {entites.filter((e) => e.type === 'societe').map((e) => (
              <option key={e.id} value={e.id}>{e.ville} (siège)</option>
            ))}
            <optgroup label="Franchises">
              {entites.filter((e) => e.type !== 'societe').map((e) => (
                <option key={e.id} value={e.id}>{e.ville}</option>
              ))}
            </optgroup>
          </select>
        </label>

        <nav className="flex flex-col gap-0.5 px-3">
          {MENU.map((m) => (
            <button
              key={m.page}
              onClick={() => naviguer(m.page)}
              className={`h-9 rounded-md px-2.5 text-left text-sm font-medium transition-colors ${
                page === m.page ? 'bg-accent-doux text-accent' : 'text-encre-2 hover:bg-survol hover:text-encre'
              }`}
            >
              {m.libelle}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-filet px-5 py-4 text-xs text-sourdine">
          <div>
            Aujourd’hui
            <div className="text-[13px] font-medium text-encre first-letter:uppercase">{formatDateLongue(dateDuJour)}</div>
          </div>
          <button onClick={reinitialiser} className="underline-offset-2 hover:text-encre hover:underline">
            Réinitialiser la démo
          </button>
          <div>Maquette · données fictives</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre du haut, sur mobile seulement */}
        <header className="flex items-center gap-3 border-b border-filet bg-surface px-4 py-2.5 md:hidden">
          <button className="-ml-1 rounded-md p-1.5 text-encre-2 hover:bg-survol" onClick={() => setMenuOuvert(true)} aria-label="Ouvrir le menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <span className="text-sm font-semibold">Guillaume Propreté</span>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}
