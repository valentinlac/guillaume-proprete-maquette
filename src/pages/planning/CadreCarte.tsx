import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Entite, Point } from '../../donnees/types'

const ICONE_DEPOT = L.divIcon({
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  html: `<div style="width:28px;height:28px;border-radius:6px;display:grid;place-items:center;
    font:700 12px/1 system-ui,sans-serif;color:#fff;background:#0f172a;border:2px solid #fff;
    box-shadow:0 1px 3px rgba(0,0,0,.35)">D</div>`,
})

/** Recadre la carte quand les points affichés ou la taille de la carte changent. */
function Recadrage({ points }: { points: [number, number][] }) {
  const map = useMap()
  // Les tracés routiers comptent des milliers de points : seule l'emprise sert de clé.
  const cle = L.latLngBounds(points).toBBoxString()
  useEffect(() => {
    const [ouest, sud, est, nord] = cle.split(',').map(Number)
    const cadrer = () => {
      map.invalidateSize()
      // Marge d'une pastille et demie, pour qu'aucune ne soit coupée au bord.
      // Sans animation : Leaflet ignore un recadrage demandé pendant un zoom animé
      // (passage rapide d'un jour à l'autre), la carte resterait mal cadrée.
      map.fitBounds([[sud, ouest], [nord, est]], { padding: [40, 40], maxZoom: 14, animate: false })
    }
    cadrer()
    // La carte peut être créée avant que la mise en page ne lui donne sa taille définitive.
    const observateur = new ResizeObserver(cadrer)
    observateur.observe(map.getContainer())
    return () => observateur.disconnect()
  }, [map, cle])
  return null
}

/**
 * Carte OpenStreetMap avec le dépôt, recadrée sur les points donnés.
 * Sans connexion, le fond ne s'affiche pas mais points et tracés restent visibles.
 */
export function CadreCarte({ depot, points, cadrage = [], children }: {
  depot: Entite['depot']
  points: [number, number][]
  /** Points supplémentaires à garder dans le cadre (ex. tracés routiers). */
  cadrage?: [number, number][]
  children: ReactNode
}) {
  const [fondIndisponible, setFondIndisponible] = useState(false)
  return (
    <div className="relative isolate h-full overflow-hidden rounded-md border border-filet bg-papier">
      <MapContainer center={[depot.lat, depot.lng]} zoom={11} zoomSnap={0.25} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          eventHandlers={{ tileerror: () => setFondIndisponible(true) }}
        />
        <Recadrage points={[[depot.lat, depot.lng], ...points, ...cadrage]} />
        <Marker position={[depot.lat, depot.lng]} icon={ICONE_DEPOT}>
          <Tooltip direction="top" offset={[0, -12]}>Dépôt : {depot.adresse}</Tooltip>
        </Marker>
        {children}
      </MapContainer>
      {fondIndisponible && (
        <div className="pointer-events-none absolute top-2 left-1/2 z-[1000] -translate-x-1/2 rounded bg-surface/95 px-2 py-1 text-xs text-encre-2">
          Fond de carte indisponible (hors connexion). Les points et l’ordre restent justes.
        </div>
      )}
    </div>
  )
}

/**
 * Décalages d'affichage (en pixels) des pastilles qui se chevaucheraient à
 * l'écran, recalculés à chaque zoom. Le dépôt est fixe ; le point réel ne bouge pas.
 */
export function useDecalagesEcran(depot: Point, points: [number, number][], ecartMinPx = 34): [number, number][] {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())
  useEffect(() => {
    const suivre = () => setZoom(map.getZoom())
    map.on('zoomend', suivre)
    return () => {
      map.off('zoomend', suivre)
    }
  }, [map])

  return useMemo(() => {
    const places = [map.project([depot.lat, depot.lng], zoom)]
    return points.map(([lat, lng]) => {
      const p = map.project([lat, lng], zoom)
      // Essaie la position réelle, puis des positions autour, jusqu'à trouver une place libre.
      for (let tour = 0; tour < 13; tour++) {
        const angle = tour === 0 ? 0 : ((tour - 1) * Math.PI) / 3 - Math.PI / 2
        const rayon = tour === 0 ? 0 : tour <= 6 ? ecartMinPx : ecartMinPx * 2
        const candidat = L.point(p.x + rayon * Math.cos(angle), p.y + rayon * Math.sin(angle))
        if (places.every((q) => q.distanceTo(candidat) >= ecartMinPx) || tour === 12) {
          places.push(candidat)
          return [Math.round(candidat.x - p.x), Math.round(candidat.y - p.y)] as [number, number]
        }
      }
      return [0, 0] as [number, number]
    })
  }, [map, zoom, depot, points, ecartMinPx])
}
