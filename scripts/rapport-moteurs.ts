/**
 * Rapport lisible des deux calculs (tournées, « Trouver un créneau »).
 * Lancement : npm run rapport  →  écrit rapport-moteurs.md
 */
import { writeFileSync } from 'node:fs'
import { chargerJeux } from '../src/donnees/chargement'
import { DATE_DU_JOUR } from '../src/donnees/donnees-fictives'
import type { JeuDeDonnees } from '../src/donnees/types'
import { prochainJourTravaille } from '../src/planning/calendrierTravail'
import { replacerEnSerie, trouverCreneaux } from '../src/planning/creneaux'
import type { Proposition } from '../src/planning/creneaux'
import { capaciteMin } from '../src/planning/journee'
import { passagesDuMois } from '../src/planning/passages'
import { planningInitial } from '../src/planning/tournees'
import { routeSansRegroupement, routeTotale, verifierPlanning } from '../src/planning/verifications'
import { annee, dernierDuMois, formatDate, formatDateLongue, mois, nomJour, nomMois, premierDuMois } from '../src/utils/dates'
import { formatDuree, formatHeure } from '../src/utils/format'

const lignes: string[] = []
const ecrire = (...l: string[]) => lignes.push(...l)

const demain = prochainJourTravaille(DATE_DU_JOUR)
const moisSuivant = premierDuMois(annee(DATE_DU_JOUR), mois(DATE_DU_JOUR) + 1)
/** Les passages annulés peuvent être replacés jusqu'à la fin du mois suivant. */
const fenetre = { debut: demain, fin: dernierDuMois(annee(moisSuivant), mois(moisSuivant)) }

ecrire(
  '# Rapport des calculs de planning',
  '',
  `Généré automatiquement (\`npm run rapport\`). Date du jour de la démo : ${formatDateLongue(DATE_DU_JOUR)}.`,
  '',
)

function nomAgent(jeu: JeuDeDonnees, id: string) {
  return jeu.agents.find((a) => a.id === id)?.nom ?? id
}

function ligneProposition(jeu: JeuDeDonnees, p: Proposition) {
  return `${nomJour(p.date)} ${formatDate(p.date)} à ${formatHeure(p.debutMin)} · **${nomAgent(jeu, p.agentId)}** · ${p.raison} _(${p.details.join(' ; ')})_`
}

for (const jeu of Object.values(chargerJeux(DATE_DU_JOUR))) {
  const ctx = { depot: jeu.entite.depot, clients: jeu.clients, agents: jeu.agents }
  const clients = new Map(jeu.clients.map((c) => [c.id, c]))
  const r = planningInitial(ctx, DATE_DU_JOUR)
  const anomalies = verifierPlanning(ctx, r.interventions)

  ecrire(`## ${jeu.entite.nom}`, '')
  ecrire(
    `- ${jeu.clients.length} clients, agents : ${jeu.agents.map((a) => `${a.nom} (${a.heuresMaxJour} h/jour)`).join(', ')}`,
    `- ${r.interventions.length} passages planifiés en ${r.tournees.length} tournées sur 2 mois, passages non placés : **${r.nonPlaces.length}**`,
    `- Contrôle automatique du planning : **${anomalies.length ? `${anomalies.length} anomalie(s)` : 'aucune anomalie'}**`,
    '',
  )

  ecrire('| Mois | Passages | Tournées | Route avec tournées par secteur | Route dans l’ordre alphabétique | Gain |', '|---|---|---|---|---|---|')
  for (const m of [mois(DATE_DU_JOUR), mois(DATE_DU_JOUR) + 1]) {
    const a = m > 11 ? annee(DATE_DU_JOUR) + 1 : annee(DATE_DU_JOUR)
    const mm = m % 12
    const prefixe = premierDuMois(a, mm).slice(0, 7)
    const passages = passagesDuMois(jeu.clients, a, mm).sort((x, y) => clients.get(x.clientId)!.nom.localeCompare(clients.get(y.clientId)!.nom))
    const ref = routeSansRegroupement(ctx, passages)
    const opt = routeTotale(ctx, r.interventions.filter((i) => i.date.startsWith(prefixe)))
    ecrire(`| ${nomMois(a, mm)} | ${passages.length} | ${r.tournees.filter((t) => t.date.startsWith(prefixe)).length} | ${formatDuree(opt)} | ${formatDuree(ref)} | ${Math.round((1 - opt / ref) * 100)} % |`)
  }
  ecrire('')

  ecrire('<details><summary>Détail des tournées</summary>', '', '| Date | Agent | Passages | Communes | Journée (route comprise) | Route |', '|---|---|---|---|---|---|')
  for (const t of [...r.tournees].sort((a, b) => a.date.localeCompare(b.date) || a.agentId.localeCompare(b.agentId))) {
    const agent = jeu.agents.find((a) => a.id === t.agentId)!
    const communes = [...new Set(t.passages.map((p) => clients.get(p.clientId)!.ville))].join(', ')
    ecrire(`| ${formatDate(t.date)}${t.date === demain ? ' ☔' : ''} | ${agent.nom} | ${t.passages.length} | ${communes} | ${formatDuree(t.journee.totalMin)} / ${formatDuree(capaciteMin(agent))} | ${formatDuree(t.journee.routeTotaleMin)} |`)
  }
  ecrire('', '</details>', '')

  // Scénario météo
  const interventions = r.interventions.map((i) => (i.date === demain ? { ...i, statut: 'annulee_meteo' as const } : i))
  const ctxPluie = { ...ctx, interventions, dateDuJour: DATE_DU_JOUR }
  const demandes = interventions
    .filter((i) => i.statut === 'annulee_meteo')
    .map((i) => ({ clientId: i.clientId, interventionId: i.id, fenetre, joursExclus: [demain] }))
  const { replacements, interventions: apres } = replacerEnSerie(ctxPluie, demandes)

  ecrire(`### Scénario « pluie le ${formatDate(demain)} »`, '')
  ecrire(`${demandes.length} passages annulés, replacés automatiquement en suggestion (l’utilisateur valide ou change) :`, '')
  for (const rep of replacements) {
    const c = clients.get(rep.demande.clientId)!
    ecrire(`- **${c.nom}** (${c.ville}, ${formatDuree(c.dureeMin)}) → ${rep.retenue ? ligneProposition(jeu, rep.retenue) : '⚠️ aucun créneau'}`)
  }
  ecrire('', `Contrôle du planning après replacement : **${verifierPlanning(ctx, apres).length ? 'anomalies' : 'aucune anomalie'}**`, '')

  // Exemple « Trouver un créneau » détaillé
  const exemple = demandes[0]
  if (exemple) {
    const c = clients.get(exemple.clientId)!
    ecrire(`### « Trouver un créneau » pour ${c.nom}`, '')
    trouverCreneaux(ctxPluie, exemple).forEach((p, k) => ecrire(`${k + 1}. ${ligneProposition(jeu, p)}`))
    ecrire('')
  }
}

writeFileSync('rapport-moteurs.md', lignes.join('\n') + '\n')
console.log('Rapport écrit dans rapport-moteurs.md')
