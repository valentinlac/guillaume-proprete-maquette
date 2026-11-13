# Aide-mémoire : démo V2 à Kevin et Damien, vendredi 13/11/2026 à 11h

Durée visée : 10 minutes. Tout est simulé : aucun SMS, mail, post ou envoi réel, données fictives.
Adresse en ligne : https://valentinlac.github.io/guillaume-proprete-maquette/

## Avant d'entrer (2 minutes)

1. Ouvrir l'adresse en ligne (ou `npm run dev`, puis http://localhost:5173).
2. Cliquer **Réinitialiser la démo** (en bas à gauche).
3. Rester sur **Valence (siège)**. Dans la maquette, « aujourd'hui » est le mercredi 28/10.
4. Idéalement : ouvrir `…/#agent` sur un téléphone pour montrer l'app agent en vrai.

## Le parcours V2 (ce que vous avez demandé le 04/11)

| # | Je clique | Je dis | À voir |
|---|-----------|--------|--------|
| 1 | Menu **App agent (mobile)** (ou `#agent` sur le téléphone) | « Voilà ce que Julien voit le matin : sa tournée, l'adresse, le bouton Waze, la durée prévue, le matériel à prendre. » | Marché Frais de Livron, 2 h prévues, perche et escabeau |
| 2 | **Démarrer**, laisser tourner environ 30 secondes, **Clôturer** | « Il démarre en arrivant, clôture en partant. Le chrono de la démo va 300 fois plus vite. » | environ 2 h 30 réelles pour 2 h prévues |
| 3 | Observation, signature au doigt, **Valider le bon** | « Le client signe sur le téléphone, le bon part au bureau. Ça s'installe sur l'écran d'accueil comme une application. » | « OK, bon signé · +30 min » |
| 4 | **Côté bureau** → Planning, jour du 28/10, onglet journée | « Au bureau, le passage est OK, avec l'écart entre prévu et réel. » | « OK · +30 min », bon signé par Mme Gaillard |
| 5 | **Ajouter une intervention urgente** → Centre médical du Polygone, jeu. 29/10, **Matin · Julien M.** → **Préparer** | « Un client appelle en urgence. L'outil cale l'urgence et replace ce qui était prévu, comme pour la pluie. » | 3 passages décalés au ven. 30/10 (Drôme Habitat, Supérette du Bourg, Résidence Les Glycines) |
| 6 | **Tout valider et envoyer** | « Messages de déplacement prêts pour les clients, planning envoyé aux agents. » | « Urgence » en rouge sur le 29/10 |
| 7 | Onglet **Clients** du planning | « Chaque client a ses contraintes : horaires d'accès, matériel. L'outil ne propose jamais un créneau en dehors des horaires. » | Brasserie du Kiosque : accès de 08:00 à 11:30 |
| 8 | Menu **Indicateurs**, **Mois en cours** | « Heures réelles par agent, vitreries décalées, CA réalisé. Et surtout : chaque journée est-elle rentable ? » | journées déficitaires en rouge (la journée de Julien du 28/10 si son passage a dépassé) |
| 9 | Changer le **coût au km** (ex. 0,60 → 1,20) | « Taux horaire selon l'ancienneté, coût au km réglable : vous voyez tout de suite les journées qui coûtent. » | le nombre de journées déficitaires monte |
| 10 | Menu **LinkedIn** → Kevin → une idée → **Générer le post** → **Valider** ou **Programmer** | « Une photo, une phrase, le post sort dans votre style. Onglet **Style d'écriture** : ce que l'outil a retenu. » | changer pour Damien : même idée, autre ton |

Phrase à dire sur LinkedIn : « Compte entreprise : copier-coller, LinkedIn limite l'API. Comptes personnels : publication automatique après validation. »

## Questions probables (V2)

- **« Ça marche sans réseau sur le chantier ? »** La maquette non. La vraie version garderait le pointage en mémoire et l'enverrait au retour du réseau.
- **« Les taux horaires sont-ils les nôtres ? »** Non, fictifs (24 à 35 € chargés selon l'ancienneté). À remplacer par vos vrais coûts.
- **« Les posts sont-ils vraiment générés ? »** Dans la maquette, ce sont des posts préécrits. La vraie version les écrirait à partir de vos anciens posts.

## Annexe : parcours V1 (démo du 28/10)

### Le parcours V1

| # | Je clique | Je dis | Chiffre à voir |
|---|-----------|--------|----------------|
| 1 | Un jour du calendrier (ex. jeu. 8), puis l'onglet **Tournées** | « Chaque journée est calculée : heures, route, ordre de passage. Les tournées sont regroupées par secteur. » | 40 clients, 2 agents |
| 2 | **Annuler la journée de demain (pluie)** | « Il pleut demain : un clic, et l'outil replace tous les passages, chacun avec son agent habituel. » | 5 passages, tous replacés le ven. 30/10 |
| 3 | **Changer** sur Résidence Les Glycines → **jeu. 12/11 Julien** → **Confirmer les replacements** | « Il compare les deux agents et explique chaque proposition. Je garde la main. » | les heures du 30/10 se recalent |
| 4 | **Prévenir les clients** → **Envoyer** | « SMS et mail prêts, avec le nouveau créneau. » | 5 SMS et 5 mails (simulés) |
| 5 | **Envoyer aux agents** → **Envoyer aux agents** | « Chaque agent reçoit seulement ce qui change pour lui. » | Julien 6 changements, Sofiane 4 |
| 6 | Menu **Trésorerie** | « La réponse en une phrase : où sera le compte dans 6 mois, et le moment le plus bas. » | **36 165 €**, plus bas **26 473 €** le 05/11 |
| 7 | Cocher **Et si un gros client payait avec du retard ?** | « L'argent arrive plus tard, il n'est pas perdu. Mais on passerait sous le seuil de sécurité. » | plus bas **21 400 €** le 08/12, alerte sous **25 000 €** le 30/11, toujours 36 165 € |
| 8 | Sélecteur en haut à gauche → **Montélimar** | « Chaque franchisé a son espace : ses clients, ses agents, sa trésorerie. » | 20 clients, Marc et Chloé |

## Si Damien est accroché : les « effets wow »

- **Tout préparer** (bandeau bleu « Pluie annoncée demain », à faire sur Montélimar ou Romans pour ne pas répéter Valence) : créneaux, messages et planning des agents dans un seul panneau → **Tout valider et envoyer**. « Trois tâches deviennent une validation. »
- **Préparer décembre** (Valence, calendrier → mois de novembre) : 40 passages, 13 tournées, environ 30 % de route en moins → **Valider**. « C'est le travail que Kevin fait à la main dans Excel. »
- **Saisie du jour** (Trésorerie) : 4 lignes sur 5 déjà classées, la Pharmacie des Arcades rapprochée de sa facture. Classer **Bricomarche** en Fournitures → **Tout valider**. À faire **après** l'étape 7 : la prévision passe ensuite à 35 821 € (les 344 € dépensés aujourd'hui).

## Questions probables et réponses

- **« Les temps de route sont-ils vrais ? »** Ce sont des estimations à vol d'oiseau, majorées. Les traits de la carte suivent les vraies routes. Dans la vraie version, un service d'itinéraire.
- **« Pourquoi un passage à 6 jours d'un autre du même client ? »** L'outil le signale en orange. La règle (replacer vite ou espacer) est à décider avec vous.
- **« Et si je veux un autre jour ? »** Bouton **Changer** : les autres créneaux des deux agents, avec la raison.
- **« D'où viennent les chiffres de trésorerie ? »** Bloc **Comment on arrive à 36 165 €** sous la courbe : chaque ligne, l'addition tombe juste.
- **« C'est branché à Sellsy ? »** Non, c'est simulé. La vraie version se connecterait à l'API Sellsy (à vérifier : leur offre y donne-t-elle accès ?).
- **« Combien ça coûte / quand ? »** Pas dans la maquette : à discuter après les questions ci-dessous.

## Mes questions pour Damien (les plus importantes)

1. Combien d'heures par semaine Kevin passe sur le planning, et vous sur la trésorerie ?
2. Le maximum de 7 h par agent inclut-il la route ? Les agents partent-ils d'un dépôt ou de chez eux ?
3. Chaque client a-t-il toujours le même agent ?
4. SMS, mail ou les deux pour prévenir les clients, et qui valide l'envoi ?
5. Quelle offre Sellsy, avec accès à l'API ? Cadulis : remplacer ou s'y connecter ?
6. La version franchise : tout de suite ou plus tard ?

La liste complète est dans le README, section « Questions pour Damien le 28 ».

## Si quelque chose coince

- Un écran ne ressemble pas à ce qui est prévu : **Réinitialiser la démo**, puis reprendre l'étape.
- Pas d'internet : la carte n'a plus de fond, mais points, ordre et tracés restent. Le dire en une phrase et continuer.
