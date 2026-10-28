/**
 * Module « temps de trajet ».
 *
 * Dans la maquette, les temps de route sont estimés à partir de la distance à vol
 * d'oiseau. Dans la vraie version, il suffira de fournir un autre `ServiceTrajet`
 * (appel à un service d'itinéraire) via `definirServiceTrajet` : le reste de
 * l'application ne passe que par `serviceTrajet()`.
 *
 * Le cache évite de recalculer deux fois le même trajet entre deux adresses ;
 * avec un vrai service payant, c'est lui qui limite le nombre d'appels.
 */

export interface Point {
  lat: number
  lng: number
}

export interface ServiceTrajet {
  /** Temps de route estimé en minutes. */
  minutesEntre(depart: Point, arrivee: Point): number
  /** Distance de route estimée en kilomètres. */
  kmEntre(depart: Point, arrivee: Point): number
}

const RAYON_TERRE_KM = 6371

export function distanceVolOiseauKm(a: Point, b: Point): number {
  const rad = (deg: number) => (deg * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * RAYON_TERRE_KM * Math.asin(Math.sqrt(h))
}

export interface OptionsTrajetSimule {
  /** La route est plus longue que la ligne droite (≈ 1,3 en zone périurbaine). */
  coefficientDetour: number
  vitesseMoyenneKmh: number
  /** Stationnement, déchargement du matériel… */
  minutesFixes: number
}

export const OPTIONS_TRAJET_PAR_DEFAUT: OptionsTrajetSimule = {
  coefficientDetour: 1.3,
  vitesseMoyenneKmh: 50,
  minutesFixes: 4,
}

export function creerServiceTrajetSimule(
  options: OptionsTrajetSimule = OPTIONS_TRAJET_PAR_DEFAUT,
): ServiceTrajet {
  const cache = new Map<string, number>()
  const cle = (a: Point, b: Point) => `${a.lat},${a.lng}|${b.lat},${b.lng}`

  const kmEntre = (a: Point, b: Point) => distanceVolOiseauKm(a, b) * options.coefficientDetour

  return {
    kmEntre,
    minutesEntre(a, b) {
      const k = cle(a, b)
      const enCache = cache.get(k)
      if (enCache !== undefined) return enCache
      const km = kmEntre(a, b)
      const minutes =
        km < 0.05 ? 0 : Math.round(options.minutesFixes + (km / options.vitesseMoyenneKmh) * 60)
      cache.set(k, minutes)
      cache.set(cle(b, a), minutes)
      return minutes
    },
  }
}

let serviceCourant: ServiceTrajet = creerServiceTrajetSimule()

/** Service de trajet utilisé par toute l'application. */
export function serviceTrajet(): ServiceTrajet {
  return serviceCourant
}

/** Point de branchement d'un vrai service d'itinéraire. */
export function definirServiceTrajet(service: ServiceTrajet): void {
  serviceCourant = service
}
