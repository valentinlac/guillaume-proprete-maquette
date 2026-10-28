/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FICHIER DE DONNÉES FICTIVES : le seul fichier à modifier pour changer la démo.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Tout est inventé : aucun nom de client réel. Les coordonnées sont des points
 * réalistes autour de chaque ville (rayon ≈ 30 km).
 *
 * Mois dus : 12 caractères de janvier à décembre, « X » = passage dû, « . » = non.
 *   ex. 'X..X..X..X..' = janvier, avril, juillet, octobre.
 *
 * Trésorerie : les montants sont saisis en positif ; le signe est déduit de la
 * catégorie (« encaissements_clients » = entrée, le reste = dépense).
 * L'historique de mouvements (~150 lignes) est généré à partir de ces modèles,
 * toujours à l'identique.
 */
import type { SourceEntite } from './chargement'

/** Date « du jour » de la démo, figée pour que le scénario soit identique à chaque fois. */
export const DATE_DU_JOUR = '2026-10-28'

/**
 * Météo simulée pour la démo (dans la vraie version : un service météo gratuit).
 * Probabilité de pluie annoncée pour le lendemain, au-delà de laquelle l'outil propose d'agir.
 */
export const METEO_DEMO = {
  probabilitePluieDemain: 80,
  seuilAlerte: 60,
}

export const CALENDRIER_TRAVAIL = {
  /** 1 = lundi … 7 = dimanche */
  joursTravailles: [1, 2, 3, 4, 5],
  plages: [
    { debut: '08:00', fin: '12:00' },
    { debut: '13:30', fin: '17:00' },
  ],
  joursFeries: [
    '2026-01-01', '2026-04-06', '2026-05-01', '2026-05-08', '2026-05-14', '2026-05-25',
    '2026-07-14', '2026-08-15', '2026-11-01', '2026-11-11', '2026-12-25',
    '2027-01-01', '2027-03-29', '2027-05-01', '2027-05-06', '2027-05-08', '2027-05-17',
  ],
}

// Raccourcis pour les mois dus
const TOUS = 'XXXXXXXXXXXX'
const SAUF_AOUT = 'XXXXXXX.XXXX'
const TRIM_JAN = 'X..X..X..X..' // janv., avr., juil., oct.
const TRIM_FEV = '.X..X..X..X.' // févr., mai, août, nov.
const TRIM_MAR = '..X..X..X..X' // mars, juin, sept., déc.
const SEM_AVR = '...X.....X..' // avril, octobre
const SEM_MAI = '....X.....X.' // mai, novembre
const SEM_MAR = '..X.....X...' // mars, septembre

export const ENTITES: SourceEntite[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'valence',
    heuresEconomiseesMois: 9,
    nom: 'Guillaume Propreté Valence',
    ville: 'Valence',
    type: 'societe',
    depot: { adresse: 'ZA des Auréats, Valence', lat: 44.9165, lng: 4.9105 },
    agents: [
      { id: 'a1', nom: 'Julien M.', heuresMaxJour: 7, zone: 'Nord et Ouest', couleur: '#2f5fb3' },
      { id: 'a2', nom: 'Sofiane B.', heuresMaxJour: 7, zone: 'Sud et Est', couleur: '#c2602a' },
    ],
    clients: [
      // Valence centre
      { id: 'c01', nom: 'Boulangerie Le Fournil des Cordeliers', adresse: '14 rue des Cordeliers', ville: 'Valence', lat: 44.9338, lng: 4.8915, tarif: 70, frequence: 'quinzaine', dureeMin: 60, moisDus: TOUS, contact: 'Mme Faure' },
      { id: 'c02', nom: 'Pharmacie des Arcades', adresse: '8 avenue Victor Hugo', ville: 'Valence', lat: 44.9305, lng: 4.8930, tarif: 55, frequence: 'quinzaine', dureeMin: 45, moisDus: TOUS, contact: 'M. Roux' },
      { id: 'c03', nom: 'Agence Drôme Habitat', adresse: '22 boulevard Bancel', ville: 'Valence', lat: 44.9365, lng: 4.8955, tarif: 65, frequence: 'mensuelle', dureeMin: 60, moisDus: TOUS, contact: 'Mme Chabert' },
      { id: 'c04', nom: 'Cabinet Morel & Associés', adresse: '5 rue Madier de Montjau', ville: 'Valence', lat: 44.9325, lng: 4.8890, tarif: 95, frequence: 'mensuelle', dureeMin: 90, moisDus: TOUS, contact: 'M. Morel' },
      { id: 'c05', nom: 'Brasserie du Kiosque', adresse: '2 avenue Gambetta', ville: 'Valence', lat: 44.9300, lng: 4.8905, tarif: 85, frequence: 'quinzaine', dureeMin: 75, moisDus: TOUS, contact: 'M. Bonnet' },
      { id: 'c06', nom: 'Résidence Les Glycines', adresse: '40 avenue de Romans', ville: 'Valence', lat: 44.9440, lng: 4.9050, tarif: 260, frequence: 'mensuelle', dureeMin: 240, moisDus: TOUS, contact: 'Mme Lambert (syndic)' },
      { id: 'c07', nom: "Opticien Vue d'Ici", adresse: '17 Grande Rue', ville: 'Valence', lat: 44.9330, lng: 4.8900, tarif: 50, frequence: 'mensuelle', dureeMin: 45, moisDus: TOUS, contact: 'Mme Garnier' },
      { id: 'c08', nom: 'Centre médical du Polygone', adresse: '11 avenue de Verdun', ville: 'Valence', lat: 44.9290, lng: 4.9000, tarif: 160, frequence: 'mensuelle', dureeMin: 150, moisDus: TOUS, contact: 'Dr Perrin' },
      // Nord
      { id: 'c09', nom: 'Garage Auto Rhône Nord', adresse: '35 avenue Marc Urtin', ville: 'Bourg-lès-Valence', lat: 44.9520, lng: 4.8960, tarif: 90, frequence: 'mensuelle', dureeMin: 90, moisDus: TOUS, contact: 'M. Blanc' },
      { id: 'c10', nom: 'Supérette du Bourg', adresse: '4 place de la Mairie', ville: 'Bourg-lès-Valence', lat: 44.9480, lng: 4.8930, tarif: 65, frequence: 'quinzaine', dureeMin: 60, moisDus: TOUS, contact: 'M. Moulin' },
      { id: 'c11', nom: 'Salle Énergie Forme', adresse: '8 rue Jean Moulin', ville: 'Bourg-lès-Valence', lat: 44.9555, lng: 4.8985, tarif: 190, frequence: 'trimestrielle', dureeMin: 180, moisDus: TRIM_JAN, contact: 'Mme Vidal' },
      { id: 'c12', nom: 'Domaine des Coteaux', adresse: '6 chemin des Vignes', ville: "Tain-l'Hermitage", lat: 45.0710, lng: 4.8470, tarif: 130, frequence: 'trimestrielle', dureeMin: 120, moisDus: TRIM_JAN, contact: 'M. Reynaud' },
      { id: 'c13', nom: 'Office notarial Hermitage', adresse: '15 avenue Jean Jaurès', ville: "Tain-l'Hermitage", lat: 45.0670, lng: 4.8430, tarif: 70, frequence: 'mensuelle', dureeMin: 60, moisDus: TOUS, contact: 'Me Arnaud' },
      { id: 'c14', nom: 'Restaurant La Table du Fleuve', adresse: '3 quai du Rhône', ville: 'Tournon-sur-Rhône', lat: 45.0660, lng: 4.8340, tarif: 80, frequence: 'quinzaine', dureeMin: 75, moisDus: TOUS, contact: 'M. Giraud' },
      { id: 'c15', nom: 'Crèche Les Petits Pas', adresse: '10 rue des Écoles', ville: 'Saint-Marcel-lès-Valence', lat: 44.9720, lng: 4.9560, tarif: 95, frequence: 'mensuelle', dureeMin: 90, moisDus: SAUF_AOUT, contact: 'Mme Brun' },
      { id: 'c16', nom: 'Entrepôt Isère-Rhône Logistique', adresse: 'ZA Les Plaines', ville: 'Châteauneuf-sur-Isère', lat: 45.0150, lng: 4.9350, tarif: 280, frequence: 'semestrielle', dureeMin: 240, moisDus: SEM_AVR, contact: 'M. Fabre' },
      // Est
      { id: 'c17', nom: 'Fromagerie des Monts', adresse: '5 place du Marché', ville: 'Chabeuil', lat: 44.8985, lng: 5.0195, tarif: 50, frequence: 'mensuelle', dureeMin: 45, moisDus: TOUS, contact: 'Mme Rey' },
      { id: 'c18', nom: 'Cabinet vétérinaire du Plateau', adresse: '18 route de Valence', ville: 'Chabeuil', lat: 44.9010, lng: 5.0100, tarif: 65, frequence: 'mensuelle', dureeMin: 60, moisDus: TOUS, contact: 'Dr Mercier' },
      { id: 'c19', nom: 'Hôtel Le Relais du Vercors', adresse: '2 route de Chabeuil', ville: 'Montélier', lat: 44.9330, lng: 5.0290, tarif: 160, frequence: 'quinzaine', dureeMin: 150, moisDus: TOUS, contact: 'M. Dumas' },
      { id: 'c20', nom: "Pépinière Les Jardins d'Alixan", adresse: '120 route de Romans', ville: 'Alixan', lat: 44.9750, lng: 5.0300, tarif: 95, frequence: 'trimestrielle', dureeMin: 90, moisDus: TRIM_JAN, contact: 'Mme Gauthier' },
      { id: 'c21', nom: 'Chaussures Le Pas Léger', adresse: '24 rue Jacquemart', ville: 'Romans-sur-Isère', lat: 45.0440, lng: 5.0510, tarif: 65, frequence: 'mensuelle', dureeMin: 60, moisDus: TOUS, contact: 'M. André' },
      { id: 'c22', nom: 'Atelier Cuir & Tradition', adresse: "7 rue de l'Industrie", ville: 'Romans-sur-Isère', lat: 45.0400, lng: 5.0560, tarif: 130, frequence: 'semestrielle', dureeMin: 120, moisDus: SEM_MAI, contact: 'Mme Colin' },
      { id: 'c23', nom: "Agence Assur'Plus", adresse: '3 avenue Alpes-Provence', ville: 'Bourg-de-Péage', lat: 45.0370, lng: 5.0490, tarif: 50, frequence: 'mensuelle', dureeMin: 45, moisDus: TOUS, contact: 'M. Lefèvre' },
      { id: 'c24', nom: 'Maison de retraite Le Clos Fleuri', adresse: '15 chemin des Écoliers', ville: 'Montélier', lat: 44.9370, lng: 5.0350, tarif: 190, frequence: 'quinzaine', dureeMin: 180, moisDus: TOUS, contact: 'Mme Henry' },
      { id: 'c25', nom: 'Motoculture Drôme Services', adresse: 'ZA de la Plaine', ville: 'Chabeuil', lat: 44.8950, lng: 5.0250, tarif: 120, frequence: 'trimestrielle', dureeMin: 120, moisDus: TRIM_FEV, contact: 'M. Martin' },
      // Sud
      { id: 'c26', nom: 'Boulangerie La Mie Dorée', adresse: '6 rue Jean Jaurès', ville: 'Portes-lès-Valence', lat: 44.8760, lng: 4.8770, tarif: 55, frequence: 'quinzaine', dureeMin: 45, moisDus: TOUS, contact: 'Mme Roche' },
      { id: 'c27', nom: 'Pôle santé de Portes', adresse: '20 avenue Jean Moulin', ville: 'Portes-lès-Valence', lat: 44.8730, lng: 4.8740, tarif: 125, frequence: 'mensuelle', dureeMin: 120, moisDus: TOUS, contact: 'Dr Michel' },
      { id: 'c28', nom: 'Carrosserie du Sud', adresse: '9 rue des Artisans', ville: 'Portes-lès-Valence', lat: 44.8710, lng: 4.8800, tarif: 90, frequence: 'trimestrielle', dureeMin: 90, moisDus: TRIM_JAN, contact: 'M. Lopez' },
      { id: 'c29', nom: "Restaurant L'Étoile du Berger", adresse: '1 place de la Halle', ville: 'Étoile-sur-Rhône', lat: 44.8395, lng: 4.8910, tarif: 80, frequence: 'mensuelle', dureeMin: 75, moisDus: TOUS, contact: 'M. Sanchez' },
      { id: 'c30', nom: 'Cave des Vignerons de Beaumont', adresse: '45 route de Montéléger', ville: 'Beaumont-lès-Valence', lat: 44.8625, lng: 4.9425, tarif: 200, frequence: 'semestrielle', dureeMin: 180, moisDus: SEM_AVR, contact: 'M. Charpentier' },
      { id: 'c31', nom: 'Marché Frais de Livron', adresse: '30 avenue de Provence', ville: 'Livron-sur-Drôme', lat: 44.7730, lng: 4.8440, tarif: 130, frequence: 'quinzaine', dureeMin: 120, moisDus: TOUS, contact: 'Mme Gaillard' },
      { id: 'c32', nom: 'Sud Drôme Conseil', adresse: '12 rue du Temple', ville: 'Livron-sur-Drôme', lat: 44.7700, lng: 4.8410, tarif: 65, frequence: 'mensuelle', dureeMin: 60, moisDus: TOUS, contact: 'M. Robin' },
      { id: 'c33', nom: 'Auto-école Loriol Conduite', adresse: '4 Grande Rue', ville: 'Loriol-sur-Drôme', lat: 44.7480, lng: 4.8230, tarif: 50, frequence: 'trimestrielle', dureeMin: 45, moisDus: TRIM_MAR, contact: 'Mme Picard' },
      { id: 'c34', nom: 'Bureaux Technoparc', adresse: '2 allée des Entrepreneurs', ville: 'Malissard', lat: 44.9010, lng: 4.9530, tarif: 190, frequence: 'mensuelle', dureeMin: 180, moisDus: TOUS, contact: 'M. Guérin' },
      { id: 'c35', nom: "Salon L'Atelier Coiffure", adresse: '8 place de la Mairie', ville: 'Beauvallon', lat: 44.8565, lng: 4.9060, tarif: 45, frequence: 'mensuelle', dureeMin: 45, moisDus: TOUS, contact: 'Mme Morin' },
      // Ouest (Ardèche, rive droite)
      { id: 'c36', nom: 'Pharmacie du Pont', adresse: '120 avenue de la République', ville: 'Guilherand-Granges', lat: 44.9335, lng: 4.8715, tarif: 55, frequence: 'quinzaine', dureeMin: 45, moisDus: TOUS, contact: 'M. Lemoine' },
      { id: 'c37', nom: 'Clinique dentaire Rive Droite', adresse: '6 rue Pasteur', ville: 'Guilherand-Granges', lat: 44.9370, lng: 4.8700, tarif: 95, frequence: 'mensuelle', dureeMin: 90, moisDus: TOUS, contact: 'Dr Masson' },
      { id: 'c38', nom: 'Domaine des Côtes de Cornas', adresse: '3 route nationale', ville: 'Cornas', lat: 44.9645, lng: 4.8475, tarif: 160, frequence: 'semestrielle', dureeMin: 150, moisDus: SEM_AVR, contact: 'M. Clément' },
      { id: 'c39', nom: 'Magasin bio La Récolte', adresse: '27 avenue du 8 Mai', ville: 'Saint-Péray', lat: 44.9495, lng: 4.8455, tarif: 65, frequence: 'mensuelle', dureeMin: 60, moisDus: TOUS, contact: 'Mme Noël' },
      { id: 'c40', nom: 'Gîtes de la Tour', adresse: 'Chemin du Château', ville: 'Soyons', lat: 44.8890, lng: 4.8505, tarif: 120, frequence: 'trimestrielle', dureeMin: 120, moisDus: TRIM_JAN, contact: 'M. Rolland' },
    ],
    tresorerie: {
      debutHistorique: '2026-05-01',
      soldeInitial: 23_000,
      // Récurrents « tout juste détectés », à confirmer pendant la démo (les autres sont déjà confirmés).
      recurrentsAConfirmer: ['Cadulis', 'Fibre Pro', 'Assurance flotte véhicules'],
      recurrents: [
        { tiers: 'Salaires (virements)', categorie: 'social', jour: 28, montant: 11_500, variation: 0.02 },
        { tiers: 'URSSAF', categorie: 'social', jour: 15, montant: 4_300, variation: 0.04 },
        { tiers: 'Caisse de retraite complémentaire', categorie: 'social', jour: 10, montant: 950, variation: 0.03 },
        { tiers: 'Mutuelle santé collective', categorie: 'social', jour: 1, montant: 640, variation: 0 },
        { tiers: "Loc'Utilitaires Drôme", categorie: 'entretien_vehicules', jour: 5, montant: 1_180, variation: 0 },
        { tiers: 'TéléCom Pro', categorie: 'telephonie_internet', jour: 12, montant: 189, variation: 0.03 },
        { tiers: 'Fibre Pro', categorie: 'telephonie_internet', jour: 20, montant: 59.9, variation: 0 },
        { tiers: 'Sellsy', categorie: 'telephonie_internet', jour: 3, montant: 109, variation: 0 },
        { tiers: 'Cadulis', categorie: 'telephonie_internet', jour: 3, montant: 49, variation: 0 },
        { tiers: 'Mutuelle des Artisans (RC pro)', categorie: 'assurances', jour: 8, montant: 412, variation: 0 },
        { tiers: 'Assurance flotte véhicules', categorie: 'assurances', jour: 8, montant: 268, variation: 0 },
        { tiers: 'Résidence Les Glycines', categorie: 'encaissements_clients', jour: 10, montant: 7_800, variation: 0 },
        { tiers: 'Syndic Rhône Gestion', categorie: 'encaissements_clients', jour: 12, montant: 4_200, variation: 0.02 },
        { tiers: 'Centre commercial Les Moulins', categorie: 'encaissements_clients', jour: 15, montant: 3_600, variation: 0 },
        { tiers: 'Bureaux Technoparc', categorie: 'encaissements_clients', jour: 20, montant: 2_400, variation: 0 },
        { tiers: 'Centre médical du Polygone', categorie: 'encaissements_clients', jour: 25, montant: 1_900, variation: 0.03 },
      ],
      ponctuels: [
        { tiers: ['Station du Rhône', 'Relais Carburant Chabeuil'], categorie: 'carburant', parMois: 5, min: 70, max: 150 },
        { tiers: ['Distri-Hygiène Pro', 'Vitro Matériel'], categorie: 'fournitures', parMois: 2, min: 120, max: 480 },
        { tiers: ['Garage du Plateau'], categorie: 'entretien_vehicules', parMois: 0.5, min: 150, max: 650 },
        { tiers: ['Brasserie du Kiosque', 'Pharmacie des Arcades', 'Hôtel Le Relais du Vercors', 'Marché Frais de Livron', 'Clinique dentaire Rive Droite', 'Garage Auto Rhône Nord'], categorie: 'encaissements_clients', parMois: 4, min: 200, max: 700 },
      ],
      // Relevé bancaire du jour (simulé) : reconnu et classé automatiquement par l'outil.
      // Seuil de sécurité choisi par le dirigeant : la prévision prévient si le compte passe en dessous.
      seuilSecurite: 25_000,
      releveDuJour: [
        { libelle: 'VIR SEPA SALAIRES OCTOBRE 2026', montant: -11_370.52 },
        { libelle: 'CB STATION DU RHONE 27/10', montant: -84.2 },
        { libelle: 'VIR PHARMACIE DES ARCADES FACT 10-2026', montant: 132 },
        { libelle: 'PRLV SEPA DISTRI-HYGIENE PRO', montant: -212.4 },
        { libelle: 'CB BRICOMARCHE VALENCE 27/10', montant: -46.9 },
      ],
      factures: [
        { client: 'Pharmacie des Arcades', montant: 132, echeance: '2026-10-26' },
        { client: 'Garage Auto Rhône Nord', montant: 216, echeance: '2026-11-02' },
        { client: 'Hôtel Le Relais du Vercors', montant: 768, echeance: '2026-11-05' },
        { client: 'Marché Frais de Livron', montant: 624, echeance: '2026-11-09' },
        { client: 'Résidence Les Glycines', montant: 7_800, echeance: '2026-11-10' },
        { client: 'Syndic Rhône Gestion', montant: 4_200, echeance: '2026-11-12' },
        { client: 'Centre commercial Les Moulins', montant: 3_600, echeance: '2026-11-16' },
        { client: 'Bureaux Technoparc', montant: 2_400, echeance: '2026-11-20' },
        { client: 'Clinique dentaire Rive Droite', montant: 228, echeance: '2026-11-23' },
        { client: 'Centre médical du Polygone', montant: 1_900, echeance: '2026-11-25' },
        { client: 'Brasserie du Kiosque', montant: 408, echeance: '2026-11-30' },
        { client: 'Maison de retraite Le Clos Fleuri', montant: 912, echeance: '2026-12-04' },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'romans',
    heuresEconomiseesMois: 5,
    nom: 'Franchise Romans-sur-Isère',
    ville: 'Romans-sur-Isère',
    type: 'franchise',
    depot: { adresse: 'ZA des Allobroges, Romans-sur-Isère', lat: 45.0360, lng: 5.0680 },
    agents: [
      { id: 'a1', nom: 'Lucas R.', heuresMaxJour: 7, zone: 'Romans et Nord', couleur: '#2f5fb3' },
      { id: 'a2', nom: 'Inès T.', heuresMaxJour: 7, zone: 'Royans et Sud', couleur: '#c2602a' },
    ],
    clients: [
      { id: 'r01', nom: 'Boulangerie Le Pétrin Romanais', adresse: '9 place Jules Nadi', ville: 'Romans-sur-Isère', lat: 45.0445, lng: 5.0500, tarif: 55, frequence: 'quinzaine', dureeMin: 45, moisDus: TOUS, contact: 'Mme Bertrand' },
      { id: 'r02', nom: 'Cabinet kiné Les Balmes', adresse: '14 avenue Gambetta', ville: 'Romans-sur-Isère', lat: 45.0480, lng: 5.0450, tarif: 65, frequence: 'mensuelle', dureeMin: 60, moisDus: TOUS, contact: 'M. Fournier' },
      { id: 'r03', nom: 'Brasserie de la Presle', adresse: '2 place Maurice Faure', ville: 'Romans-sur-Isère', lat: 45.0410, lng: 5.0540, tarif: 70, frequence: 'quinzaine', dureeMin: 60, moisDus: TOUS, contact: 'M. Girard' },
      { id: 'r04', nom: 'Boutique Chaussures Artisanales', adresse: '31 rue Mathieu de la Drôme', ville: 'Romans-sur-Isère', lat: 45.0425, lng: 5.0580, tarif: 50, frequence: 'mensuelle', dureeMin: 45, moisDus: TOUS, contact: 'Mme Simon' },
      { id: 'r05', nom: 'Agence Isère Habitat', adresse: '5 avenue Alpes-Provence', ville: 'Bourg-de-Péage', lat: 45.0375, lng: 5.0480, tarif: 65, frequence: 'mensuelle', dureeMin: 60, moisDus: TOUS, contact: 'M. Laurent' },
      { id: 'r06', nom: 'Résidence Le Parc des Ormes', adresse: '18 chemin des Ormes', ville: 'Bourg-de-Péage', lat: 45.0340, lng: 5.0420, tarif: 190, frequence: 'mensuelle', dureeMin: 180, moisDus: TOUS, contact: 'Mme David (syndic)' },
      { id: 'r07', nom: 'Supérette de Mours', adresse: '1 place de l’Église', ville: 'Mours-Saint-Eusèbe', lat: 45.0650, lng: 5.0560, tarif: 65, frequence: 'quinzaine', dureeMin: 60, moisDus: TOUS, contact: 'M. Bertin' },
      { id: 'r08', nom: 'Garage des Collines', adresse: '40 route de Tain', ville: 'Saint-Paul-lès-Romans', lat: 45.0670, lng: 5.1300, tarif: 90, frequence: 'trimestrielle', dureeMin: 90, moisDus: TRIM_JAN, contact: 'M. Perret' },
      { id: 'r09', nom: 'Maison médicale de Génissieux', adresse: '3 rue des Tilleuls', ville: 'Génissieux', lat: 45.0850, lng: 5.0800, tarif: 125, frequence: 'mensuelle', dureeMin: 120, moisDus: TOUS, contact: 'Dr Collet' },
      { id: 'r10', nom: 'Restaurant Le Moulin', adresse: '12 route de Saint-Donat', ville: 'Peyrins', lat: 45.0930, lng: 5.0450, tarif: 80, frequence: 'mensuelle', dureeMin: 75, moisDus: TOUS, contact: 'M. Chevalier' },
      { id: 'r11', nom: 'Ferme-auberge du Goubet', adresse: 'Lieu-dit Le Goubet', ville: 'Chatuzange-le-Goubet', lat: 45.0030, lng: 5.0900, tarif: 95, frequence: 'trimestrielle', dureeMin: 90, moisDus: TRIM_FEV, contact: 'Mme Marchand' },
      { id: 'r12', nom: "Pharmacie de l'Herbasse", adresse: '6 place du Champ de Mars', ville: "Saint-Donat-sur-l'Herbasse", lat: 45.1200, lng: 4.9830, tarif: 55, frequence: 'quinzaine', dureeMin: 45, moisDus: TOUS, contact: 'M. Barbier' },
      { id: 'r13', nom: 'Fromagerie du Royans', adresse: '2 rue du Pont', ville: 'Saint-Nazaire-en-Royans', lat: 45.0600, lng: 5.2480, tarif: 50, frequence: 'mensuelle', dureeMin: 45, moisDus: TOUS, contact: 'Mme Hubert' },
      { id: 'r14', nom: 'Hôtel Les Falaises', adresse: '8 route du Vercors', ville: 'Hostun', lat: 45.0300, lng: 5.2100, tarif: 160, frequence: 'semestrielle', dureeMin: 150, moisDus: SEM_AVR, contact: 'M. Royer' },
      { id: 'r15', nom: 'Crèche Les Lutins', adresse: '20 rue de la Liberté', ville: 'Romans-sur-Isère', lat: 45.0500, lng: 5.0600, tarif: 95, frequence: 'mensuelle', dureeMin: 90, moisDus: SAUF_AOUT, contact: 'Mme Leroy' },
      { id: 'r16', nom: 'Bureaux ZA des Allobroges', adresse: '4 rue des Allobroges', ville: 'Romans-sur-Isère', lat: 45.0350, lng: 5.0700, tarif: 155, frequence: 'mensuelle', dureeMin: 150, moisDus: TOUS, contact: 'M. Renard' },
      { id: 'r17', nom: 'Cave des Coteaux de Peyrins', adresse: '50 route de Romans', ville: 'Peyrins', lat: 45.0950, lng: 5.0480, tarif: 120, frequence: 'semestrielle', dureeMin: 120, moisDus: SEM_MAR, contact: 'M. Dupuis' },
      { id: 'r18', nom: "Salle Romans Form'", adresse: '11 boulevard Voltaire', ville: 'Romans-sur-Isère', lat: 45.0390, lng: 5.0620, tarif: 160, frequence: 'trimestrielle', dureeMin: 150, moisDus: TRIM_JAN, contact: 'Mme Caron' },
      { id: 'r19', nom: 'Opticien Clair Regard', adresse: '7 Grande Rue', ville: 'Bourg-de-Péage', lat: 45.0385, lng: 5.0510, tarif: 50, frequence: 'mensuelle', dureeMin: 45, moisDus: TOUS, contact: 'M. Meunier' },
      { id: 'r20', nom: "Pâtisserie La Pogne d'Or", adresse: '15 côte des Cordeliers', ville: 'Romans-sur-Isère', lat: 45.0455, lng: 5.0525, tarif: 50, frequence: 'quinzaine', dureeMin: 45, moisDus: TOUS, contact: 'Mme Brunet' },
    ],
    tresorerie: {
      debutHistorique: '2026-05-01',
      soldeInitial: 15_500,
      // Récurrents « tout juste détectés », à confirmer pendant la démo (les autres sont déjà confirmés).
      recurrentsAConfirmer: ['Sellsy', 'TéléCom Pro'],
      recurrents: [
        { tiers: 'Salaires (virements)', categorie: 'social', jour: 28, montant: 5_900, variation: 0.02 },
        { tiers: 'URSSAF', categorie: 'social', jour: 15, montant: 2_250, variation: 0.04 },
        { tiers: 'Mutuelle santé collective', categorie: 'social', jour: 1, montant: 310, variation: 0 },
        { tiers: 'Leasing Utilitaires Isère', categorie: 'entretien_vehicules', jour: 5, montant: 640, variation: 0 },
        { tiers: 'TéléCom Pro', categorie: 'telephonie_internet', jour: 12, montant: 96, variation: 0.03 },
        { tiers: 'Sellsy', categorie: 'telephonie_internet', jour: 3, montant: 109, variation: 0 },
        { tiers: 'Redevance franchise Guillaume Propreté', categorie: 'fournitures', jour: 5, montant: 450, variation: 0 },
        { tiers: 'Mutuelle des Artisans (RC pro)', categorie: 'assurances', jour: 8, montant: 236, variation: 0 },
        { tiers: 'Résidence Le Parc des Ormes', categorie: 'encaissements_clients', jour: 10, montant: 4_600, variation: 0 },
        { tiers: 'Bureaux ZA des Allobroges', categorie: 'encaissements_clients', jour: 15, montant: 2_600, variation: 0 },
        { tiers: 'Maison médicale de Génissieux', categorie: 'encaissements_clients', jour: 22, montant: 1_450, variation: 0.03 },
      ],
      ponctuels: [
        { tiers: ['Station Romans Est'], categorie: 'carburant', parMois: 4, min: 60, max: 120 },
        { tiers: ['Distri-Hygiène Pro'], categorie: 'fournitures', parMois: 1.5, min: 90, max: 320 },
        { tiers: ['Garage des Collines'], categorie: 'entretien_vehicules', parMois: 0.4, min: 120, max: 480 },
        { tiers: ['Brasserie de la Presle', 'Supérette de Mours', "Pharmacie de l'Herbasse", 'Crèche Les Lutins'], categorie: 'encaissements_clients', parMois: 5, min: 150, max: 480 },
      ],
      // Seuil de sécurité choisi par le dirigeant : la prévision prévient si le compte passe en dessous.
      seuilSecurite: 8_000,
      releveDuJour: [
        { libelle: 'VIR SEPA SALAIRES OCTOBRE 2026', montant: -5_854.22 },
        { libelle: 'CB STATION ROMANS EST 27/10', montant: -72.4 },
        { libelle: 'VIR BRASSERIE DE LA PRESLE FACT 10-2026', montant: 168 },
        { libelle: 'CB LEROY MERLIN ROMANS 27/10', montant: -38.5 },
      ],
      factures: [
        { client: 'Brasserie de la Presle', montant: 168, echeance: '2026-10-26' },
        { client: 'Supérette de Mours', montant: 156, echeance: '2026-11-03' },
        { client: 'Résidence Le Parc des Ormes', montant: 4_600, echeance: '2026-11-10' },
        { client: "Pharmacie de l'Herbasse", montant: 132, echeance: '2026-11-06' },
        { client: 'Bureaux ZA des Allobroges', montant: 2_600, echeance: '2026-11-16' },
        { client: 'Maison médicale de Génissieux', montant: 1_450, echeance: '2026-11-23' },
        { client: 'Crèche Les Lutins', montant: 228, echeance: '2026-11-13' },
        { client: 'Cabinet kiné Les Balmes', montant: 78, echeance: '2026-11-18' },
        { client: 'Restaurant Le Moulin', montant: 96, echeance: '2026-11-20' },
        { client: "Salle Romans Form'", montant: 192, echeance: '2026-11-27' },
        { client: 'Garage des Collines', montant: 108, echeance: '2026-11-30' },
        { client: 'Fromagerie du Royans', montant: 60, echeance: '2026-12-02' },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'montelimar',
    heuresEconomiseesMois: 4,
    nom: 'Franchise Montélimar',
    ville: 'Montélimar',
    type: 'franchise',
    depot: { adresse: 'ZA du Meyrol, Montélimar', lat: 44.5440, lng: 4.7420 },
    agents: [
      { id: 'a1', nom: 'Marc D.', heuresMaxJour: 7, zone: 'Montélimar et Rhône', couleur: '#2f5fb3' },
      { id: 'a2', nom: 'Chloé P.', heuresMaxJour: 6, zone: 'Est et Drôme provençale', couleur: '#c2602a' },
    ],
    clients: [
      { id: 'm01', nom: "Confiserie Le Nougat d'Antan", adresse: '12 allées Provençales', ville: 'Montélimar', lat: 44.5575, lng: 4.7500, tarif: 65, frequence: 'quinzaine', dureeMin: 60, moisDus: TOUS, contact: 'Mme Aubert' },
      { id: 'm02', nom: 'Pharmacie des Allées', adresse: '30 allées Provençales', ville: 'Montélimar', lat: 44.5600, lng: 4.7490, tarif: 55, frequence: 'quinzaine', dureeMin: 45, moisDus: TOUS, contact: 'M. Guillot' },
      { id: 'm03', nom: 'Agence Provence Immobilier', adresse: '4 rue Pierre Julien', ville: 'Montélimar', lat: 44.5560, lng: 4.7530, tarif: 65, frequence: 'mensuelle', dureeMin: 60, moisDus: TOUS, contact: 'Mme Bailly' },
      { id: 'm04', nom: 'Clinique dentaire du Roubion', adresse: '9 avenue Saint-Martin', ville: 'Montélimar', lat: 44.5530, lng: 4.7560, tarif: 95, frequence: 'mensuelle', dureeMin: 90, moisDus: TOUS, contact: 'Dr Lacroix' },
      { id: 'm05', nom: 'Brasserie des Halles', adresse: '1 place du Marché', ville: 'Montélimar', lat: 44.5585, lng: 4.7520, tarif: 80, frequence: 'quinzaine', dureeMin: 75, moisDus: TOUS, contact: 'M. Rousseau' },
      { id: 'm06', nom: 'Résidence Les Oliviers', adresse: '22 boulevard Marre-Desmarais', ville: 'Montélimar', lat: 44.5650, lng: 4.7600, tarif: 220, frequence: 'mensuelle', dureeMin: 210, moisDus: TOUS, contact: 'Mme Vincent (syndic)' },
      { id: 'm07', nom: 'Garage du Jabron', adresse: '15 route de Dieulefit', ville: 'Montboucher-sur-Jabron', lat: 44.5520, lng: 4.8000, tarif: 90, frequence: 'trimestrielle', dureeMin: 90, moisDus: TRIM_JAN, contact: 'M. Muller' },
      { id: 'm08', nom: "Boulangerie d'Ancône", adresse: '3 rue du Rhône', ville: 'Ancône', lat: 44.5810, lng: 4.7340, tarif: 50, frequence: 'quinzaine', dureeMin: 45, moisDus: TOUS, contact: 'Mme Lefebvre' },
      { id: 'm09', nom: 'Domaine des Vignes de Savasse', adresse: 'Chemin des Vignes', ville: 'Savasse', lat: 44.6050, lng: 4.7770, tarif: 160, frequence: 'semestrielle', dureeMin: 150, moisDus: SEM_AVR, contact: 'M. Faure' },
      { id: 'm10', nom: 'Restaurant Le Relais de Sauzet', adresse: '5 Grande Rue', ville: 'Sauzet', lat: 44.6020, lng: 4.8200, tarif: 80, frequence: 'mensuelle', dureeMin: 75, moisDus: TOUS, contact: 'M. Bourgeois' },
      { id: 'm11', nom: 'Supérette de Châteauneuf', adresse: '2 place de la Mairie', ville: 'Châteauneuf-du-Rhône', lat: 44.4900, lng: 4.7200, tarif: 65, frequence: 'quinzaine', dureeMin: 60, moisDus: TOUS, contact: 'Mme Renaud' },
      { id: 'm12', nom: 'Cabinet Rhône Provence Conseil', adresse: '18 rue de la République', ville: 'Le Teil', lat: 44.5450, lng: 4.6830, tarif: 65, frequence: 'mensuelle', dureeMin: 60, moisDus: TOUS, contact: 'M. Schmitt' },
      { id: 'm13', nom: "Maison de santé d'Allan", adresse: '1 rue des Écoles', ville: 'Allan', lat: 44.5000, lng: 4.7900, tarif: 125, frequence: 'mensuelle', dureeMin: 120, moisDus: TOUS, contact: 'Dr Marie' },
      { id: 'm14', nom: 'Hôtel Les Lavandes', adresse: '7 route de Crest', ville: "Cléon-d'Andran", lat: 44.6100, lng: 4.9370, tarif: 130, frequence: 'trimestrielle', dureeMin: 120, moisDus: TRIM_JAN, contact: 'Mme Fontaine' },
      { id: 'm15', nom: 'Atelier Céramique du Lez', adresse: '10 rue du Bourg', ville: 'Dieulefit', lat: 44.5250, lng: 5.0600, tarif: 95, frequence: 'semestrielle', dureeMin: 90, moisDus: SEM_MAI, contact: 'M. Benoit' },
      { id: 'm16', nom: 'Coopérative agricole de Marsanne', adresse: 'Route de Cléon', ville: 'Marsanne', lat: 44.6420, lng: 4.8730, tarif: 150, frequence: 'trimestrielle', dureeMin: 150, moisDus: TRIM_MAR, contact: 'M. Lucas' },
      { id: 'm17', nom: 'Crèche Les Petits Nougats', adresse: '6 rue Bouverie', ville: 'Montélimar', lat: 44.5620, lng: 4.7450, tarif: 95, frequence: 'mensuelle', dureeMin: 90, moisDus: SAUF_AOUT, contact: 'Mme Dufour' },
      { id: 'm18', nom: 'Bureaux ZA du Meyrol', adresse: '14 rue du Meyrol', ville: 'Montélimar', lat: 44.5450, lng: 4.7400, tarif: 155, frequence: 'mensuelle', dureeMin: 150, moisDus: TOUS, contact: 'M. Mathieu' },
      { id: 'm19', nom: 'Opticien Regard Provençal', adresse: '21 rue Cuiraterie', ville: 'Montélimar', lat: 44.5590, lng: 4.7480, tarif: 50, frequence: 'mensuelle', dureeMin: 45, moisDus: TOUS, contact: 'Mme Gilbert' },
      { id: 'm20', nom: 'Salon de thé La Bâtie', adresse: '3 place du Village', ville: 'La Bâtie-Rolland', lat: 44.5550, lng: 4.8500, tarif: 45, frequence: 'mensuelle', dureeMin: 45, moisDus: TOUS, contact: 'Mme Carpentier' },
    ],
    tresorerie: {
      debutHistorique: '2026-05-01',
      soldeInitial: 9_800,
      // Récurrents « tout juste détectés », à confirmer pendant la démo (les autres sont déjà confirmés).
      recurrentsAConfirmer: ['Sellsy', 'Leasing Utilitaires Provence'],
      recurrents: [
        { tiers: 'Salaires (virements)', categorie: 'social', jour: 28, montant: 5_400, variation: 0.02 },
        { tiers: 'URSSAF', categorie: 'social', jour: 15, montant: 2_050, variation: 0.04 },
        { tiers: 'Mutuelle santé collective', categorie: 'social', jour: 1, montant: 290, variation: 0 },
        { tiers: 'Leasing Utilitaires Provence', categorie: 'entretien_vehicules', jour: 5, montant: 610, variation: 0 },
        { tiers: 'TéléCom Pro', categorie: 'telephonie_internet', jour: 12, montant: 92, variation: 0.03 },
        { tiers: 'Sellsy', categorie: 'telephonie_internet', jour: 3, montant: 109, variation: 0 },
        { tiers: 'Redevance franchise Guillaume Propreté', categorie: 'fournitures', jour: 5, montant: 450, variation: 0 },
        { tiers: 'Mutuelle des Artisans (RC pro)', categorie: 'assurances', jour: 8, montant: 236, variation: 0 },
        { tiers: 'Résidence Les Oliviers', categorie: 'encaissements_clients', jour: 10, montant: 4_900, variation: 0 },
        { tiers: 'Bureaux ZA du Meyrol', categorie: 'encaissements_clients', jour: 18, montant: 2_300, variation: 0 },
        { tiers: "Maison de santé d'Allan", categorie: 'encaissements_clients', jour: 24, montant: 1_250, variation: 0.03 },
      ],
      ponctuels: [
        { tiers: ['Station Montélimar Sud'], categorie: 'carburant', parMois: 4, min: 60, max: 130 },
        { tiers: ['Distri-Hygiène Pro'], categorie: 'fournitures', parMois: 1.5, min: 90, max: 300 },
        { tiers: ['Garage du Jabron'], categorie: 'entretien_vehicules', parMois: 0.4, min: 120, max: 520 },
        { tiers: ["Confiserie Le Nougat d'Antan", 'Brasserie des Halles', 'Supérette de Châteauneuf', 'Pharmacie des Allées'], categorie: 'encaissements_clients', parMois: 3, min: 150, max: 450 },
      ],
      // Seuil de sécurité choisi par le dirigeant : la prévision prévient si le compte passe en dessous.
      seuilSecurite: 2_000,
      releveDuJour: [
        { libelle: 'VIR SEPA SALAIRES OCTOBRE 2026', montant: -5_426.2 },
        { libelle: 'CB STATION MONTELIMAR SUD 27/10', montant: -66.1 },
        { libelle: "VIR CONFISERIE LE NOUGAT D'ANTAN FACT 10-2026", montant: 156 },
        { libelle: 'CB CASTORAMA MONTELIMAR 27/10', montant: -52.3 },
      ],
      factures: [
        { client: "Confiserie Le Nougat d'Antan", montant: 156, echeance: '2026-10-27' },
        { client: 'Brasserie des Halles', montant: 192, echeance: '2026-11-04' },
        { client: 'Résidence Les Oliviers', montant: 4_900, echeance: '2026-11-10' },
        { client: 'Pharmacie des Allées', montant: 132, echeance: '2026-11-06' },
        { client: 'Bureaux ZA du Meyrol', montant: 2_300, echeance: '2026-11-18' },
        { client: "Maison de santé d'Allan", montant: 1_250, echeance: '2026-11-24' },
        { client: 'Supérette de Châteauneuf', montant: 156, echeance: '2026-11-12' },
        { client: 'Clinique dentaire du Roubion', montant: 114, echeance: '2026-11-16' },
        { client: 'Crèche Les Petits Nougats', montant: 114, echeance: '2026-11-20' },
        { client: 'Hôtel Les Lavandes', montant: 156, echeance: '2026-11-26' },
        { client: 'Restaurant Le Relais de Sauzet', montant: 96, echeance: '2026-11-30' },
        { client: 'Garage du Jabron', montant: 108, echeance: '2026-12-03' },
      ],
    },
  },
]
