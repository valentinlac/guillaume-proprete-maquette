import { Fragment, useMemo, useState } from 'react'
import { CircleMarker, Polyline, Tooltip } from 'react-leaflet'
import { useEtatDemo } from '../../donnees/EtatDemo'
import type { DateISO } from '../../donnees/types'
import { optimiserTournees, planningALaMain, premierJourModifiable } from '../../planning/optimisation'
import { routeTotale } from '../../planning/verifications'
import { prochainJourTravaille } from '../../planning/calendrierTravail'
import { indexerParDate, tourneesDuJour } from '../../planning/vues'
import { Carte } from '../../ui/Carte'
import { Bouton } from '../../ui/Bouton'
import { Bascule } from '../../ui/Onglets'
import { PastilleAgent } from '../../ui/statuts'
import { formatDate, formatDateLongue, nomMois, premierDuMois } from '../../utils/dates'
import { formatDuree } from '../../utils/format'
import { usePlacerSurLaRoute, useTracerParLaRoute } from '../../trajets/traces'
import { CadreCarte } from './CadreCarte'

interface Props {
  annee: number
  mois: number
  moisPossibles: { annee: number; mois: number }[]
  onChangeMois: (annee: number, mois: number) => void
  /** Ouvre une journée dans la vue calendrier. */
  onOuvrirJour: (date: DateISO) => void
}

type Message = { ton: 'succes' | 'info'; texte: string }

/** Tournées du mois par secteur, avec « Optimiser les tournées ». */
export function VueTournees({ annee, mois, moisPossibles, onChangeMois, onOuvrirJour }: Props) {
  const { donnees, modifier, dateDuJour } = useEtatDemo()
  const [survol, setSurvol] = useState<string | null>(null)
  const tracer = useTracerParLaRoute()
  const placer = usePlacerSurLaRoute()
  const [message, setMessage] = useState<Message | null>(null)
  const premier = premierJourModifiable(dateDuJour)
  const ctx = { depot: donnees.entite.depot, clients: donnees.clients, agents: donnees.agents }
  const clients = new Map(donnees.clients.map((c) => [c.id, c]))

  const prefixe = premierDuMois(annee, mois).slice(0, 7)
  const tournees = useMemo(() => {
    const parDate = indexerParDate(donnees.interventions.filter((i) => i.date.startsWith(prefixe)))
    return [...parDate.keys()].sort().flatMap((date) =>
      tourneesDuJour(donnees, parDate.get(date)!)
        .filter((t) => t.journee)
        .map((t) => ({ ...t, date, cle: `${date}|${t.agent.id}` })),
    )
  }, [donnees, prefixe])

  const aVenir = (date: DateISO) => date >= premier
  const routeAVenir = routeTotale(ctx, donnees.interventions.filter((i) => aVenir(i.date)))
  // Référence « tableur » : même planning refait à la main, pour mesurer le gain.
  const routeALaMain = useMemo(() => {
    const depuis = premierJourModifiable(dateDuJour)
    const contexte = { depot: donnees.entite.depot, clients: donnees.clients, agents: donnees.agents }
    return routeTotale(contexte, planningALaMain(donnees, dateDuJour).filter((i) => i.date >= depuis))
  }, [donnees, dateDuJour])

  const optimiser = () => {
    const r = optimiserTournees(donnees, dateDuJour)
    if (r.deplaces === 0) {
      setMessage({ ton: 'info', texte: 'Les tournées sont déjà regroupées par secteur : aucun changement nécessaire.' })
      return
    }
    modifier((jeu) => ({ ...jeu, interventions: r.interventions }))
    const gain = Math.round((1 - r.routeApresMin / r.routeAvantMin) * 100)
    setMessage({
      ton: 'succes',
      texte: `Tournées regroupées par secteur : ${r.deplaces} passage${r.deplaces > 1 ? 's' : ''} déplacé${r.deplaces > 1 ? 's' : ''}, temps de route à venir ${formatDuree(r.routeAvantMin)} → ${formatDuree(r.routeApresMin)} (${gain > 0 ? `−${gain}` : `+${-gain}`} %). Les journées jusqu’au ${formatDate(prochainJourTravaille(dateDuJour))} sont déjà envoyées aux agents et n’ont pas changé.`,
    })
  }

  const simulerALaMain = () => {
    const aLaMain = planningALaMain(donnees, dateDuJour)
    modifier((jeu) => ({ ...jeu, interventions: aLaMain }))
    setMessage({
      ton: 'info',
      texte: `Simulation d’un planning fait à la main : passages pris dans l’ordre alphabétique du tableur, sans regroupement. Temps de route à venir : ${formatDuree(routeAVenir)} → ${formatDuree(routeTotale(ctx, aLaMain.filter((i) => aVenir(i.date))))}. Cliquez sur « Optimiser les tournées » pour regrouper.`,
    })
  }

  const iMois = moisPossibles.findIndex((m) => m.annee === annee && m.mois === mois)
  const points = tournees.flatMap((t) => t.interventions.map((i) => [clients.get(i.clientId)!.lat, clients.get(i.clientId)!.lng] as [number, number]))
  const gainTableur = routeALaMain > 0 ? Math.round((1 - routeAVenir / routeALaMain) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Bascule
          valeur={String(iMois)}
          onChange={(v) => onChangeMois(moisPossibles[Number(v)].annee, moisPossibles[Number(v)].mois)}
          options={moisPossibles.map((m, k) => ({ valeur: String(k), libelle: <span className="first-letter:uppercase">{nomMois(m.annee, m.mois)}</span> }))}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Bouton variante="discret" onClick={simulerALaMain}>Simuler un planning fait à la main</Bouton>
          <Bouton variante="principal" onClick={optimiser}>Optimiser les tournées</Bouton>
        </div>
      </div>

      {message && (
        <div className="flex items-start gap-3 rounded-lg border border-filet bg-surface px-4 py-2.5 text-sm text-encre-2">
          <span className="flex-1">{message.texte}</span>
          <button onClick={() => setMessage(null)} className="text-sourdine hover:text-encre" aria-label="Masquer le message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      )}

      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Carte
          titre="Secteurs du mois"
          action={
            <span className="text-[13px] text-sourdine">
              {formatDuree(routeAVenir)} de route à venir
              {gainTableur > 0 && (
                <>
                  , <span className="font-medium text-encre">−{gainTableur} %</span> par rapport à un planning simulé fait à la main (estimation de démo)
                </>
              )}
            </span>
          }
        >
          <div className="h-80 lg:h-[32rem]">
            <CadreCarte depot={donnees.entite.depot} points={points}>
              {tournees.map((t) => {
                const passe = !aVenir(t.date)
                const enAvant = survol === t.cle
                const estompe = (survol !== null && !enAvant) || passe
                const actives = t.interventions.filter((i) => i.statut !== 'annulee_meteo').map((i) => clients.get(i.clientId)!)
                const pts = actives.map(placer)
                const depot = { id: 'depot', lat: donnees.entite.depot.lat, lng: donnees.entite.depot.lng }
                return (
                  <Fragment key={t.cle}>
                    <Polyline
                      positions={tracer([depot, ...actives, depot])}
                      pathOptions={{ color: t.agent.couleur, weight: enAvant ? 4 : 2.5, opacity: estompe ? 0.15 : 0.85, lineJoin: 'round' }}
                      eventHandlers={{ mouseover: () => setSurvol(t.cle), mouseout: () => setSurvol(null) }}
                    />
                    {pts.map((p, k) => (
                      <CircleMarker
                        key={k}
                        center={p}
                        radius={enAvant ? 6 : 4.5}
                        pathOptions={{ color: '#fff', weight: 1.5, fillColor: t.agent.couleur, fillOpacity: estompe ? 0.25 : 1, opacity: estompe ? 0.3 : 1 }}
                        eventHandlers={{ mouseover: () => setSurvol(t.cle), mouseout: () => setSurvol(null) }}
                      >
                        <Tooltip>
                          {actives[k].nom} : {formatDateLongue(t.date)}, {t.agent.nom}
                        </Tooltip>
                      </CircleMarker>
                    ))}
                  </Fragment>
                )
              })}
            </CadreCarte>
          </div>
        </Carte>

        <Carte titre={`${tournees.length} tournées`} sansMarge className="lg:max-h-[36.5rem] lg:overflow-y-auto">
          <ul>
            {tournees.map((t) => {
              const passe = !aVenir(t.date)
              return (
                <li key={t.cle} className="border-b border-filet last:border-b-0">
                  <button
                    onMouseEnter={() => setSurvol(t.cle)}
                    onMouseLeave={() => setSurvol(null)}
                    onClick={() => onOuvrirJour(t.date)}
                    className={`flex w-full items-start gap-3 px-5 py-2.5 text-left ${passe ? 'text-sourdine' : ''} ${survol === t.cle ? 'bg-survol' : 'hover:bg-survol'}`}
                  >
                    <span className="mt-1.5"><PastilleAgent couleur={t.agent.couleur} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <span className="font-medium first-letter:uppercase">{formatDateLongue(t.date)}</span>
                        <span className="text-xs text-sourdine tabular-nums">
                          {t.interventions.length} passage{t.interventions.length > 1 ? 's' : ''} · route {formatDuree(t.journee!.routeTotaleMin)}
                        </span>
                      </span>
                      <span className="block truncate text-xs text-sourdine">
                        {t.agent.nom.split(' ')[0]} · {t.communes.join(', ')}
                        {t.date < premier && t.date >= dateDuJour && ' · déjà envoyée aux agents'}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Carte>
      </div>
    </div>
  )
}
