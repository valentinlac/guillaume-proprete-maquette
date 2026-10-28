import { Fragment, useState } from 'react'
import { CircleMarker, Polyline } from 'react-leaflet'
import { useEtatDemo } from '../../donnees/EtatDemo'
import { preparerMoisSuivant } from '../../planning/moisSuivant'
import { Bouton } from '../../ui/Bouton'
import { Indicateur } from '../../ui/Carte'
import { PastilleAgent } from '../../ui/statuts'
import { Tiroir } from '../../ui/Tiroir'
import { formatDateLongue, nomMois } from '../../utils/dates'
import { formatDuree } from '../../utils/format'
import { usePlacerSurLaRoute, useTracerParLaRoute } from '../../trajets/traces'
import { CadreCarte } from './CadreCarte'

interface Props {
  onFermer: () => void
  /** Après validation : résumé, et mois à afficher. */
  onValide: (texte: string, annee: number, mois: number) => void
}

/**
 * « Préparer le mois suivant » : tout le planning du mois construit en un clic,
 * à vérifier avant validation. Rien n'est enregistré avant.
 */
export function PanneauMoisSuivant({ onFermer, onValide }: Props) {
  const { donnees, modifier, dateDuJour } = useEtatDemo()
  const [prepare] = useState(() => preparerMoisSuivant(donnees, dateDuJour))
  const nomDuMois = nomMois(prepare.annee, prepare.mois)
  const clients = new Map(donnees.clients.map((c) => [c.id, c]))
  const depot = { id: 'depot', lat: donnees.entite.depot.lat, lng: donnees.entite.depot.lng }
  const tracer = useTracerParLaRoute()
  const placer = usePlacerSurLaRoute()
  const travailMin = prepare.tournees.reduce((s, t) => s + t.journee.travailMin, 0)
  const gain = prepare.routeTableurMin > 0 ? Math.round((1 - prepare.routeMin / prepare.routeTableurMin) * 100) : 0
  const tournees = [...prepare.tournees].sort((a, b) => a.date.localeCompare(b.date) || a.agentId.localeCompare(b.agentId))
  const chargeAgent = (id: string) => prepare.tournees.filter((t) => t.agentId === id).reduce((s, t) => s + t.journee.totalMin, 0)
  const points = prepare.interventions.map((i) => [clients.get(i.clientId)!.lat, clients.get(i.clientId)!.lng] as [number, number])

  const valider = () => {
    modifier((jeu) => ({ ...jeu, interventions: [...jeu.interventions, ...prepare.interventions] }))
    onValide(
      `Planning de ${nomDuMois} validé : ${prepare.interventions.length} passages en ${prepare.tournees.length} tournées. Pensez à l’envoyer aux agents.`,
      prepare.annee,
      prepare.mois,
    )
  }

  return (
    <Tiroir
      titre={<span className="first-letter:uppercase">Planning de {nomDuMois} : prêt à valider</span>}
      sousTitre="Construit à partir de la liste des clients et de leurs mois dus, regroupé par secteur pour les 2 agents. Rien n’est enregistré avant validation."
      onFermer={onFermer}
      largeur="max-w-5xl"
      pied={
        <>
          <span className="flex-1" />
          <Bouton variante="discret" onClick={onFermer}>Annuler</Bouton>
          <Bouton variante="principal" onClick={valider} disabled={prepare.interventions.length === 0}>
            Valider le planning de {nomDuMois.split(' ')[0]}
          </Bouton>
        </>
      }
    >
      <div className="space-y-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:gap-0 sm:divide-x sm:divide-filet [&>*]:sm:px-6 [&>*:first-child]:sm:pl-0">
          <Indicateur
            libelle="Passages"
            valeur={prepare.interventions.length}
            detail={prepare.nonPlaces.length === 0 ? 'tous les passages dus, aucun oublié' : `${prepare.nonPlaces.length} sans place`}
          />
          <Indicateur libelle="Tournées" valeur={prepare.tournees.length} detail="regroupées par secteur" />
          <Indicateur libelle="Vitrerie" valeur={formatDuree(travailMin)} detail="chez les clients" />
          <Indicateur libelle="Route" valeur={formatDuree(prepare.routeMin)} detail={gain > 0 ? `${gain} % de moins qu’un planning simulé fait à la main (estimation de démo)` : 'tournées par secteur'} />
        </dl>

        <p className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-encre-2">
          {donnees.agents.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-2">
              <PastilleAgent couleur={a.couleur} />
              {a.nom} : {formatDuree(chargeAgent(a.id))} sur le mois
            </span>
          ))}
        </p>

        <div className="grid gap-6 [&>*]:min-w-0 lg:grid-cols-2">
          <div className="h-80 lg:h-[26rem]">
            <CadreCarte depot={donnees.entite.depot} points={points}>
              {tournees.map((t) => {
                const pts = t.passages.map((p) => placer(clients.get(p.clientId)!))
                return (
                  <Fragment key={`${t.date}|${t.agentId}`}>
                    <Polyline positions={tracer([depot, ...t.passages.map((p) => clients.get(p.clientId)!), depot])} pathOptions={{ color: donnees.agents.find((a) => a.id === t.agentId)!.couleur, weight: 2.5, opacity: 0.85, lineJoin: 'round' }} />
                    {pts.map((p, k) => (
                      <CircleMarker key={k} center={p} radius={4.5} pathOptions={{ color: '#fff', weight: 1.5, fillColor: donnees.agents.find((a) => a.id === t.agentId)!.couleur, fillOpacity: 1 }} />
                    ))}
                  </Fragment>
                )
              })}
            </CadreCarte>
          </div>

          <ul className="overflow-hidden rounded-lg border border-filet bg-surface text-sm lg:max-h-[26rem] lg:overflow-y-auto">
            {tournees.map((t) => {
              const agent = donnees.agents.find((a) => a.id === t.agentId)!
              const communes = [...new Set(t.passages.map((p) => clients.get(p.clientId)!.ville))]
              return (
                <li key={`${t.date}|${t.agentId}`} className="flex items-start gap-3 border-b border-filet px-4 py-2.5 last:border-b-0">
                  <span className="mt-1.5"><PastilleAgent couleur={agent.couleur} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-medium first-letter:uppercase">{formatDateLongue(t.date)}</span>
                      <span className="text-xs text-sourdine tabular-nums">
                        {t.passages.length} passage{t.passages.length > 1 ? 's' : ''} · journée de {formatDuree(t.journee.totalMin)}, route comprise
                      </span>
                    </span>
                    <span className="block truncate text-xs text-sourdine">
                      {agent.nom.split(' ')[0]} · {communes.join(', ')}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </Tiroir>
  )
}
