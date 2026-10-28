/**
 * État de la démo, gardé en mémoire de la page (aucun serveur).
 * Chaque entité garde ses propres modifications quand on passe de l'une à l'autre.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { chargerJeux } from './chargement'
import { DATE_DU_JOUR, ENTITES } from './donnees-fictives'
import type { DateISO, Entite, JeuDeDonnees } from './types'

interface EtatDemo {
  dateDuJour: DateISO
  entites: Entite[]
  entiteId: string
  choisirEntite: (id: string) => void
  /** Données de l'entité affichée. */
  donnees: JeuDeDonnees
  /** Applique une modification aux données de l'entité affichée. */
  modifier: (transformation: (jeu: JeuDeDonnees) => JeuDeDonnees) => void
  /** Remet toutes les entités dans leur état de départ. */
  reinitialiser: () => void
  /** Change à chaque réinitialisation (sert à remettre les écrans à zéro). */
  version: number
}

const Contexte = createContext<EtatDemo | null>(null)

const entites: Entite[] = ENTITES.map(({ id, nom, ville, type, depot }) => ({ id, nom, ville, type, depot }))

export function FournisseurEtatDemo({ children }: { children: ReactNode }) {
  const [jeux, setJeux] = useState(() => chargerJeux(DATE_DU_JOUR))
  const [entiteId, setEntiteId] = useState(entites[0].id)
  const [version, setVersion] = useState(0)

  const modifier = useCallback(
    (transformation: (jeu: JeuDeDonnees) => JeuDeDonnees) =>
      setJeux((actuels) => ({ ...actuels, [entiteId]: transformation(actuels[entiteId]) })),
    [entiteId],
  )

  const valeur = useMemo<EtatDemo>(
    () => ({
      dateDuJour: DATE_DU_JOUR,
      entites,
      entiteId,
      choisirEntite: setEntiteId,
      donnees: jeux[entiteId],
      modifier,
      reinitialiser: () => {
        setJeux(chargerJeux(DATE_DU_JOUR))
        setVersion((v) => v + 1)
      },
      version,
    }),
    [jeux, entiteId, modifier, version],
  )

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>
}

export function useEtatDemo(): EtatDemo {
  const etat = useContext(Contexte)
  if (!etat) throw new Error('useEtatDemo doit être utilisé dans <FournisseurEtatDemo>')
  return etat
}
