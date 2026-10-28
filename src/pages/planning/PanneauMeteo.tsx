import { useState } from 'react'
import { useEtatDemo } from '../../donnees/EtatDemo'
import type { DateISO, Intervention } from '../../donnees/types'
import { proposerReplacements, retablirJournee } from '../../planning/meteo'
import { Bouton } from '../../ui/Bouton'
import { Tiroir } from '../../ui/Tiroir'
import { formatDateLongue } from '../../utils/dates'
import { ListeReplacements } from './ListeReplacements'

interface Props {
  /** Journée annulée pour la pluie. */
  date: DateISO
  onFermer: () => void
  /** Après confirmation : nombre de passages replacés. */
  onConfirme: (replaces: number) => void
}

/**
 * Replacement des passages annulés pour la pluie : l'outil propose un créneau
 * pour chacun, l'utilisateur ajuste puis confirme. Rien n'est enregistré avant.
 */
export function PanneauMeteo({ date, onFermer, onConfirme }: Props) {
  const { donnees, modifier, dateDuJour } = useEtatDemo()
  const annules = donnees.interventions.filter((i) => i.statut === 'annulee_meteo' && i.date === date)
  // Brouillon : le planning tel qu'il serait après les replacements proposés.
  const [brouillon, setBrouillon] = useState<Intervention[]>(
    () => proposerReplacements({ depot: donnees.entite.depot, clients: donnees.clients, agents: donnees.agents, interventions: donnees.interventions, dateDuJour }).interventions,
  )
  const ids = new Set(annules.map((i) => i.id))
  const replaces = brouillon.filter((i) => ids.has(i.id) && i.statut !== 'annulee_meteo')

  const confirmer = () => {
    modifier((jeu) => ({ ...jeu, interventions: brouillon }))
    onConfirme(replaces.length)
  }
  const retablir = () => {
    modifier((jeu) => ({ ...jeu, interventions: retablirJournee(jeu.interventions, date) }))
    onFermer()
  }

  return (
    <Tiroir
      titre={<span className="first-letter:uppercase">Pluie {formatDateLongue(date)}</span>}
      sousTitre={`${annules.length} passage${annules.length > 1 ? 's' : ''} annulé${annules.length > 1 ? 's' : ''}. Un nouveau créneau est proposé pour chacun, dans le mois ou le suivant ; changez-le si besoin, puis confirmez.`}
      onFermer={onFermer}
      pied={
        <>
          <button onClick={retablir} className="text-[13px] text-sourdine hover:text-encre hover:underline">
            Finalement, il ne pleut pas : rétablir la journée
          </button>
          <span className="flex-1" />
          <span className="text-[13px] text-sourdine tabular-nums">{replaces.length} sur {annules.length} replacé{replaces.length > 1 ? 's' : ''}</span>
          <Bouton variante="discret" onClick={onFermer}>Plus tard</Bouton>
          <Bouton variante="principal" onClick={confirmer}>Confirmer les replacements</Bouton>
        </>
      }
    >
      <ListeReplacements date={date} annules={annules} brouillon={brouillon} setBrouillon={setBrouillon} />
    </Tiroir>
  )
}
