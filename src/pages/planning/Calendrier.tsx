import { useMemo } from 'react'
import { useEtatDemo } from '../../donnees/EtatDemo'
import type { DateISO } from '../../donnees/types'
import { estFerie, prochainJourTravaille } from '../../planning/calendrierTravail'
import { indexerParDate, tourneesDuJour } from '../../planning/vues'
import type { TourneeAgentJour } from '../../planning/vues'
import { ajouterJours, joursDuMois, jourDuMois, jourSemaine, mois as moisDe, nomJour, nomMois } from '../../utils/dates'
import { Bouton } from '../../ui/Bouton'
import { PastilleAgent } from '../../ui/statuts'

const JOURS_SEMAINE = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.']

interface Props {
  annee: number
  mois: number
  /** Mois affichables, pour les flèches de navigation. */
  moisPossibles: { annee: number; mois: number }[]
  onChangeMois: (annee: number, mois: number) => void
  jourSelectionne: DateISO | null
  onSelectionJour: (date: DateISO) => void
  /** Bouton « Préparer <mois> », affiché quand on regarde le dernier mois planifié. */
  preparerMois?: { libelle: string; onClick: () => void }
}

/** Semaines du mois, du lundi au vendredi. */
function semaines(annee: number, mois: number): DateISO[][] {
  const jours = joursDuMois(annee, mois)
  let lundi = ajouterJours(jours[0], 1 - jourSemaine(jours[0]))
  if (jourSemaine(jours[0]) > 5) lundi = ajouterJours(lundi, 7) // mois qui commence un week-end
  const resultat: DateISO[][] = []
  while (lundi <= jours[jours.length - 1]) {
    resultat.push([0, 1, 2, 3, 4].map((k) => ajouterJours(lundi, k)))
    lundi = ajouterJours(lundi, 7)
  }
  return resultat
}

export function Calendrier({ annee, mois, moisPossibles, onChangeMois, jourSelectionne, onSelectionJour, preparerMois }: Props) {
  const { donnees, dateDuJour } = useEtatDemo()
  const demain = prochainJourTravaille(dateDuJour)
  const parDate = useMemo(() => indexerParDate(donnees.interventions), [donnees.interventions])
  const tournees = (date: DateISO) => tourneesDuJour(donnees, parDate.get(date) ?? [])

  const iMois = moisPossibles.findIndex((m) => m.annee === annee && m.mois === mois)
  const precedent = moisPossibles[iMois - 1]
  const suivant = moisPossibles[iMois + 1]

  const enteteJour = (date: DateISO) => (
    <div className="flex items-baseline gap-1.5 text-[13px]">
      <span className={`tabular-nums ${date === dateDuJour ? 'font-semibold text-accent' : date < dateDuJour ? 'text-sourdine' : 'font-medium text-encre'}`}>
        {jourDuMois(date)}
      </span>
      {date === dateDuJour && <span className="text-xs text-accent">aujourd’hui</span>}
      {date === demain && <span className="text-xs text-sourdine">demain</span>}
      {estFerie(date) && <span className="text-xs text-sourdine">férié</span>}
    </div>
  )

  return (
    <section className="rounded-lg border border-filet bg-surface">
      <div className="flex h-12 items-center justify-between border-b border-filet pr-2 pl-3">
        <h2 className="text-[15px] font-semibold first-letter:uppercase">{nomMois(annee, mois)}</h2>
        <div className="flex items-center gap-1">
          {!suivant && preparerMois && (
            <Bouton petit variante="principal" onClick={preparerMois.onClick} className="mr-2">
              {preparerMois.libelle}
            </Bouton>
          )}
          <BoutonFleche sens="precedent" desactive={!precedent} onClick={() => precedent && onChangeMois(precedent.annee, precedent.mois)} />
          <BoutonFleche sens="suivant" desactive={!suivant} onClick={() => suivant && onChangeMois(suivant.annee, suivant.mois)} />
        </div>
      </div>

      {/* Grand écran : grille du lundi au vendredi */}
      <div className="hidden md:block">
        <div className="grid grid-cols-5 border-b border-filet text-xs text-sourdine">
          {JOURS_SEMAINE.map((j) => (
            <div key={j} className="px-3 py-1.5">{j}</div>
          ))}
        </div>
        {semaines(annee, mois).map((semaine) => (
          <div key={semaine[0]} className="grid grid-cols-5 border-b border-filet last:border-b-0">
            {semaine.map((date) => {
              const horsMois = moisDe(date) !== mois
              const selectionne = date === jourSelectionne
              return (
                <button
                  key={date}
                  disabled={horsMois}
                  onClick={() => onSelectionJour(date)}
                  className={`flex min-h-28 min-w-0 flex-col gap-1.5 border-r border-filet px-3 py-2.5 text-left last:border-r-0 ${
                    horsMois ? 'bg-papier/60' : selectionne ? 'bg-accent-doux' : 'hover:bg-survol'
                  }`}
                >
                  {!horsMois && enteteJour(date)}
                  {!horsMois && tournees(date).map((t) => <LigneTournee key={t.agent.id} tournee={t} passe={date < dateDuJour} />)}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Mobile : liste des jours qui ont des passages */}
      <ul className="divide-y divide-filet md:hidden">
        {joursDuMois(annee, mois)
          .filter((d) => (parDate.get(d)?.length ?? 0) > 0 || d === dateDuJour || d === demain)
          .map((date) => (
            <li key={date}>
              <button
                onClick={() => onSelectionJour(date)}
                className={`flex w-full flex-col gap-1.5 px-4 py-3 text-left ${date === jourSelectionne ? 'bg-accent-doux' : ''}`}
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[13px] text-sourdine">{nomJour(date).slice(0, 3)}.</span>
                  {enteteJour(date)}
                </div>
                {tournees(date).map((t) => <LigneTournee key={t.agent.id} tournee={t} passe={date < dateDuJour} />)}
                {tournees(date).length === 0 && <span className="text-xs text-sourdine">Aucun passage</span>}
              </button>
            </li>
          ))}
      </ul>
    </section>
  )
}

/** Tournée d'un agent dans une case : pastille, nombre de passages ; communes en dessous. Les heures sont dans la vue du jour. */
function LigneTournee({ tournee, passe }: { tournee: TourneeAgentJour; passe: boolean }) {
  const { agent, interventions, communes } = tournee
  const annules = interventions.filter((i) => i.statut === 'annulee_meteo').length
  const replaces = interventions.filter((i) => i.statut === 'replanifiee').length
  const actifs = interventions.length - annules

  return (
    <div className={`min-w-0 text-xs leading-snug ${passe ? 'opacity-50' : ''}`} title={`${agent.nom} · ${communes.join(', ')}`}>
      <div className="flex items-center gap-1.5 text-encre">
        <PastilleAgent couleur={agent.couleur} taille={7} />
        <span className="truncate font-medium">{agent.nom.split(' ')[0]}</span>
        {actifs > 0 && <span className="ml-auto shrink-0 text-sourdine tabular-nums">{actifs} passage{actifs > 1 ? 's' : ''}</span>}
      </div>
      <div className="truncate pl-[13px] text-sourdine">{communes.join(', ')}</div>
      {(annules > 0 || replaces > 0) && (
        <div className="pl-[13px] font-medium">
          {annules > 0 && <span className="text-alerte">{annules} annulé{annules > 1 ? 's' : ''}</span>}
          {annules > 0 && replaces > 0 && <span className="text-sourdine"> · </span>}
          {replaces > 0 && <span className="text-accent">{replaces} replacé{replaces > 1 ? 's' : ''}</span>}
        </div>
      )}
    </div>
  )
}

function BoutonFleche({ sens, desactive, onClick }: { sens: 'precedent' | 'suivant'; desactive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={desactive}
      aria-label={sens === 'precedent' ? 'Mois précédent' : 'Mois suivant'}
      className="rounded-md p-1.5 text-encre-2 hover:bg-survol disabled:cursor-not-allowed disabled:opacity-30"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
        <path d={sens === 'precedent' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
      </svg>
    </button>
  )
}
