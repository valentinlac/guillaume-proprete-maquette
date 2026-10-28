# Guillaume Propreté : maquette cliquable

Maquette de démonstration de deux écrans, **planning des agents** et **prévision de trésorerie**,
avec des données entièrement fictives, sans serveur ni base de données.
Présentation à Damien le **28/10/2026 à 9h**.

## Démarrer

Prérequis : [Node.js](https://nodejs.org) 20 ou plus récent.

```bash
cd ~/guillaume-proprete-maquette
npm install      # la première fois seulement
npm run dev      # puis ouvrir http://localhost:5173
```

> Si `npm install` échoue avec une erreur de droits (`EACCES … .npm`), lancer une fois
> `sudo chown -R $(whoami) ~/.npm` puis recommencer.

**Version à partager** : `npm run build` produit le dossier `dist/`, un site statique autonome
(chemins relatifs) que l'on peut déposer tel quel sur Netlify, Vercel ou tout hébergement.
`npm run preview` permet de le tester en local sur http://localhost:4173.

| Commande          | Rôle |
| ----------------- | ---- |
| `npm test`        | lance les tests automatiques (≈ 300), dont le scénario de démo complet sur les 3 entités |
| `npm run rapport` | écrit `rapport-moteurs.md` : tournées, gain de route, scénario pluie, exemples de « Trouver un créneau » |
| `npm run build`   | produit le site statique dans `dist/` |

## Avant la démo (check-list)

- [ ] **Connexion internet** pour le fond de carte OpenStreetMap. Sans connexion, la carte affiche quand même les points, l'ordre de passage et les tracés, avec un message discret.
- [ ] Ouvrir le site et cliquer sur **« Réinitialiser la démo »** (en bas du menu de gauche) : toutes les données reviennent à l'état de départ.
- [ ] Ne pas importer le fichier CSV d'exemple **avant** la pluie : il ajoute des passages le 29/10 (le scénario fonctionne quand même, avec plus de passages à replacer).
- [ ] Faire la **Saisie du jour** après les étapes 6 et 7 : valider le relevé enregistre les dépenses du jour (344 €), la prévision passe alors de 36 165 € à 35 821 €.
- [ ] La date du jour de la démo est **figée au mercredi 28/10/2026** (modifiable dans `src/donnees/donnees-fictives.ts`).

## Parcours de démo (10 minutes)

| # | Écran | Action | Ce que l'on montre |
|---|-------|--------|--------------------|
| 1 | Planning | Ouverture sur « Planning du mois » | 40 clients, 2 agents (couleurs), tournées regroupées par secteur ; clic sur un jour → vue journée avec heures, temps de route et carte. Onglet **Tournées** : secteurs du mois sur la carte. |
| 2 | Planning | **Annuler la journée de demain (pluie)** | Les 5 passages du jeudi 29/10 passent en « annulée météo » ; l'outil propose un nouveau créneau pour chacun. |
| 3 | Panneau pluie | **Changer** sur un client (ex. Résidence Les Glycines) → choisir une des 3 propositions → **Confirmer les replacements** | Par défaut, tout est replacé dès le vendredi 30/10, chacun avec son agent habituel. « Changer » montre les autres créneaux des deux agents avec la raison (« 9 min depuis le dépôt »…) ; si l'autre agent est proposé, l'outil dit pourquoi. L'utilisateur choisit, les heures de la journée se recalent. |
| 4 | Planning | **Prévenir les clients** (ligne « À faire ») → **Envoyer** | Clients touchés, aperçu du SMS et du mail (« Passage annulé à cause de la météo, nouveau créneau proposé : … »), envoi simulé. |
| 5 | Planning | **Envoyer aux agents** → **Envoyer aux agents** | Ce que reçoit chaque agent : passages retirés, ajoutés, horaires décalés. Envoi simulé. |
| 6 | Trésorerie | Menu **Trésorerie** (onglet Prévision) | La réponse en une phrase (« Dans 6 mois, le compte serait à 36 165 € », moment le plus bas), la courbe, et « 3 dépenses fixes repérées » (lien **Les vérifier** → onglet Dépenses fixes). |
| 7 | Trésorerie | Cocher **Et si un gros client payait avec du retard ?** (30 jours) | La courbe en pointillés creuse pendant 30 jours puis rejoint la normale (l'argent arrive plus tard, il n'est pas perdu : toujours 36 165 € dans 6 mois). Plus bas 21 400 € le 08/12 au lieu de 26 473 €, et l'alerte « sous votre seuil de sécurité (25 000 €) » apparaît. Le bloc « Comment on arrive à… » détaille le calcul ligne par ligne si Damien le demande. |
| 8 | Menu de gauche | Sélecteur d'entité → Franchise Romans-sur-Isère (ou Montélimar) | Autres clients, autres agents, autre trésorerie : l'outil est réplicable par franchisé. |

**Variante « effet wow » des étapes 2 à 5** : le bandeau **« Pluie annoncée demain »** en haut du planning → **Tout préparer** → un seul panneau montre les nouveaux créneaux, les messages aux clients et ce que reçoit chaque agent → **Tout valider et envoyer**. Trois tâches manuelles deviennent une validation.

**Préparer le mois suivant** : dans le calendrier, passer sur novembre → **Préparer décembre** → tout le mois est construit à partir de la liste des clients (40 passages, 13 tournées, environ 30 % de route en moins qu'un planning simulé fait à la main ; c'est une estimation de démo, à mesurer sur les vrais tableaux de Kevin) → **Valider**. C'est le travail que Kevin fait aujourd'hui à la main dans Excel.

**Saisie automatique** : Trésorerie → onglet **Saisie du jour** → le relevé bancaire du jour est déjà là, reconnu et classé (salaires, carburant, fournitures ; le virement de la Pharmacie des Arcades est rapproché de sa facture) → classer la seule ligne inconnue (Bricomarché) → **Tout valider**. La saisie devient une vérification.

Pour aller plus loin si le temps le permet : **Trouver un créneau** (bouton en haut du planning),
**Optimiser les tournées** après **Simuler un planning fait à la main** (onglet Tournées, −31 % de route),
**Importer un fichier** (onglet Clients), l'onglet **Saisie du jour** et le bilan **prévu et réel** (onglet Dépenses fixes) de la trésorerie.

## Ce que la maquette simule (et ce qui viendra plus tard)

| Dans la maquette | Dans la vraie version |
| ---------------- | --------------------- |
| Temps de route estimés à vol d'oiseau (× 1,3, 50 km/h, + 4 min). Les traits des cartes, eux, suivent les vraies routes : calculés une fois avec OSRM (OpenStreetMap, gratuit) et enregistrés dans `public/itineraires/`, sans appel pendant la démo (`npm run itineraires` pour les recalculer si les clients changent) | Service d'itinéraire, trajets calculés une fois et mis en mémoire (module `src/trajets/`, remplaçable via `definirServiceTrajet`) |
| Envoi de SMS, de mails et du planning aux agents : affichés, non envoyés | Fournisseur SMS / mail, outil de pointage (Cadulis ou autre) |
| Bandeau Sellsy et factures : fictifs | Connexion à l'API Sellsy (factures, encaissements, rapprochement) |
| Clients importés avec latitude et longitude | Coordonnées calculées à partir de l'adresse |
| Téléphones dans la tranche 06 39 98 réservée par l'ARCEP aux fictions, mails fictifs | Coordonnées réelles des clients |
| Données en mémoire de la page | Base de données, comptes utilisateurs, un espace par franchisé |

## Modifier les données de démo

Tout est dans **un seul fichier** : `src/donnees/donnees-fictives.ts` : date du jour, horaires,
jours fériés, entités, agents, clients (avec leurs mois dus), modèles de trésorerie
(l'historique de ~150 mouvements en est généré, toujours à l'identique), factures, et
récurrents « tout juste détectés » à confirmer pendant la démo.

Les fichiers CSV d'exemple sont dans `public/exemple-clients-<entité>.csv`
(séparateur `;`, virgule décimale acceptée).

## Organisation du code

| Dossier           | Contenu |
| ----------------- | ------- |
| `src/donnees/`    | types, fichier de données fictives, chargement, import CSV, état en mémoire |
| `src/planning/`   | règles de planning : calendrier, tournées, « Trouver un créneau », météo, messages clients, contrôles |
| `src/tresorerie/` | calculs : soldes, récurrents, prévision, scénarios, prévu contre réel |
| `src/trajets/`    | module « temps de trajet », remplaçable |
| `src/pages/`, `src/ui/` | affichage uniquement |

Les modules `donnees`, `planning`, `tresorerie` et `trajets` ne dépendent pas de l'affichage :
on pourra brancher Sellsy, une vraie base ou un service d'itinéraire sans réécrire les écrans.

## Règles retenues (à confirmer avec Damien)

| Règle | Valeur dans la maquette | Où la changer |
| --- | --- | --- |
| Jours et horaires travaillés | du lundi au vendredi, de 8h à 12h et de 13h30 à 17h, jours fériés exclus | `donnees-fictives.ts` |
| Maximum par agent | 7 h par jour, **route comprise** (départ et retour au dépôt) | `donnees-fictives.ts` |
| Quinzaine | 1 passage dans chaque moitié du mois | `planning/passages.ts` |
| Écart entre 2 passages d'un client | 7 jours à la planification ; jamais moins de 3 jours lors d'un replacement | `planning/tournees.ts`, `planning/creneaux.ts` |
| Regroupement en tournée | passages à moins de 10 km les uns des autres | `planning/tournees.ts` |
| Tournée de demain | jamais modifiée par « Optimiser » (déjà envoyée aux agents) | `planning/optimisation.ts` |
| Classement des créneaux | détour ajouté, route depuis le passage précédent, journée vide, hors secteur, attente, mois suivant, proximité d'un autre passage du client | `PENALITES` dans `planning/creneaux.ts` |
| Récurrent détecté | même fournisseur, même jour (± 3 j), montant à ± 10 %, au moins 3 mois | `tresorerie/recurrents.ts` |
| Prévision | récurrents confirmés + factures à encaisser + moyenne mensuelle des dépenses variables | `tresorerie/prevision.ts` |
| Créneau annoncé au client | fenêtre d'une heure, arrondie à la demi-heure | `planning/messages.ts` |

## Questions pour Damien le 28

Celles du cahier des charges :

- Combien d'heures par semaine Kevin passe-t-il sur le planning, et Damien sur la trésorerie ?
- Combien de clients vitrerie et quelle répartition de fréquences ?
- Quelle durée moyenne par passage, et quelles règles pour décaler un client (jamais le même jour, priorités) ?
- SMS, mail ou les deux pour prévenir les clients, et qui valide l'envoi ?
- Quelle offre Sellsy ont-ils, et ont-ils accès à l'API ?
- Veulent-ils remplacer Cadulis ou s'y connecter ?
- La version franchise est-elle pour tout de suite ou une phase 2 ?
- Quelles règles pour proposer un créneau : jours et horaires travaillés, priorité des urgences, clients qu'on ne décale jamais ?
- Leur outil de pointage à distance est-il Cadulis ou un autre outil, et en sont-ils satisfaits ?
- Quel est le coût du module de prévision de Sellsy, et pourquoi ne l'utilisent-ils pas ?

Celles apparues en construisant la maquette :

- Le maximum de 7 h par agent inclut-il la route ? Les agents partent-ils d'un dépôt ou de chez eux ?
- Préfèrent-ils replacer **vite** (quitte à rapprocher deux passages d'un même client) ou **espacer** (quitte à attendre) ? Ouvrir une journée pour un seul passage, ou attendre une tournée existante ?
- Un long passage (4 h) peut-il être coupé par la pause de midi ?
- Chaque client a-t-il toujours le même agent ? L'outil garde l'agent habituel et explique tout changement : est-ce la bonne règle ?
- SMS : accepter les accents (un SMS accentué compte 70 caractères au lieu de 160, donc facturé 2 ou 3 fois) ou les retirer ?
- Les dépenses variables (carburant, fournitures) : la moyenne des 6 derniers mois leur convient-elle comme budget ?
