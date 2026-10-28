import { lazy, Suspense, useEffect, useState } from 'react'
import { FournisseurEtatDemo, useEtatDemo } from './donnees/EtatDemo'
import { Gabarit } from './ui/Gabarit'
import type { Page } from './ui/Gabarit'

// Chaque écran est chargé à la demande (la carte pour le planning, les graphiques pour la trésorerie).
const PagePlanning = lazy(() => import('./pages/PagePlanning').then((m) => ({ default: m.PagePlanning })))
const PageTresorerie = lazy(() => import('./pages/PageTresorerie').then((m) => ({ default: m.PageTresorerie })))

function pageDepuisAdresse(): Page {
  return window.location.hash === '#tresorerie' ? 'tresorerie' : 'planning'
}

export default function App() {
  const [page, setPage] = useState<Page>(pageDepuisAdresse)

  useEffect(() => {
    const suivre = () => setPage(pageDepuisAdresse())
    window.addEventListener('hashchange', suivre)
    return () => window.removeEventListener('hashchange', suivre)
  }, [])

  const allerA = (p: Page) => {
    window.location.hash = p
    setPage(p)
  }

  return (
    <FournisseurEtatDemo>
      <Gabarit page={page} allerA={allerA}>
        <Suspense fallback={<p className="text-sm text-sourdine">Chargement…</p>}>
          <PageCourante page={page} />
        </Suspense>
      </Gabarit>
    </FournisseurEtatDemo>
  )
}

/** Recrée la page quand on change d'entité ou qu'on réinitialise la démo. */
function PageCourante({ page }: { page: Page }) {
  const { entiteId, version } = useEtatDemo()
  const cle = `${entiteId}-${version}`
  return page === 'planning' ? <PagePlanning key={cle} /> : <PageTresorerie key={cle} />
}
