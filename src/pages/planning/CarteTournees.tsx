import L from 'leaflet'
import { Fragment, useMemo } from 'react'
import { Marker, Polyline, Tooltip } from 'react-leaflet'
import type { Agent, Entite } from '../../donnees/types'
import type { DetailJournee } from '../../planning/vues'
import { formatHeure } from '../../utils/format'
import { usePlacerSurLaRoute, useTracerParLaRoute } from '../../trajets/traces'
import { CadreCarte, useDecalagesEcran } from './CadreCarte'

export interface TraceAgent {
  agent: Agent
  detail: DetailJournee
}

/**
 * Pastille numérotée à la couleur de l'agent (pas d'image externe). Si elle est
 * écartée pour ne pas en recouvrir une autre, un point reste sur la route, à
 * l'endroit exact du passage, relié à la pastille par un trait fin.
 */
function icone(texte: string, couleur: string, annule = false, enAvant = false, [dx, dy]: [number, number] = [0, 0]) {
  const taille = enAvant ? 34 : 26
  const [x, y] = [taille / 2 - dx, taille / 2 - dy]
  // Le trait s'arrête au bord de la pastille, pour ne pas passer sous le chiffre.
  const longueur = Math.hypot(dx, dy) || 1
  const [bx, by] = [taille / 2 - (dx / longueur) * (taille / 2), taille / 2 - (dy / longueur) * (taille / 2)]
  const repere = dx || dy
    ? `<svg width="${taille}" height="${taille}" style="position:absolute;left:0;top:0;overflow:visible;pointer-events:none">
        <line x1="${x}" y1="${y}" x2="${bx}" y2="${by}" stroke="${annule ? '#94a3b8' : couleur}" stroke-width="2" />
        <circle cx="${x}" cy="${y}" r="4" fill="${annule ? '#e2e8f0' : couleur}" stroke="#fff" stroke-width="1.5" />
      </svg>`
    : ''
  return L.divIcon({
    className: '',
    iconSize: [taille, taille],
    // Le décalage éventuel sépare les pastilles de clients très proches.
    iconAnchor: [x, y],
    html: `<div style="position:relative;width:${taille}px;height:${taille}px">${repere}<div style="position:relative;width:${taille}px;height:${taille}px;border-radius:9999px;display:grid;place-items:center;
      font:600 ${enAvant ? 14 : 12}px/1 system-ui,sans-serif;color:${annule ? '#64748b' : '#fff'};
      background:${annule ? '#e2e8f0' : couleur};border:${enAvant ? '3px solid #facc15' : '2px solid #fff'};box-sizing:border-box;
      box-shadow:0 1px 3px rgba(0,0,0,.35)${enAvant ? ',0 0 0 4px rgba(250,204,21,.35)' : ''};
      ${annule ? 'text-decoration:line-through;' : ''}">${texte}</div></div>`,
  })
}

export function CarteTournees({ depot, traces, miseEnAvant }: {
  depot: Entite['depot']
  traces: TraceAgent[]
  /** Identifiant d'un passage à mettre en évidence (ex. aperçu d'un créneau). */
  miseEnAvant?: string
}) {
  // Pastilles posées sur la route, pour que le trait passe en leur centre.
  const placer = usePlacerSurLaRoute()
  const points = useMemo<[number, number][]>(
    () => traces.flatMap((t) => t.detail.lignes.map((l) => placer(l.client))),
    [traces, placer],
  )
  // Le cadre englobe aussi les routes empruntées, pas seulement les clients.
  const tracer = useTracerParLaRoute()
  const etapeDepot = { id: 'depot', lat: depot.lat, lng: depot.lng }
  const routes = traces.flatMap((t) => tracer([etapeDepot, ...t.detail.lignes.filter((l) => l.debutMin !== null).map((l) => l.client), etapeDepot]))
  return (
    <CadreCarte depot={depot} points={points} cadrage={routes}>
      <Traces depot={depot} traces={traces} points={points} miseEnAvant={miseEnAvant} />
    </CadreCarte>
  )
}

/** Tracés et pastilles numérotées ; à l'intérieur de la carte pour connaître le zoom. */
function Traces({ depot, traces, points, miseEnAvant }: {
  depot: Entite['depot']
  traces: TraceAgent[]
  points: [number, number][]
  miseEnAvant?: string
}) {
  // Pastilles qui se chevaucheraient à l'écran (entre elles ou avec le dépôt) : légèrement écartées.
  const liste = useDecalagesEcran(depot, points)
  const ids = traces.flatMap((t) => t.detail.lignes.map((l) => l.intervention.id))
  const decalages = new Map(ids.map((id, k) => [id, liste[k]]))
  const positions = new Map(ids.map((id, k) => [id, points[k]]))
  const tracer = useTracerParLaRoute()
  const etapeDepot = { id: 'depot', lat: depot.lat, lng: depot.lng }

  return (
    <>
      {traces.map(({ agent, detail }) => {
        const actives = detail.lignes.filter((l) => l.debutMin !== null)
        // Le chemin réel par la route : dépôt, chaque client dans l'ordre, retour au dépôt.
        const trace = tracer([etapeDepot, ...actives.map((l) => l.client), etapeDepot])
        return (
          <Fragment key={agent.id}>
            {actives.length > 0 && (
              <>
                {/* Liseré blanc sous le trait, pour qu'il reste lisible sur le fond de carte. */}
                <Polyline positions={trace} pathOptions={{ color: '#fff', weight: 7, opacity: 0.9, lineJoin: 'round', lineCap: 'round' }} interactive={false} />
                <Polyline positions={trace} pathOptions={{ color: agent.couleur, weight: 4, opacity: 0.95, lineJoin: 'round', lineCap: 'round' }} interactive={false} />
              </>
            )}
            {detail.lignes.map((l, k) => {
              const annule = l.debutMin === null
              return (
                <Marker
                  key={l.intervention.id}
                  position={positions.get(l.intervention.id)!}
                  icon={icone(annule ? '×' : String(k + 1), agent.couleur, annule, l.intervention.id === miseEnAvant, decalages.get(l.intervention.id))}
                  zIndexOffset={l.intervention.id === miseEnAvant ? 1000 : 0}
                >
                  <Tooltip direction="top" offset={[0, -12]}>
                    <strong>{annule ? '' : `${k + 1}. `}{l.client.nom}</strong>
                    <br />
                    {l.client.ville} · {agent.nom}
                    {!annule && ` · ${formatHeure(l.debutMin!)}`}
                    {annule && ' · annulé'}
                  </Tooltip>
                </Marker>
              )
            })}
          </Fragment>
        )
      })}
    </>
  )
}
