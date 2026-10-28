# Rapport des calculs de planning

Généré automatiquement (`npm run rapport`). Date du jour de la démo : mercredi 28/10/2026.

## Guillaume Propreté Valence

- 40 clients, agents : Julien M. (7 h/jour), Sofiane B. (7 h/jour)
- 88 passages planifiés en 28 tournées sur 2 mois, passages non placés : **0**
- Contrôle automatique du planning : **aucune anomalie**

| Mois | Passages | Tournées | Route avec tournées par secteur | Route dans l’ordre alphabétique | Gain |
|---|---|---|---|---|---|
| octobre 2026 | 47 | 15 | 12 h 33 | 20 h 26 | 39 % |
| novembre 2026 | 41 | 13 | 11 h 45 | 17 h 59 | 35 % |

<details><summary>Détail des tournées</summary>

| Date | Agent | Passages | Communes | Journée (route comprise) | Route |
|---|---|---|---|---|---|
| 01/10/2026 | Julien M. | 4 | Valence | 6 h 42 / 7 h | 27 min |
| 02/10/2026 | Julien M. | 3 | Bourg-lès-Valence | 6 h / 7 h | 30 min |
| 05/10/2026 | Julien M. | 3 | Portes-lès-Valence, Beaumont-lès-Valence | 5 h 58 / 7 h | 43 min |
| 06/10/2026 | Julien M. | 4 | Valence, Malissard, Chabeuil | 6 h 24 / 7 h | 54 min |
| 07/10/2026 | Sofiane B. | 3 | Tain-l'Hermitage, Tournon-sur-Rhône | 5 h 29 / 7 h | 1 h 14 |
| 08/10/2026 | Sofiane B. | 5 | Valence, Saint-Marcel-lès-Valence, Romans-sur-Isère, Bourg-de-Péage, Alixan | 6 h 56 / 7 h | 1 h 26 |
| 09/10/2026 | Julien M. | 4 | Beauvallon, Étoile-sur-Rhône, Livron-sur-Drôme | 6 h 14 / 7 h | 1 h 14 |
| 12/10/2026 | Sofiane B. | 4 | Guilherand-Granges, Saint-Péray, Cornas | 6 h 30 / 7 h | 45 min |
| 15/10/2026 | Sofiane B. | 2 | Montélier | 6 h 14 / 7 h | 44 min |
| 16/10/2026 | Julien M. | 1 | Livron-sur-Drôme | 3 h / 7 h | 1 h |
| 20/10/2026 | Sofiane B. | 4 | Guilherand-Granges, Soyons, Portes-lès-Valence | 6 h 17 / 7 h | 47 min |
| 23/10/2026 | Sofiane B. | 2 | Montélier | 6 h 14 / 7 h | 44 min |
| 26/10/2026 | Sofiane B. | 3 | Valence | 3 h 24 / 7 h | 24 min |
| 29/10/2026 ☔ | Julien M. | 3 | Valence, Bourg-lès-Valence | 6 h 29 / 7 h | 29 min |
| 29/10/2026 ☔ | Sofiane B. | 2 | Châteauneuf-sur-Isère, Tournon-sur-Rhône | 6 h 27 / 7 h | 1 h 12 |
| 02/11/2026 | Julien M. | 2 | Montélier | 6 h 14 / 7 h | 44 min |
| 03/11/2026 | Sofiane B. | 5 | Valence, Guilherand-Granges, Saint-Péray | 6 h 14 / 7 h | 44 min |
| 04/11/2026 | Julien M. | 3 | Bourg-de-Péage, Romans-sur-Isère | 4 h 58 / 7 h | 1 h 13 |
| 05/11/2026 | Julien M. | 3 | Valence, Bourg-lès-Valence | 7 h / 7 h | 30 min |
| 06/11/2026 | Julien M. | 2 | Tain-l'Hermitage, Tournon-sur-Rhône | 3 h 23 / 7 h | 1 h 08 |
| 09/11/2026 | Sofiane B. | 4 | Beauvallon, Étoile-sur-Rhône, Livron-sur-Drôme | 6 h 14 / 7 h | 1 h 14 |
| 13/11/2026 | Sofiane B. | 5 | Valence, Portes-lès-Valence | 6 h 33 / 7 h | 48 min |
| 16/11/2026 | Julien M. | 1 | Tournon-sur-Rhône | 2 h 19 / 7 h | 1 h 04 |
| 18/11/2026 | Julien M. | 2 | Montélier | 6 h 14 / 7 h | 44 min |
| 20/11/2026 | Sofiane B. | 4 | Saint-Marcel-lès-Valence, Chabeuil | 6 h 17 / 7 h | 1 h 02 |
| 23/11/2026 | Julien M. | 3 | Valence, Guilherand-Granges, Malissard | 6 h 55 / 7 h | 40 min |
| 26/11/2026 | Sofiane B. | 1 | Livron-sur-Drôme | 3 h / 7 h | 1 h |
| 30/11/2026 | Sofiane B. | 6 | Valence, Bourg-lès-Valence, Portes-lès-Valence | 6 h 39 / 7 h | 54 min |

</details>

### Scénario « pluie le 29/10/2026 »

5 passages annulés, replacés automatiquement en suggestion (l’utilisateur valide ou change) :

- **Résidence Les Glycines** (Valence, 4 h) → vendredi 30/10/2026 à 08:09 · **Julien M.** · Début de tournée, 9 min depuis le dépôt _(Fin de journée vers 15:59, 6 h 29 sur 7 h maximum ; Détour ajouté à la tournée : +5 min ; Même secteur : à 1,0 km de Supérette du Bourg ; Attention : autre passage de ce client à 6 jours d’écart)_
- **Entrepôt Isère-Rhône Logistique** (Châteauneuf-sur-Isère, 4 h) → vendredi 30/10/2026 à 10:06 · **Sofiane B.** · 19 min de route depuis Restaurant La Table du Fleuve _(Fin de journée vers 15:57, 6 h 27 sur 7 h maximum ; Détour ajouté à la tournée : +8 min)_
- **Restaurant La Table du Fleuve** (Tournon-sur-Rhône, 1 h 15) → vendredi 30/10/2026 à 08:32 · **Sofiane B.** · Début de tournée, 32 min depuis le dépôt _(Fin de journée vers 15:57, 6 h 27 sur 7 h maximum ; Détour ajouté à la tournée : +30 min)_
- **Agence Drôme Habitat** (Valence, 1 h) → vendredi 30/10/2026 à 14:51 · **Julien M.** · 6 min de route depuis Supérette du Bourg _(Fin de journée vers 15:59, 6 h 29 sur 7 h maximum ; Détour ajouté à la tournée : +4 min ; Même secteur : à 1,1 km de Résidence Les Glycines)_
- **Supérette du Bourg** (Bourg-lès-Valence, 1 h) → vendredi 30/10/2026 à 13:45 · **Julien M.** · 6 min de route depuis Résidence Les Glycines _(Fin de journée vers 15:59, 6 h 29 sur 7 h maximum ; Détour ajouté à la tournée : +6 min ; Même secteur : à 1,0 km de Résidence Les Glycines ; Attention : autre passage de ce client à 6 jours d’écart)_

Contrôle du planning après replacement : **aucune anomalie**

### « Trouver un créneau » pour Agence Drôme Habitat

1. mercredi 04/11/2026 à 08:08 · **Julien M.** · Début de tournée, 8 min depuis le dépôt _(Fin de journée vers 15:35, 6 h 05 sur 7 h maximum ; Détour ajouté à la tournée : +7 min)_
2. vendredi 06/11/2026 à 11:19 · **Julien M.** · 28 min de route depuis Restaurant La Table du Fleuve _(Fin de journée vers 13:57, 4 h 27 sur 7 h maximum ; Détour ajouté à la tournée : +4 min)_
3. vendredi 30/10/2026 à 08:08 · **Sofiane B.** · Journée libre, 8 min depuis le dépôt _(Fin de journée vers 09:16, 1 h 16 sur 7 h maximum)_

## Franchise Romans-sur-Isère

- 20 clients, agents : Lucas R. (7 h/jour), Inès T. (7 h/jour)
- 44 passages planifiés en 12 tournées sur 2 mois, passages non placés : **0**
- Contrôle automatique du planning : **aucune anomalie**

| Mois | Passages | Tournées | Route avec tournées par secteur | Route dans l’ordre alphabétique | Gain |
|---|---|---|---|---|---|
| octobre 2026 | 23 | 6 | 4 h 20 | 5 h 29 | 21 % |
| novembre 2026 | 21 | 6 | 4 h 22 | 4 h 43 | 7 % |

<details><summary>Détail des tournées</summary>

| Date | Agent | Passages | Communes | Journée (route comprise) | Route |
|---|---|---|---|---|---|
| 01/10/2026 | Inès T. | 4 | Mours-Saint-Eusèbe, Saint-Paul-lès-Romans, Saint-Nazaire-en-Royans, Hostun | 6 h 58 / 7 h | 1 h 13 |
| 06/10/2026 | Inès T. | 4 | Romans-sur-Isère, Bourg-de-Péage | 6 h 12 / 7 h | 27 min |
| 09/10/2026 | Lucas R. | 4 | Romans-sur-Isère | 5 h 11 / 7 h | 26 min |
| 12/10/2026 | Lucas R. | 4 | Romans-sur-Isère, Saint-Donat-sur-l'Herbasse, Peyrins, Génissieux | 6 h 31 / 7 h | 1 h 01 |
| 29/10/2026 ☔ | Lucas R. | 6 | Romans-sur-Isère, Saint-Donat-sur-l'Herbasse, Mours-Saint-Eusèbe | 6 h 20 / 7 h | 1 h 05 |
| 29/10/2026 ☔ | Inès T. | 1 | Romans-sur-Isère | 2 h 38 / 7 h | 8 min |
| 05/11/2026 | Lucas R. | 5 | Romans-sur-Isère, Saint-Donat-sur-l'Herbasse, Peyrins, Génissieux, Mours-Saint-Eusèbe | 6 h 51 / 7 h | 1 h 06 |
| 09/11/2026 | Inès T. | 4 | Bourg-de-Péage, Romans-sur-Isère | 3 h 58 / 7 h | 28 min |
| 13/11/2026 | Inès T. | 4 | Romans-sur-Isère, Chatuzange-le-Goubet | 6 h 22 / 7 h | 37 min |
| 18/11/2026 | Inès T. | 1 | Saint-Nazaire-en-Royans | 1 h 37 / 7 h | 52 min |
| 23/11/2026 | Lucas R. | 6 | Romans-sur-Isère, Saint-Donat-sur-l'Herbasse, Mours-Saint-Eusèbe | 6 h 50 / 7 h | 1 h 05 |
| 30/11/2026 | Inès T. | 1 | Bourg-de-Péage | 3 h 14 / 7 h | 14 min |

</details>

### Scénario « pluie le 29/10/2026 »

7 passages annulés, replacés automatiquement en suggestion (l’utilisateur valide ou change) :

- **Bureaux ZA des Allobroges** (Romans-sur-Isère, 2 h 30) → vendredi 30/10/2026 à 08:04 · **Inès T.** · Journée libre, 4 min depuis le dépôt _(Fin de journée vers 10:38, 2 h 38 sur 7 h maximum)_
- **Cabinet kiné Les Balmes** (Romans-sur-Isère, 1 h) → vendredi 30/10/2026 à 10:50 · **Lucas R.** · 5 min de route depuis Boulangerie Le Pétrin Romanais _(Fin de journée vers 15:50, 6 h 20 sur 7 h maximum ; Détour ajouté à la tournée : +5 min ; Même secteur : à 0,6 km de Boulangerie Le Pétrin Romanais)_
- **Brasserie de la Presle** (Romans-sur-Isère, 1 h) → vendredi 30/10/2026 à 08:06 · **Lucas R.** · Début de tournée, 6 min depuis le dépôt _(Fin de journée vers 15:50, 6 h 20 sur 7 h maximum ; Détour ajouté à la tournée : +4 min ; Même secteur : à 0,5 km de Boulangerie Le Pétrin Romanais)_
- **Supérette de Mours** (Mours-Saint-Eusèbe, 1 h) → vendredi 30/10/2026 à 14:41 · **Lucas R.** · 17 min de route depuis Pharmacie de l'Herbasse _(Fin de journée vers 15:50, 6 h 20 sur 7 h maximum ; Détour ajouté à la tournée : +4 min ; Même secteur : à 2,1 km de Cabinet kiné Les Balmes ; Attention : autre passage de ce client à 6 jours d’écart)_
- **Boulangerie Le Pétrin Romanais** (Romans-sur-Isère, 45 min) → vendredi 30/10/2026 à 10:00 · **Lucas R.** · 4 min de route depuis Pâtisserie La Pogne d'Or _(Fin de journée vers 15:50, 6 h 20 sur 7 h maximum ; Détour ajouté à la tournée : +4 min ; Même secteur : à 0,2 km de Pâtisserie La Pogne d'Or)_
- **Pharmacie de l'Herbasse** (Saint-Donat-sur-l'Herbasse, 45 min) → vendredi 30/10/2026 à 13:39 · **Lucas R.** · 19 min de route depuis Cabinet kiné Les Balmes _(Fin de journée vers 15:50, 6 h 20 sur 7 h maximum ; Détour ajouté à la tournée : +29 min ; Attention : autre passage de ce client à 6 jours d’écart)_
- **Pâtisserie La Pogne d'Or** (Romans-sur-Isère, 45 min) → vendredi 30/10/2026 à 09:11 · **Lucas R.** · 5 min de route depuis Brasserie de la Presle _(Fin de journée vers 15:50, 6 h 20 sur 7 h maximum ; Détour ajouté à la tournée : +4 min ; Même secteur : à 0,2 km de Boulangerie Le Pétrin Romanais ; Attention : autre passage de ce client à 6 jours d’écart)_

Contrôle du planning après replacement : **aucune anomalie**

### « Trouver un créneau » pour Brasserie de la Presle

1. vendredi 30/10/2026 à 08:06 · **Lucas R.** · Journée libre, 6 min depuis le dépôt _(Fin de journée vers 09:12, 1 h 12 sur 7 h maximum)_
2. lundi 02/11/2026 à 08:06 · **Lucas R.** · Journée libre, 6 min depuis le dépôt _(Fin de journée vers 09:12, 1 h 12 sur 7 h maximum)_
3. vendredi 30/10/2026 à 08:06 · **Inès T.** · Journée libre, 6 min depuis le dépôt _(Fin de journée vers 09:12, 1 h 12 sur 7 h maximum)_

## Franchise Montélimar

- 20 clients, agents : Marc D. (7 h/jour), Chloé P. (6 h/jour)
- 44 passages planifiés en 14 tournées sur 2 mois, passages non placés : **0**
- Contrôle automatique du planning : **aucune anomalie**

| Mois | Passages | Tournées | Route avec tournées par secteur | Route dans l’ordre alphabétique | Gain |
|---|---|---|---|---|---|
| octobre 2026 | 23 | 7 | 5 h 02 | 6 h 07 | 18 % |
| novembre 2026 | 21 | 7 | 5 h 26 | 6 h | 9 % |

<details><summary>Détail des tournées</summary>

| Date | Agent | Passages | Communes | Journée (route comprise) | Route |
|---|---|---|---|---|---|
| 01/10/2026 | Chloé P. | 3 | Ancône, Savasse, Sauzet | 5 h 18 / 6 h | 48 min |
| 06/10/2026 | Chloé P. | 2 | Montélimar | 5 h 05 / 6 h | 20 min |
| 09/10/2026 | Marc D. | 4 | Montélimar, Le Teil | 4 h 54 / 7 h | 39 min |
| 12/10/2026 | Marc D. | 3 | Montélimar, Allan, Châteauneuf-du-Rhône | 5 h 17 / 7 h | 47 min |
| 20/10/2026 | Chloé P. | 3 | Montboucher-sur-Jabron, La Bâtie-Rolland, Cléon-d'Andran | 5 h 25 / 6 h | 1 h 10 |
| 29/10/2026 ☔ | Marc D. | 4 | Montélimar, Châteauneuf-du-Rhône | 6 h / 7 h | 45 min |
| 29/10/2026 ☔ | Chloé P. | 4 | Montélimar, Ancône | 4 h 18 / 6 h | 33 min |
| 02/11/2026 | Chloé P. | 1 | Dieulefit | 2 h 56 / 6 h | 1 h 26 |
| 05/11/2026 | Marc D. | 3 | Montélimar, Allan, Châteauneuf-du-Rhône | 5 h 17 / 7 h | 47 min |
| 09/11/2026 | Chloé P. | 4 | Montélimar, Le Teil | 4 h 39 / 6 h | 39 min |
| 13/11/2026 | Chloé P. | 4 | Montélimar, Ancône, Sauzet, La Bâtie-Rolland | 5 h 15 / 6 h | 1 h |
| 18/11/2026 | Marc D. | 1 | Montélimar | 3 h 46 / 7 h | 16 min |
| 23/11/2026 | Marc D. | 4 | Montélimar, Châteauneuf-du-Rhône | 6 h / 7 h | 45 min |
| 30/11/2026 | Chloé P. | 4 | Montélimar, Ancône | 4 h 18 / 6 h | 33 min |

</details>

### Scénario « pluie le 29/10/2026 »

8 passages annulés, replacés automatiquement en suggestion (l’utilisateur valide ou change) :

- **Bureaux ZA du Meyrol** (Montélimar, 2 h 30) → vendredi 30/10/2026 à 11:26 · **Marc D.** · 6 min de route depuis Agence Provence Immobilier _(Fin de journée vers 15:30, 6 h sur 7 h maximum ; Détour ajouté à la tournée : +4 min ; Même secteur : à 1,6 km de Agence Provence Immobilier)_
- **Brasserie des Halles** (Montélimar, 1 h 15) → vendredi 30/10/2026 à 09:03 · **Chloé P.** · 8 min de route depuis Boulangerie d'Ancône _(Fin de journée vers 13:48, 4 h 18 sur 6 h maximum ; Détour ajouté à la tournée : +3 min ; Même secteur : à 0,2 km de Confiserie Le Nougat d'Antan)_
- **Confiserie Le Nougat d'Antan** (Montélimar, 1 h) → vendredi 30/10/2026 à 10:22 · **Chloé P.** · 4 min de route depuis Brasserie des Halles _(Fin de journée vers 13:48, 4 h 18 sur 6 h maximum ; Détour ajouté à la tournée : +4 min ; Même secteur : à 0,2 km de Brasserie des Halles)_
- **Agence Provence Immobilier** (Montélimar, 1 h) → vendredi 30/10/2026 à 10:20 · **Marc D.** · 5 min de route depuis Opticien Regard Provençal _(Fin de journée vers 15:30, 6 h sur 7 h maximum ; Détour ajouté à la tournée : +4 min ; Même secteur : à 0,5 km de Opticien Regard Provençal)_
- **Supérette de Châteauneuf** (Châteauneuf-du-Rhône, 1 h) → vendredi 30/10/2026 à 08:14 · **Marc D.** · Début de tournée, 14 min depuis le dépôt _(Fin de journée vers 15:30, 6 h sur 7 h maximum ; Détour ajouté à la tournée : +23 min ; Attention : autre passage de ce client à 6 jours d’écart)_
- **Pharmacie des Allées** (Montélimar, 45 min) → vendredi 30/10/2026 à 11:26 · **Chloé P.** · 4 min de route depuis Confiserie Le Nougat d'Antan _(Fin de journée vers 13:48, 4 h 18 sur 6 h maximum ; Détour ajouté à la tournée : +4 min ; Même secteur : à 0,3 km de Confiserie Le Nougat d'Antan)_
- **Boulangerie d'Ancône** (Ancône, 45 min) → vendredi 30/10/2026 à 08:10 · **Chloé P.** · Début de tournée, 10 min depuis le dépôt _(Fin de journée vers 13:48, 4 h 18 sur 6 h maximum ; Détour ajouté à la tournée : +11 min ; Même secteur : à 2,6 km de Pharmacie des Allées)_
- **Opticien Regard Provençal** (Montélimar, 45 min) → vendredi 30/10/2026 à 09:30 · **Marc D.** · 16 min de route depuis Supérette de Châteauneuf _(Fin de journée vers 15:30, 6 h sur 7 h maximum ; Détour ajouté à la tournée : +5 min ; Même secteur : à 0,5 km de Agence Provence Immobilier)_

Contrôle du planning après replacement : **aucune anomalie**

### « Trouver un créneau » pour Bureaux ZA du Meyrol

1. vendredi 30/10/2026 à 08:04 · **Marc D.** · Journée libre, 4 min depuis le dépôt _(Fin de journée vers 10:38, 2 h 38 sur 7 h maximum)_
2. lundi 02/11/2026 à 08:04 · **Marc D.** · Journée libre, 4 min depuis le dépôt _(Fin de journée vers 10:38, 2 h 38 sur 7 h maximum)_
3. lundi 02/11/2026 à 08:04 · **Chloé P.** · Début de tournée, 4 min depuis le dépôt _(Fin de journée vers 15:01, 5 h 31 sur 6 h maximum ; Détour ajouté à la tournée : +5 min)_

