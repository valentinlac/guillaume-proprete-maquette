import { lazy, Suspense, useEffect, useState } from 'react'
import { FournisseurEtatDemo, useEtatDemo } from './donnees/EtatDemo'
import { Gabarit } from './ui/Gabarit'
import type { Page } from './ui/Gabarit'

// Chaque écran est chargé à la demande (la carte pour le planning, les graphiques pour la trésorerie).
const PagePlanning = lazy(() => import('./pages/PagePlanning').then((m) => ({ default: m.PagePlanning })))
const PageTresorerie = lazy(() => import('./pages/PageTresorerie').then((m) => ({ default: m.PageTresorerie })))
const PageIndicateurs = lazy(() => import('./pages/PageIndicateurs').then((m) => ({ default: m.PageIndicateurs })))
const PageLinkedIn = lazy(() => import('./pages/PageLinkedIn').then((m) => ({ default: m.PageLinkedIn })))
const PageAgent = lazy(() => import('./pages/PageAgent').then((m) => ({ default: m.PageAgent })))

const PAGES: Page[] = ['planning', 'tresorerie', 'indicateurs', 'linkedin', 'agent']

function pageDepuisAdresse(): Page {
  const p = window.location.hash.slice(1) as Page
  return PAGES.includes(p) ? p : 'planning'
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
      {/* L'app agent s'ouvre plein écran, sans le menu du bureau (pensée pour un téléphone). */}
      {page === 'agent' ? (
        <div className="h-full overflow-y-auto">
          <Suspense fallback={<p className="p-4 text-sm text-sourdine">Chargement…</p>}>
            <PageCourante page={page} />
          </Suspense>
        </div>
      ) : (
        <Gabarit page={page} allerA={allerA}>
          <Suspense fallback={<p className="text-sm text-sourdine">Chargement…</p>}>
            <PageCourante page={page} />
          </Suspense>
        </Gabarit>
      )}
    </FournisseurEtatDemo>
  )
}

/** Recrée la page quand on change d'entité ou qu'on réinitialise la démo. */
function PageCourante({ page }: { page: Page }) {
  const { entiteId, version } = useEtatDemo()
  const cle = `${entiteId}-${version}`
  if (page === 'agent') return <PageAgent key={cle} />
  if (page === 'indicateurs') return <PageIndicateurs key={cle} />
  if (page === 'linkedin') return <PageLinkedIn key={cle} />
  return page === 'planning' ? <PagePlanning key={cle} /> : <PageTresorerie key={cle} />
}
