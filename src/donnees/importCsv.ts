/**
 * Import de clients depuis un fichier CSV, au format d'un export Excel français :
 * séparateur « ; » (ou « , »), virgule décimale acceptée.
 *
 * Colonnes attendues (en-tête obligatoire, ordre libre) :
 *   nom ; adresse ; ville ; latitude ; longitude ; tarif ; frequence ; duree_min ; mois_dus ; contact
 *
 * Dans la vraie version, latitude et longitude seront calculées à partir de
 * l'adresse ; ici, elles doivent être fournies (aucun service externe).
 */
import { convertirClient, lireMoisDus } from './chargement'
import type { Client, Frequence } from './types'

export interface ErreurImport {
  ligne: number
  message: string
}

export interface ResultatImport {
  clients: Client[]
  erreurs: ErreurImport[]
}

const COLONNES = ['nom', 'adresse', 'ville', 'latitude', 'longitude', 'tarif', 'frequence', 'duree_min', 'mois_dus', 'contact'] as const
type Colonne = (typeof COLONNES)[number]

const FREQUENCES: Record<string, Frequence> = {
  quinzaine: 'quinzaine',
  'tous les 15 jours': 'quinzaine',
  mensuelle: 'mensuelle',
  mensuel: 'mensuelle',
  trimestrielle: 'trimestrielle',
  trimestriel: 'trimestrielle',
  semestrielle: 'semestrielle',
  semestriel: 'semestrielle',
}

function sansAccents(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Découpe une ligne CSV en respectant les guillemets. */
function decouper(ligne: string, separateur: string): string[] {
  const champs: string[] = []
  let courant = ''
  let entreGuillemets = false
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i]
    if (c === '"') {
      if (entreGuillemets && ligne[i + 1] === '"') {
        courant += '"'
        i++
      } else entreGuillemets = !entreGuillemets
    } else if (c === separateur && !entreGuillemets) {
      champs.push(courant.trim())
      courant = ''
    } else courant += c
  }
  champs.push(courant.trim())
  return champs
}

function nombre(texte: string): number {
  return Number(texte.replace(/\s|€/g, '').replace(',', '.'))
}

/**
 * Lit le contenu d'un fichier CSV. `existants` sert à générer des identifiants
 * sans collision et à écarter les clients déjà présents (même nom).
 */
export function lireCsvClients(contenu: string, existants: Pick<Client, 'id' | 'nom'>[] = []): ResultatImport {
  const lignes = contenu.replace(/^﻿/, '').split(/\r?\n/)
  const iEntete = lignes.findIndex((l) => l.trim() !== '')
  if (iEntete < 0) return { clients: [], erreurs: [{ ligne: 1, message: 'Fichier vide' }] }

  const separateur = lignes[iEntete].includes(';') ? ';' : ','
  const entete = decouper(lignes[iEntete], separateur).map(sansAccents)
  const position = {} as Record<Colonne, number>
  const manquantes = COLONNES.filter((c) => {
    position[c] = entete.indexOf(c)
    return position[c] < 0
  })
  if (manquantes.length) {
    return { clients: [], erreurs: [{ ligne: iEntete + 1, message: `Colonne(s) manquante(s) : ${manquantes.join(', ')}` }] }
  }

  const clients: Client[] = []
  const erreurs: ErreurImport[] = []
  const ids = new Set(existants.map((c) => c.id))
  const noms = new Set(existants.map((c) => sansAccents(c.nom)))
  let compteur = 1
  const nouvelId = () => {
    let id: string
    do id = `i${String(compteur++).padStart(2, '0')}`
    while (ids.has(id))
    ids.add(id)
    return id
  }

  for (let n = iEntete + 1; n < lignes.length; n++) {
    if (lignes[n].trim() === '') continue
    const numero = n + 1
    const champs = decouper(lignes[n], separateur)
    const val = (c: Colonne) => champs[position[c]] ?? ''
    const problemes: string[] = []

    const nom = val('nom')
    if (!nom) problemes.push('nom vide')
    else if (noms.has(sansAccents(nom))) {
      erreurs.push({ ligne: numero, message: `${nom} : déjà dans la liste, ignoré` })
      continue
    }
    const lat = nombre(val('latitude'))
    const lng = nombre(val('longitude'))
    if (!val('latitude') || !val('longitude') || Number.isNaN(lat) || Number.isNaN(lng)) {
      problemes.push('coordonnées manquantes (le calcul depuis l’adresse est prévu dans la vraie version)')
    } else if (lat < 41 || lat > 51.5 || lng < -5.5 || lng > 9.8) {
      problemes.push('coordonnées hors de France')
    }
    const tarif = nombre(val('tarif'))
    if (!(tarif > 0)) problemes.push(`tarif invalide (« ${val('tarif')} »)`)
    const dureeMin = nombre(val('duree_min'))
    if (!(dureeMin > 0) || dureeMin > 450) problemes.push(`durée invalide (« ${val('duree_min')} »)`)
    const frequence = FREQUENCES[sansAccents(val('frequence'))]
    if (!frequence) problemes.push(`fréquence inconnue (« ${val('frequence')} »)`)
    let moisDus = ''
    try {
      lireMoisDus(val('mois_dus'))
      moisDus = val('mois_dus')
    } catch {
      problemes.push(`mois dus invalides (« ${val('mois_dus')} », 12 caractères X ou . attendus)`)
    }

    if (problemes.length) {
      erreurs.push({ ligne: numero, message: `${nom || 'Client sans nom'} : ${problemes.join(' ; ')}` })
      continue
    }
    noms.add(sansAccents(nom))
    clients.push(
      convertirClient({
        id: nouvelId(),
        nom,
        adresse: val('adresse'),
        ville: val('ville'),
        lat,
        lng,
        tarif,
        frequence: frequence!,
        dureeMin,
        moisDus,
        contact: val('contact') || 'Responsable',
      }),
    )
  }
  return { clients, erreurs }
}
