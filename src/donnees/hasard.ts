/**
 * Générateur pseudo-aléatoire à graine (mulberry32) : les données fictives
 * « aléatoires » sont identiques à chaque chargement, ce qui garantit une démo
 * reproductible.
 */
export interface Hasard {
  /** Réel dans [0, 1[ */
  reel(): number
  /** Entier dans [min, max] (bornes incluses) */
  entier(min: number, max: number): number
  choisir<T>(liste: readonly T[]): T
}

export function creerHasard(graine: number): Hasard {
  let etat = graine >>> 0
  const reel = () => {
    etat = (etat + 0x6d2b79f5) >>> 0
    let t = etat
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    reel,
    entier: (min, max) => min + Math.floor(reel() * (max - min + 1)),
    choisir: (liste) => liste[Math.floor(reel() * liste.length)],
  }
}

/** Transforme un texte en graine numérique. */
export function hacher(texte: string): number {
  let h = 2166136261
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
