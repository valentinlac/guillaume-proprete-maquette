/**
 * Calcule une fois pour toutes le tracé routier entre chaque paire de points
 * (dépôt et clients fictifs) et l'enregistre dans public/itineraires/<entité>.json.
 * La maquette lit ces fichiers : aucun appel extérieur pendant la démo.
 *
 * Source : serveur de démonstration gratuit d'OSRM (données OpenStreetMap),
 * une requête par seconde au plus, comme le demandent ses conditions d'usage.
 * À relancer seulement si les clients ou le dépôt changent : npm run itineraires
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { ENTITES } from '../src/donnees/donnees-fictives'

const SERVEUR = 'https://router.project-osrm.org/route/v1/driving'
/** Tolérance de simplification du tracé, en degrés (environ 15 m). */
const TOLERANCE = 0.00015

type Coord = [number, number]

/** Simplification de Douglas-Peucker : garde la forme de la route avec beaucoup moins de points. */
function simplifier(points: Coord[], tolerance: number): Coord[] {
  if (points.length < 3) return points
  const [a, b] = [points[0], points[points.length - 1]]
  let max = 0
  let index = 0
  for (let k = 1; k < points.length - 1; k++) {
    const d = distanceAuSegment(points[k], a, b)
    if (d > max) [max, index] = [d, k]
  }
  if (max <= tolerance) return [a, b]
  return [...simplifier(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplifier(points.slice(index), tolerance)]
}

function distanceAuSegment([x, y]: Coord, [x1, y1]: Coord, [x2, y2]: Coord): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const t = dx || dy ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy))) : 0
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function trace(a: Coord, b: Coord): Promise<Coord[]> {
  const url = `${SERVEUR}/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`
  for (let essai = 0; essai < 4; essai++) {
    const reponse = await fetch(url, { headers: { 'User-Agent': 'maquette-guillaume-proprete (donnees fictives)' } })
    if (reponse.ok) {
      const json = (await reponse.json()) as { routes: { geometry: { coordinates: [number, number][] } }[] }
      const points = json.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng] as Coord)
      return simplifier(points, TOLERANCE).map(([lat, lng]) => [Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5])
    }
    await pause(3000 * (essai + 1))
  }
  throw new Error(`Itinéraire introuvable : ${url}`)
}

mkdirSync('public/itineraires', { recursive: true })
for (const entite of ENTITES) {
  const fichier = `public/itineraires/${entite.id}.json`
  // Reprise possible : les tracés déjà calculés sont conservés.
  const traces: Record<string, Coord[]> = existsSync(fichier) ? JSON.parse(readFileSync(fichier, 'utf8')) : {}
  const points: { id: string; c: Coord }[] = [
    { id: 'depot', c: [entite.depot.lat, entite.depot.lng] },
    ...entite.clients.map((c) => ({ id: c.id, c: [c.lat, c.lng] as Coord })),
  ]
  const paires = points.flatMap((a, i) => points.slice(i + 1).map((b) => [a, b] as const))
  let faits = 0
  for (const [a, b] of paires) {
    const cle = `${a.id}|${b.id}`
    faits++
    if (traces[cle]) continue
    traces[cle] = await trace(a.c, b.c)
    if (faits % 20 === 0) {
      writeFileSync(fichier, JSON.stringify(traces))
      console.log(`${entite.id} : ${faits}/${paires.length}`)
    }
    await pause(1100)
  }
  writeFileSync(fichier, JSON.stringify(traces))
  console.log(`${entite.id} : ${paires.length} tracés enregistrés dans ${fichier}`)
}
