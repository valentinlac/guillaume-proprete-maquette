import type { Categorie } from '../donnees/types'

export const LIBELLES_CATEGORIE: Record<Categorie, string> = {
  social: 'Social',
  entretien_vehicules: 'Entretien véhicules',
  telephonie_internet: 'Téléphonie et internet',
  assurances: 'Assurances',
  carburant: 'Carburant',
  fournitures: 'Fournitures',
  encaissements_clients: 'Encaissements clients',
}

export const CATEGORIES = Object.keys(LIBELLES_CATEGORIE) as Categorie[]
